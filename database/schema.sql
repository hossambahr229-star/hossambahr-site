-- PostgreSQL production data model. Run through reviewed migrations, never directly in production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE membership_role AS ENUM ('owner','manager','operator','reviewer','accountant','auditor');
CREATE TYPE request_status AS ENUM ('draft','submitted','under_review','awaiting_documents','ready_for_payment','in_progress','awaiting_authority','completed','cancelled','rejected');
CREATE TYPE document_status AS ENUM ('pending_upload','quarantined','available','rejected','deleted');
CREATE TYPE payment_status AS ENUM ('pending','authorized','paid','failed','refunded','cancelled');

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_subject text NOT NULL UNIQUE,
  display_name text NOT NULL,
  phone_e164 text,
  email text,
  locale text NOT NULL DEFAULT 'ar-AE',
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\\+[1-9][0-9]{7,14}$')
);

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  emirate text NOT NULL,
  license_number_ciphertext bytea,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE company_memberships (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (company_id, user_id, role)
);

CREATE TABLE service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  authority text NOT NULL,
  emirate text NOT NULL,
  official_url text NOT NULL,
  source_checked_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES service_catalog(id),
  requirements jsonb NOT NULL DEFAULT '[]',
  government_fee_minor bigint,
  platform_fee_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'AED',
  duration_text_ar text,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  reviewed_by uuid REFERENCES app_users(id),
  CHECK (government_fee_minor IS NULL OR government_fee_minor >= 0),
  CHECK (platform_fee_minor >= 0),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE,
  company_id uuid REFERENCES companies(id),
  customer_id uuid NOT NULL REFERENCES app_users(id),
  service_version_id uuid NOT NULL REFERENCES service_versions(id),
  status request_status NOT NULL DEFAULT 'draft',
  assigned_to uuid REFERENCES app_users(id),
  customer_note text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (public_reference ~ '^HB-[A-Z0-9]{10,20}$')
);

CREATE TABLE request_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status request_status,
  to_status request_status,
  note text,
  visible_to_customer boolean NOT NULL DEFAULT true,
  actor_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES app_users(id),
  storage_key text NOT NULL UNIQUE,
  original_name_ciphertext bytea NOT NULL,
  media_type text NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 char(64),
  status document_status NOT NULL DEFAULT 'pending_upload',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (size_bytes > 0 AND size_bytes <= 26214400)
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id),
  provider text NOT NULL,
  provider_reference text UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  government_fee_minor bigint NOT NULL DEFAULT 0,
  platform_fee_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'AED',
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (government_fee_minor >= 0 AND platform_fee_minor >= 0)
);

CREATE TABLE webhook_receipts (
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payload_sha256 char(64) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (provider, provider_event_id)
);

CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES app_users(id),
  company_id uuid REFERENCES companies(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text,
  ip_hash char(64),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_requests_customer_idx ON service_requests(customer_id, created_at DESC);
CREATE INDEX service_requests_company_idx ON service_requests(company_id, created_at DESC);
CREATE INDEX service_requests_status_idx ON service_requests(status, updated_at);
CREATE INDEX request_events_request_idx ON request_events(request_id, created_at);
CREATE INDEX documents_request_idx ON documents(request_id, created_at);
CREATE INDEX audit_log_resource_idx ON audit_log(resource_type, resource_id, created_at DESC);

-- Row-level security must be paired with transaction-local identity claims set by the API.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

# Security policy

## Public-site boundary

This repository is a public static site. Never commit or collect passports, Emirates IDs, visas, contracts, payment data, customer exports, production credentials, API keys, access tokens, private certificates, or database backups here.

Security issues should be reported privately to `hossambahr229@gmail.com`; do not open a public issue containing customer data or exploit details.

## Production requirements

- TLS only, HSTS, restrictive Content Security Policy, and secure response headers.
- Server-side authorization on every resource; UI hiding is not authorization.
- MFA for staff and least-privilege roles with periodic access reviews.
- Private object storage, short-lived signed upload/download URLs, file-type and size allowlists, malware scanning, and quarantine before staff access.
- Encryption at rest and in transit, with secrets and keys stored in a managed vault and rotated.
- Append-only audit events for authentication, access, download, status, fee, payment, and permission changes.
- Structured logs must exclude document contents, identity numbers, payment data, secrets, and authentication tokens.
- Payment collection must use a hosted or tokenized provider flow. The platform must not store card data.
- Signed payment webhooks, replay protection, idempotency keys, and server-side reconciliation are mandatory.
- Document retention and deletion schedules must be approved before production, with legal holds supported separately.
- Tested backups, point-in-time recovery, incident response, breach notification, and disaster-recovery runbooks are release blockers.

## Data handling

Collect only what is necessary for the selected service. Record purpose and consent where required, support access/correction/deletion workflows, and review any cross-border transfer before enabling it. Production launch requires UAE legal review; this file is an engineering baseline, not legal advice.

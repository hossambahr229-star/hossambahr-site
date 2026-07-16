from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

required = [
    "SECURITY.md",
    "docs/production-architecture-ar.md",
    "api/openapi.yaml",
    "database/schema.sql",
    "config/runtime.example.js",
]
for item in required:
    if not (ROOT / item).is_file():
        errors.append(f"missing required foundation file: {item}")

api = (ROOT / "api/openapi.yaml").read_text(encoding="utf-8")
schema = (ROOT / "database/schema.sql").read_text(encoding="utf-8")
runtime = (ROOT / "config/runtime.example.js").read_text(encoding="utf-8")

for route in [
    "/requests:",
    "/requests/{requestId}/events:",
    "/requests/{requestId}/documents/upload-session:",
    "/requests/{requestId}/payment-session:",
    "/webhooks/payments/{provider}:",
]:
    if route not in api:
        errors.append(f"API contract is missing {route}")

for control in ["Idempotency-Key", "X-Webhook-Signature", "bearerAuth", "writeOnly: true"]:
    if control not in api:
        errors.append(f"API contract is missing security control: {control}")

for table in ["service_requests", "request_events", "documents", "payments", "webhook_receipts", "audit_log"]:
    if not re.search(rf"CREATE TABLE\s+{table}\s*\(", schema, re.IGNORECASE):
        errors.append(f"database schema is missing table: {table}")

for protected in ["companies", "company_memberships", "service_requests", "request_events", "documents", "payments"]:
    if f"ALTER TABLE {protected} ENABLE ROW LEVEL SECURITY;" not in schema:
        errors.append(f"row-level security is not enabled for: {protected}")

if "hostedPaymentsEnabled: false" not in runtime or "privateDocumentsEnabled: false" not in runtime:
    errors.append("sensitive production features must be disabled in the public example config")

for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".ico"}:
        continue
    if path.stat().st_size > 4_000_000:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in [
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        r"(?i)(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*['\"][^'\"]{12,}['\"]",
    ]:
        if re.search(pattern, text):
            errors.append(f"possible secret found in {path.relative_to(ROOT)}")

if errors:
    print("Foundation validation failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Production foundation validation passed")

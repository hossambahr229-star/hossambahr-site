# HOSSAM BAHR OS — Production Activation

The Global OS code is deliberately separated from production activation. Production database changes must only run after the pull request passes both architecture/build checks and local Supabase database checks.

## One-time credential setup
GitHub repository encrypted secrets required by the production deployment workflow:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

The project reference is already non-secret and configured as:
`bbddlpvxjowphkagvycz`

Never commit the access token or database password to source control. The repository secret audit rejects common secret formats.

## Deployment sequence
1. PR CI: architecture, tests, static build, migration safety, secret scan.
2. PR DB CI: local Supabase start, db reset, db lint, pgTAP.
3. Merge reviewed PR to `main`.
4. Production DB workflow links to the configured project and runs `supabase db push`.
5. Existing production browser verification validates the live website.
6. Confirm authentication, `/account/`, `/os/`, one service-to-case flow, organization creation, and private document upload.

## Rollout rule
New execution capabilities remain disabled until their backend tables/functions and authorization policies exist in production. Sensitive integrations are never enabled merely because UI code exists.

## Human-control rule
Payments, government submissions, signatures, destructive actions, consent changes, and other high-risk operations remain behind explicit authorization gates.

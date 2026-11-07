# KaamProof engineering delivery — 2026-11-07

The application is implemented and verified locally, with all three hosted CI jobs
successful for application commit **375073a1878c7e638bdf2621e8f9988714534157**.
[Draft PR #2](https://github.com/Sanjayram3269/KaamProof/pull/2) contains the work on
`feat/kaamproof-product`. Nothing was merged into main. The original unmerged MVP
branch remains unchanged. External production configuration and validation are
still required; this is not an independent production-readiness certification.

## 1. Implemented functionality

- Worker registration/login/logout, Argon2id passwords, hashed opaque browser
  sessions, HttpOnly cookies, rotating refresh credentials, CSRF/origin checks,
  persistent rate limits, reset/verification outbox, profile/phone/language/email
  preferences, session revocation and password-confirmed account deletion.
- Real dashboard aggregates and recent records, owned customers, job creation and
  permitted editing, archive/restore, search, category/status filters, date order,
  pagination, job details and attributed history.
- Immutable agreement versions with scope/exclusions/terms, labour/material/other/
  tax breakdowns, Decimal totals, currency, validity and exact-version decisions.
- Separate customer portal, expiring/revocable hashed capability links, stale and
  duplicate decision protection, comments, work/evidence review, acknowledgement
  and disputes. Customer possession is identified as a link capability, not
  independently verified civil identity.
- JPEG/PNG/WebP decoding and re-encoding, content/size/pixel validation, metadata
  stripping, private storage, captions/hashes/timestamps, authorized downloads,
  preservation after agreement issue and durable private-file deletion.
- Guarded work/completion/dispute/resumption/resubmission transitions, with
  completion-number binding and stable per-job event order.
- Self-reported partial/multiple payments, reference/idempotency checks, valid
  Decimal amounts and balances; six branded PDF document types with identifiers,
  timestamps, versions, embedded fonts and clear provenance/limitations.
- In-app notification/read state, preference-aware durable email queue and retries.
- Responsive four-language UI, localized labels/errors/events/dates/currency,
  accessible forms/tabs, confirmations, toasts, loading/empty/error states, help,
  profile/settings and not-found handling.

## 2. Architecture and technology

Next.js **16.4.5 App Router**, React 19, TypeScript, i18next and Lucide; FastAPI,
Pydantic 2, SQLAlchemy 2, Alembic, PostgreSQL 17 and local SQLite; ReportLab,
HarfBuzz and embedded Noto fonts; private local/S3 evidence; SQL outbox; Nginx.
Compose runs database, API, Next.js server, mail/deletion worker and gateway.
Only the gateway publishes port 8080. Job mutation/event transactions finish
before successful responses are sent.

The initial audit examined the README-only main tree and missed an unmerged MVP.
That was corrected: every MVP source/config/document/test file was inspected,
its untouched five backend tests passed, and its Next.js/FastAPI frameworks and
apps/api + apps/web layout were retained. See MVP_RECONCILIATION.md for the exact
baseline classifications and safe data-transfer procedure.

## 3. Added/modified files and modules

| Location | Delivered work |
| --- | --- |
| apps/api/app | Auth, security, schema/models, database transactions, domain services, worker/customer routes, bounded bodies, private storage, PDFs, outbox, deletion worker, MVP importer |
| apps/api/migrations | Three current migrations, clean/repeated upgrade support and metadata checks |
| apps/api/tests | 36 database/integration/security/import tests; original MVP migration fixture |
| apps/web/app | Actual Next.js pages/layouts and legacy worker URL redirects |
| apps/web/src | Shared UI, state/query layer, worker/public/customer pages, transport, navigation, four-language messages/events, responsive styles and component tests |
| apps/web/proxy.ts | Fresh per-request script nonce and production CSP |
| apps/web/e2e | Four Chromium workflow/accessibility/mobile/error tests and a valid image fixture |
| Dockerfiles, compose.yaml, nginx.conf | Non-root API/Next runtime, private DB/API, persistent volumes and readiness checks |
| .github/workflows/ci.yml | PostgreSQL backend, frontend and container/browser quality jobs |
| .env.example, README.md, docs | Configuration, audits, requirements, roadmap, architecture, API/data model, deployment, security, reconciliation, test evidence and changelog |

The source archive contains the complete tracked tree and no node_modules,
virtualenv, runtime database, private evidence, local mail previews or credentials.

## 4. Database and migration status

Fourteen current tables; foreign keys, unique constraints, monetary checks and
state constraints are active. Migration head: **b03_activity_order** (three
revisions). Clean and repeated SQLite/PostgreSQL upgrades succeeded.
`alembic check` returned **No new upgrade operations detected.**

The MVP schema has a separate history. The importer defaults to a rolled-back
dry run, requires an empty migrated target, reads the source without mutation,
validates/copies evidence, preserves records/metadata, upgrades bcrypt at login,
and retires old unbound capabilities without inventing agreement bindings.
An actual pre-existing production database was not supplied for cutover testing.

## 5–10. Executed quality gates

| Gate | Actual result |
| --- | --- |
| Backend, fresh on-disk SQLite | **36 passed**, 1 warning, **12.87s** |
| Backend, Linux + PostgreSQL 17 | **36 passed**, 1 warning, **13.89s** |
| Original untouched MVP baseline | **5 passed**, 2 warnings, **2.50s** |
| Frontend unit/component tests | **11 passed**, 1 test file |
| Native Next.js Chromium E2E | **4 passed**, **25.9s** |
| Docker/Next.js/Nginx Chromium E2E | **4 passed**, **14.9s** |
| Backend lint | **All checks passed!** |
| Frontend lint | Exit 0 |
| TypeScript + generated route types | Exit 0 |
| Next.js production build | Successful dynamic App Router production build |
| Docker build and startup | Images built; DB/API/Next/gateway healthy; mail worker running |
| Health endpoint | `{"status":"ok"}` through gateway |
| Migration/schema consistency | Repeated upgrade succeeds; no drift |
| Python dependency scan | **No known vulnerabilities found** |
| npm dependency scan | **found 0 vulnerabilities**, including development dependencies |
| Installed dependency consistency | **No broken requirements found.** |
| PDF QA | Three multilingual pages rendered and visually inspected |
| UI QA | Loaded production dashboard captured at 1440px and 390px; mobile overflow assertion passes |
| Hosted GitHub Actions | **backend, frontend, containers-and-browser: success** for application commit 375073a |

[Successful hosted run](https://github.com/Sanjayram3269/KaamProof/actions/runs/42371498060).
The sole current backend warning is Starlette's TestClient httpx transport
deprecation. Native development also logs environment preload/color warnings;
the browser workflow records no application page errors.

## 11. Verified workflows and security findings

Executed registration through customer approval, work start, real image upload,
progress update, completion, separate-customer acknowledgement, two partial
payments, PDF parsing/download, stored-row/event assertions and cross-user denial.
Negative tests cover stale/revoked/expired/replayed links, concurrent decisions,
invalid states, disputes/resubmission, invalid/oversized/corrupt images, streamed
request limits, CSRF/Origin/mass assignment, auth expiry/revocation, payment
validation/duplicates, SQL-shaped searches, database constraints, reset/verification,
account/file deletion and safe MVP import/rollback.

axe checks pass for public/authentication, dashboard and initial job-detail
surfaces. Component tests verify translations, formatting, validation, escaped
content and failure states. No fabricated dashboard metrics or fake email-delivery
claims are used. No open critical issue was found within this executed scope;
this does not replace an independent penetration test.

See TEST_REPORT.md for detailed coverage and failures corrected during execution,
and SECURITY_AUDIT.md for controls and practical limits.

## 12. Implemented but not externally verified / blocked / remaining

**Implemented but not provider-verified:** SMTP STARTTLS/retry adapter, private S3
adapter, production Secure-cookie configuration. Local file/email behavior is
tested. The CI definition has now also run successfully on GitHub.

**Blocked by missing external configuration:** live SMTP delivery, S3 bucket/IAM
policy checks, public HTTPS deployment, production backup/restore and actual MVP
database cutover. No external credentials or real database snapshot were supplied.

**Remaining operational validation:** target-scale load tests, native-speaker
translation review, Firefox/WebKit/assistive-technology checks and independent
security review. SMTP is at least once; interrupted sends can repeat. Failed
storage/DB transactions can leave inaccessible orphan uploads, so reconcile old
unreferenced objects. Account deletion queues actual file removal. Exact Indic
ligature copy/search extraction varies by PDF reader; visible text was inspected.
Do not claim independent identity/work/payment/legal certification.

## 13. Environment variables to configure

| Variable | Use |
| --- | --- |
| POSTGRES_PASSWORD | Unique URL-safe database password for Compose |
| APP_ORIGIN | Exact public origin; localhost:8080 locally, HTTPS in production |
| ENVIRONMENT | development locally; production enables guards/Secure cookies |
| DATABASE_URL | Native/custom deployment target; Compose constructs its own |
| DATA_DIR | Private persistent local data directory |
| SMTP_HOST/PORT/USER/PASSWORD/FROM | Real STARTTLS email provider (port 587 default) |
| S3_BUCKET / S3_ENDPOINT_URL | Private evidence bucket; compatible endpoint optional |
| AWS_DEFAULT_REGION | Storage region |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY | Server-only storage credentials, or use an IAM role |
| MVP_DATABASE_URL | Offline read-only source snapshot, only for intentional import |
| TEST_DATABASE_URL | Empty disposable test database, never real records |
| E2E_BASE_URL | http://localhost:8080 to test Docker; omit for native dev server |

No JWT secret is required; JWT bearer authentication was retired.

## 14. Exact local startup

From the repository root, PowerShell:

```powershell
Copy-Item .env.example .env
# Set POSTGRES_PASSWORD in .env to a unique URL-safe random value.
docker compose up --build -d --wait
docker compose ps
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Open **http://localhost:8080** and register. The local stack was left running.
No sample users or business records are seeded by startup; verification created
isolated test accounts. `docker compose down` stops services and preserves volumes.
Native development, testing and import commands are in DEPLOYMENT.md and
MVP_RECONCILIATION.md. Do not remove volumes containing records you need.

## 15. Next steps

Review draft PR #2 and its successful hosted CI. Configure SMTP/private storage,
TLS, monitoring and backups in the target environment. If migrating an existing
MVP, perform the documented source-snapshot dry run and compare counts/records
before cutover. Complete production-specific security/load/restore/language review
before onboarding real workers and customers. Merge/deploy remains the owner's
decision; no merge or public deployment was performed.

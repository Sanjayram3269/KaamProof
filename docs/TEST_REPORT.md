# Executed test report

Verification date: 2026-11-07 (Asia/Kolkata). Baseline: 4175835. Work is on
feat/kaamproof-product; main is not merged. Results below are actual executed
commands, not inferred from test files. See delivery checkpoint for final commit.

## Verified complete

| Gate | Executed result |
| --- | --- |
| SQLite backend | `python -m pytest -q --tb=short`: **34 passed**, 1 dependency deprecation warning, 10.92s |
| PostgreSQL backend | Final source suite in Linux container against disposable PostgreSQL 17 database: **34 passed**, 1 warning, 11.99s |
| Frontend unit/component | `npm test`: **11 passed**, 1 test file |
| Native browser workflow | `npm run test:e2e`: **4 passed**, 18.2s; an earlier native run preceded the additional mobile-menu assertion |
| Container browser workflow | Final `E2E_BASE_URL=http://localhost:8080 npm run test:e2e`: **4 passed**, 15.3s, including desktop/job axe checks and the mobile-menu assertion |
| Backend lint | `ruff check app tests migrations`: **All checks passed!** |
| Frontend lint | `npm run lint`: exit 0 |
| TypeScript | `npm run typecheck`: exit 0 |
| Production build | `npm run build`: successful TypeScript + Next.js build |
| Database migration | Clean SQLite and PostgreSQL upgrades; second upgrade is a no-op; `alembic check`: **No new upgrade operations detected.** |
| Python dependency scan | `pip-audit -r apps/api/requirements.txt`: **No known vulnerabilities found** after package updates |
| npm dependency scan | `npm audit`: **found 0 vulnerabilities**, including development dependencies |
| Dependency consistency | `python -m pip check`: **No broken requirements found.** |
| Docker build/start | Both images built; PostgreSQL, API and frontend health checks passed; mail worker running |
| PDF visual QA | Three-page mixed English/Hindi/Tamil/Kannada job record rendered using Poppler; every page visually inspected for layout and glyph rendering |
| Responsive visual QA | Actual desktop dashboard and 390px mobile dashboard screenshots inspected; no initial horizontal overflow |

The Starlette warning recommends migrating its test transport from httpx to httpx2.
It does not fail the suite; production requests do not use TestClient.

## What the tests verify

The backend suite runs on actual migrated databases, not mocked repositories.
The full workflow creates a worker/customer/job, issues an agreement, shares a
capability, approves, starts work, uploads and downloads evidence as both roles,
records an update, submits completion, acknowledges, records two partial payments,
generates and parses the PDF, queries stored rows/events, and denies another worker.

Negative and invariant cases cover duplicate accounts, invalid credentials,
Argon2id storage, HttpOnly cookies, access and refresh expiry, rotation/replay,
session invalidation, CSRF, hostile Origin, extra owner_id assignment, unauthorized
customer association and job/evidence/PDF reads/writes, SQL-shaped search strings,
pagination validation, archive/restore, agreement version preservation, stale and
rejected agreement responses, invalid/expired/revoked capabilities, expired agreement,
simultaneous approvals, invalid transitions, disputes and completion resubmission,
stale/duplicate acknowledgement, spoofed MIME/SVG/invalid/corrupt-checksum/oversized
images, chunked request limits, evidence retention after issue, Decimal validation,
NaN/negative/excess-precision/overpayment, idempotency/reference duplicates,
financial revision invariants, database FK/check constraints, dashboard counts,
notification read state, portal privacy, all six document types, password reset,
verification, language preference, account cascade/deletion queue and local-file
cleanup, authentication rate limiting and local email preview delivery labeling.

Frontend tests verify landing/navigation, required and minimum-length fields,
asynchronous form errors, empty/not-found/error/retry states, escaped activity text,
Hindi/Tamil/Kannada status translations, persisted language, date/currency formatting,
same-origin/CSRF API requests and structured server failures.

Chromium tests exercise registration, real dashboard loading, customer/job creation,
agreement issue, separate customer browser context, approval, worker start, actual
image upload, attributed update, completion, acknowledgement, payment, PDF download,
cross-user denial, 390px navigation, language persistence, required validation,
not-found routes, invalid customer capability and invalid login. axe scans public,
login/register/reset-request, dashboard and initial job-detail surfaces for WCAG
2 A/AA and 2.1 AA rules. This is an automated subset, not a full accessibility audit.

## Failures found and corrected

- Initial TypeScript check found unused/missing translation bindings; corrected.
- A test used an obsolete cookie inspection property and an 8-MB parameter value
  as its test ID; corrected the test harness, without changing application controls.
- A malformed PNG fixture uncovered an uncaught decoder checksum exception. Added
  a 415 response and regression test, and generated a valid browser upload fixture.
- Reopening a customer fragment link in the same mounted portal did not reload
  its state. Added hash/focus reload behavior and awaited completion submission.
- Low-contrast secondary text failed axe; corrected the palette.
- Nginx healthcheck used localhost resolving to IPv6 while listening on IPv4;
  changed the probe to 127.0.0.1 and confirmed healthy startup.
- Initial dependency pins had published advisories; upgraded and rescanned cleanly.
- Same-second activity ordering, streamed request caps, token consumption and
  durable file deletion were tightened with database/security regression tests.

## Implemented but not externally verified

SMTP STARTTLS adapter/retry outbox; private S3 object adapter and encryption options;
production Secure cookies/configuration guard; GitHub Actions workflow definition.
Local transports and local/contained application behavior are verified. There was
no configured external SMTP/S3 account, public TLS deployment or hosted CI run yet.

## Blocked by external configuration

Actual production deployment, provider SMTP delivery, S3 bucket policy validation
and a production backup/restore drill require target infrastructure and credentials.
No credentials were fabricated. Exact variables and commands are in DEPLOYMENT.md.

## Remaining operational work

Configure providers/TLS/backups, validate production rate-limit proxy addresses,
review translations with native speakers, perform target-scale load testing and
an independent security review. The suite runs Chromium; Firefox/WebKit and assistive
technology testing were not executed. PDFs preserve visible Indic text; exact
copy/search extraction of shaped Indic ligatures depends on the PDF reader.

## Final checkpoint

Final application commits: c8567e0 (frontend) and c1849e9 (transaction/account
invariants), following backend commit 5735e6d and audit commit 97e0933. Subsequent
documentation/Compose/CI commits do not alter application behavior.

Final Docker rebuild output ended with:

```text
Image kaamproof-frontend Built
Image kaamproof-mail Built
Image kaamproof-backend Built
Container kaamproof-db-1 Healthy
Container kaamproof-backend-1 Healthy
Container kaamproof-frontend-1 Healthy
34 passed, 1 warning in 11.99s
4 passed (15.3s)
```

The running mail worker has no independently configured SMTP credentials; its
container state is running, with database-backed startup inherited from the API
image. `GET http://localhost:8080/api/v1/health` returned `{"status":"ok"}`.
PostgreSQL `alembic upgrade head` succeeded again and `alembic check` detected no
schema drift. `git diff --check` passed. Hosted CI status is separate from these
local results and is not asserted as passed without observing a successful run.

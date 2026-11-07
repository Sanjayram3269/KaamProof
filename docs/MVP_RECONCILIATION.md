# Existing MVP reconciliation

The initial checked-out `main` tree at 4175835 was README-only. A later remote
branch review identified `origin/feat/kaamproof-mvp-initial` at 0b3b8a9. The first
audit missed this branch; the final audit includes every file in its tree.
Neither main nor the MVP branch was modified. The source feature branch remains
available in Git as the original reference.

Reviewed the complete MVP README, four docs, API modules, schemas, security,
services, models, migration/configuration, tests, every web page/component/library,
Docker/Compose and CI. Its untouched five backend tests were executed in an
isolated Linux container: **5 passed, 2 warnings in 2.50s**. These verify duplicate
accounts/invalid login, a basic approval/completion/PDF flow, invalid links,
cross-user job read denial and stale agreement-version submission. They do not
establish the broader product/security requirements.

| MVP area | Baseline classification | Reconciliation |
| --- | --- | --- |
| Next.js App Router + FastAPI/SQLAlchemy | Implemented; framework sound | Retained frameworks and apps/api, apps/web layout; upgraded Next 14.2.24 to patched 16.4.5 |
| Authentication | Partially implemented / security-critical | Replaced localStorage bearer/JWT/default-secret handling with hashed server sessions, CSRF, refresh/revocation/reset; bcrypt import compatibility upgrades to Argon2id on login |
| Dashboard/job list/create/read | Partially implemented | Retained capabilities; added edit/archive/search/filter/pagination and financial/customer/activity queries |
| Agreements | Partially implemented / security-critical | Existing versions preserved conceptually; new links bind exact version, validity enforced, decisions serialized, revision resets approval |
| Customer portal | Partially implemented | Added comments, private evidence display/download, explicit attribution and stale/replay protection |
| Evidence | Partially implemented / security-critical | Old worker detail serialized storage paths and offered no download endpoint; now private bytes, content normalization, metadata stripping and retention policy |
| Completion/dispute | Partially implemented | Added resumption/resubmission with completion-number binding and attribution |
| Payments | API partial, frontend placeholder | Added real forms/history/balances, idempotency, reference and amount checks, PDF summary |
| Customers | Frontend placeholder | Real owned directory and job association |
| Settings/i18n | Dictionary preview only | Persisted four-language UI, localized validation/errors/events/dates/amounts, profile and sessions |
| PDF | Basic export implemented | Retained export; added six document types, pagination, identifiers, timestamps and embedded Indic fonts |
| CI | Broken configuration risk | Referenced an absent package-lock; now committed lock, actual test/build/type/lint/container/browser gates |
| Docker | Implemented but unverified in baseline | Non-root API/Next containers, private backend/db, separate gateway and actual readiness checks |

No useful MVP workflow was removed. Legacy `/jobs`, `/jobs/{id}`, `/customers`,
`/settings` and `/payments` worker entry points redirect to their completed
workspace equivalents (payments are recorded within each job). Customer links
from the MVP are intentionally revoked during import because they had no exact
agreement binding. Workers issue new private links; they are not silently made
valid against a different agreement.

## Safe data transfer

Do not point new Alembic migrations at the MVP database. Its `0001_initial` history
and table meanings differ. Back up the old database and evidence, take the old
application offline, create a separate empty target database and migrate it with
the new Alembic history. Use a SELECT-only source role or offline SQLite snapshot.

From apps/api, with DATABASE_URL selecting the empty new target:

```powershell
$env:MVP_DATABASE_URL='sqlite:///C:/private-backup/mvp.db'
..\..\.venv\Scripts\python -m alembic upgrade head
..\..\.venv\Scripts\python -m app.import_mvp --evidence-root C:/private-backup/storage
# Review the dry-run counts and warnings before the explicit write:
..\..\.venv\Scripts\python -m app.import_mvp --evidence-root C:/private-backup/storage --apply
```

The command defaults to rollback/dry-run. It refuses non-empty targets and identical
source/target URLs, checks the exact MVP schema, preserves user/job/agreement/event/
evidence/payment IDs and timestamps, copies/re-encodes valid evidence through the
private storage adapter, retains original approval/completion/payment-note metadata
in a system-attributed import event, and revokes legacy links. It never updates
the source. Ambiguous multiple agreement decisions or unsafe/missing images fail
the import and roll back the target. Newly written blobs are cleaned on failure.

Customer records are deterministically derived per existing job, avoiding accidental
merging of same-named people. Legacy unspecified validity is shown as unspecified
and represented as expired for new decisions; issue a new version before sharing.
No customer consent or external verification is invented. Old JWT sessions are
not transferred. Browser kp_token values are removed. Normal legacy bcrypt passwords
work and rehash on login; legacy passwords above bcrypt's 72-byte limit require a
password reset, rather than silently truncating input. Export and compare source/
target counts and inspect sample PDFs before cutover; keep the source backup.

Import tests run the actual old migration to build a source snapshot, verify
dry-run rollback, successful data/evidence transfer, revoked links, preserved
financial/approval records, bcrypt upgrade, repeat refusal and path-attack rollback.
No real pre-existing database was supplied, so an actual deployment cutover remains
an operator/provider validation step.

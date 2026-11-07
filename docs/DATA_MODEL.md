# Data model and migrations

Current schema uses SQLAlchemy models in apps/api/app/models.py and three Alembic
revisions: 099798374148, a82d311d0fda, b03_activity_order (head). Both SQLite and
PostgreSQL migrations have been executed, repeated, and checked against metadata.

| Table | Purpose / constraints |
| --- | --- |
| users | Unique normalized email, Argon2id password (legacy bcrypt accepted and upgraded), language, unverified contact fields, preferences |
| sessions | Owned hashed access/refresh/CSRF credentials, expiry, user-agent and timestamps; unique token digests |
| action_tokens | Hashed one-use reset/verification credentials and expiry |
| rate_buckets | Hashed rate key, window/count, atomic upsert |
| customers | Worker-owned name/contact records |
| jobs | Worker/customer FKs, state check, archive flag, revision lock, completion number/notes/timestamps |
| agreements | Job FK, unique job/version, Decimal pricing, nonnegative components and sum check, currency, validity, exact customer decision |
| share_links | Job/agreement FKs, unique capability digest, expiry/revocation; raw tokens never stored |
| evidence | Job FK, private generated key, normalized-byte hash/size, caption, timestamp, deletion marker |
| activities | Job FK, actor/type/notes/details/time, unique job/sequence; no mutation endpoint |
| payments | Job FK, positive Numeric amount, currency/method/reference/date, unique job/idempotency key |
| notifications | Owned job-linked message, read/unread and timestamp |
| outbox | Recipient/body, attempt/backoff and successful external delivery timestamp |
| blob_deletions | Durable private storage keys to remove after DB transaction commit |

Foreign keys are enforced on SQLite through PRAGMA on every connection, as well
as natively in PostgreSQL. Account deletion removes jobs before customer rows,
cascades child records, and queues private objects for deletion. Events and
payments have no ordinary update/delete API. Issued evidence is preserved until
account deletion. No database create_all is used in application startup or current
backend tests; migrations construct test databases too.

All job changes acquire a conditional revision update. Record mutation and event
insertion commit before a successful response is sent through function-scoped
FastAPI dependencies. Concurrency losers get 409 and roll back completely.
No sums across different currencies are presented as one financial total.

The MVP `0001_initial` schema is a different history. Its original migration is
retained as a test fixture, and the import utility operates read-only on a source
snapshot and transactionally on a separate empty target. Do not stamp the new
history onto old tables. See MVP_RECONCILIATION.md for dry-run/apply instructions.

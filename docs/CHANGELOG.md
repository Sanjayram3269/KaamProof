# Changelog

## 2026-11-07 — Initial product implementation

- Audited the README-only bootstrap and recorded requirements and acceptance gates.
- Added PostgreSQL/SQLite schema, constraints and three Alembic migrations.
- Implemented Argon2id authentication, secure browser sessions, rotating refresh
  credentials, CSRF/origin checks, rate limits, reset/verification outbox, profile,
  language preference, session management and account deletion.
- Implemented real dashboard queries, customers, job creation/edit/archive/search,
  status/category filtering, pagination and attributed activity sequences.
- Added immutable agreement versions, itemized Decimal pricing, expiring/revocable
  hashed customer capabilities, current-version approval/rejection and comments.
- Added validated/re-encoded private images, protected worker/customer download,
  evidence retention policy and durable deletion queue.
- Added guarded completion/dispute/resubmission/acknowledgement transitions.
- Added self-reported partial payments, idempotency/reference checks and balance
  validation; generated six types of branded PDF record with embedded Noto fonts.
- Added responsive React UI, four-language messages and events, localized dates
  and amounts, accessible forms/tabs, validation, loading/error/empty states,
  confirmations, notifications, preferences, help and not-found handling.
- Added backend/database, component and Chromium workflows, automated axe checks,
  container health checks, CI workflow and deployment/security documentation.
- Resolved dependency advisories, malformed-PNG handling, body streaming limits,
  activity ordering and the IPv6 healthcheck mismatch found during verification.

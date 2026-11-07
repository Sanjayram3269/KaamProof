# Architecture

Main was a bootstrap; an unmerged MVP used Next.js and FastAPI. The final
implementation retains that framework and apps/api + apps/web structure, using
React 19, TypeScript, Next.js 16.4.5 App Router, i18next and Lucide; FastAPI, Pydantic 2,
SQLAlchemy 2 and Alembic on the backend. PostgreSQL 17 is the container database;
SQLite on a private local disk supports development and isolated tests.

Nginx proxies the Next.js Node server and `/api/v1` backend on one origin.
Only port 8080 is published by Compose. A production TLS terminator sits in front
of Nginx. Worker browser credentials use opaque, random, hashed server-side
sessions in HttpOnly cookies, with rotating refresh credentials and session-bound
CSRF tokens. There is no JWT parser or signing key to configure.

Next.js uses actual App Router pages and layouts, with a per-request script nonce
and dynamic rendering. The previous Vite iteration was replaced during MVP
reconciliation. A small navigation adapter shares accessible components with the
test harness; production routing uses next/link and next/navigation.

`app/auth.py` handles account/session routes. `app/jobs.py` handles worker routes;
`app/portal.py` handles customer capabilities. `services.py` centralizes ownership,
optimistic record locking, state transitions, attribution and financial summaries.
`storage.py` validates, decodes and re-encodes images and provides private local/S3
storage. `documents.py` builds paginated PDF records, with embedded OFL Noto fonts
and HarfBuzz shaping for supported Indic scripts. `mail.py` processes a durable
outbox; `cleanup.py` processes post-commit private blob deletion.

The frontend separates shared UI, query/state utilities, public/customer pages,
worker pages, API transport, translations and event translations. UI business
records always come from the API. Only language preference is stored in localStorage.
Images in the customer portal are fetched with capability headers into temporary
blob URLs, which are revoked on unmount.

Schema: users, sessions, action_tokens, rate_buckets, customers, jobs, agreements,
share_links, evidence, activities, payments, notifications, outbox and
blob_deletions. Ownership is explicit on jobs/customers; child records reference
jobs. All relationships use database foreign keys. Email, token digests,
agreement version per job, activity sequence per job and payment idempotency per
job have unique constraints. Money uses NUMERIC(14,2) and Decimal validation.

All job mutations take an optimistic revision lock, then write the change and
its attributed event in the same database transaction. This serializes agreement
decisions, completion responses and payment balance checks across API processes.
Activity sequence follows that revision, giving stable within-job chronology even
when actions share a timestamp. A losing concurrent request returns 409.

State machine:

```mermaid
stateDiagram-v2
  draft --> awaiting_approval: issue agreement
  awaiting_approval --> awaiting_approval: reject or revise
  awaiting_approval --> approved: customer approves current version
  approved --> awaiting_approval: issue revised version before work
  approved --> in_progress: worker starts
  in_progress --> completion_pending: worker submits completion
  completion_pending --> completed: customer acknowledges
  completion_pending --> disputed: customer disputes
  disputed --> in_progress: worker resumes
```

Agreements have no update/delete endpoint. A revision creates another immutable
version and resets job approval. Shared links retain their exact agreement binding;
old links can display history but cannot approve newer versions or completion.
Customer possession identifies a capability, not an independently verified person.

Timestamp values are Unix UTC seconds; UI dates use Intl and the viewer's timezone.
Activity sequence provides exact ordering within a job. PDF labels are English,
while user text supports English, Hindi, Tamil and Kannada. Fonts derive from
https://github.com/notofonts/noto-fonts under the included OFL license.

## Dashboard read model

GET /api/v1/dashboard accepts days=7|30|90|365 and an optional uppercase
three-letter currency. Existing aggregate keys remain available. The response
adds active work, live approval counts, prioritized attention, financial series,
payment entries, evidence counts, event-derived last activity, customer context
and onboarding flags. GET /api/v1/payments provides owned, date/currency-filtered
entries with bounded pagination. GET /api/v1/notifications/summary supplies the
unread badge. Job filters support active, approvals, outstanding, attention and agreement-ready work,
plus an owned customer ID and currency-preserving financial drilldowns. Every query remains authenticated and owner-scoped.

Job KPIs, stage counts and attention exclude archived work. Active includes
approved, in-progress, completion-review and disputed states. Approval counts
include live pending agreements and completion reviews; expired and rejected
agreements appear as distinct attention items. There is no due-date model, so
the interface does not infer overdue jobs. One highest-priority attention reason
is returned per job, with six visible entries and a total for the drilldown.

Financial lifetime figures retain archived history. Approved value uses the latest
approved version per job, even while a proposed revision is pending; versions are
never added together. Outstanding is each approved amount less recorded payments,
clamped at zero before summing. Its job drilldown includes archived records and
labels that scope. Pending/rejected estimates are excluded from agreed amounts.
Payment completion is the recorded share of approved contract value. A missing
denominator produces no percentage. Each currency is kept separate. SQL NUMERIC
and Python Decimal compute all monetary totals; JSON uses decimal strings. The
browser converts values to Number only for display and chart coordinates.

Period analytics filter payment paid_at (not event creation time) using UTC
calendar boundaries. Seven and thirty days use daily buckets; ninety days uses
weekly buckets; twelve months starts at the first day of the month eleven months
before the current month and uses monthly buckets. Buckets include actual zero
periods, never synthetic activity or growth comparisons. Future-dated entries
are excluded from period analytics. Payments remain worker-reported records.

Recent jobs, attention, events and customer cards have bounded output. Customer
cards aggregate only their displayed IDs; the active-customer total is a separate
SQL distinct count. The read model reuses existing indexes and requires no schema
migration. Mutations, session/CSRF controls, version-bound capabilities, evidence
access, payment idempotency and PDF generation retain their existing paths.

The Docker gateway resolves service names through Docker DNS with a ten-second
cache, so container replacement does not leave a stale upstream address. Its
health check covers both the frontend and API. See the official [NGINX proxy
variable documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

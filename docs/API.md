# Current API contract

Base path `/api/v1`; browser authentication uses HttpOnly session/refresh cookies,
not Authorization JWTs. On worker mutations send X-CSRF-Token from kp_csrf. Same
origin requests only. Inputs reject unknown fields. Money is sent as decimal
strings; timestamps are Unix UTC seconds. Errors use
`{"error":{"message":"...","fields":[...]}}` (fields present for validation only).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /health | Database-backed readiness |
| POST | /auth/register, /auth/login | Account/session creation |
| GET | /auth/me | Current profile |
| POST | /auth/refresh, /auth/logout | Rotate or invalidate session |
| PUT | /auth/profile | Name, phone, language and email preference |
| GET / DELETE | /auth/sessions, /auth/sessions/{id} | List/revoke owned sessions |
| POST | /auth/forgot-password, /auth/reset-password | Queued recovery and one-time reset |
| POST | /auth/request-verification, /auth/verify-email | Queued verification and token consumption |
| DELETE | /auth/account | Password-confirmed deletion and private-blob deletion queue |
| GET | /dashboard | Actual aggregates, recent jobs/activity/customers and currency totals |
| GET / POST | /customers | Owned directory and customer creation |
| GET / POST | /jobs | Search/filter/sort/page or create |
| GET / PUT | /jobs/{id} | Full owned record or permitted draft edits |
| POST | /jobs/{id}/archive | Archive/restore |
| POST | /jobs/{id}/agreements | Issue a new immutable agreement version |
| POST | /jobs/{id}/links | Create expiring, exact-version capability (raw token returned once) |
| DELETE | /jobs/{id}/links/{id} | Revoke a capability |
| POST | /jobs/{id}/start, /jobs/{id}/updates, /jobs/{id}/completion | Guarded work actions |
| POST / GET / DELETE | /jobs/{id}/evidence, /jobs/{id}/evidence/{id} | Validated upload, authorized download, draft-only removal |
| POST | /jobs/{id}/payments | Decimal amount, method/reference/date and idempotency key |
| GET | /jobs/{id}/documents/{kind} | record, agreement, work-summary, evidence-index, completion or payments PDF |
| GET | /notifications | Recent owned in-app records |
| POST | /notifications/{id}/read | Mark owned record read |
| GET | /portal | Customer-safe record, using X-Customer-Token |
| POST | /portal/decision | Exact agreement_id + approved/rejected + notes |
| POST | /portal/comments | Customer-entered notes |
| POST | /portal/completion | Exact completion_number + acknowledged/disputed + notes |
| GET | /portal/evidence/{id} | Capability-authorized private image bytes |

Job list query parameters: q, status, category, page (>=1), size (1–100),
sort (newest/oldest), archived (boolean). Result has items/total/page/size.
Customer capabilities are shared in a fragment URL `/portal#token`, consumed into
memory, removed from the address bar and sent in a header, never in API paths.
Decisions return 409 on stale/replayed/concurrent operations; expired agreement
decisions return 410; invalid/revoked/expired capabilities return 404.

The old MVP Authorization and `/customer/{token}` contract is deliberately retired.
See MVP_RECONCILIATION.md for data transfer and link reissuance. OpenAPI at the
internal API's `/openapi.json` is the executable schema for request fields.

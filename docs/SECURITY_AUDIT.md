# Security audit

Scope: application source, isolated SQLite/PostgreSQL tests, Chromium workflows,
dependency scans, container startup and authorized local file storage. This is an
engineering review, not an independent penetration test or legal certification.

## Controls and evidence

| Area | Implemented controls and executed verification |
| --- | --- |
| Passwords | Argon2id via pwdlib, 10–128 characters, dummy verification for unknown accounts; imported bcrypt upgraded on login; stored hash assertion and invalid-login tests |
| Browser sessions | Random opaque credentials, SHA-256 digests in DB, HttpOnly/SameSite=Strict cookies, Secure in production, 8-hour access, 14-day refresh; expiry/logout/revocation/rotation/replay tests |
| JWT | Not used; authorization uses server-side opaque sessions, so JWT algorithm/issuer bypass is not applicable |
| CSRF and CORS | Session-bound CSRF header on worker mutations, exact origin validation on all mutations, same-origin apps/web/API, no permissive CORS; hostile-origin and forged-CSRF tests |
| IDOR / ownership | Worker ownership checked on jobs and customer association; evidence/documents require parent ownership; cross-user read/write and PDF/image denial tests |
| Customer links | 256-bit random capabilities, digests only in share_links, expiry/revocation, capability headers rather than URL paths, fragment removed from address bar, no-referrer; invalid/expired/revoked/stale/replay tests |
| Decisions | Job revision locking, agreement version binding, one decision, completion submission binding; simultaneous approval test gives one 200 and one 409 |
| State transitions | Explicit allowed transitions; premature completion, repeated start, stale completion, dispute/resubmission and duplicate acknowledgement tests |
| SQL injection | SQLAlchemy bound expressions; injected search string returns no matching records |
| XSS | React text rendering, no dangerouslySetInnerHTML, XML-escaped PDF text, production CSP, re-encoded raster uploads; script text remains literal in component test |
| Uploads | Actual decode/verify, allowlisted JPEG/PNG/WebP, 8-MB file limit, 9-MB streamed request limit, 16M-pixel cap, image re-encode strips metadata, generated private storage keys; forged MIME, SVG, invalid, corrupt checksum, oversize and ownership tests |
| Path traversal | Client filename never becomes a filesystem path; generated storage key only; hostile filename included in upload validation tests |
| Money | Decimal/NUMERIC, positive amounts, two decimal places, balance check under job lock, immutable payments, idempotency and reference duplicate checks; NaN/negative/excess-precision/overpayment tests |
| Audit integrity | No event update/delete API; mutation + attributed event commits atomically; per-job unique sequence; agreement history preserved |
| Rate limiting | Persisted SQL buckets with atomic upsert, auth and portal limits; failed-login attempts count and 429 is tested |
| Mass assignment | Pydantic extra=forbid and explicit update fields; injected owner_id rejected |
| Deletion | Password-confirmed account removal, cascaded records and durable blob-deletion queue; queue and actual local file cleanup tested |
| Error leakage | Consistent error envelopes, no input secrets in validation payloads, generic 500 response with request ID, no raw capability headers in access logs |
| Email | Durable outbox, STARTTLS, bounded backoff, no external-delivery claim for local .eml preview; local preview test asserts delivered_at stays null |

## Findings corrected during implementation

- Corrupt PNG checksum raised SyntaxError instead of a validation response. Added
  handling and a regression test; it now returns 415.
- Same-second activity entries could appear in random UUID order. Added a
  transaction-bound sequence with a database unique constraint and migration.
- Streamed bodies could bypass a Content-Length-only cap. Added an actual byte
  counter and a chunked-body regression test.
- Account deletion initially left private files. Added a durable deletion queue
  committed with account removal and a retryable worker.
- Refresh and action-token consumption now checks atomic deletion row counts.
- Financial revisions cannot lower totals below already-recorded payments.
- Initial dependency pins had advisories. Updated multipart, Pillow, pytest and
  pypdf; patched the minimatch development dependency through a tested override.
- Automated accessibility checks found low-contrast secondary text; corrected.

## Remaining deployment limitations

- No external SMTP account, S3 bucket or public TLS domain was supplied. Adapters
  are implemented; external provider delivery, permissions and disaster recovery
  must be validated in the target environment. Never mark these as verified here.
- The holder of a shared link can respond as the customer. There is no independent
  customer identity verification. Share privately and revoke links if disclosed.
- Refresh reuse is rejected; it does not automatically revoke every other session
  belonging to that user. Workers can revoke individual sessions in settings.
- In-flight SMTP deliveries have at-least-once semantics. An interrupted send can
  be retried. Local .eml previews contain recovery credentials and need private
  filesystem permissions and retention limits.
- Private storage and database writes cannot share a distributed transaction.
  A failed upload transaction can leave an inaccessible orphan object; periodically
  reconcile old unreferenced object keys against evidence records. User-visible
  deletion requests use the durable queue and do not rely on such reconciliation.
- Deleting a worker account removes its records, including audit history. This is
  an explicit account-deletion policy, not a claim of immutable third-party escrow.
- No malware scanner, independent penetration test, production load benchmark,
  backup restore drill or human native-speaker translation review was performed.
  Raster decoding/re-encoding and bounded uploads reduce the supported attack surface.
- Security properties depend on correct TLS, private storage, database access,
  trusted proxy configuration, updated dependencies and regular monitoring.

The MVP import is dry-run-first, rejects non-empty targets, validates source evidence
paths, and retires old unbound capabilities without inventing historical agreement
bindings. It preserves the source snapshot. Legacy passwords exceeding bcrypt
limitations require reset instead of silent truncation.

No secrets or real external credentials are included. CI credentials are scoped
only to disposable local test databases. See DEPLOYMENT.md for required variables.

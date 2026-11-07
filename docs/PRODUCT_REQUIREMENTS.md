# KaamProof product requirements

Your Work. Your Proof. A worker owns jobs, versioned agreements, private evidence,
attributed timeline entries and self-reported payment records. A customer receives
a revocable, expiring capability link to review an exact agreement and make one
decision, then acknowledge or dispute a completion submission. The system records
statements; it does not verify identity, work quality, settlement or legal validity.

Required roles: authenticated worker and possession-based customer access. Worker
records must be isolated server-side. Customer responses must reference immutable
agreement versions and a completion submission. Monetary values use Decimal and
explicit currency. Database operations and event recording must commit atomically.

Required surfaces: landing, authentication/reset, dashboard, searchable paginated
jobs, creation/details, agreements, portal, evidence, timeline, payments, customers,
notifications, profile/settings, help, not-found and recoverable error states.
English, Hindi, Tamil and Kannada preferences persist. Dates/currency use Intl.

Acceptance: registration through customer approval, evidence, completion,
acknowledgement, payment and downloadable PDF, plus cross-user denial. Negative
tests cover expired/revoked capabilities, stale/duplicate decisions, invalid state
transitions, invalid image content, CSRF, session expiry/revocation and constraints.
External email/object storage use explicit adapters and configuration; no claimed
delivery without a successful transport response. Production requires TLS, a
private bucket or protected persistent disk, PostgreSQL and reviewed configuration.

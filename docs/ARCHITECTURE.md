# Architecture

Bounded contexts: worker identity, jobs, immutable agreement versions, expiring customer-link access, evidence, job timeline, completion acknowledgement/dispute, and PDF export.

The platform records statements and decisions made by account holders and link holders. It does not independently verify identity, technical quality, materials, or payment settlement. Payment entries are manually reported by workers.

Lifecycle: awaiting_customer -> confirmed -> in_progress -> completion_submitted -> completed. Rejected and disputed are explicit outcomes.

Agreement decisions reference an exact version. Scope changes create a new version. Customer tokens are random, expiring, revocable and stored as hashes.

Before public onboarding add private object storage, file scanning, signed URLs, email/SMS, rate limits, session revocation, observability, retention automation, backups and independent security review.

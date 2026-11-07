# Data model

- users: UUID, name, email, phone, password hash, preferred language
- jobs: UUID, worker UUID, customer name/contact, title, description, category, status
- agreements: UUID, job UUID, version, scope, exclusions, labour/material/total decimal amounts, expiry; unique(job_id, version)
- customer_links: UUID, job UUID, token hash, expiry, revocation time
- approvals: UUID, job UUID, agreement UUID, decision, note, timestamp
- job_events: UUID, job UUID, actor type/id, event type, message, metadata, timestamp
- evidence: UUID, job UUID, uploader, storage key, original name, MIME, size, caption
- completion_decisions: UUID, job UUID, acknowledge/dispute, note, timestamp
- payment_entries: UUID, job UUID, decimal amount, method/reference/note, timestamp

Worker ownership must be enforced on every job read/write. Customer contacts are excluded from customer-facing payloads.

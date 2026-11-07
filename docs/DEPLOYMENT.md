# Deployment

Production topology: Next.js hosting, FastAPI container, managed PostgreSQL with TLS/backups, private S3-compatible evidence bucket, HTTPS reverse proxy/WAF, email/SMS provider.

Set unique DATABASE_URL and cryptographically random JWT_SECRET in the secret manager. Never commit secrets. Restrict CORS to deployed web origin.

Release: build and scan images; provision DB/private storage; run alembic upgrade head; deploy API and web; verify health, registration, agreement approval, evidence, completion and PDF; test backup restore; enable monitoring.

Do not expose local evidence volume publicly. Add private object storage, signed downloads, malware scanning, retention/deletion workflows and file size limits first.

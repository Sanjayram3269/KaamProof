# KaamProof

**Your Work. Your Proof.** Worker-owned agreements, work evidence, customer
acknowledgements and self-reported payment records.

This repository implements a FastAPI/SQLAlchemy backend, a responsive React and
TypeScript frontend, English/Hindi/Tamil/Kannada interfaces, private evidence,
version-bound customer approvals, completion disputes, PDF records and a durable
email outbox. It does not independently verify identity, work quality, payment
settlement or legal validity.

## Start locally

Install Docker Desktop with Linux containers. In PowerShell at the repository root:

```powershell
Copy-Item .env.example .env
# Set POSTGRES_PASSWORD in .env to a unique URL-safe random value.
docker compose up --build -d --wait
```

Open http://localhost:8080 and register. No sample business data or credentials
are seeded. PostgreSQL and private evidence persist in named volumes. Inspect
startup with `docker compose ps` and `docker compose logs`. Stop with
`docker compose down`; this preserves the data volumes.

For Python/Node native development, provider configuration and production ingress,
see [deployment instructions](docs/DEPLOYMENT.md). Production requires HTTPS,
PostgreSQL, private persistent storage and reviewed credentials/configuration.

## Core workflow

1. Register a worker and add a customer.
2. Create a job and issue an agreement with itemized pricing and a validity period.
3. Create and privately share the expiring customer link.
4. The customer approves that exact version, or rejects and requests changes.
5. Start work, upload images and record attributed updates.
6. Submit completion. The customer acknowledges or raises a dispute; disputed
   work can resume and be resubmitted with a new completion number.
7. Record partial or full payments as self-reported records, and download PDFs.

Historical agreement versions remain intact. Stale links cannot approve revisions.
Evidence access requires worker ownership or a valid customer capability. Issued
evidence is preserved; deletion is allowed in draft or through account deletion.

## Verify

Backend, from `apps/api/` after installing `requirements.txt` into a virtualenv:

```text
python -m alembic upgrade head
python -m alembic check
python -m pytest -q
ruff check app tests migrations
```

Frontend, from `apps/web/`:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The default browser tests require the native API on port 8000 and launch Next.js on
localhost:5173. For the Docker stack, set E2E_BASE_URL=http://localhost:8080 instead.
Backend tests migrate an isolated on-disk SQLite database; TEST_DATABASE_URL can
select an empty, disposable PostgreSQL database. Tests erase that database's
application tables. CI executes PostgreSQL tests, builds/starts containers and
runs Chromium against Nginx.

## Documentation

- [Implementation audit](docs/IMPLEMENTATION_AUDIT.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture and state machine](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Data model](docs/DATA_MODEL.md)
- [Existing MVP reconciliation and safe import](docs/MVP_RECONCILIATION.md)
- [Execution roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Executed test report](docs/TEST_REPORT.md)
- [Security audit and limitations](docs/SECURITY_AUDIT.md)
- [Deployment and environment variables](docs/DEPLOYMENT.md)
- [Changelog](docs/CHANGELOG.md)

Interactive API documentation is at `/docs` on the backend (native port 8000).
All application endpoints are under `/api/v1`. In production only the frontend
port is exposed; use the source/OpenAPI definition for internal API documentation.

Local email is a private `.eml` preview, not external delivery. SMTP/S3 and real
production TLS/backup validation require your provider configuration. See the
test report for exactly what was executed and what remains unverified.

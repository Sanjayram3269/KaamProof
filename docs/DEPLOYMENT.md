# Local development and deployment

## Docker (recommended)

Requirements: Docker Engine/Desktop with Linux containers, Compose v2, network
access to download images/packages, and an unused local port 8080.

From the repository root, in PowerShell:

```powershell
Copy-Item .env.example .env
# Edit POSTGRES_PASSWORD in .env to a unique URL-safe value.
docker compose build
docker compose up -d --wait
docker compose ps
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Open http://localhost:8080. Register your own account. No demo accounts or business
records are seeded. PostgreSQL and private evidence persist in named volumes.
`docker compose down` stops the stack and retains records. Do not remove its
volumes unless you intend to destroy the stored records.

Backend startup runs `alembic upgrade head` before serving. Failure stops startup.
For an existing MVP deployment, follow MVP_RECONCILIATION.md: use a separate empty
target and the dry-run import tool. Do not run the new migration history in-place
against the MVP database.
Health checks test PostgreSQL readiness and a proxied API database query. The mail
worker runs once a minute; errors appear in `docker compose logs mail`.

## Native development

Requirements: Python 3.12, Node 22.12 or newer, npm. PowerShell, repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r apps/api/requirements.txt
Set-Location apps/api
..\..\.venv\Scripts\python -m alembic upgrade head
..\..\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second PowerShell terminal, repository root:

```powershell
Set-Location apps/web
npm ci
npm run dev
```

Open http://localhost:5173 (use this exact hostname). Next.js proxies `/api` to port
8000; no cross-origin API configuration is necessary. Native development defaults
to `apps/api/data/kaamproof.db` and private `apps/api/data/evidence`.
Native Python reads environment variables, not `.env` automatically. Compose
reads the root `.env`; set `$env:NAME='value'` before native commands when overriding.

## Email and storage credentials

Without SMTP configuration, password-reset and verification messages are queued.
Run `python -m app.mail` inside backend, or wait for the Compose worker. Local
messages are `.eml` files in DATA_DIR/mail, never marked externally delivered.
For Docker, inspect a local message using `docker compose exec mail sh` and the
private `/app/data/mail` directory. Treat these files as credentials; do not share.

For external delivery configure SMTP_HOST, SMTP_PORT (587), SMTP_USER,
SMTP_PASSWORD and SMTP_FROM. STARTTLS with certificate verification is mandatory.
Run the mail worker continuously or once per minute. Failures retry with exponential
backoff (up to eight attempts). SMTP delivery is at least once; an interrupted
successful send may be delivered again. Investigate exhausted outbox entries; do
not infer delivery from a queued message. Production mail requires SMTP_HOST.

Local private disk works for a single installation. For S3 supply S3_BUCKET,
AWS_DEFAULT_REGION and IAM role credentials or AWS_ACCESS_KEY_ID /
AWS_SECRET_ACCESS_KEY; S3_ENDPOINT_URL is optional for compatible services.
The bucket must block public access. Allow only required object get/put/delete
permissions to the backend role. Objects use random keys and SSE-S3 encryption.
The API streams authorized bytes; it never returns public object URLs or storage
keys. Run `python -m app.cleanup` every minute for durable deletion requests.

## Production configuration

Set ENVIRONMENT=production, APP_ORIGIN to the exact public HTTPS origin, and a
PostgreSQL DATABASE_URL (Compose constructs it from POSTGRES_PASSWORD). Configure
TLS at the ingress, HSTS, encrypted backups and monitoring. Production startup
rejects SQLite and HTTP origins. Cookies become Secure automatically.

Keep backend port 8000 private: the provided command trusts forwarded client IPs
only because Nginx is its only ingress and overwrites incoming forwarding headers.
If placing another trusted TLS proxy ahead of Nginx, configure Nginx real_ip rules
for that proxy's specific CIDR so rate limits see individual client addresses.
Never trust arbitrary Internet forwarding headers or publish backend port 8000.

Back up both PostgreSQL and evidence, coordinate snapshots, test restores, and
restrict access to the data volume (which can include local recovery messages).
Rotate database/SMTP/object storage credentials outside Git. Terminate sessions
when investigating compromise. Configure bucket retention/backups consistently
with account deletion; provider backup retention is a deployment responsibility.
Audit the bucket's public-access block and TLS ingress before real customer data.

Scale on PostgreSQL; SQLite is for local single-process development. Migrations
must run once as a release job before starting multiple backend replicas.
Monitor outbox attempts, deletion queue backlog, health, 409/429/5xx rates, storage
capacity and database backups. Add a managed ingress/WAF for Internet-scale abuse.

## Verification commands

```powershell
Set-Location apps/api
..\..\.venv\Scripts\python -m pytest -q
..\..\.venv\Scripts\ruff check app tests migrations
..\..\.venv\Scripts\python -m alembic upgrade head
..\..\.venv\Scripts\python -m alembic check
Set-Location ../web
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
# With the native API running:
npm run test:e2e
# Or with the Compose stack running:
$env:E2E_BASE_URL='http://localhost:8080'
npm run test:e2e
npm audit
```

Backend tests create and migrate a fresh on-disk SQLite database by default.
To use an empty, dedicated PostgreSQL database, set TEST_DATABASE_URL before
pytest. Tests erase that database's application tables. Never point it at real
records. CI runs PostgreSQL tests plus the browser workflow against Docker/Nginx.

Migration head is b03_activity_order (three revisions). Repeated upgrades are
safe. When adding a migration, run `alembic revision --autogenerate -m "description"`,
review generated SQL, test on a clean database and a backed-up prior schema, and
run `alembic check`. Do not use create_all in application startup.

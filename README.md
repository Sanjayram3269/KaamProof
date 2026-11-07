# KaamProof

**Your Work. Your Proof. Your Identity.**

KaamProof is a mobile-first work-record platform for independent service workers. It records agreed scope, agreement revisions, work evidence, customer acknowledgement and payment notes.

> MVP disclaimer: participant records are not identity verification, escrow, legal advice, or independent certification of work quality.

## Features
- Worker registration and authentication
- Dashboard and job management
- Immutable, versioned work agreements
- Expiring customer review links
- Customer approval/rejection of a specific agreement version
- Job timeline and image evidence
- Completion submission and customer acknowledgement/dispute
- PDF job record export
- English, Hindi, Tamil and Kannada language dictionary
- PostgreSQL, Docker Compose, Alembic migrations and CI

## Stack
- Next.js App Router, TypeScript, Tailwind CSS
- FastAPI, SQLAlchemy 2, Pydantic
- PostgreSQL; SQLite for API tests
- Local evidence storage for development; move to private object storage before public launch

## Run locally
Copy .env.example to .env, change the secrets, then:
```bash
docker compose up --build
```
PowerShell:
```powershell
Copy-Item .env.example .env
docker compose up --build
```
- Web: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Run without Docker
API:
```bash
cd apps/api
python -m venv .venv
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
Web:
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

## Checks
```bash
cd apps/api && pytest && ruff check .
cd apps/web && npm install && npm run lint && npm run typecheck && npm run build
```

## Workflow
Worker creates a job and agreement; customer reviews and accepts/rejects the exact version; worker records progress and evidence; worker submits completion; customer acknowledges or disputes; worker downloads a PDF record.

## Docs
- docs/ARCHITECTURE.md
- docs/API.md
- docs/DATA_MODEL.md
- docs/DEPLOYMENT.md

## Public launch requirements
Change secrets; restrict CORS; use HTTPS, rate limits, managed PostgreSQL and backups; replace local storage with a private object store, signed URLs and malware scanning; configure email/SMS delivery; add abuse prevention; implement privacy, consent, retention, deletion and incident-response processes; complete a security review.

Customer links are bearer credentials: anyone possessing a valid link can access the permitted job summary and submit its decision. They do not verify a customer's civil identity. Acknowledgement is not a legal ruling or work-quality certification. Do not expose customer contact data publicly or report demo usage as real impact.

Agreement changes create new versions; approved versions must not be silently edited. Distinguish self-reported evidence, customer acknowledgement and independent verification. No automated worker score.

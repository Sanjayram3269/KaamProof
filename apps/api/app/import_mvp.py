"""Read-only MVP source -> empty migrated target. Defaults to a rolled-back dry run.

Use an offline source snapshot and its evidence directory. Never run Alembic's
new history against the MVP database. Source records and timestamps are retained;
unbound legacy links are revoked, and legacy bcrypt hashes upgrade on login.
"""

import argparse
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import MetaData, create_engine, func, select

from .db import SessionLocal, engine
from .models import Activity, Agreement, Customer, Evidence, Job, Payment, User, uid
from .storage import clean_image, storage


def epoch(value):
    if value is None:
        return 0
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if isinstance(value, datetime):
        return int(value.replace(tzinfo=value.tzinfo or UTC).timestamp())
    return int(value)


def migrate(source_url, evidence_root=None, apply=False):
    source = create_engine(source_url)
    if source.url == engine.url:
        raise ValueError("Source and target must be different databases")
    metadata = MetaData()
    metadata.reflect(source)
    names = [
        "users",
        "jobs",
        "agreements",
        "approvals",
        "customer_links",
        "job_events",
        "evidence",
        "completion_decisions",
        "payment_entries",
    ]
    if (
        any(name not in metadata.tables for name in names)
        or "password_hash" not in metadata.tables["users"].c
    ):
        raise ValueError("Source is not the supported MVP schema")
    # Snapshot read transaction only. Use a database role with SELECT privileges in production.
    with source.connect() as connection:
        records = {
            name: [
                dict(row) for row in connection.execute(select(metadata.tables[name])).mappings()
            ]
            for name in names
        }
    source.dispose()
    warnings = []
    written = []
    try:
        with SessionLocal() as db:
            if db.scalar(select(func.count()).select_from(User)) or db.scalar(
                select(func.count()).select_from(Job)
            ):
                raise ValueError("Target must be an empty, newly migrated database")
            for u in records["users"]:
                db.add(
                    User(
                        id=u["id"],
                        email=u["email"].lower(),
                        name=u["name"],
                        phone=u["phone"] or "",
                        password=u["password_hash"],
                        language=u["language"],
                        created_at=epoch(u["created_at"]),
                    )
                )
            db.flush()
            status_map = {
                "awaiting_customer": "awaiting_approval",
                "confirmed": "approved",
                "rejected": "awaiting_approval",
                "completion_submitted": "completion_pending",
                "cancelled": "draft",
            }
            for old in records["jobs"]:
                customer_id = str(uuid5(NAMESPACE_URL, "kaamproof:mvp:customer:" + old["id"]))
                db.add(
                    Customer(
                        id=customer_id,
                        owner_id=old["worker_id"],
                        name=old["customer_name"],
                        phone=old["customer_phone"] or "",
                        created_at=epoch(old["created_at"]),
                    )
                )
                db.flush()
                state = status_map.get(old["status"], old["status"])
                job = Job(
                    id=old["id"],
                    owner_id=old["worker_id"],
                    customer_id=customer_id,
                    title=old["title"],
                    description=old["description"],
                    category=old["category"],
                    location=old["location_label"] or "",
                    status=state,
                    archived=old["status"] == "cancelled",
                    created_at=epoch(old["created_at"]),
                )
                db.add(job)
                db.flush()
                agreements = sorted(
                    (a for a in records["agreements"] if a["job_id"] == job.id),
                    key=lambda a: a["version"],
                )
                if not agreements:
                    raise ValueError(
                        "Legacy job has no agreement; reconcile the source snapshot first"
                    )
                for a in agreements:
                    approvals = [p for p in records["approvals"] if p["agreement_id"] == a["id"]]
                    if len(approvals) > 1:
                        raise ValueError(
                            "Legacy agreement has multiple decisions; reconcile before import"
                        )
                    decision = approvals[0] if approvals else None
                    db.add(
                        Agreement(
                            id=a["id"],
                            job_id=job.id,
                            version=a["version"],
                            scope=a["scope"],
                            exclusions=a["exclusions"] or "",
                            labour=a["labour_amount"],
                            materials=a["materials_amount"],
                            other=0,
                            tax=0,
                            total=a["total_amount"],
                            currency=a["currency"],
                            valid_until=epoch(a["valid_until"]),
                            created_at=epoch(a["created_at"]),
                            decision={"approve": "approved", "reject": "rejected"}.get(
                                decision["decision"] if decision else "", "pending"
                            ),
                            decision_notes=(decision["note"] or "") if decision else "",
                            decided_at=epoch(decision["decided_at"]) if decision else None,
                        )
                    )
                db.flush()
                # Old links were unbound. Keep their history in the import event,
                # but never manufacture an agreement binding or a usable capability.
                events = sorted(
                    (e for e in records["job_events"] if e["job_id"] == job.id),
                    key=lambda e: (epoch(e["created_at"]), e["id"]),
                )
                event_map = {
                    "agreement_approve": "customer_approved",
                    "agreement_reject": "customer_rejected",
                    "completion_acknowledge": "customer_acknowledged",
                    "completion_dispute": "dispute_raised",
                    "evidence_added": "evidence_uploaded",
                }
                for sequence, e in enumerate(events):
                    db.add(
                        Activity(
                            id=e["id"],
                            job_id=job.id,
                            sequence=sequence,
                            kind=event_map.get(e["event_type"], e["event_type"]),
                            actor=e["actor_type"],
                            actor_id=e["actor_id"],
                            notes=e["message"],
                            details={"legacy_metadata": e["metadata_json"]},
                            created_at=epoch(e["created_at"]),
                        )
                    )
                submitted = [e for e in events if e["event_type"] == "completion_submitted"]
                decisions = [d for d in records["completion_decisions"] if d["job_id"] == job.id]
                if (
                    submitted
                    or decisions
                    or state in ("completion_pending", "completed", "disputed")
                ):
                    job.completion_number = 1
                    if submitted:
                        job.completion_notes, job.completion_at = (
                            submitted[-1]["message"],
                            epoch(submitted[-1]["created_at"]),
                        )
                    acknowledgements = [d for d in decisions if d["decision"] == "acknowledge"]
                    if state == "completed" and acknowledgements:
                        job.acknowledged_at = epoch(acknowledgements[-1]["decided_at"])
                for p in (p for p in records["payment_entries"] if p["job_id"] == job.id):
                    db.add(
                        Payment(
                            id=p["id"],
                            job_id=job.id,
                            amount=p["amount"],
                            currency=agreements[-1]["currency"],
                            method=p["method"] or "other",
                            reference=p["reference"] or "",
                            paid_at=epoch(p["recorded_at"]),
                            created_at=epoch(p["recorded_at"]),
                            idempotency_key="mvp:" + p["id"],
                        )
                    )
                for e in (e for e in records["evidence"] if e["job_id"] == job.id):
                    if evidence_root is None:
                        raise ValueError(
                            "An evidence root is required for a source containing images"
                        )
                    parts = PurePosixPath(e["storage_key"].replace("\\", "/")).parts
                    if len(parts) < 2 or parts[-2] != job.id or parts[-1] in (".", ".."):
                        raise ValueError("Unsafe legacy evidence path")
                    root = Path(evidence_root).resolve()
                    path = (root / job.id / parts[-1]).resolve()
                    if not path.is_relative_to(root):
                        raise ValueError("Legacy evidence escapes the supplied root")
                    raw = path.read_bytes()
                    cleaned = clean_image(raw)
                    key = uid() + ".jpg"
                    if apply:
                        storage.put(key, cleaned)
                        written.append(key)
                    db.add(
                        Evidence(
                            id=e["id"],
                            job_id=job.id,
                            storage_key=key,
                            caption=e["caption"] or "",
                            digest=hashlib.sha256(cleaned).hexdigest(),
                            size=len(cleaned),
                            created_at=epoch(e["created_at"]),
                        )
                    )
                db.add(
                    Activity(
                        job_id=job.id,
                        sequence=len(events),
                        kind="mvp_imported",
                        actor="system",
                        notes="Imported MVP snapshot. Legacy links revoked; unspecified validity is expired.",
                        details={
                            "source_status": old["status"],
                            "legacy_links_not_transferred": [
                                {
                                    "id": link["id"],
                                    "created_at": str(link["created_at"]),
                                    "expires_at": str(link["expires_at"]),
                                    "agreement_binding": None,
                                }
                                for link in records["customer_links"]
                                if link["job_id"] == job.id
                            ],
                            "source_updated_at": str(old["updated_at"]),
                            "source_approvals": [
                                json.loads(json.dumps(p, default=str))
                                for p in records["approvals"]
                                if p["job_id"] == job.id
                            ],
                            "source_completion_decisions": [
                                json.loads(json.dumps(d, default=str)) for d in decisions
                            ],
                            "source_payment_notes": {
                                p["id"]: p["note"]
                                for p in records["payment_entries"]
                                if p["job_id"] == job.id
                            },
                        },
                    )
                )
                job.revision = len(events) + 1
            db.flush()
            warnings.append(
                "Legacy links are revoked. Issue new links; revise agreements with unspecified validity."
            )
            if apply:
                db.commit()
            else:
                db.rollback()
    except Exception:
        for key in written:
            storage.delete(key)
        raise
    return {
        "applied": apply,
        "counts": {name: len(rows) for name, rows in records.items()},
        "warnings": warnings,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-root", type=Path)
    parser.add_argument("--apply", action="store_true", help="Commit import; default is dry-run")
    args = parser.parse_args()
    if not os.getenv("MVP_DATABASE_URL"):
        parser.error("Set MVP_DATABASE_URL to the offline source snapshot URL")
    print(
        json.dumps(
            migrate(os.environ["MVP_DATABASE_URL"], args.evidence_root, args.apply), indent=2
        )
    )

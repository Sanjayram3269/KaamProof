from decimal import Decimal

from sqlalchemy import select, update

from .models import Activity, Agreement, Customer, Job, Notification, Outbox, Payment, User
from .security import fail


def serialize(row, exclude=()):
    return {
        c.name: str(getattr(row, c.name))
        if isinstance(getattr(row, c.name), Decimal)
        else getattr(row, c.name)
        for c in row.__table__.columns
        if c.name not in exclude
    }


def public_user(user):
    return serialize(user, ("password",))


def own_job(db, job_id, user, write=False):
    job = db.scalar(select(Job).where(Job.id == job_id, Job.owner_id == user.id))
    if not job:
        fail(404, "Job not found")
    if write:
        lock_job(db, job)
    return job


def lock_job(db, job):
    revision = job.revision
    result = db.execute(
        update(Job).where(Job.id == job.id, Job.revision == revision).values(revision=revision + 1),
        execution_options={"synchronize_session": False},
    )
    if result.rowcount != 1:
        fail(409, "Record changed. Reload and try again.")
    db.refresh(job)


def latest_agreement(db, job):
    return db.scalar(
        select(Agreement)
        .where(Agreement.job_id == job.id)
        .order_by(Agreement.version.desc())
        .limit(1)
    )


def event(db, job, kind, actor="worker", actor_id=None, notes="", details=None):
    row = Activity(
        job_id=job.id,
        kind=kind,
        actor=actor,
        actor_id=actor_id,
        notes=notes,
        details=details or {},
        sequence=job.revision,
    )
    db.add(row)
    if actor == "customer":
        message = kind.replace("_", " ").capitalize() + ": " + job.title
        db.add(Notification(user_id=job.owner_id, job_id=job.id, message=message))
        user = db.get(User, job.owner_id)
        if user.email_notifications and user.verified:
            db.add(
                Outbox(
                    user_id=user.id, recipient=user.email, subject="KaamProof update", body=message
                )
            )
    return row


def transition(db, job, target, notes="", actor="worker", actor_id=None):
    allowed = {
        "approved": {"in_progress"},
        "in_progress": {"completion_pending"},
        "completion_pending": {"completed", "disputed"},
        "disputed": {"in_progress"},
    }
    if target not in allowed.get(job.status, set()):
        fail(409, "Invalid job status transition")
    job.status = target
    kinds = {
        "in_progress": "work_started",
        "completion_pending": "completion_submitted",
        "completed": "customer_acknowledged",
        "disputed": "dispute_raised",
    }
    event(
        db, job, kinds[target], actor, actor_id, notes, {"completion_number": job.completion_number}
    )


def financials(db, job):
    agreement = latest_agreement(db, job)
    payments = db.scalars(
        select(Payment).where(Payment.job_id == job.id).order_by(Payment.paid_at)
    ).all()
    total = agreement.total if agreement else Decimal("0.00")
    paid = sum((p.amount for p in payments), Decimal("0.00"))
    return {
        "agreed": str(total),
        "recorded": str(paid),
        "outstanding": str(total - paid),
        "currency": agreement.currency if agreement else "INR",
        "self_reported": True,
        "entries": [serialize(p) for p in payments],
    }


def job_summary(db, job):
    result = serialize(job)
    customer = db.get(Customer, job.customer_id)
    result["customer_name"] = customer.name
    agreement = latest_agreement(db, job)
    result["agreement"] = serialize(agreement) if agreement else None
    return result

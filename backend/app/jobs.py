import hashlib
import secrets
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy import func, select

from .config import MAX_IMAGE_BYTES
from .db import database
from .models import (
    Activity,
    Agreement,
    Customer,
    Evidence,
    Job,
    Notification,
    Payment,
    ShareLink,
    now,
    uid,
)
from .schemas import (
    AgreementInput,
    CustomerInput,
    JobEdit,
    JobInput,
    LinkInput,
    Notes,
    PaymentInput,
)
from .security import authenticated, digest, fail
from .services import (
    event,
    financials,
    job_summary,
    latest_agreement,
    own_job,
    serialize,
    transition,
)
from .storage import clean_image, storage

router = APIRouter(prefix="/api/v1", tags=["worker"])


@router.get("/customers")
def customers(
    user=Depends(authenticated, scope="function"), db=Depends(database, scope="function")
):
    return [
        serialize(c)
        for c in db.scalars(
            select(Customer)
            .where(Customer.owner_id == user.id)
            .order_by(Customer.created_at.desc())
        ).all()
    ]


@router.post("/customers", status_code=201)
def create_customer(
    data: CustomerInput,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    customer = Customer(owner_id=user.id, **data.model_dump())
    db.add(customer)
    db.flush()
    return serialize(customer)


@router.get("/dashboard")
def dashboard(
    user=Depends(authenticated, scope="function"), db=Depends(database, scope="function")
):
    distribution = dict(
        db.execute(
            select(Job.status, func.count(Job.id))
            .where(Job.owner_id == user.id, Job.archived.is_(False))
            .group_by(Job.status)
        ).all()
    )
    recent = db.scalars(
        select(Job)
        .where(Job.owner_id == user.id, Job.archived.is_(False))
        .order_by(Job.created_at.desc(), Job.id)
        .limit(5)
    ).all()
    activities = db.scalars(
        select(Activity)
        .join(Job)
        .where(Job.owner_id == user.id)
        .order_by(Activity.created_at.desc(), Activity.sequence.desc(), Activity.id)
        .limit(8)
    ).all()
    amounts = db.execute(
        select(Payment.currency, func.sum(Payment.amount))
        .join(Job)
        .where(Job.owner_id == user.id)
        .group_by(Payment.currency)
    ).all()
    return {
        "total": sum(distribution.values()),
        "distribution": distribution,
        "recorded_payments": {currency: str(amount) for currency, amount in amounts},
        "recent_jobs": [job_summary(db, j) for j in recent],
        "activities": [serialize(a) for a in activities],
        "recent_customers": customers(user, db)[:5],
    }


@router.get("/jobs")
def list_jobs(
    q: str = Query("", max_length=180),
    status: str = "",
    category: str = "",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    sort: str = "newest",
    archived: bool = False,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    filters = [Job.owner_id == user.id, Job.archived == archived]
    if q:
        filters.append(Job.title.ilike(f"%{q}%", escape="\\"))
    if status:
        filters.append(Job.status == status)
    if category:
        filters.append(Job.category == category)
    total = db.scalar(select(func.count()).select_from(Job).where(*filters))
    rows = db.scalars(
        select(Job)
        .where(*filters)
        .order_by(Job.created_at.asc() if sort == "oldest" else Job.created_at.desc(), Job.id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return {"items": [job_summary(db, j) for j in rows], "total": total, "page": page, "size": size}


@router.post("/jobs", status_code=201)
def create_job(
    data: JobInput,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    customer = db.get(Customer, data.customer_id)
    if not customer or customer.owner_id != user.id:
        fail(404, "Customer not found")
    job = Job(owner_id=user.id, **data.model_dump())
    db.add(job)
    db.flush()
    event(db, job, "job_created", actor_id=user.id)
    return job_summary(db, job)


@router.get("/jobs/{job_id}")
def detail(
    job_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user)
    result = job_summary(db, job)
    result["customer"] = serialize(db.get(Customer, job.customer_id))
    result["agreements"] = [
        serialize(a)
        for a in db.scalars(
            select(Agreement).where(Agreement.job_id == job.id).order_by(Agreement.version.desc())
        ).all()
    ]
    result["timeline"] = [
        serialize(a)
        for a in db.scalars(
            select(Activity)
            .where(Activity.job_id == job.id)
            .order_by(Activity.sequence, Activity.id)
        ).all()
    ]
    result["evidence"] = [
        serialize(e, ("storage_key",))
        for e in db.scalars(
            select(Evidence).where(Evidence.job_id == job.id, Evidence.deleted.is_(False))
        ).all()
    ]
    result["payments"] = financials(db, job)
    result["links"] = [
        serialize(link, ("token_hash",))
        for link in db.scalars(
            select(ShareLink)
            .where(ShareLink.job_id == job.id)
            .order_by(ShareLink.created_at.desc())
        ).all()
    ]
    return result


@router.put("/jobs/{job_id}")
def edit_job(
    job_id: str,
    data: JobEdit,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    if job.status != "draft":
        fail(409, "Issued job details are preserved. Record an update or revise the agreement.")
    for field, value in data.model_dump().items():
        setattr(job, field, value)
    event(db, job, "job_edited", actor_id=user.id)
    return job_summary(db, job)


@router.post("/jobs/{job_id}/archive")
def archive(
    job_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    job.archived = not job.archived
    event(db, job, "job_archived" if job.archived else "job_restored", actor_id=user.id)
    return {"archived": job.archived}


@router.post("/jobs/{job_id}/agreements", status_code=201)
def agreement(
    job_id: str,
    data: AgreementInput,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    if job.status not in ("draft", "awaiting_approval", "approved"):
        fail(409, "Revise agreements before work starts")
    if not now() < data.valid_until <= now() + 366 * 86400:
        fail(422, "Validity must be within the next year")
    previous = latest_agreement(db, job)
    if previous and data.currency != previous.currency:
        fail(409, "Agreement currency cannot change")
    total = data.labour + data.materials + data.other + data.tax
    if total < Decimal(financials(db, job)["recorded"]):
        fail(422, "Agreement total cannot be lower than payments already recorded")
    row = Agreement(
        job_id=job.id,
        version=previous.version + 1 if previous else 1,
        total=total,
        **data.model_dump(),
    )
    db.add(row)
    db.flush()
    job.status = "awaiting_approval"
    event(
        db,
        job,
        "agreement_revised" if previous else "agreement_created",
        actor_id=user.id,
        details={"agreement_id": row.id, "version": row.version},
    )
    return serialize(row)


@router.post("/jobs/{job_id}/links", status_code=201)
def share(
    job_id: str,
    data: LinkInput,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    agreement = latest_agreement(db, job)
    if not agreement:
        fail(409, "Create an agreement first")
    raw = secrets.token_urlsafe(32)
    row = ShareLink(
        job_id=job.id,
        agreement_id=agreement.id,
        token_hash=digest(raw),
        expires_at=now() + data.days * 86400,
    )
    db.add(row)
    db.flush()
    event(
        db,
        job,
        "customer_link_created",
        actor_id=user.id,
        details={"link_id": row.id, "version": agreement.version},
    )
    return {"id": row.id, "token": raw, "expires_at": row.expires_at}


@router.delete("/jobs/{job_id}/links/{link_id}")
def revoke_link(
    job_id: str,
    link_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    link = db.get(ShareLink, link_id)
    if not link or link.job_id != job.id:
        fail(404, "Link not found")
    link.revoked = True
    event(db, job, "customer_link_revoked", actor_id=user.id, details={"link_id": link.id})
    return {"message": "Link revoked"}


@router.post("/jobs/{job_id}/start")
def start(
    job_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    transition(db, job, "in_progress", actor_id=user.id)
    return job_summary(db, job)


@router.post("/jobs/{job_id}/updates", status_code=201)
def work_update(
    job_id: str,
    data: Notes,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    row = event(db, job, "work_updated", actor_id=user.id, notes=data.notes)
    db.flush()
    return serialize(row)


@router.post("/jobs/{job_id}/completion")
def complete(
    job_id: str,
    data: Notes,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    if job.status != "in_progress":
        fail(409, "Work must be in progress")
    job.completion_number += 1
    job.completion_notes, job.completion_at = data.notes, now()
    transition(db, job, "completion_pending", data.notes, actor_id=user.id)
    return job_summary(db, job)


@router.post("/jobs/{job_id}/evidence", status_code=201)
def upload(
    job_id: str,
    file: UploadFile = File(),
    caption: str = Form(""),
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    if len(caption) > 500:
        fail(422, "Caption is too long")
    raw = file.file.read(MAX_IMAGE_BYTES + 1)
    cleaned = clean_image(raw)
    key = uid() + ".jpg"
    storage.put(key, cleaned)
    row = Evidence(
        job_id=job.id,
        storage_key=key,
        caption=caption,
        digest=hashlib.sha256(cleaned).hexdigest(),
        size=len(cleaned),
    )
    db.add(row)
    db.flush()
    event(
        db,
        job,
        "evidence_uploaded",
        actor_id=user.id,
        notes=caption,
        details={"evidence_id": row.id, "sha256": row.digest},
    )
    return serialize(row, ("storage_key",))


@router.get("/jobs/{job_id}/evidence/{evidence_id}")
def download(
    job_id: str,
    evidence_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    own_job(db, job_id, user)
    row = db.get(Evidence, evidence_id)
    if not row or row.job_id != job_id or row.deleted:
        fail(404, "Evidence not found")
    return Response(
        storage.get(row.storage_key),
        media_type="image/jpeg",
        headers={"Content-Disposition": f'inline; filename="{row.id}.jpg"'},
    )


@router.delete("/jobs/{job_id}/evidence/{evidence_id}")
def remove_evidence(
    job_id: str,
    evidence_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    if job.status != "draft":
        fail(409, "Evidence is preserved after an agreement is issued")
    row = db.get(Evidence, evidence_id)
    if not row or row.job_id != job.id or row.deleted:
        fail(404, "Evidence not found")
    row.deleted = True
    from .models import BlobDeletion

    db.add(BlobDeletion(storage_key=row.storage_key))
    event(db, job, "evidence_removed", actor_id=user.id, details={"evidence_id": row.id})
    return {"message": "Evidence removed from the record"}


@router.post("/jobs/{job_id}/payments", status_code=201)
def payment(
    job_id: str,
    data: PaymentInput,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    job = own_job(db, job_id, user, True)
    agreement = latest_agreement(db, job)
    if not agreement or agreement.decision != "approved":
        fail(409, "Record payments against an approved agreement")
    if data.paid_at > now() + 60 or data.paid_at < job.created_at - 366 * 86400:
        fail(422, "Invalid payment date")
    duplicate = db.scalar(
        select(Payment).where(
            Payment.job_id == job.id, Payment.idempotency_key == data.idempotency_key
        )
    )
    if duplicate:
        fail(409, "This payment was already recorded")
    if data.reference and db.scalar(
        select(Payment).where(Payment.job_id == job.id, Payment.reference == data.reference)
    ):
        fail(409, "This payment reference was already recorded")
    balance = Decimal(financials(db, job)["outstanding"])
    if data.amount > balance:
        fail(422, "Amount exceeds outstanding balance")
    row = Payment(job_id=job.id, currency=agreement.currency, **data.model_dump())
    db.add(row)
    db.flush()
    event(
        db,
        job,
        "payment_recorded",
        actor_id=user.id,
        details={"payment_id": row.id, "amount": str(row.amount), "self_reported": True},
    )
    return serialize(row)


@router.get("/notifications")
def notifications(
    user=Depends(authenticated, scope="function"), db=Depends(database, scope="function")
):
    return [
        serialize(n)
        for n in db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        ).all()
    ]


@router.post("/notifications/{notification_id}/read")
def read_notification(
    notification_id: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    row = db.get(Notification, notification_id)
    if not row or row.user_id != user.id:
        fail(404, "Notification not found")
    row.read = True
    return serialize(row)


@router.get("/jobs/{job_id}/documents/{kind}")
def document(
    job_id: str,
    kind: str,
    user=Depends(authenticated, scope="function"),
    db=Depends(database, scope="function"),
):
    own_job(db, job_id, user)
    if kind not in (
        "record",
        "agreement",
        "work-summary",
        "evidence-index",
        "completion",
        "payments",
    ):
        fail(404, "Document type not found")
    from .documents import make_pdf

    data = detail(job_id, user, db)
    return Response(
        make_pdf(data, kind),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="kaamproof-{kind}.pdf"'},
    )

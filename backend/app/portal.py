from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select

from .db import database
from .models import Activity, Agreement, Evidence, Job, ShareLink, now
from .schemas import CompletionDecision, Decision, Notes
from .security import digest, fail, throttle
from .services import event, latest_agreement, lock_job, serialize, transition
from .storage import storage

router = APIRouter(prefix="/api/v1/portal", tags=["customer"])


def capability(request: Request, db=Depends(database)):
    throttle("portal:" + (request.client.host if request.client else "unknown"), 120)
    raw = request.headers.get("x-customer-token", "")
    if not 30 <= len(raw) <= 100:
        fail(404, "This link is invalid, expired or revoked")
    link = db.scalar(select(ShareLink).where(ShareLink.token_hash == digest(raw)))
    if not link or link.revoked or link.expires_at <= now():
        fail(404, "This link is invalid, expired or revoked")
    job = db.get(Job, link.job_id)
    if request.method != "GET":
        lock_job(db, job)
        db.refresh(link)
        if link.revoked or link.expires_at <= now():
            fail(404, "This link is invalid, expired or revoked")
    return job, link


@router.get("")
def view(context=Depends(capability), db=Depends(database)):
    job, link = context
    agreement = db.get(Agreement, link.agreement_id)
    current = latest_agreement(db, job)
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "status": job.status,
        "agreement": serialize(agreement),
        "is_current": current.id == agreement.id,
        "completion_notes": job.completion_notes,
        "completion_number": job.completion_number,
        "completion_at": job.completion_at,
        "acknowledged_at": job.acknowledged_at,
        "evidence": [
            serialize(e, ("storage_key", "job_id"))
            for e in db.scalars(
                select(Evidence).where(Evidence.job_id == job.id, Evidence.deleted.is_(False))
            ).all()
        ],
        "timeline": [
            serialize(a, ("actor_id", "details"))
            for a in db.scalars(
                select(Activity)
                .where(Activity.job_id == job.id)
                .order_by(Activity.sequence, Activity.id)
            ).all()
        ],
    }


@router.post("/decision")
def decide(data: Decision, context=Depends(capability), db=Depends(database)):
    job, link = context
    agreement = latest_agreement(db, job)
    if (
        agreement.id != link.agreement_id
        or agreement.id != data.agreement_id
        or job.status != "awaiting_approval"
        or agreement.decision != "pending"
    ):
        fail(409, "This agreement has changed or already has a decision. Ask for the latest link.")
    if agreement.valid_until <= now():
        fail(410, "Agreement validity has expired")
    agreement.decision = data.decision
    agreement.decision_notes, agreement.decided_at = data.notes, now()
    if data.decision == "approved":
        job.status = "approved"
    event(
        db,
        job,
        "customer_approved" if data.decision == "approved" else "customer_rejected",
        "customer",
        link.id,
        data.notes,
        {"agreement_id": agreement.id, "version": agreement.version},
    )
    return {"message": "Decision recorded"}


@router.post("/comments", status_code=201)
def comment(data: Notes, context=Depends(capability), db=Depends(database)):
    job, link = context
    row = event(db, job, "customer_comment", "customer", link.id, data.notes)
    db.flush()
    return serialize(row, ("actor_id",))


@router.post("/completion")
def completion(data: CompletionDecision, context=Depends(capability), db=Depends(database)):
    job, link = context
    agreement = latest_agreement(db, job)
    if (
        link.agreement_id != agreement.id
        or agreement.decision != "approved"
        or job.completion_number != data.completion_number
    ):
        fail(409, "The record changed. Ask for the latest link.")
    if data.decision == "disputed" and not data.notes:
        fail(422, "Please describe the completion concern")
    transition(
        db,
        job,
        "completed" if data.decision == "acknowledged" else "disputed",
        data.notes,
        "customer",
        link.id,
    )
    if data.decision == "acknowledged":
        job.acknowledged_at = now()
    return {"message": "Completion response recorded"}


@router.get("/evidence/{evidence_id}")
def evidence(evidence_id: str, context=Depends(capability), db=Depends(database)):
    job, link = context
    row = db.get(Evidence, evidence_id)
    if not row or row.job_id != job.id or row.deleted:
        fail(404, "Evidence not found")
    return Response(storage.get(row.storage_key), media_type="image/jpeg")

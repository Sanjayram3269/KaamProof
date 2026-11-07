import base64
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import select

from app.db import SessionLocal
from app.models import BlobDeletion, Evidence, now
from conftest import Client
from test_workflows import agreement, customer_call, image, share


def test_corrupt_png_checksum_returns_validation_error(worker, job):
    corrupt = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII="
    )
    result = worker.request(
        "POST",
        "/jobs/" + job["id"] + "/evidence",
        files={"file": ("corrupt.png", corrupt, "image/png")},
    )
    assert result.status_code == 415


def test_concurrent_decisions_have_one_winner(worker, job):
    a = agreement(worker, job)
    link = share(worker, job)
    payload = {"agreement_id": a["id"], "decision": "approved"}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: customer_call(link, "POST", "/decision", payload).status_code, range(2)
            )
        )
    assert sorted(results) == [200, 409]


def test_database_foreign_key_enforcement(worker):
    from sqlalchemy.exc import IntegrityError
    from app.models import Job
    import pytest

    with pytest.raises(IntegrityError), SessionLocal.begin() as db:
        db.add(Job(owner_id="absent", customer_id="absent", title="Invalid"))


def test_account_deletion_queues_private_blobs(worker, job):
    result = worker.request(
        "POST",
        "/jobs/" + job["id"] + "/evidence",
        files={"file": ("proof.png", image(), "image/png")},
    )
    with SessionLocal() as db:
        key = db.get(Evidence, result.json()["id"]).storage_key
    assert (
        worker.request(
            "DELETE", "/auth/account", json={"password": "strong-password-123"}
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        assert db.get(BlobDeletion, key)
    from app.cleanup import cleanup

    cleanup()
    with SessionLocal() as db:
        assert db.get(BlobDeletion, key) is None


def test_link_revocation_and_customer_comments(worker, job):
    agreement(worker, job)
    link = share(worker, job)
    result = customer_call(link, "POST", "/comments", {"notes": "<img src=x onerror=alert(1)>"})
    assert result.status_code == 201
    assert "actor_id" not in result.json()
    assert worker.request("DELETE", f"/jobs/{job['id']}/links/{link['id']}").status_code == 200
    assert customer_call(link).status_code == 404


def test_reset_expiry_and_refresh_expiry(worker):
    from app.models import ActionToken, AuthSession

    worker.post("/auth/forgot-password", {"email": "worker@example.com"})
    with SessionLocal.begin() as db:
        db.scalar(select(ActionToken)).expires_at = now() - 1
        db.scalar(select(AuthSession)).refresh_expires_at = now() - 1
    assert worker.post("/auth/refresh").status_code == 401
    anonymous = Client()
    assert (
        anonymous.post(
            "/auth/reset-password", {"token": "x" * 43, "password": "another-password"}
        ).status_code
        == 400
    )


def test_streamed_body_size_is_bounded(worker):
    def chunks():
        for _ in range(10):
            yield b"x" * (1024 * 1024)

    response = worker.request(
        "POST", "/customers", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413


def test_language_preference_and_financial_revision_invariants(worker, job):
    from test_workflows import approve

    profile = worker.get("/auth/me").json()
    response = worker.request(
        "PUT",
        "/auth/profile",
        json={
            "name": profile["name"],
            "language": "ta",
            "phone": "+919999999999",
            "email_notifications": True,
        },
    )
    assert response.status_code == 200 and worker.get("/auth/me").json()["language"] == "ta"
    approve(worker, job)
    base = "/jobs/" + job["id"]
    assert (
        worker.post(
            base + "/payments",
            {
                "amount": "1000",
                "method": "cash",
                "paid_at": now(),
                "idempotency_key": "revision-payment-key",
            },
        ).status_code
        == 201
    )
    assert (
        worker.post(
            base + "/agreements",
            {
                "scope": "Revised",
                "labour": "100",
                "materials": "0",
                "other": "0",
                "tax": "0",
                "valid_until": now() + 86400,
            },
        ).status_code
        == 422
    )
    history = worker.get(base).json()["timeline"]
    assert [a["sequence"] for a in history] == sorted(a["sequence"] for a in history)


def test_local_mail_preview_does_not_claim_delivery(worker, monkeypatch):
    from app.mail import deliver
    from app.models import Outbox

    monkeypatch.delenv("SMTP_HOST", raising=False)
    worker.post("/auth/forgot-password", {"email": "worker@example.com"})
    deliver()
    with SessionLocal() as db:
        message = db.scalar(select(Outbox))
        assert message.attempts == 1 and message.delivered_at is None

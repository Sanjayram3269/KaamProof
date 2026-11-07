import io
import secrets

import pytest
from PIL import Image
from pypdf import PdfReader
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.models import (
    Activity,
    Agreement,
    AuthSession,
    Evidence,
    Job,
    Payment,
    ShareLink,
    User,
    now,
)
from conftest import Client


def agreement(worker, job, **overrides):
    data = {
        "scope": "Repair cabinets",
        "labour": "1000.00",
        "materials": "500.00",
        "other": "0",
        "tax": "0",
        "valid_until": now() + 86400,
        **overrides,
    }
    result = worker.post(f"/jobs/{job['id']}/agreements", data)
    assert result.status_code == 201, result.text
    return result.json()


def share(worker, job):
    result = worker.post(f"/jobs/{job['id']}/links", {"days": 7})
    assert result.status_code == 201, result.text
    return result.json()


def customer_call(link, method="GET", path="", data=None):
    return Client().request(
        method, "/portal" + path, json=data, headers={"X-Customer-Token": link["token"]}
    )


def approve(worker, job):
    a = agreement(worker, job)
    link = share(worker, job)
    result = customer_call(
        link, "POST", "/decision", {"agreement_id": a["id"], "decision": "approved"}
    )
    assert result.status_code == 200, result.text
    return a, link


def image():
    output = io.BytesIO()
    Image.new("RGB", (40, 40), "green").save(output, "PNG")
    return output.getvalue()


def test_full_workflow(worker, job, tmp_path):
    a, link = approve(worker, job)
    base = f"/jobs/{job['id']}"
    assert worker.post(base + "/start").status_code == 200
    upload = worker.request(
        "POST",
        base + "/evidence",
        files={"file": ("proof.png", image(), "image/png")},
        data={"caption": "Cabinets repaired"},
    )
    assert upload.status_code == 201, upload.text
    evidence = upload.json()
    assert "storage_key" not in evidence
    assert worker.get(base + "/evidence/" + evidence["id"]).status_code == 200
    assert customer_call(link, path="/evidence/" + evidence["id"]).status_code == 200
    assert worker.post(base + "/updates", {"notes": "All fittings replaced"}).status_code == 201
    assert worker.post(base + "/completion", {"notes": "Finished and cleaned"}).status_code == 200
    assert (
        customer_call(
            link, "POST", "/completion", {"decision": "acknowledged", "completion_number": 1}
        ).status_code
        == 200
    )
    assert (
        worker.post(
            base + "/payments",
            {
                "amount": "1000",
                "method": "upi",
                "reference": "PAY-1",
                "paid_at": now(),
                "idempotency_key": "payment-key-one",
            },
        ).status_code
        == 201
    )
    assert (
        worker.post(
            base + "/payments",
            {
                "amount": "500",
                "method": "cash",
                "paid_at": now(),
                "idempotency_key": "payment-key-two",
            },
        ).status_code
        == 201
    )
    data = worker.get(base).json()
    assert data["status"] == "completed"
    assert data["payments"]["outstanding"] == "0.00"
    pdf = worker.get(base + "/documents/record")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    extracted = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf.content)).pages)
    assert "Agreement version 1" in extracted and "Self-reported" in extracted
    assert "Finished and cleaned" in extracted
    (tmp_path / "workflow.pdf").write_bytes(pdf.content)
    with SessionLocal() as db:
        assert db.get(Job, job["id"]).status == "completed"
        assert db.get(Agreement, a["id"]).decision == "approved"
        assert db.scalar(select(func.count()).select_from(Payment)) == 2
        assert db.scalar(select(func.count()).select_from(Evidence)) == 1
        kinds = set(db.scalars(select(Activity.kind)).all())
        assert {
            "job_created",
            "customer_approved",
            "work_started",
            "evidence_uploaded",
            "work_updated",
            "completion_submitted",
            "customer_acknowledged",
            "payment_recorded",
        } <= kinds
    other = Client()
    other.register("other@example.com")
    assert other.get(base).status_code == 404
    assert other.get(base + "/documents/record").status_code == 404


def test_registration_login_and_logout(worker):
    assert worker.get("/auth/me").status_code == 200
    assert (
        worker.post(
            "/auth/register",
            {"name": "Duplicate", "email": "WORKER@example.com", "password": "strong-password-123"},
        ).status_code
        == 409
    )
    cookies = worker.raw.cookies
    assert next(c for c in cookies.jar if c.name == "kp_session").has_nonstandard_attr("HttpOnly")
    assert worker.post("/auth/logout").status_code == 200
    assert worker.get("/auth/me").status_code == 401
    assert (
        worker.post(
            "/auth/login", {"email": "worker@example.com", "password": "wrong-password"}
        ).status_code
        == 401
    )
    assert (
        worker.post(
            "/auth/login", {"email": "worker@example.com", "password": "strong-password-123"}
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        assert db.scalar(select(User)).password.startswith("$argon2id$")


def test_session_expiry_rotation_replay_and_revocation(worker):
    old = worker.raw.cookies.get("kp_refresh")
    with SessionLocal.begin() as db:
        db.scalar(select(AuthSession)).expires_at = now() - 1
    assert worker.get("/auth/me").status_code == 401
    assert worker.post("/auth/refresh").status_code == 200
    assert worker.get("/auth/me").status_code == 200
    replay = Client()
    replay.raw.cookies.set("kp_refresh", old)
    assert replay.post("/auth/refresh").status_code == 401
    session = worker.get("/auth/sessions").json()[0]
    assert "token_hash" not in session
    assert worker.request("DELETE", "/auth/sessions/" + session["id"]).status_code == 200
    assert worker.get("/auth/me").status_code == 401


def test_csrf_origin_and_mass_assignment(worker):
    assert (
        worker.post("/customers", {"name": "bad"}, headers={"X-CSRF-Token": "bad"}).status_code
        == 403
    )
    assert (
        worker.post(
            "/customers", {"name": "bad"}, headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    assert worker.post("/customers", {"name": "bad", "owner_id": "injected"}).status_code == 422
    assert Client().get("/jobs").status_code == 401


def test_job_edit_search_archive_and_customer_ownership(worker, job):
    base = "/jobs/" + job["id"]
    edit = {
        "title": "Updated kitchen",
        "description": "Details",
        "location": "Mysuru",
        "category": "Carpentry",
    }
    assert worker.request("PUT", base, json=edit).status_code == 200
    assert worker.get("/jobs?q=kitchen&category=Carpentry").json()["total"] == 1
    assert worker.get("/jobs?q=' OR 1=1 --").json()["total"] == 0
    assert worker.get("/jobs?page=0").status_code == 422
    assert worker.post(base + "/archive").json()["archived"]
    assert worker.get("/jobs").json()["total"] == 0
    assert worker.get("/jobs?archived=true").json()["total"] == 1
    other = Client()
    other.register("isolation@example.com")
    assert (
        other.post("/jobs", {"title": "Stolen", "customer_id": job["customer_id"]}).status_code
        == 404
    )
    for suffix in ("/start", "/archive", "/completion", "/links"):
        assert other.post(
            base + suffix, {"notes": "test"} if suffix == "/completion" else {}
        ).status_code in (404, 422)


def test_agreement_version_stale_replay_and_rejection(worker, job):
    a1 = agreement(worker, job)
    old = share(worker, job)
    a2 = agreement(worker, job, scope="Revised scope")
    assert a2["version"] == 2
    assert not customer_call(old).json()["is_current"]
    assert (
        customer_call(
            old, "POST", "/decision", {"agreement_id": a1["id"], "decision": "approved"}
        ).status_code
        == 409
    )
    new = share(worker, job)
    assert (
        customer_call(
            new,
            "POST",
            "/decision",
            {"agreement_id": a2["id"], "decision": "rejected", "notes": "Please revise"},
        ).status_code
        == 200
    )
    assert (
        customer_call(
            new, "POST", "/decision", {"agreement_id": a2["id"], "decision": "approved"}
        ).status_code
        == 409
    )
    a3 = agreement(worker, job)
    latest = share(worker, job)
    assert (
        customer_call(
            latest, "POST", "/decision", {"agreement_id": a3["id"], "decision": "approved"}
        ).status_code
        == 200
    )
    detail = worker.get("/jobs/" + job["id"]).json()
    assert len(detail["agreements"]) == 3 and detail["agreements"][-1]["scope"] == a1["scope"]


@pytest.mark.parametrize("mode", ["expired", "revoked", "invalid", "agreement_expired"])
def test_invalid_customer_links(worker, job, mode):
    a = agreement(worker, job)
    link = share(worker, job)
    with SessionLocal.begin() as db:
        row = db.get(ShareLink, link["id"])
        assert row.token_hash != link["token"] and len(row.token_hash) == 64
        if mode == "expired":
            row.expires_at = now() - 1
        if mode == "revoked":
            row.revoked = True
        if mode == "agreement_expired":
            db.get(Agreement, a["id"]).valid_until = now() - 1
    if mode == "invalid":
        link["token"] = secrets.token_urlsafe(32)
    result = customer_call(
        link, "POST", "/decision", {"agreement_id": a["id"], "decision": "approved"}
    )
    assert result.status_code == (410 if mode == "agreement_expired" else 404)


def test_completion_dispute_and_resubmission(worker, job):
    _, link = approve(worker, job)
    base = "/jobs/" + job["id"]
    assert worker.post(base + "/completion", {"notes": "Too soon"}).status_code == 409
    assert worker.post(base + "/start").status_code == 200
    assert worker.post(base + "/start").status_code == 409
    assert worker.post(base + "/completion", {"notes": "Finished"}).status_code == 200
    assert (
        customer_call(
            link, "POST", "/completion", {"completion_number": 1, "decision": "disputed"}
        ).status_code
        == 422
    )
    assert (
        customer_call(
            link,
            "POST",
            "/completion",
            {"completion_number": 1, "decision": "disputed", "notes": "Door sticks"},
        ).status_code
        == 200
    )
    assert worker.post(base + "/start").status_code == 200
    assert worker.post(base + "/completion", {"notes": "Adjusted door"}).status_code == 200
    assert (
        customer_call(
            link, "POST", "/completion", {"completion_number": 1, "decision": "acknowledged"}
        ).status_code
        == 409
    )
    response = {"completion_number": 2, "decision": "acknowledged"}
    assert customer_call(link, "POST", "/completion", response).status_code == 200
    assert customer_call(link, "POST", "/completion", response).status_code == 409


@pytest.mark.parametrize(
    "content,expected",
    [
        (b'<svg onload="alert(1)">', 415),
        (b"x" * (8 * 1024 * 1024 + 1), 413),
        (b"not an image", 415),
    ],
    ids=["svg", "oversize", "invalid"],
)
def test_image_validation(worker, job, content, expected):
    result = worker.request(
        "POST",
        "/jobs/" + job["id"] + "/evidence",
        files={"file": ("../../evil.jpg", content, "image/jpeg")},
    )
    assert result.status_code == expected, result.text


def test_evidence_ownership_and_preservation(worker, job):
    base = "/jobs/" + job["id"]
    result = worker.request(
        "POST", base + "/evidence", files={"file": ("a.png", image(), "text/plain")}
    )
    assert result.status_code == 201  # Content, not the supplied MIME header, determines validity.
    evidence = result.json()
    other = Client()
    other.register("other-image@example.com")
    assert other.get(base + "/evidence/" + evidence["id"]).status_code == 404
    agreement(worker, job)
    assert worker.request("DELETE", base + "/evidence/" + evidence["id"]).status_code == 409


def test_payment_constraints_and_duplicates(worker, job):
    base = "/jobs/" + job["id"]
    data = {
        "amount": "100",
        "method": "upi",
        "reference": "ref",
        "paid_at": now(),
        "idempotency_key": "unique-payment-one",
    }
    assert worker.post(base + "/payments", data).status_code == 409
    approve(worker, job)
    assert worker.post(base + "/payments", {**data, "amount": "0"}).status_code == 422
    assert worker.post(base + "/payments", {**data, "amount": "1.001"}).status_code == 422
    assert worker.post(base + "/payments", {**data, "amount": "NaN"}).status_code == 422
    assert worker.post(base + "/payments", {**data, "amount": "2000"}).status_code == 422
    assert worker.post(base + "/payments", data).status_code == 201
    assert worker.post(base + "/payments", data).status_code == 409
    assert (
        worker.post(
            base + "/payments", {**data, "idempotency_key": "unique-payment-two"}
        ).status_code
        == 409
    )
    with pytest.raises(IntegrityError), SessionLocal.begin() as db:
        db.add(
            Payment(
                job_id=job["id"],
                amount=-1,
                currency="INR",
                method="cash",
                paid_at=now(),
                idempotency_key="database-negative",
            )
        )


def test_dashboard_notifications_and_portal_privacy(worker, job):
    _, link = approve(worker, job)
    data = worker.get("/dashboard").json()
    assert data["total"] == 1 and data["distribution"]["approved"] == 1
    notifications = worker.get("/notifications").json()
    assert len(notifications) == 1
    assert worker.post("/notifications/" + notifications[0]["id"] + "/read").json()["read"]
    portal = customer_call(link).json()
    assert "owner_id" not in portal and "customer" not in portal and "payments" not in portal
    assert all("actor_id" not in item for item in portal["timeline"])
    assert worker.get("/health").json()["status"] == "ok"


@pytest.mark.parametrize(
    "kind", ["record", "agreement", "work-summary", "evidence-index", "completion", "payments"]
)
def test_document_types(worker, job, kind):
    approve(worker, job)
    response = worker.get(f"/jobs/{job['id']}/documents/{kind}")
    assert response.status_code == 200 and len(PdfReader(io.BytesIO(response.content)).pages) >= 1


def test_rate_limit_persists_failed_requests():
    client = Client()
    for _ in range(30):
        assert (
            client.post(
                "/auth/login", {"email": "absent@example.com", "password": "invalid-password"}
            ).status_code
            == 401
        )
    assert (
        client.post(
            "/auth/login", {"email": "absent@example.com", "password": "invalid-password"}
        ).status_code
        == 429
    )


def test_password_reset_verification_and_deletion(worker, job):
    from app.models import Outbox

    assert worker.post("/auth/forgot-password", {"email": "absent@example.com"}).status_code == 200
    worker.post("/auth/forgot-password", {"email": "worker@example.com"})
    with SessionLocal() as db:
        body = db.scalar(select(Outbox)).body
    token = body.split("#")[1].split()[0]
    assert (
        worker.post(
            "/auth/reset-password", {"token": token, "password": "new-password-123"}
        ).status_code
        == 200
    )
    assert worker.get("/auth/me").status_code == 401
    assert (
        worker.post(
            "/auth/reset-password", {"token": token, "password": "new-password-456"}
        ).status_code
        == 400
    )
    worker.post("/auth/login", {"email": "worker@example.com", "password": "new-password-123"})
    worker.post("/auth/request-verification")
    with SessionLocal() as db:
        body = db.scalars(select(Outbox).where(Outbox.subject == "KaamProof verify")).one().body
    token = body.split("#")[1].split()[0]
    assert worker.post("/auth/verify-email", {"token": token}).status_code == 200
    assert worker.get("/auth/me").json()["verified"]
    result = worker.request("DELETE", "/auth/account", json={"password": "new-password-123"})
    assert result.status_code == 200, result.text
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0
        assert db.scalar(select(func.count()).select_from(Job)) == 0

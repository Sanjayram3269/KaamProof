"""Dashboard read models: money, time windows, tenant boundaries and drilldowns."""

from datetime import UTC, datetime
from decimal import Decimal
import uuid

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Agreement, Customer, Job, Notification, Payment, User
from app.dashboard import period_start
from conftest import Client

NOW = int(datetime(2026, 11, 7, 12, tzinfo=UTC).timestamp())


@pytest.fixture
def clock(monkeypatch):
    monkeypatch.setattr("app.jobs.now", lambda: NOW)


def seed(
    client,
    *,
    status="in_progress",
    amount="100.00",
    currency="INR",
    decision="approved",
    expires=None,
    archived=False,
    payments=(),
):
    email = client.get("/auth/me").json()["email"]
    with SessionLocal.begin() as db:
        owner = db.scalar(select(User).where(User.email == email))
        customer = Customer(owner_id=owner.id, name="Read model customer")
        db.add(customer)
        db.flush()
        job = Job(
            owner_id=owner.id,
            customer_id=customer.id,
            title="Documented work",
            status=status,
            archived=archived,
            created_at=NOW - 100,
        )
        db.add(job)
        db.flush()
        if amount is not None:
            db.add(
                Agreement(
                    job_id=job.id,
                    version=1,
                    scope="Agreed scope",
                    labour=Decimal(amount),
                    materials=0,
                    other=0,
                    tax=0,
                    total=Decimal(amount),
                    currency=currency,
                    decision=decision,
                    valid_until=expires or NOW + 10 * 86400,
                )
            )
        for value, timestamp in payments:
            db.add(
                Payment(
                    job_id=job.id,
                    amount=Decimal(value),
                    currency=currency,
                    method="upi",
                    paid_at=timestamp,
                    idempotency_key=str(uuid.uuid4()),
                )
            )
        db.flush()
        return job.id, customer.id, owner.id


def test_empty_dashboard_has_honest_onboarding_and_no_metrics(worker, clock):
    response = worker.get("/dashboard?days=30")
    assert response.status_code == 200, response.text
    data = response.json()
    assert (
        data["total"] == data["active"] == data["pending_approvals"] == data["attention_count"] == 0
    )
    assert data["onboarding"] == {"customer": False, "job": False, "agreement": False}
    assert data["attention"] == data["transactions"]["items"] == []
    assert data["finance"]["completion_rate"] is None
    assert len(data["finance"]["series"]) == 30
    assert all(Decimal(p["amount"]) == 0 for p in data["finance"]["series"])


def test_decimal_balances_do_not_mix_currencies_or_pending_estimates(worker, clock):
    seed(worker, amount="0.30", payments=[("0.10", NOW - 100), ("0.20", NOW - 50)])
    seed(worker, amount="100.00", payments=[("30.25", NOW - 100)])
    seed(worker, amount="9000", status="awaiting_approval", decision="pending")
    seed(worker, amount="8000", status="awaiting_approval", decision="rejected")
    seed(worker, amount="200", currency="USD", payments=[("20", NOW - 100)])
    data = worker.get("/dashboard?currency=INR&days=90").json()
    finance = data["finance"]
    assert Decimal(finance["collected"]) == Decimal("30.55")
    assert Decimal(finance["agreed"]) == Decimal("100.30")
    assert Decimal(finance["outstanding"]) == Decimal("69.75")
    assert finance["currencies"] == ["INR", "USD"]
    assert Decimal(finance["period_collected"]) == sum(
        (Decimal(p["amount"]) for p in finance["series"]), Decimal(0)
    )
    usd = worker.get("/dashboard?currency=USD").json()["finance"]
    assert Decimal(usd["collected"]) == 20
    assert Decimal(usd["outstanding"]) == 180
    assert Decimal(usd["completion_rate"]) == 10
    assert worker.get("/jobs?focus=outstanding&currency=USD").json()["total"] == 1
    assert worker.get("/jobs?focus=outstanding&currency=INR").json()["total"] == 1


@pytest.mark.parametrize(
    "days,grain,count", [(7, "day", 7), (30, "day", 30), (90, "week", 13), (365, "month", 12)]
)
def test_period_boundaries_and_series_match_transactions(worker, clock, days, grain, count):
    start = int(period_start(days, NOW).timestamp())
    seed(
        worker,
        amount="100",
        payments=[("1.01", start - 1), ("2.02", start), ("3.03", NOW), ("4.04", NOW + 1)],
    )
    response = worker.get(f"/dashboard?days={days}")
    assert response.status_code == 200, response.text
    data = response.json()
    finance = data["finance"]
    assert finance["grain"] == grain
    assert len(finance["series"]) == count
    assert Decimal(finance["period_collected"]) == Decimal("5.05")
    assert Decimal(finance["collected"]) == Decimal("10.10")
    assert finance["period_count"] == data["transactions"]["total"] == 2
    assert sum((Decimal(p["amount"]) for p in finance["series"]), Decimal(0)) == Decimal("5.05")


def test_attention_and_kpi_drilldowns_use_actual_states(worker, clock):
    cases = [
        ("disputed", "approved", NOW + 86400, "resolve_dispute"),
        ("awaiting_approval", "rejected", NOW + 86400, "revise_agreement"),
        ("awaiting_approval", "pending", NOW - 1, "expired_agreement"),
        ("completion_pending", "approved", NOW + 86400, "completion_review"),
        ("awaiting_approval", "pending", NOW + 86400, "expiring_agreement"),
        ("awaiting_approval", "pending", NOW + 10 * 86400, "customer_approval"),
        ("completed", "approved", NOW + 86400, "payment_follow_up"),
        ("approved", "approved", NOW + 86400, "start_work"),
    ]
    expected = {}
    for status, decision, expiry, kind in cases:
        job_id, _, _ = seed(worker, status=status, decision=decision, expires=expiry)
        expected[job_id] = kind
    seed(worker, status="disputed", archived=True)
    data = worker.get("/dashboard").json()
    assert data["total"] == 8
    assert data["active"] == 3
    assert data["pending_approvals"] == 3
    assert data["attention_count"] == 8
    assert len(data["attention"]) == 6
    assert all(expected[i["job_id"]] == i["kind"] for i in data["attention"])
    for focus, total in [
        ("active", 3),
        ("approvals", 3),
        ("attention", 8),
        ("outstanding", 5),
        ("agreement", 5),
    ]:
        filtered = worker.get(f"/jobs?focus={focus}").json()
        assert filtered["total"] == total
    assert all(data["onboarding"].values())


def test_dashboard_payment_pagination_and_tenant_boundaries(worker, clock):
    job_id, customer_id, owner_id = seed(worker, payments=[("1.00", NOW - i) for i in range(15)])
    other = Client()
    other.register("other-dashboard@example.com")
    seed(other, amount="99999", payments=[("999", NOW)])
    with SessionLocal.begin() as db:
        db.add(Notification(user_id=owner_id, job_id=job_id, message="Your work was approved"))
    assert worker.get("/notifications/summary").json() == {"unread": 1}
    assert other.get("/notifications/summary").json() == {"unread": 0}
    notifications = worker.get("/notifications").json()
    worker.post(f"/notifications/{notifications[0]['id']}/read")
    assert worker.get("/notifications/summary").json() == {"unread": 0}
    first = worker.get("/payments?size=10&page=1&days=7").json()
    second = worker.get("/payments?size=10&page=2&days=7").json()
    assert first["total"] == second["total"] == 15
    assert len(first["items"]) == 10 and len(second["items"]) == 5
    assert not {p["id"] for p in first["items"]} & {p["id"] for p in second["items"]}
    assert all(
        p["job_id"] == job_id and p["self_reported"] for p in first["items"] + second["items"]
    )
    assert worker.get("/jobs?customer_id=" + customer_id).json()["total"] == 1
    assert other.get("/jobs?customer_id=" + customer_id).json()["total"] == 0
    assert worker.get("/payments?page=99").json()["items"] == []
    assert Client().get("/dashboard").status_code == 401
    assert Client().get("/payments").status_code == 401


@pytest.mark.parametrize(
    "path",
    [
        "/dashboard?days=8",
        "/dashboard?currency=inr",
        "/dashboard?currency=INRR",
        "/payments?days=366",
        "/payments?page=0",
        "/payments?size=101",
        "/payments?currency=",
        "/jobs?focus=unknown",
    ],
)
def test_invalid_dashboard_inputs_return_validation_errors(worker, path):
    assert worker.get(path).status_code == 422


def test_latest_approved_version_is_counted_once_while_a_revision_is_pending(worker, clock):
    job_id, _, _ = seed(worker, amount="100", payments=[("20", NOW)])
    with SessionLocal.begin() as db:
        job = db.get(Job, job_id)
        job.status = "awaiting_approval"
        db.add(
            Agreement(
                job_id=job_id,
                version=2,
                scope="Revised scope",
                labour=Decimal("200"),
                materials=0,
                other=0,
                tax=0,
                total=Decimal("200"),
                currency="INR",
                decision="pending",
                valid_until=NOW + 10 * 86400,
            )
        )
    data = worker.get("/dashboard").json()
    assert Decimal(data["finance"]["agreed"]) == 100
    assert Decimal(data["finance"]["outstanding"]) == 80
    assert Decimal(data["recent_jobs"][0]["agreement"]["total"]) == 200
    assert data["pending_approvals"] == 1
    with SessionLocal.begin() as db:
        current = db.scalar(
            select(Agreement).where(Agreement.job_id == job_id, Agreement.version == 2)
        )
        current.decision = "approved"
        db.get(Job, job_id).status = "approved"
    finance = worker.get("/dashboard").json()["finance"]
    assert Decimal(finance["agreed"]) == 200
    assert Decimal(finance["outstanding"]) == 180

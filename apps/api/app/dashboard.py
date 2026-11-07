"""Tenant-scoped dashboard read models. Money stays Decimal until JSON serialization."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, case, func, or_, select

from .models import Activity, Agreement, Customer, Evidence, Job, Payment
from .services import serialize

ZERO = Decimal("0.00")
ACTIVE_STATES = ("approved", "in_progress", "completion_pending", "disputed")


def read_models(owner_id):
    owned = select(Job.id).where(Job.owner_id == owner_id)

    def latest(approved=False):
        query = select(Agreement.job_id, func.max(Agreement.version).label("version")).where(
            Agreement.job_id.in_(owned)
        )
        if approved:
            query = query.where(Agreement.decision == "approved")
        versions = query.group_by(Agreement.job_id).subquery()
        return (
            select(Agreement)
            .join(
                versions,
                and_(
                    Agreement.job_id == versions.c.job_id, Agreement.version == versions.c.version
                ),
            )
            .subquery()
        )

    latest_agreement, approved = latest(), latest(True)
    paid = (
        select(Payment.job_id, func.sum(Payment.amount).label("paid"))
        .where(Payment.job_id.in_(owned))
        .group_by(Payment.job_id)
        .subquery()
    )
    balance = case(
        (
            approved.c.total > func.coalesce(paid.c.paid, 0),
            approved.c.total - func.coalesce(paid.c.paid, 0),
        ),
        else_=0,
    )
    return latest_agreement, approved, paid, balance


def pending_condition(latest, current_time):
    return or_(
        Job.status == "completion_pending",
        and_(
            Job.status == "awaiting_approval",
            latest.c.decision == "pending",
            latest.c.valid_until > current_time,
        ),
    )


def attention_kind(latest, balance, current_time):
    return case(
        (Job.status == "disputed", "resolve_dispute"),
        (
            and_(Job.status == "awaiting_approval", latest.c.decision == "rejected"),
            "revise_agreement",
        ),
        (
            and_(Job.status == "awaiting_approval", latest.c.valid_until <= current_time),
            "expired_agreement",
        ),
        (Job.status == "completion_pending", "completion_review"),
        (
            and_(
                Job.status == "awaiting_approval", latest.c.valid_until <= current_time + 3 * 86400
            ),
            "expiring_agreement",
        ),
        (Job.status == "awaiting_approval", "customer_approval"),
        (and_(Job.status == "completed", balance > 0), "payment_follow_up"),
        (Job.status == "approved", "start_work"),
        else_=None,
    )


def period_start(days, current_time):
    current = datetime.fromtimestamp(current_time, UTC)
    if days == 365:
        month = current.year * 12 + current.month - 1 - 11
        return datetime(month // 12, month % 12 + 1, 1, tzinfo=UTC)
    return (current - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)


def payment_activity(db, owner_id, days, currency, current_time, page=1, size=6):
    conditions = [
        Job.owner_id == owner_id,
        Payment.currency == currency,
        Payment.paid_at >= int(period_start(days, current_time).timestamp()),
        Payment.paid_at <= current_time,
    ]
    query = (
        select(Payment, Job.title, Customer.name)
        .select_from(Payment)
        .join(Job, Job.id == Payment.job_id)
        .join(Customer, Customer.id == Job.customer_id)
        .where(*conditions)
    )
    total = db.scalar(select(func.count()).select_from(Payment).join(Job).where(*conditions))
    rows = db.execute(
        query.order_by(Payment.paid_at.desc(), Payment.id).offset((page - 1) * size).limit(size)
    ).all()
    return {
        "items": [
            {**serialize(p), "job_title": title, "customer_name": name, "self_reported": True}
            for p, title, name in rows
        ],
        "total": total,
        "page": page,
        "size": size,
    }


def build_dashboard(db, user, days, selected_currency, current_time):
    latest, approved, paid, balance = read_models(user.id)
    visible = [Job.owner_id == user.id, Job.archived.is_(False)]
    distribution = dict(
        db.execute(select(Job.status, func.count()).where(*visible).group_by(Job.status)).all()
    )
    lifetime_payments = dict(
        db.execute(
            select(Payment.currency, func.sum(Payment.amount))
            .join(Job)
            .where(Job.owner_id == user.id)
            .group_by(Payment.currency)
        ).all()
    )
    totals = db.execute(
        select(approved.c.currency, func.sum(approved.c.total), func.sum(balance))
        .select_from(Job)
        .join(approved, approved.c.job_id == Job.id)
        .outerjoin(paid, paid.c.job_id == Job.id)
        .where(Job.owner_id == user.id)
        .group_by(approved.c.currency)
    ).all()
    books = {
        currency: {"agreed": Decimal(total), "outstanding": Decimal(outstanding)}
        for currency, total, outstanding in totals
    }
    currencies = sorted(set(books) | set(lifetime_payments)) or ["INR"]
    currency = selected_currency or ("INR" if "INR" in currencies else currencies[0])
    selected = books.get(currency, {"agreed": ZERO, "outstanding": ZERO})
    collected = Decimal(lifetime_payments.get(currency, ZERO))
    # Denominator is approved contracts. Pending/rejected estimates are never agreed revenue.
    completion = (
        ((selected["agreed"] - selected["outstanding"]) * 100 / selected["agreed"]).quantize(
            Decimal("0.01")
        )
        if selected["agreed"]
        else None
    )
    start = period_start(days, current_time)
    period_rows = db.execute(
        select(Payment.amount, Payment.paid_at)
        .join(Job)
        .where(
            Job.owner_id == user.id,
            Payment.currency == currency,
            Payment.paid_at >= int(start.timestamp()),
            Payment.paid_at <= current_time,
        )
    ).all()
    grain = "month" if days == 365 else "week" if days == 90 else "day"
    series = []
    cursor = start
    end = datetime.fromtimestamp(current_time, UTC)
    while cursor <= end:
        if grain == "month":
            month = cursor.year * 12 + cursor.month
            following = datetime(month // 12, month % 12 + 1, 1, tzinfo=UTC)
        else:
            following = cursor + timedelta(days=7 if grain == "week" else 1)
        amount = sum(
            (
                Decimal(amount)
                for amount, timestamp in period_rows
                if cursor.timestamp() <= timestamp < following.timestamp()
            ),
            ZERO,
        )
        series.append({"date": cursor.date().isoformat(), "amount": str(amount)})
        cursor = following
    financial = {
        "currency": currency,
        "currencies": currencies,
        "self_reported": True,
        "collected": str(collected),
        "agreed": str(selected["agreed"]),
        "outstanding": str(selected["outstanding"]),
        "completion_rate": str(completion) if completion is not None else None,
        "period_collected": str(sum((Decimal(p[0]) for p in period_rows), ZERO)),
        "period_count": len(period_rows),
        "days": days,
        "grain": grain,
        "start": int(start.timestamp()),
        "end": current_time,
        "series": series,
    }
    pending = db.scalar(
        select(func.count())
        .select_from(Job)
        .outerjoin(latest, latest.c.job_id == Job.id)
        .where(*visible, pending_condition(latest, current_time))
    )
    recent_rows = db.scalars(
        select(Job).where(*visible).order_by(Job.created_at.desc(), Job.id).limit(6)
    ).all()
    ids = [j.id for j in recent_rows]
    recent_customer_rows = db.scalars(
        select(Customer)
        .where(Customer.owner_id == user.id)
        .order_by(Customer.created_at.desc(), Customer.id)
        .limit(4)
    ).all()
    customer_ids = [c.id for c in recent_customer_rows]
    customers = {
        c.id: c
        for c in db.scalars(
            select(Customer).where(
                Customer.owner_id == user.id, Customer.id.in_([j.customer_id for j in recent_rows])
            )
        ).all()
    }
    latest_rows = {
        a["job_id"]: dict(a)
        for a in db.execute(select(latest).where(latest.c.job_id.in_(ids))).mappings()
    }
    evidence_counts = dict(
        db.execute(
            select(Evidence.job_id, func.count())
            .where(Evidence.job_id.in_(ids), Evidence.deleted.is_(False))
            .group_by(Evidence.job_id)
        ).all()
    )
    activity_times = dict(
        db.execute(
            select(Activity.job_id, func.max(Activity.created_at))
            .where(Activity.job_id.in_(ids))
            .group_by(Activity.job_id)
        ).all()
    )
    recent = []
    for job in recent_rows:
        agreement = latest_rows.get(job.id)
        if agreement:
            agreement = {k: str(v) if isinstance(v, Decimal) else v for k, v in agreement.items()}
        recent.append(
            {
                **serialize(job),
                "customer_name": customers[job.customer_id].name,
                "agreement": agreement,
                "evidence_count": evidence_counts.get(job.id, 0),
                "updated_at": activity_times.get(job.id, job.created_at),
            }
        )
    kind = attention_kind(latest, balance, current_time)
    attention_query = (
        select(
            Job,
            Customer.name,
            approved.c.currency,
            balance.label("balance"),
            latest.c.valid_until,
            kind.label("kind"),
        )
        .select_from(Job)
        .join(Customer, Customer.id == Job.customer_id)
        .outerjoin(latest, latest.c.job_id == Job.id)
        .outerjoin(approved, approved.c.job_id == Job.id)
        .outerjoin(paid, paid.c.job_id == Job.id)
        .where(*visible, kind.is_not(None))
    )
    attention_count = db.scalar(select(func.count()).select_from(attention_query.subquery()))
    priorities = case(
        (Job.status == "disputed", 0),
        (and_(Job.status == "awaiting_approval", latest.c.valid_until <= current_time), 1),
        (Job.status == "completion_pending", 2),
        else_=3,
    )
    attention = [
        {
            "job_id": j.id,
            "title": j.title,
            "customer_name": name,
            "status": j.status,
            "kind": reason,
            "amount": str(Decimal(amount)),
            "currency": cur or currency,
            "valid_until": valid_until,
        }
        for j, name, cur, amount, valid_until, reason in db.execute(
            attention_query.order_by(priorities, Job.created_at, Job.id).limit(6)
        ).all()
    ]
    activities = [
        {**serialize(a), "job_title": title}
        for a, title in db.execute(
            select(Activity, Job.title)
            .join(Job)
            .where(Job.owner_id == user.id)
            .order_by(Activity.created_at.desc(), Activity.sequence.desc(), Activity.id)
            .limit(7)
        ).all()
    ]
    customer_rows = db.execute(
        select(
            Job.customer_id,
            func.count(),
            func.sum(case((Job.status.in_(ACTIVE_STATES), 1), else_=0)),
            func.sum(case((pending_condition(latest, current_time), 1), else_=0)),
        )
        .outerjoin(latest, latest.c.job_id == Job.id)
        .where(*visible, Job.customer_id.in_(customer_ids))
        .group_by(Job.customer_id)
    ).all()
    context = {
        customer_id: {"jobs": count, "active": active, "pending": pending_count}
        for customer_id, count, active, pending_count in customer_rows
    }
    recent_customers = [
        {**serialize(c), **context.get(c.id, {"jobs": 0, "active": 0, "pending": 0})}
        for c in recent_customer_rows
    ]
    has_agreement = bool(
        db.scalar(
            select(func.count()).select_from(Agreement).join(Job).where(Job.owner_id == user.id)
        )
    )
    return {
        "total": sum(distribution.values()),
        "distribution": distribution,
        "active": sum(distribution.get(s, 0) for s in ACTIVE_STATES),
        "pending_approvals": pending,
        "recorded_payments": {c: str(a) for c, a in lifetime_payments.items()},
        "recent_jobs": recent,
        "activities": activities,
        "recent_customers": recent_customers,
        "active_customers": db.scalar(
            select(func.count(func.distinct(Job.customer_id))).where(
                *visible, Job.status.in_(ACTIVE_STATES)
            )
        ),
        "attention": attention,
        "attention_count": attention_count,
        "finance": financial,
        "transactions": payment_activity(db, user.id, days, currency, current_time),
        "onboarding": {
            "customer": bool(recent_customer_rows),
            "job": bool(distribution),
            "agreement": has_agreement,
        },
    }

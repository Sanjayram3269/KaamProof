from datetime import UTC, datetime

import bcrypt
import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import MetaData, create_engine, func, select

from app.db import SessionLocal
from app.import_mvp import migrate
from app.models import Agreement, Job, Payment, ShareLink, User, uid
from conftest import Client
from fixtures.mvp_initial import upgrade
from test_workflows import image


def source_snapshot(tmp_path, unsafe=False):
    url = f"sqlite:///{tmp_path / 'mvp.db'}"
    engine = create_engine(url)
    with engine.begin() as connection, Operations.context(MigrationContext.configure(connection)):
        upgrade()
    tables = MetaData()
    tables.reflect(engine)
    ids = {name: uid() for name in ["user", "job", "agreement", "link", "payment", "evidence"]}
    stamp = datetime.now(UTC)
    with engine.begin() as db:
        db.execute(
            tables.tables["users"].insert(),
            dict(
                id=ids["user"],
                name="MVP Worker",
                email="mvp@example.com",
                phone=None,
                language="hi",
                created_at=stamp,
                password_hash=bcrypt.hashpw(b"legacy-password-123", bcrypt.gensalt()).decode(),
            ),
        )
        db.execute(
            tables.tables["jobs"].insert(),
            dict(
                id=ids["job"],
                worker_id=ids["user"],
                customer_name="Existing Customer",
                title="Existing job",
                description="Original work scope",
                category="Electrical",
                status="confirmed",
                created_at=stamp,
                updated_at=stamp,
            ),
        )
        db.execute(
            tables.tables["agreements"].insert(),
            dict(
                id=ids["agreement"],
                job_id=ids["job"],
                version=1,
                scope="Original scope",
                labour_amount=500,
                materials_amount=150,
                total_amount=650,
                created_at=stamp,
                currency="INR",
            ),
        )
        db.execute(
            tables.tables["approvals"].insert(),
            dict(
                id=uid(),
                job_id=ids["job"],
                agreement_id=ids["agreement"],
                decision="approve",
                note="Original approval",
                decided_at=stamp,
            ),
        )
        db.execute(
            tables.tables["customer_links"].insert(),
            dict(
                id=ids["link"],
                job_id=ids["job"],
                token_hash="0" * 64,
                expires_at=stamp,
                created_at=stamp,
            ),
        )
        db.execute(
            tables.tables["job_events"].insert(),
            dict(
                id=uid(),
                job_id=ids["job"],
                actor_type="worker",
                actor_id=ids["user"],
                event_type="job_created",
                message="Original event",
                created_at=stamp,
            ),
        )
        db.execute(
            tables.tables["payment_entries"].insert(),
            dict(
                id=ids["payment"],
                job_id=ids["job"],
                amount=100,
                method="cash",
                note="Original payment note",
                recorded_at=stamp,
            ),
        )
        db.execute(
            tables.tables["evidence"].insert(),
            dict(
                id=ids["evidence"],
                job_id=ids["job"],
                uploader_id=ids["user"],
                storage_key="../../wrong/file.png"
                if unsafe
                else f"/app/storage/{ids['job']}/proof.png",
                original_name="proof.png",
                content_type="image/png",
                size_bytes=len(image()),
                caption="Original image",
                created_at=stamp,
            ),
        )
    root = tmp_path / "storage"
    (root / ids["job"]).mkdir(parents=True)
    (root / ids["job"] / "proof.png").write_bytes(image())
    engine.dispose()
    return url, root, ids


def test_mvp_import_dry_run_apply_and_bcrypt_upgrade(tmp_path):
    url, root, ids = source_snapshot(tmp_path)
    result = migrate(url, root)
    assert not result["applied"] and result["counts"]["jobs"] == 1
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0
    assert migrate(url, root, apply=True)["applied"]
    with SessionLocal() as db:
        assert db.get(Job, ids["job"]).status == "approved"
        assert db.get(Agreement, ids["agreement"]).decision == "approved"
        assert db.get(ShareLink, ids["link"]) is None  # Unbound capabilities are never transferred.
        assert db.get(Payment, ids["payment"]).amount == 100
    client = Client()
    assert (
        client.post(
            "/auth/login", {"email": "mvp@example.com", "password": "legacy-password-123"}
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        assert db.get(User, ids["user"]).password.startswith("$argon2id$")
    with pytest.raises(ValueError, match="empty"):
        migrate(url, root, apply=True)


def test_mvp_import_rejects_unsafe_paths_atomically(tmp_path):
    url, root, ids = source_snapshot(tmp_path, unsafe=True)
    with pytest.raises(ValueError, match="Unsafe"):
        migrate(url, root, apply=True)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0

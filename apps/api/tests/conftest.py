import os
import tempfile
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete

test_root = Path(tempfile.mkdtemp(prefix="kaamproof-tests-"))
os.environ["DATABASE_URL"] = os.getenv("TEST_DATABASE_URL", f"sqlite:///{test_root / 'test.db'}")
os.environ["DATA_DIR"] = str(test_root / "data")
os.environ["APP_ORIGIN"] = "http://localhost:5173"

from app.db import Base, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402

command.upgrade(Config("alembic.ini"), "head")
command.upgrade(Config("alembic.ini"), "head")


class Client:
    def __init__(self):
        self.raw = TestClient(app)

    def request(self, method, path, **kwargs):
        headers = {
            "X-CSRF-Token": self.raw.cookies.get("kp_csrf", ""),
            "Origin": "http://localhost:5173",
        }
        headers.update(kwargs.pop("headers", {}))
        return self.raw.request(method, "/api/v1" + path, headers=headers, **kwargs)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, data=None, **kwargs):
        return self.request("POST", path, json=data or {}, **kwargs)

    def register(self, email="worker@example.com"):
        response = self.post(
            "/auth/register",
            {
                "name": "Test Worker",
                "email": email,
                "password": "strong-password-123",
            },
        )
        assert response.status_code == 201, response.text
        return response.json()


@pytest.fixture(autouse=True)
def clean_database():
    with SessionLocal.begin() as db:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(delete(table))
    yield


@pytest.fixture
def worker():
    client = Client()
    client.register()
    return client


@pytest.fixture
def job(worker):
    customer = worker.post("/customers", {"name": "Customer", "phone": "+919999999999"}).json()
    response = worker.post(
        "/jobs",
        {
            "title": "Kitchen renovation",
            "description": "Repair cabinets",
            "customer_id": customer["id"],
            "location": "Bengaluru",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()

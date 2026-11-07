import os
os.environ["DATABASE_URL"]="sqlite://"
os.environ["JWT_SECRET"]="test-secret-that-is-long-enough-123456789"
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base,get_db
from app.main import app
@pytest.fixture()
def client():
 engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
 factory=sessionmaker(bind=engine,autoflush=False,autocommit=False)
 Base.metadata.create_all(engine)
 def override():
  db=factory()
  try:yield db
  finally:db.close()
 app.dependency_overrides[get_db]=override
 with TestClient(app) as c:yield c
 app.dependency_overrides.clear();Base.metadata.drop_all(engine)

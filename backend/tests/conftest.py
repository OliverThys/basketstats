from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.config import settings
from app.database import Base, get_db
from app.main import app

settings.celery_enabled = False


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """A TestClient already authenticated as the owner of a fresh organization."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        test_client = TestClient(app)
        register_response = test_client.post(
            "/auth/register",
            json={"org_name": "Test Club", "email": "owner@example.com", "display_name": "Owner"},
        )
        token = register_response.json()["access_token"]
        test_client.headers["Authorization"] = f"Bearer {token}"
        yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)

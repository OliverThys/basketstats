from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app


@pytest.fixture()
def anon_client(db_session: Session) -> Generator[TestClient, None, None]:
    """An unauthenticated TestClient, for exercising the auth endpoints themselves."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_register_creates_org_and_owner_and_returns_token(anon_client: TestClient) -> None:
    response = anon_client.post(
        "/auth/register",
        json={"org_name": "Ad-hoc Club", "email": "coach@example.com", "display_name": "Coach"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]

    me_response = anon_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    body = me_response.json()
    assert body["email"] == "coach@example.com"
    assert body["role"] == "owner"


def test_login_with_unknown_email_is_rejected(anon_client: TestClient) -> None:
    response = anon_client.post("/auth/login", json={"email": "nobody@example.com"})
    assert response.status_code == 404


def test_protected_endpoint_without_token_is_rejected(anon_client: TestClient) -> None:
    response = anon_client.get("/auth/me")
    assert response.status_code in (401, 403)


def test_registering_the_same_email_twice_is_rejected(anon_client: TestClient) -> None:
    anon_client.post(
        "/auth/register",
        json={"org_name": "Club A", "email": "dupe@example.com", "display_name": "Coach"},
    )
    second = anon_client.post(
        "/auth/register",
        json={"org_name": "Club B", "email": "dupe@example.com", "display_name": "Coach"},
    )
    assert second.status_code == 409


def test_login_returns_a_token_for_a_registered_user(anon_client: TestClient) -> None:
    anon_client.post(
        "/auth/register",
        json={"org_name": "Club C", "email": "known@example.com", "display_name": "Coach"},
    )
    response = anon_client.post("/auth/login", json={"email": "known@example.com"})
    assert response.status_code == 200
    assert "access_token" in response.json()

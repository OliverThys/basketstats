from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_and_access_protected_endpoint() -> None:
    login_response = client.post("/auth/login", json={"email": "coach@example.com"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json() == {"subject": "coach@example.com"}


def test_protected_endpoint_without_token_is_rejected() -> None:
    response = client.get("/auth/me")
    assert response.status_code in (401, 403)

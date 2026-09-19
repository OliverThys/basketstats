from fastapi.testclient import TestClient


def _register(client: TestClient, org_name: str, email: str) -> str:
    response = client.post(
        "/auth/register", json={"org_name": org_name, "email": email, "display_name": "Coach"}
    )
    return response.json()["access_token"]


def _other_org_headers(client: TestClient) -> dict:
    token = _register(client, "Rival Club Inc", "rival-owner@example.com")
    return {"Authorization": f"Bearer {token}"}


def test_teams_are_scoped_to_the_caller_organization(client: TestClient) -> None:
    my_team = client.post("/teams", json={"name": "My Team"}).json()

    other_headers = _other_org_headers(client)
    client.post("/teams", json={"name": "Rival Team"}, headers=other_headers)

    my_teams = client.get("/teams").json()
    assert [team["name"] for team in my_teams] == ["My Team"]

    other_teams = client.get("/teams", headers=other_headers).json()
    assert [team["name"] for team in other_teams] == ["Rival Team"]

    # Cross-org reads/writes 404 rather than leaking existence of the resource.
    cross_read = client.get(f"/teams/{my_team['id']}", headers=other_headers)
    assert cross_read.status_code == 404

    cross_update = client.put(
        f"/teams/{my_team['id']}", json={"name": "Hijacked"}, headers=other_headers
    )
    assert cross_update.status_code == 404


def test_games_are_scoped_to_the_caller_organization(client: TestClient) -> None:
    team = client.post("/teams", json={"name": "My Team"}).json()
    game = client.post(
        "/games",
        json={
            "home_team_id": team["id"],
            "opponent_name": "Rival",
            "game_date": "2026-01-15T18:00:00Z",
        },
    ).json()

    other_headers = _other_org_headers(client)
    cross_read = client.get(f"/games/{game['id']}", headers=other_headers)
    assert cross_read.status_code == 404

    # Creating a game against a team from another org is rejected, not just hidden.
    hijack_attempt = client.post(
        "/games",
        json={
            "home_team_id": team["id"],
            "opponent_name": "Hijack",
            "game_date": "2026-01-15T18:00:00Z",
        },
        headers=other_headers,
    )
    assert hijack_attempt.status_code == 404

    # Nor can another org delete it: 404, and the game is still there afterwards.
    cross_delete = client.delete(f"/games/{game['id']}", headers=other_headers)
    assert cross_delete.status_code == 404
    assert client.get(f"/games/{game['id']}").status_code == 200


def test_viewer_role_is_read_only(client: TestClient) -> None:
    invite = client.post(
        "/auth/invite",
        json={"email": "viewer@example.com", "display_name": "Viewer", "role": "viewer"},
    )
    assert invite.status_code == 201
    token = client.post("/auth/login", json={"email": "viewer@example.com"}).json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {token}"}

    denied = client.post("/teams", json={"name": "Nope"}, headers=viewer_headers)
    assert denied.status_code == 403

    team = client.post("/teams", json={"name": "Viewable Team"}).json()
    allowed_read = client.get(f"/teams/{team['id']}", headers=viewer_headers)
    assert allowed_read.status_code == 200


def test_only_owner_can_invite_users(client: TestClient) -> None:
    client.post(
        "/auth/invite",
        json={"email": "assistant@example.com", "display_name": "Assistant", "role": "assistant"},
    )
    token = client.post("/auth/login", json={"email": "assistant@example.com"}).json()[
        "access_token"
    ]
    assistant_headers = {"Authorization": f"Bearer {token}"}

    denied = client.post(
        "/auth/invite",
        json={"email": "another@example.com", "display_name": "Another", "role": "viewer"},
        headers=assistant_headers,
    )
    assert denied.status_code == 403

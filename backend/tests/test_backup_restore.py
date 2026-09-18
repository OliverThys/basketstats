from fastapi.testclient import TestClient


def _seed_org(client: TestClient) -> dict:
    team = client.post("/teams", json={"name": "Home Team"}).json()
    player = client.post(
        "/players",
        json={
            "team_id": team["id"],
            "first_name": "Jane",
            "last_name": "Doe",
            "jersey_number": 7,
            "position": "PG",
        },
    ).json()
    game = client.post(
        "/games",
        json={
            "home_team_id": team["id"],
            "opponent_name": "Rival Club",
            "game_date": "2026-01-15T18:00:00Z",
        },
    ).json()
    # The roster is auto-populated from the team's players when the game is created.
    client.post(
        f"/games/{game['id']}/events/batch",
        json={
            "events": [
                {
                    "id": "44444444-4444-4444-4444-444444444444",
                    "seq": 1,
                    "period": 1,
                    "actor": "home_player",
                    "player_id": player["id"],
                    "action_type": "FG2_MADE",
                }
            ]
        },
    )
    return {"team": team, "player": player, "game": game}


def test_backup_export_contains_every_entity(client: TestClient) -> None:
    _seed_org(client)

    backup = client.get("/organizations/me/backup")
    assert backup.status_code == 200
    body = backup.json()
    assert len(body["teams"]) == 1
    assert len(body["players"]) == 1
    assert len(body["games"]) == 1
    assert len(body["rosters"]) == 1
    assert len(body["events"]) == 1


def test_restore_round_trip_recreates_identical_state(client: TestClient) -> None:
    seeded = _seed_org(client)
    backup = client.get("/organizations/me/backup").json()

    # Restoring wipes the organization's current teams/games/rosters/events
    # and recreates them from the backup (restore_organization deletes games,
    # which cascade to rosters/events, then teams, which cascade to players).
    restore = client.post("/organizations/restore", json=backup)
    assert restore.status_code == 200
    assert restore.json() == {"teams": 1, "players": 1, "games": 1, "rosters": 1, "events": 1}

    teams = client.get("/teams").json()
    assert len(teams) == 1
    assert teams[0]["id"] == seeded["team"]["id"]

    box_score = client.get(f"/games/{seeded['game']['id']}/box-score").json()
    assert box_score["home_score"] == 2


def test_restore_rejects_a_backup_from_another_organization(client: TestClient) -> None:
    backup = client.get("/organizations/me/backup").json()

    other_token = client.post(
        "/auth/register",
        json={
            "org_name": "Other Club",
            "email": "other-owner@example.com",
            "display_name": "Owner",
        },
    ).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    response = client.post("/organizations/restore", json=backup, headers=other_headers)
    assert response.status_code == 400


def test_backup_requires_owner_role(client: TestClient) -> None:
    client.post(
        "/auth/invite",
        json={"email": "assistant@example.com", "display_name": "Assistant", "role": "assistant"},
    )
    token = client.post("/auth/login", json={"email": "assistant@example.com"}).json()[
        "access_token"
    ]
    response = client.get("/organizations/me/backup", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

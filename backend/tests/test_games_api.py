from fastapi.testclient import TestClient


def _setup_org_team_player(client: TestClient) -> tuple[str, str, str]:
    org = client.post("/organizations", json={"name": "Test Club"}).json()
    team = client.post("/teams", json={"org_id": org["id"], "name": "Home Team"}).json()
    player = client.post(
        "/players",
        json={
            "team_id": team["id"],
            "first_name": "Jane",
            "last_name": "Doe",
            "jersey_number": 7,
            "position": "PG",
            "height_cm": 178,
            "weight_kg": 65,
        },
    ).json()
    return org["id"], team["id"], player["id"]


def test_team_player_game_crud_flow(client: TestClient) -> None:
    org_id, team_id, player_id = _setup_org_team_player(client)

    game = client.post(
        "/games",
        json={
            "org_id": org_id,
            "home_team_id": team_id,
            "opponent_name": "Rival Club",
            "game_date": "2026-01-15T18:00:00Z",
            "label": "Game 1",
        },
    ).json()

    roster_entry = client.post(
        f"/games/{game['id']}/roster",
        json={"player_id": player_id, "is_starter": True, "dnp": False},
    )
    assert roster_entry.status_code == 201

    roster_list = client.get(f"/games/{game['id']}/roster").json()
    assert len(roster_list) == 1
    assert roster_list[0]["player_id"] == player_id

    games_for_org = client.get("/games", params={"org_id": org_id}).json()
    assert len(games_for_org) == 1


def test_event_batch_ingestion_is_idempotent(client: TestClient) -> None:
    org_id, team_id, player_id = _setup_org_team_player(client)
    game = client.post(
        "/games",
        json={
            "org_id": org_id,
            "home_team_id": team_id,
            "opponent_name": "Rival Club",
            "game_date": "2026-01-15T18:00:00Z",
        },
    ).json()

    batch = {
        "events": [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "seq": 1,
                "period": 1,
                "actor": "home_player",
                "player_id": player_id,
                "action_type": "FG2_MADE",
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "seq": 2,
                "period": 1,
                "actor": "home_player",
                "player_id": player_id,
                "action_type": "ASSIST",
            },
        ]
    }

    first_response = client.post(f"/games/{game['id']}/events/batch", json=batch)
    assert first_response.status_code == 200
    assert first_response.json() == {"inserted": 2, "skipped_existing": 0}

    # Replaying the exact same batch (offline retry / reconnect) must not duplicate rows.
    second_response = client.post(f"/games/{game['id']}/events/batch", json=batch)
    assert second_response.json() == {"inserted": 0, "skipped_existing": 2}

    events = client.get(f"/games/{game['id']}/events").json()
    assert len(events) == 2

    box_score = client.get(f"/games/{game['id']}/box-score").json()
    assert box_score["home_score"] == 2
    assert box_score["players"][0]["pts"] == 2
    assert box_score["players"][0]["ast"] == 1


def test_voiding_an_event_recomputes_the_box_score(client: TestClient) -> None:
    org_id, team_id, player_id = _setup_org_team_player(client)
    game = client.post(
        "/games",
        json={
            "org_id": org_id,
            "home_team_id": team_id,
            "opponent_name": "Rival Club",
            "game_date": "2026-01-15T18:00:00Z",
        },
    ).json()

    client.post(
        f"/games/{game['id']}/events/batch",
        json={
            "events": [
                {
                    "id": "33333333-3333-3333-3333-333333333333",
                    "seq": 1,
                    "period": 1,
                    "actor": "home_player",
                    "player_id": player_id,
                    "action_type": "FG3_MADE",
                }
            ]
        },
    )
    assert client.get(f"/games/{game['id']}/box-score").json()["home_score"] == 3

    delete_response = client.delete(
        f"/games/{game['id']}/events/33333333-3333-3333-3333-333333333333"
    )
    assert delete_response.status_code == 204

    box_score = client.get(f"/games/{game['id']}/box-score").json()
    assert box_score["home_score"] == 0
    assert box_score["players"] == []

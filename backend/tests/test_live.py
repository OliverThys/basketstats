from fastapi.testclient import TestClient


def _create_game_with_player(client: TestClient) -> dict:
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
    return {"game": game, "player": player}


def test_spectator_snapshot_is_public_and_scoreless_at_first(client: TestClient) -> None:
    seeded = _create_game_with_player(client)
    share_token = seeded["game"]["share_token"]

    response = client.get(f"/live/{share_token}")
    assert response.status_code == 200
    body = response.json()
    assert body["box_score"]["home_score"] == 0
    assert body["game"]["opponent_name"] == "Rival Club"


def test_unknown_share_token_is_not_found(client: TestClient) -> None:
    response = client.get("/live/does-not-exist")
    assert response.status_code == 404


def test_websocket_receives_a_snapshot_then_an_update_after_an_event(client: TestClient) -> None:
    seeded = _create_game_with_player(client)
    game_id = seeded["game"]["id"]
    player_id = seeded["player"]["id"]
    share_token = seeded["game"]["share_token"]

    with client.websocket_connect(f"/live/{share_token}/ws") as websocket:
        initial = websocket.receive_json()
        assert initial["type"] == "snapshot"
        assert initial["box_score"]["home_score"] == 0

        client.post(
            f"/games/{game_id}/events/batch",
            json={
                "events": [
                    {
                        "id": "55555555-5555-5555-5555-555555555555",
                        "seq": 1,
                        "period": 1,
                        "actor": "home_player",
                        "player_id": player_id,
                        "action_type": "FG3_MADE",
                    }
                ]
            },
        )

        update = websocket.receive_json()
        assert update["box_score"]["home_score"] == 3

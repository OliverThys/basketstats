from fastapi.testclient import TestClient


def _setup_team_player(client: TestClient) -> tuple[str, str]:
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
    return team["id"], player["id"]


def _create_game(client: TestClient, team_id: str, opponent: str, label: str) -> str:
    return client.post(
        "/games",
        json={
            "home_team_id": team_id,
            "opponent_name": opponent,
            "game_date": "2026-01-15T18:00:00Z",
            "label": label,
        },
    ).json()["id"]


def _record_made_twos(
    client: TestClient, game_id: str, player_id: str, count: int, *, dnp: bool
) -> None:
    # The roster is auto-populated (not DNP) when the game is created; flip the
    # DNP flag here for scenarios that need to exclude the player from averages.
    roster = client.get(f"/games/{game_id}/roster").json()
    roster_id = next(entry["id"] for entry in roster if entry["player_id"] == player_id)
    client.put(
        f"/games/{game_id}/roster/{roster_id}",
        json={"is_starter": not dnp, "dnp": dnp},
    )
    events = [
        {
            "id": f"{game_id[:8]}-{index:04d}-4000-8000-000000000000",
            "seq": index,
            "period": 1,
            "actor": "home_player",
            "player_id": player_id,
            "action_type": "FG2_MADE",
            "x": 0.89,
            "y": 0.5,
        }
        for index in range(1, count + 1)
    ]
    if events:
        client.post(f"/games/{game_id}/events/batch", json={"events": events})


def test_season_stats_exclude_dnp_and_exports_are_readable(client: TestClient) -> None:
    team_id, player_id = _setup_team_player(client)
    game_a = _create_game(client, team_id, "Opp A", "Game A")
    game_b = _create_game(client, team_id, "Opp B", "Game B")
    game_dnp = _create_game(client, team_id, "Opp A", "DNP")
    _record_made_twos(client, game_a, player_id, 5, dnp=False)
    _record_made_twos(client, game_b, player_id, 10, dnp=False)
    _record_made_twos(client, game_dnp, player_id, 8, dnp=True)

    season = client.get(f"/teams/{team_id}/season-stats").json()
    assert season["games"] == 3
    row = season["players"][0]
    assert row["totals"]["games_played"] == 2
    assert row["totals"]["pts"] == 30
    assert row["totals"]["pts_avg"] == 15
    assert row["by_opponent"]["Opp A"]["games_played"] == 1
    assert row["by_opponent"]["Opp A"]["pts"] == 10

    box = client.get(f"/games/{game_a}/box-score").json()
    assert box["players"][0]["efg_pct"] == 1.0
    assert box["totals"]["ts_pct"] > 0
    assert "plus_minus" in box["players"][0]
    assert "minutes" in box["players"][0]

    csv_box = client.get(f"/games/{game_a}/box-score.csv")
    assert csv_box.status_code == 200
    assert "Jane Doe" in csv_box.text
    assert "eFG%" in csv_box.text

    pdf_box = client.get(f"/games/{game_a}/box-score.pdf")
    assert pdf_box.status_code == 200
    assert pdf_box.headers["content-type"].startswith("application/pdf")
    assert pdf_box.content.startswith(b"%PDF")

    csv_season = client.get(f"/teams/{team_id}/season-stats.csv")
    assert csv_season.status_code == 200
    assert "Jane Doe" in csv_season.text
    assert "15" in csv_season.text

    pdf_season = client.get(f"/teams/{team_id}/season-stats.pdf")
    assert pdf_season.status_code == 200
    assert pdf_season.content.startswith(b"%PDF")

    zones = client.get(f"/teams/{team_id}/shot-zones").json()
    at_rim = next(zone for zone in zones["zones"] if zone["zone"] == "at_rim")
    assert at_rim["made"] == 23  # 5+10+8; DNP games still contribute team shot events
    assert at_rim["attempted"] == 23

    job = client.post(f"/teams/{team_id}/season-stats/jobs").json()
    assert job["status"] == "inline"
    assert job["result"]["players"][0]["totals"]["pts"] == 30

"""Seeds a demo organization/team/roster/game against a running API so the
frontend live entry screen (Phase 2) has something to open. Not part of the
product: a dev convenience until Phase 6 adds real team/game management UI.

Usage:
    python scripts/seed_demo.py [--base-url http://localhost:8000]

Prints the created game's ID, which is what the frontend's "Game ID" field
(see App.tsx) expects.
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime

import httpx

DEMO_PLAYERS = [
    ("Sasha", "Korchagin", 6, "PG"),
    ("Aleksej", "Kotishevski", 7, "SG"),
    ("Patrick", "Beverly", 12, "PG"),
    ("Miha", "Zupan", 13, "SF"),
    ("Aleksej", "Zozulin", 14, "SF"),
    ("Anton", "Ponkrashov", 18, "SG"),
    ("Vladimir", "Dycok", 21, "PF"),
    ("Aleksandr", "Bashminov", 22, "C"),
    ("Evgenij", "Kolesnikov", 24, "PF"),
    ("Henry", "Domercant", 44, "SF"),
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()

    with httpx.Client(base_url=args.base_url, timeout=10.0) as client:
        token_response = client.post(
            "/auth/register",
            json={
                "org_name": "Demo Club",
                "email": f"demo-{datetime.now(UTC).timestamp():.0f}@example.com",
                "display_name": "Demo Coach",
            },
        )
        token_response.raise_for_status()
        token = token_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        team = client.post("/teams", json={"name": "BC Spartak"}).raise_for_status().json()

        player_ids = []
        for first_name, last_name, jersey_number, position in DEMO_PLAYERS:
            player = (
                client.post(
                    "/players",
                    json={
                        "team_id": team["id"],
                        "first_name": first_name,
                        "last_name": last_name,
                        "jersey_number": jersey_number,
                        "position": position,
                    },
                )
                .raise_for_status()
                .json()
            )
            player_ids.append(player["id"])

        game = (
            client.post(
                "/games",
                json={
                    "home_team_id": team["id"],
                    "opponent_name": "BC Enisey",
                    "game_date": datetime.now(UTC).isoformat(),
                    "label": "Demo Game",
                },
            )
            .raise_for_status()
            .json()
        )

        for index, player_id in enumerate(player_ids):
            client.post(
                f"/games/{game['id']}/roster",
                json={"player_id": player_id, "is_starter": index < 5, "dnp": False},
            ).raise_for_status()

    print(f"Game ID: {game['id']}")
    print(f"Team ID: {team['id']}")
    print(f"Auth token: {token}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

import { expect, test, type APIRequestContext } from "@playwright/test";

const API = "http://127.0.0.1:8000";

interface SeededGame {
  gameId: string;
  playerLastName: string;
  benchLastName?: string;
  token: string;
}

async function seedGame(request: APIRequestContext, benchLastName?: string): Promise<SeededGame> {
  const registerResponse = await request.post(`${API}/auth/register`, {
    data: {
      org_name: "E2E Club",
      email: `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      display_name: "E2E Coach",
    },
  });
  const { access_token: token } = await registerResponse.json();
  const headers = { Authorization: `Bearer ${token}` };

  const team = await (
    await request.post(`${API}/teams`, { headers, data: { name: "E2E Home" } })
  ).json();
  const player = await (
    await request.post(`${API}/players`, {
      headers,
      data: {
        team_id: team.id,
        first_name: "Jane",
        last_name: "Doe",
        jersey_number: 7,
        position: "PG",
      },
    })
  ).json();
  let benchPlayer: { id: string; last_name: string } | undefined;
  if (benchLastName) {
    benchPlayer = await (
      await request.post(`${API}/players`, {
        headers,
        data: {
          team_id: team.id,
          first_name: "Ann",
          last_name: benchLastName,
          jersey_number: 12,
          position: "SG",
        },
      })
    ).json();
  }
  const game = await (
    await request.post(`${API}/games`, {
      headers,
      data: {
        home_team_id: team.id,
        opponent_name: "E2E Away",
        game_date: new Date().toISOString(),
        label: "E2E Game",
      },
    })
  ).json();
  // Creating a game already puts the whole team on the roster, starting the
  // first five, so seeding only reads the sheet back instead of building it.
  const rosterResponse = await request.get(`${API}/games/${game.id}/roster`, { headers });
  expect(rosterResponse.ok()).toBeTruthy();
  const roster: { id: string; player_id: string; is_starter: boolean }[] = await rosterResponse.json();
  expect(roster).toEqual(
    expect.arrayContaining([expect.objectContaining({ player_id: player.id, is_starter: true })]),
  );

  if (benchPlayer) {
    // A two-player team would otherwise start both, leaving nobody to sub in.
    const benchEntry = roster.find((entry) => entry.player_id === benchPlayer!.id)!;
    const demoted = await request.put(`${API}/games/${game.id}/roster/${benchEntry.id}`, {
      headers,
      data: { is_starter: false, dnp: false },
    });
    expect(demoted.ok()).toBeTruthy();
  }

  return {
    gameId: game.id,
    playerLastName: player.last_name,
    benchLastName: benchPlayer?.last_name,
    token,
  };
}

async function recordStat(
  page: import("@playwright/test").Page,
  playerLastName: string,
  buttonLabel: string,
  playByPlayLabel: string,
) {
  await page.getByRole("button", { name: new RegExp(playerLastName) }).click();
  await page.getByRole("button", { name: buttonLabel, exact: true }).click();
  await expect(
    page.getByText(new RegExp(`${playerLastName} - ${playByPlayLabel}`)),
  ).toBeVisible();
}

const API_HOST = /http:\/\/(127\.0\.0\.1|localhost):8000\//;

async function cutApi(page: import("@playwright/test").Page) {
  await page.route(API_HOST, (route) => route.abort());
}

async function restoreApi(page: import("@playwright/test").Page) {
  await page.unroute(API_HOST);
}

test("offline recording survives reload and syncs once", async ({ page, request }) => {
  const { gameId, playerLastName, token } = await seedGame(request);

  await page.addInitScript((storedToken) => {
    localStorage.setItem("basketstats_token", storedToken);
  }, token);

  await page.goto(`/?game=${gameId}`);
  await expect(page.getByRole("heading", { name: "E2E Game" })).toBeVisible();

  await recordStat(page, playerLastName, "Interception", "Interception");

  await cutApi(page);
  await recordStat(page, playerLastName, "Passe", "Passe décisive");
  await expect(page.getByTestId("sync-badge")).toHaveText(/Hors ligne|Attente de sync/);

  await page.reload();
  await expect(page.getByText(/Doe - Interception/)).toBeVisible();
  await expect(page.getByText(/Doe - Passe décisive/)).toBeVisible();

  await restoreApi(page);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  // The badge only surfaces something worth knowing (pending/offline), so a
  // fully drained queue is expressed by the badge disappearing entirely.
  await expect(page.getByTestId("sync-badge")).toHaveCount(0, { timeout: 20_000 });

  const headers = { Authorization: `Bearer ${token}` };
  const events = await (await request.get(`${API}/games/${gameId}/events`, { headers })).json();
  expect(events).toHaveLength(2);
  expect(new Set(events.map((event: { id: string }) => event.id)).size).toBe(2);

  const replay = await request.post(`${API}/games/${gameId}/events/batch`, {
    headers,
    data: {
      events: events.map((event: Record<string, unknown>) => ({
        id: event.id,
        seq: event.seq,
        period: event.period,
        game_clock: event.game_clock,
        wall_time: event.wall_time,
        actor: event.actor,
        player_id: event.player_id,
        action_type: event.action_type,
        x: event.x,
        y: event.y,
        meta: event.meta,
        voided: event.voided,
      })),
    },
  });
  expect(await replay.json()).toEqual({ inserted: 0, skipped_existing: 2 });
  const afterReplay = await (
    await request.get(`${API}/games/${gameId}/events`, { headers })
  ).json();
  expect(afterReplay).toHaveLength(2);
});

test("substitutions entered offline give the server the right playing time", async ({
  page,
  request,
}) => {
  const { gameId, playerLastName, benchLastName, token } = await seedGame(request, "Bench");

  await page.addInitScript((storedToken) => {
    localStorage.setItem("basketstats_token", storedToken);
  }, token);

  await page.goto(`/?game=${gameId}`);
  await expect(page.getByRole("heading", { name: "E2E Game" })).toBeVisible();
  await expect(page.getByText("Sur le terrain : 1/5")).toBeVisible();

  await cutApi(page);

  // Swap the starter out for the bench player at the very top of Q1, so the
  // expected split is exact and owes nothing to real elapsed time: the starter
  // never plays a second, the substitute is on the floor from there on.
  await page.getByRole("button", { name: "Changement", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(playerLastName) }).click();
  await page.getByRole("button", { name: new RegExp(benchLastName!) }).click();
  await expect(page.getByRole("button", { name: new RegExp(benchLastName!) })).toHaveAttribute(
    "title",
    "Sur le terrain",
  );

  // Move the journal on to Q2 so Q1 is closed out and its minutes are credited.
  await page.getByRole("button", { name: "Terminer le changement" }).click();
  await page.getByRole("button", { name: "Q2", exact: true }).click();
  await recordStat(page, benchLastName!, "Interception", "Interception");

  await page.reload();
  await expect(page.getByText(new RegExp(`${benchLastName} - Interception`))).toBeVisible();

  await restoreApi(page);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("sync-badge")).toHaveCount(0, { timeout: 20_000 });

  const headers = { Authorization: `Bearer ${token}` };
  const events = await (await request.get(`${API}/games/${gameId}/events`, { headers })).json();
  expect(events.map((event: { action_type: string }) => event.action_type)).toEqual([
    "SUB_OUT",
    "SUB_IN",
    "STEAL",
  ]);

  // Subbed out at 10:00 in Q1, the starter played nothing; the substitute was
  // on the floor for the whole of Q1 and Q2, so two full 10-minute quarters.
  const boxScore = await (await request.get(`${API}/games/${gameId}/box-score`, { headers })).json();
  const minutes = boxScore.players
    .map((row: { minutes: number }) => row.minutes)
    .sort((a: number, b: number) => a - b);
  expect(minutes).toEqual([0, 20]);
});

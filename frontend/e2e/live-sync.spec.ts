import { expect, test, type APIRequestContext } from "@playwright/test";

const API = "http://127.0.0.1:8000";

interface SeededGame {
  gameId: string;
  playerLastName: string;
  token: string;
}

async function seedGame(request: APIRequestContext): Promise<SeededGame> {
  const registerResponse = await request.post(`${API}/auth/register`, {
    data: {
      org_name: "E2E Club",
      email: `e2e-${Date.now()}@example.com`,
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
  const roster = await request.post(`${API}/games/${game.id}/roster`, {
    headers,
    data: { player_id: player.id, is_starter: true, dnp: false },
  });
  expect(roster.ok()).toBeTruthy();
  return { gameId: game.id, playerLastName: player.last_name, token };
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
  await expect(page.getByTestId("sync-badge")).toHaveText("Synchronisé", { timeout: 20_000 });

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

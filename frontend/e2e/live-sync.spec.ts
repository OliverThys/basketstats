import { expect, test, type APIRequestContext } from "@playwright/test";

const API = "http://127.0.0.1:8000";

interface SeededGame {
  gameId: string;
  playerLastName: string;
}

async function seedGame(request: APIRequestContext): Promise<SeededGame> {
  const org = await (await request.post(`${API}/organizations`, { data: { name: "E2E Club" } })).json();
  const team = await (
    await request.post(`${API}/teams`, { data: { org_id: org.id, name: "E2E Home" } })
  ).json();
  const player = await (
    await request.post(`${API}/players`, {
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
      data: {
        org_id: org.id,
        home_team_id: team.id,
        opponent_name: "E2E Away",
        game_date: new Date().toISOString(),
        label: "E2E Game",
      },
    })
  ).json();
  const roster = await request.post(`${API}/games/${game.id}/roster`, {
    data: { player_id: player.id, is_starter: true, dnp: false },
  });
  expect(roster.ok()).toBeTruthy();
  return { gameId: game.id, playerLastName: player.last_name };
}

async function recordStat(page: import("@playwright/test").Page, playerLastName: string, stat: string) {
  await page.getByRole("button", { name: new RegExp(playerLastName) }).click();
  await page.getByRole("button", { name: stat, exact: true }).click();
  await expect(page.getByText(new RegExp(`${playerLastName} - ${stat}`))).toBeVisible();
}

const API_HOST = /http:\/\/(127\.0\.0\.1|localhost):8000\//;

async function cutApi(page: import("@playwright/test").Page) {
  await page.route(API_HOST, (route) => route.abort());
}

async function restoreApi(page: import("@playwright/test").Page) {
  await page.unroute(API_HOST);
}

test("offline recording survives reload and syncs once", async ({ page, request }) => {
  const { gameId, playerLastName } = await seedGame(request);

  await page.goto(`/?game=${gameId}`);
  await expect(page.getByRole("heading", { name: "E2E Game" })).toBeVisible();

  await recordStat(page, playerLastName, "Steal");

  await cutApi(page);
  await recordStat(page, playerLastName, "Assist");
  await expect(page.getByTestId("sync-badge")).toHaveText(/Offline|Sync pending/);

  await page.reload();
  await expect(page.getByText(/Doe - Steal/)).toBeVisible();
  await expect(page.getByText(/Doe - Assist/)).toBeVisible();

  await restoreApi(page);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("sync-badge")).toHaveText("Synced", { timeout: 20_000 });

  const events = await (await request.get(`${API}/games/${gameId}/events`)).json();
  expect(events).toHaveLength(2);
  expect(new Set(events.map((event: { id: string }) => event.id)).size).toBe(2);

  const replay = await request.post(`${API}/games/${gameId}/events/batch`, {
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
  const afterReplay = await (await request.get(`${API}/games/${gameId}/events`)).json();
  expect(afterReplay).toHaveLength(2);
});

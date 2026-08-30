import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./repository.js";

const auth = async (headers: Record<string, string | string[] | undefined>) => {
  const value = headers["x-test-user"];
  if (typeof value !== "string") throw new Error("unauthorized");
  return value;
};

describe("BodyFitness API", () => {
  it("requires authentication for cloud routes", async () => {
    const app = await buildApp({ repository: new MemoryRepository(), authenticate: auth });
    const response = await app.inject({ method: "GET", url: "/v1/circle" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("creates mutual connections and filters exact steps by policy", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth, webAppUrl: "https://bodyfitness.example" });
    await app.inject({ method: "PUT", url: "/v1/me/profile", headers: { "x-test-user": "user_a" }, payload: { displayName: "Asha", handle: "asha_fit", birthDate: "2000-01-01", timezone: "Asia/Kolkata", primaryStepSource: null } });
    await app.inject({ method: "PUT", url: "/v1/me/profile", headers: { "x-test-user": "user_b" }, payload: { displayName: "Ravi", handle: "ravi_fit", birthDate: "2001-01-01", timezone: "Asia/Kolkata", primaryStepSource: null } });
    const invite = await app.inject({ method: "POST", url: "/v1/invites", headers: { "x-test-user": "user_a" }, payload: { handle: "ravi_fit" } });
    const token = invite.json().token as string;
    expect((await app.inject({ method: "POST", url: `/v1/invites/${token}/accept`, headers: { "x-test-user": "user_b" } })).statusCode).toBe(200);
    await app.inject({ method: "POST", url: "/v1/health/steps", headers: { "x-test-user": "user_a" }, payload: { date: "2026-08-19", steps: 12000, source: "apple-health", deviceId: "ios-a", syncedAt: "2026-08-19T10:00:00.000Z", isManualOverride: false } });
    const circle = (await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_b" } })).json();
    expect(circle.members[0].summary.steps).toBeNull();
    expect(circle.members[0].summary.stepGoalPercent).toBe(1.2);
    const connectionId = circle.members[0].connection.id as string;
    expect((await app.inject({ method: "PUT", url: `/v1/connections/${connectionId}/sharing`, headers: { "x-test-user": "user_a" }, payload: { achievements: true, goalProgress: true, exactSteps: true, workoutSummaries: false, personalRecords: false, nutrition: false, weight: false } })).statusCode).toBe(200);
    const optedIn = (await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_b" } })).json();
    expect(optedIn.members[0].summary.steps).toBe(12000);
    await app.close();
  });

  it("denies unconnected users and revokes access immediately", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth });
    const connectionId = await connect(app, "user_a", "asha_fit", "user_b", "ravi_fit");
    expect((await app.inject({ method: "GET", url: "/v1/circle/user_a", headers: { "x-test-user": "stranger" } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/v1/circle/user_a", headers: { "x-test-user": "user_b" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "DELETE", url: `/v1/connections/${connectionId}`, headers: { "x-test-user": "user_a" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/v1/circle/user_a", headers: { "x-test-user": "user_b" } })).statusCode).toBe(404);
    await app.close();
  });

  it("rejects expired invitations and hides blocked connections", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth });
    await setProfile(app, "user_a", "Asha", "asha_fit", "2000-01-01");
    await setProfile(app, "user_b", "Ravi", "ravi_fit", "2001-01-01");
    const invite = await app.inject({ method: "POST", url: "/v1/invites", headers: { "x-test-user": "user_a" }, payload: { handle: "ravi_fit" } });
    const expiredToken = invite.json().token as string;
    repository.invites.get(expiredToken)!.expiresAt = "2020-01-01T00:00:00.000Z";
    expect((await app.inject({ method: "POST", url: `/v1/invites/${expiredToken}/accept`, headers: { "x-test-user": "user_b" } })).statusCode).toBe(410);

    const connectionId = await connect(app, "user_a", "asha_fit", "user_b", "ravi_fit");
    expect((await app.inject({ method: "POST", url: `/v1/connections/${connectionId}/block`, headers: { "x-test-user": "user_b" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_a" } })).json().members).toEqual([]);
    await app.close();
  });

  it("deduplicates sync retries and returns revision conflicts", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth });
    const record = { entity: "settings", entityId: "preferences", revision: 2, updatedAt: "2026-08-19T10:00:00.000Z", deletedAt: null, payload: { themePreference: "dark" } };
    const envelope = { deviceId: "web-1", cursor: null, idempotencyKey: "retry-key-0001", records: [record] };
    const first = await app.inject({ method: "POST", url: "/v1/sync/batch", headers: { "x-test-user": "user_a" }, payload: envelope });
    const retry = await app.inject({ method: "POST", url: "/v1/sync/batch", headers: { "x-test-user": "user_a" }, payload: envelope });
    expect(retry.json()).toEqual(first.json());
    expect(repository.records.size).toBe(1);

    const stale = await app.inject({ method: "POST", url: "/v1/sync/batch", headers: { "x-test-user": "user_a" }, payload: { ...envelope, idempotencyKey: "retry-key-0002", records: [{ ...record, revision: 1, payload: { themePreference: "light" } }] } });
    expect(stale.json().conflicts).toHaveLength(1);
    expect(stale.json().conflicts[0].payload.themePreference).toBe("dark");
    await app.close();
  });

  it("keeps teen accounts private with the same default sharing", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth });
    await setProfile(app, "teen_a", "Teen A", "teen_a", "2013-08-19");
    await setProfile(app, "teen_b", "Teen B", "teen_b", "2012-01-01");
    await connect(app, "teen_a", "teen_a", "teen_b", "teen_b");
    const circle = (await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "teen_a" } })).json();
    expect(circle.members[0].connection.sharing).toMatchObject({ achievements: true, goalProgress: true, exactSteps: false, workoutSummaries: false, weight: false });
    await app.close();
  });

  it("uses one primary health source and restores it after a manual override", async () => {
    const repository = new MemoryRepository();
    const app = await buildApp({ repository, authenticate: auth });
    await connect(app, "user_a", "asha_fit", "user_b", "ravi_fit");
    const postSteps = (source: "apple-health" | "health-connect" | "manual", steps: number, isManualOverride = false) => app.inject({ method: "POST", url: "/v1/health/steps", headers: { "x-test-user": "user_a" }, payload: { date: "2026-08-19", steps, source, deviceId: source === "manual" ? null : source, syncedAt: `2026-08-19T10:${String(steps % 60).padStart(2, "0")}:00.000Z`, isManualOverride } });
    await postSteps("apple-health", 5000);
    await postSteps("health-connect", 9000);
    expect((await app.inject({ method: "GET", url: "/v1/me/profile", headers: { "x-test-user": "user_a" } })).json().primaryStepSource).toBe("apple-health");
    expect((await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_b" } })).json().members[0].summary.stepGoalPercent).toBe(0.5);

    await postSteps("manual", 7000, true);
    expect((await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_b" } })).json().members[0].summary.stepGoalPercent).toBe(0.7);
    await postSteps("apple-health", 6000);
    expect((await app.inject({ method: "GET", url: "/v1/me/profile", headers: { "x-test-user": "user_a" } })).json().primaryStepSource).toBe("apple-health");
    expect((await app.inject({ method: "GET", url: "/v1/circle", headers: { "x-test-user": "user_b" } })).json().members[0].summary.stepGoalPercent).toBe(0.6);
    expect((await app.inject({ method: "GET", url: "/v1/health/steps?date=2026-08-19", headers: { "x-test-user": "user_a" } })).json()).toHaveLength(3);
    await app.close();
  });

  it("rejects profiles younger than thirteen", async () => {
    const app = await buildApp({ repository: new MemoryRepository(), authenticate: auth });
    const response = await app.inject({ method: "PUT", url: "/v1/me/profile", headers: { "x-test-user": "teen" }, payload: { displayName: "Young", handle: "young_user", birthDate: new Date().toISOString().slice(0, 10), timezone: "UTC", primaryStepSource: null } });
    expect(response.statusCode).toBe(422);
    await app.close();
  });
});

async function setProfile(app: Awaited<ReturnType<typeof buildApp>>, userId: string, displayName: string, handle: string, birthDate: string) {
  return app.inject({ method: "PUT", url: "/v1/me/profile", headers: { "x-test-user": userId }, payload: { displayName, handle, birthDate, timezone: "UTC", primaryStepSource: null } });
}

async function connect(app: Awaited<ReturnType<typeof buildApp>>, userA: string, handleA: string, userB: string, handleB: string) {
  await setProfile(app, userA, "User A", handleA, "2000-01-01");
  await setProfile(app, userB, "User B", handleB, "2001-01-01");
  const invite = await app.inject({ method: "POST", url: "/v1/invites", headers: { "x-test-user": userA }, payload: { handle: handleB } });
  const accepted = await app.inject({ method: "POST", url: `/v1/invites/${invite.json().token}/accept`, headers: { "x-test-user": userB } });
  return accepted.json().connectionId as string;
}

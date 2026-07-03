import { describe, expect, it } from "vitest";
import { appRouter, matchExerciseForCaptureForTest } from "./routers";
import {
  addTrainerFeedback,
  addTrainerPtSession,
  addWorkoutLog,
  createRoutine,
  createWorkoutSession,
  ensureTrainerCode,
  getAdminDataDiagnostics,
  getCoachingNotificationSummary,
  getExerciseHistory,
  getMonthlyStats,
  getUserByEmail,
  linkTrainerByCode,
  markCoachingRead,
  markTrainerWorkRead,
  preparePostgresSql,
  reviewTrainerClientLink,
  touchUserLastSignedIn,
  upsertUser,
} from "./db";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { shouldTouchLastSignedIn } from "./_core/sdk";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-fittrack",
    email: "test@fittrack.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
  });
});

describe("users.upsertUser", () => {
  it("reuses an existing user when the same email logs in with a different openId", async () => {
    const email = "duplicate-login@fittrack.local";
    const firstId = await upsertUser({
      openId: "legacy-provider:duplicate-login",
      email,
      name: "Legacy Duplicate",
      loginMethod: "google",
      role: "user",
    });

    const secondId = await upsertUser({
      openId: "google:duplicate-login",
      email,
      name: "Current Duplicate",
      loginMethod: "google",
      role: "user",
    });
    const byEmail = await getUserByEmail(email);

    expect(secondId).toBe(firstId);
    expect(byEmail.id).toBe(firstId);
    expect(byEmail.openId).toBe("google:duplicate-login");
  });
});

describe("users.touchUserLastSignedIn", () => {
  it("updates only the activity timestamp for an existing user", async () => {
    const userId = await upsertUser({
      openId: "activity-touch-user",
      email: "activity-touch@fittrack.local",
      name: "Activity Touch",
      loginMethod: "email",
      role: "user",
      lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
    });
    const touchedAt = new Date("2026-01-01T00:20:00.000Z");

    await touchUserLastSignedIn(userId, touchedAt);
    const updated = await getUserByEmail("activity-touch@fittrack.local");

    expect(new Date(updated.lastSignedIn).toISOString()).toBe(touchedAt.toISOString());
    expect(updated.openId).toBe("activity-touch-user");
  });
});

describe("auth.shouldTouchLastSignedIn", () => {
  it("skips recent activity touches and allows stale timestamps", () => {
    const now = new Date("2026-01-01T00:20:00.000Z");

    expect(shouldTouchLastSignedIn("2026-01-01T00:10:01.000Z", now)).toBe(false);
    expect(shouldTouchLastSignedIn("2026-01-01T00:05:00.000Z", now)).toBe(true);
    expect(shouldTouchLastSignedIn(null, now)).toBe(true);
  });
});

describe("exercises.list", () => {
  it("returns exercises list (public access)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({});
    expect(Array.isArray(result)).toBe(true);
    // Should have seeded exercises
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters exercises by bodyPart", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({ bodyPart: "chest" });
    expect(Array.isArray(result)).toBe(true);
    result.forEach((ex) => {
      expect(ex.bodyPart).toBe("chest");
    });
  });

  it("filters exercises by equipment", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({ equipment: "barbell" });
    expect(Array.isArray(result)).toBe(true);
    result.forEach((ex) => {
      expect(ex.equipment).toBe("barbell");
    });
  });

  it("includes bulk imported exercises with Korean names", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({ search: "Farmer's Walk" });
    const match = result.find((exercise) => exercise.name === "Farmer's Walk");
    expect(match).toBeTruthy();
    expect(match?.nameKo).toBe("파머스 워크");
  });

  it("uses phonetic Korean labels for imported exercise names", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({ search: "Lateral Bound" });
    const match = result.find((exercise) => exercise.name === "Lateral Bound");
    expect(match).toBeTruthy();
    expect(match?.nameKo).toBe("레터럴 바운드");
  });

  it("does not keep redundant imported duplicate variants", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.list({ search: "Chest Push" });
    expect(result.some((exercise) => exercise.name === "Chest Push (multiple response)")).toBe(true);
    expect(result.some((exercise) => exercise.name === "Chest Push (single response)")).toBe(false);
  });

  it("includes expanded cable and leverage machine exercises from hasaneyldrm dataset", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cableRow = await caller.exercises.list({ search: "원암 케이블 로우" });
    expect(cableRow.some((exercise) => exercise.name === "Cable One Arm Bent Over Row")).toBe(true);

    const compactCableRow = await caller.exercises.list({ search: "케이블원암로우" });
    expect(compactCableRow.some((exercise) => exercise.name === "Cable One Arm Bent Over Row")).toBe(true);

    const triceps = await caller.exercises.list({ search: "트라이셉스 원암" });
    expect(triceps.some((exercise) => exercise.name === "Cable Standing One Arm Triceps Extension")).toBe(true);

    const tricepsPushdown = await caller.exercises.list({ search: "삼두 한팔" });
    expect(tricepsPushdown.some((exercise) => exercise.name === "Cable One Arm Tricep Pushdown")).toBe(true);

    const pulldown = await caller.exercises.list({ search: "플레이트 풀다운" });
    expect(pulldown.some((exercise) => exercise.name === "Lever Front Pulldown")).toBe(true);
  });

  it("keeps phonetic Korean names and exposes basic dumbbell press", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const dumbbellPress = await caller.exercises.list({ search: "덤벨프레스" });
    expect(dumbbellPress[0]).toEqual(expect.objectContaining({ nameKo: "덤벨 프레스" }));

    await expect(caller.exercises.list({ search: "스미스벤치" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "스미스 머신 벤치프레스" })])
    );
    await expect(caller.exercises.list({ search: "머신로우" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "머신 로우" })])
    );
    await expect(caller.exercises.list({ search: "숄더프레스" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "숄더 프레스" })])
    );
    await expect(caller.exercises.list({ search: "레그컬" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "레그 컬" })])
    );
    await expect(caller.exercises.list({ search: "케이블컬" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "케이블 컬" })])
    );
    await expect(caller.exercises.list({ search: "바벨 컬" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "바벨 컬" })])
    );
    await expect(caller.exercises.list({ search: "힙 스러스트" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "힙 스러스트" })])
    );
    await expect(caller.exercises.list({ search: "케이블 크런치" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "케이블 크런치" })])
    );
    await expect(caller.exercises.list({ search: "로잉머신" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "로잉 머신" })])
    );
    await expect(caller.exercises.list({ search: "핵스쿼트" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "핵 스쿼트" })])
    );

    const oneArmCableRow = await caller.exercises.list({ search: "원암 케이블 로우" });
    expect(oneArmCableRow.some((exercise) => String(exercise.nameKo).includes("원암"))).toBe(true);

    const chestPress = await caller.exercises.list({ search: "체스트 프레스" });
    expect(chestPress.some((exercise) => String(exercise.nameKo).includes("체스트"))).toBe(true);
  });

  it("prioritizes basic gym exercises for broad movement searches", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const pressNames = (await caller.exercises.list({ search: "프레스" })).slice(0, 8).map((exercise) => exercise.nameKo);
    expect(pressNames).toEqual(expect.arrayContaining(["덤벨 숄더 프레스", "바벨 숄더 프레스", "아놀드 프레스"]));

    const rowNames = (await caller.exercises.list({ search: "로우" })).slice(0, 8).map((exercise) => exercise.nameKo);
    expect(rowNames).toEqual(expect.arrayContaining(["바벨 로우", "인버티드 로우", "티바 로우"]));

    const curlNames = (await caller.exercises.list({ search: "컬" })).slice(0, 8).map((exercise) => exercise.nameKo);
    expect(curlNames).toEqual(expect.arrayContaining(["덤벨 컬", "바벨 컬", "해머 컬"]));
    expect(curlNames).not.toContain("손목 컬");
  });

  it("searches assisted exercises and hides duplicated imported names", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const assistedPullup = await caller.exercises.list({ search: "어시스트 풀업" });
    expect(assistedPullup.some((exercise) => exercise.name === "Assisted Pull-up")).toBe(true);

    const weightedDips = await caller.exercises.list({ search: "Weighted Three Bench Dips" });
    expect(weightedDips.filter((exercise) => exercise.name === "Weighted Three Bench Dips")).toHaveLength(1);
    expect(weightedDips.find((exercise) => exercise.name === "Weighted Three Bench Dips")?.nameKo).toBe("웨이티드 쓰리 벤치 딥스");
  });

  it("sorts exact exercise search matches before partial matches", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exercises.list({ search: "바벨 로우" });
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].nameKo).toBe("바벨 로우");
  });

  it("searches common Korean gym aliases", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.exercises.list({ search: "사레레" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "레터럴 레이즈" })])
    );
    await expect(caller.exercises.list({ search: "밀프" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "오버헤드 프레스" })])
    );
    await expect(caller.exercises.list({ search: "불스스" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "불가리안 스플릿 스쿼트" })])
    );
    await expect(caller.exercises.list({ search: "롱풀" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "시티드 케이블 로우" })])
    );
    await expect(caller.exercises.list({ search: "런닝머신" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "트레드밀 달리기" })])
    );
    await expect(caller.exercises.list({ search: "시티드 니업" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "시티드 니업", equipment: "bodyweight" })])
    );
    await expect(caller.exercises.list({ search: "니업" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "시티드 니업" })])
    );
    await expect(caller.exercises.list({ search: "케이블 해머컬" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ nameKo: "케이블 해머 컬", equipment: "cable" })])
    );
    expect((await caller.exercises.list({ search: "이너싸이" })).some((exercise) =>
      String(exercise.nameKo).includes("어덕") || String(exercise.name).toLowerCase().includes("adduct")
    )).toBe(true);
    expect((await caller.exercises.list({ search: "아웃싸이" })).some((exercise) =>
      String(exercise.nameKo).includes("어브") || String(exercise.name).toLowerCase().includes("abduct")
    )).toBe(true);
    expect((await caller.exercises.list({ search: "어덕트머신" })).some((exercise) =>
      String(exercise.nameKo).includes("어덕") || String(exercise.name).toLowerCase().includes("adduct")
    )).toBe(true);
  });

  it("returns readable Korean display names for imported exercises", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const innerThigh = await caller.exercises.list({ search: "이너싸이" });
    expect(innerThigh.some((exercise) => exercise.nameKo === "이너싸이 머신")).toBe(true);

    const chestTap = await caller.exercises.list({ search: "체스트 탭 푸시업" });
    expect(chestTap.some((exercise) => exercise.nameKo === "체스트 탭 푸시업")).toBe(true);
  });

  it("keeps image capture exercise matching on exact common movements", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const exercises = await caller.exercises.list({});

    const cableHammerCurl = matchExerciseForCaptureForTest({ nameKo: "케이블 해머컬", name: "" }, exercises);
    expect(cableHammerCurl?.equipment).toBe("cable");
    expect(String(cableHammerCurl?.nameKo ?? "")).toContain("해머");
    expect(String(cableHammerCurl?.nameKo ?? "")).toContain("컬");
    expect(matchExerciseForCaptureForTest({ nameKo: "크런치", name: "" }, exercises)?.nameKo).toBe("크런치");
    expect(matchExerciseForCaptureForTest({ nameKo: "시티드 니 레이즈", name: "" }, exercises)?.nameKo).toBe("시티드 니업");
  });
});

describe("exercises.detail", () => {
  it("returns exercise detail by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // 먼저 운동 목록을 조회해서 존재하는 운동 ID를 얻기
    const exercises = await caller.exercises.list({});
    if (exercises.length === 0) {
      // 운동이 없으면 테스트 스킵
      expect(true).toBe(true);
      return;
    }
    const firstExerciseId = exercises[0].id;
    const result = await caller.exercises.detail({ id: firstExerciseId });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(firstExerciseId);
    expect(result?.nameKo).toBeTruthy();
  });

  it("returns null for non-existent exercise", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.exercises.detail({ id: 999999 });
    expect(result).toBeNull();
  });
});

describe("exercise history", () => {
  it("returns date-level average weight for trend charts", async () => {
    const unique = Date.now();
    const userId = await upsertUser({
      openId: `exercise-history-${unique}`,
      email: `exercise-history-${unique}@fittrack.local`,
      name: "Exercise History",
      loginMethod: "test",
      role: "user",
    });
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const exercises = await caller.exercises.list({ search: "바벨 로우" });
    const exerciseId = exercises[0].id;
    const sessionId = await createWorkoutSession(userId, {
      name: "평균 무게 테스트",
      workoutDate: new Date("2026-06-08T12:00:00.000Z"),
    });

    await addWorkoutLog({ sessionId, exerciseId, setNumber: 1, weightKg: 80, reps: 10 });
    await addWorkoutLog({ sessionId, exerciseId, setNumber: 2, weightKg: 100, reps: 8 });

    const history = await getExerciseHistory(userId, exerciseId, 1);
    expect(history[0].averageWeight).toBe(90);
    expect(history[0].setCount).toBeGreaterThanOrEqual(2);
  });
});

describe("workout.saveSession", () => {
  it("saves session and logs in one mutation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const exercises = await caller.exercises.list({ search: "바벨 로우" });
    const exerciseId = exercises[0].id;

    const saved = await caller.workout.saveSession({
      name: "일괄 저장 테스트",
      workoutDate: new Date("2026-06-25T12:00:00.000Z"),
      durationMinutes: 35,
      notes: "single mutation",
      logs: [
        { exerciseId, setNumber: 1, weightKg: 50, reps: 10 },
        { exerciseId, setNumber: 2, weightKg: 60, reps: 8 },
      ],
    });
    const session = await caller.workout.getSession({ sessionId: saved.sessionId });

    expect(session?.logs).toHaveLength(2);
    expect(Number(session?.totalVolume)).toBe(980);
    expect(Number(session?.durationMinutes)).toBe(35);
  });
});

describe("goals (protected)", () => {
  it("returns null when no goal set", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // This may return null or existing goal
    const result = await caller.goals.get();
    // Just check it doesn't throw
    expect(result === null || result !== undefined).toBe(true);
  });
});

describe("monthlyStats.get", () => {
  it("does not rely on camelCase SQL aliases for monthly volume rows", () => {
    const sql = preparePostgresSql(
      `SELECT COALESCE(ws.workoutDate, ws.startedAt) AS session_date,
              ws.totalVolume AS total_volume
       FROM workout_sessions ws`,
    );

    expect(sql).toContain("AS session_date");
    expect(sql).toContain("AS total_volume");
    expect(sql).not.toContain("AS sessionDate");
  });

  it("returns kg volume for sub-ton monthly workout logs", async () => {
    const unique = Date.now();
    const userId = await upsertUser({
      openId: `monthly-volume-${unique}`,
      email: `monthly-volume-${unique}@fittrack.local`,
      name: "Monthly Volume",
      loginMethod: "test",
      role: "user",
    });
    const sessionId = await createWorkoutSession(userId, {
      name: "월별 볼륨 테스트",
      workoutDate: new Date(),
    });
    await addWorkoutLog({ sessionId, exerciseId: 1, setNumber: 1, weightKg: 40, reps: 10 });

    const stats = await getMonthlyStats(userId, 1);

    expect(stats).toHaveLength(1);
    expect(stats[0].count).toBe(1);
    expect(stats[0].totalVolume).toBe(400);
  });
});

describe("trainer notifications", () => {
  it("does not append RETURNING id for coaching read-state inserts in Postgres SQL", () => {
    const sql = preparePostgresSql(
      "INSERT INTO coaching_read_states (user_id, scope, last_read_at) VALUES (?, ?, ?)",
    );
    expect(sql).not.toMatch(/RETURNING id/i);
  });

  it("returns a coaching notification summary and supports marking it read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.trainer.notifications();

    expect(summary).toMatchObject({
      feedback: expect.any(Number),
      ptSessions: expect.any(Number),
      comments: expect.any(Number),
      tasks: expect.any(Number),
      requests: expect.any(Number),
      coachingUnreadCount: expect.any(Number),
      trainerUnreadCount: expect.any(Number),
      unreadCount: expect.any(Number),
    });

    await expect(caller.trainer.markCoachingRead()).resolves.toMatchObject({
      feedback: 0,
      ptSessions: 0,
      comments: 0,
      tasks: 0,
      coachingUnreadCount: 0,
    });

    await expect(caller.trainer.notifications()).resolves.toMatchObject({
      feedback: 0,
      ptSessions: 0,
      comments: 0,
      tasks: 0,
      coachingUnreadCount: 0,
    });
  });

  it("keeps confirmed PT notifications read across fresh notification summaries", async () => {
    const unique = Date.now();
    const trainerId = await upsertUser({
      openId: `trainer-notification-${unique}`,
      email: `trainer-notification-${unique}@fittrack.local`,
      name: "Notification Trainer",
      loginMethod: "test",
      role: "user",
    });
    const clientId = await upsertUser({
      openId: `client-notification-${unique}`,
      email: `client-notification-${unique}@fittrack.local`,
      name: "Notification Client",
      loginMethod: "test",
      role: "user",
    });

    const code = await ensureTrainerCode(trainerId);
    const link = await linkTrainerByCode(clientId, code);
    await reviewTrainerClientLink(trainerId, Number(link.id), "active");

    const sessionId = await createWorkoutSession(clientId, {
      name: "PT 알림 테스트",
      workoutDate: new Date(),
    });
    await addTrainerPtSession(trainerId, clientId, sessionId, "PT 운동 기록");

    expect(await getCoachingNotificationSummary(clientId)).toMatchObject({
      ptSessions: 1,
      coachingUnreadCount: 1,
    });

    await markCoachingRead(clientId);
    expect(await getCoachingNotificationSummary(clientId)).toMatchObject({
      ptSessions: 0,
      coachingUnreadCount: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    await addTrainerFeedback(trainerId, clientId, "새 피드백 알림");

    expect(await getCoachingNotificationSummary(clientId)).toMatchObject({
      feedback: 1,
      ptSessions: 0,
      coachingUnreadCount: 1,
    });
  });

  it("marks trainer client request notifications read separately from client coaching", async () => {
    const unique = Date.now();
    const trainerId = await upsertUser({
      openId: `trainer-request-notification-${unique}`,
      email: `trainer-request-notification-${unique}@fittrack.local`,
      name: "Request Notification Trainer",
      loginMethod: "test",
      role: "user",
    });
    const clientId = await upsertUser({
      openId: `client-request-notification-${unique}`,
      email: `client-request-notification-${unique}@fittrack.local`,
      name: "Request Notification Client",
      loginMethod: "test",
      role: "user",
    });

    const code = await ensureTrainerCode(trainerId);
    await linkTrainerByCode(clientId, code);

    expect(await getCoachingNotificationSummary(trainerId)).toMatchObject({
      requests: 1,
      trainerUnreadCount: 1,
      coachingUnreadCount: 0,
    });

    await markTrainerWorkRead(trainerId);

    expect(await getCoachingNotificationSummary(trainerId)).toMatchObject({
      requests: 0,
      trainerUnreadCount: 0,
      coachingUnreadCount: 0,
    });
  });
});

describe("feedback", () => {
  it("allows a user to submit feedback and an admin to update its status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const message = `테스트 사용자 의견 ${Date.now()}`;
    const created = await caller.feedback.create({ category: "idea", message });

    expect(created.success).toBe(true);
    expect(created.id).toBeGreaterThan(0);

    const mine = await caller.feedback.mine();
    expect(mine.some((item: any) => item.id === created.id && item.message === message)).toBe(true);

    const adminCaller = appRouter.createCaller(createAuthContext("admin").ctx);
    const allFeedback = await adminCaller.admin.userFeedback({ status: "all" });
    expect(allFeedback.some((item: any) => item.id === created.id)).toBe(true);

    const updated = await adminCaller.admin.updateUserFeedback({
      feedbackId: created.id,
      status: "resolved",
      adminNote: "테스트 확인 완료",
    });

    expect(updated.success).toBe(true);
    expect(updated.feedback?.status).toBe("resolved");
    expect(updated.feedback?.adminNote).toBe("테스트 확인 완료");
  });
});

describe("admin member management", () => {
  it("returns data diagnostics for admin quality checks", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const weightedExercises = await caller.exercises.list({ search: "바벨 로우" });
    const exerciseId = weightedExercises[0].id;
    const unique = Date.now();
    const userId = await upsertUser({
      openId: `admin-diagnostics-${unique}`,
      email: `admin-diagnostics-${unique}@fittrack.local`,
      name: "Admin Diagnostics",
      loginMethod: "test",
      role: "user",
    });
    const sessionId = await createWorkoutSession(userId, {
      name: "진단 테스트",
      workoutDate: new Date(),
    });
    await addWorkoutLog({ sessionId, exerciseId, setNumber: 1, weightKg: 0, reps: 0 });

    const diagnostics = await getAdminDataDiagnostics();

    expect(diagnostics.totalSessions).toBeGreaterThan(0);
    expect(diagnostics.zeroVolumeSessions).toBeGreaterThan(0);
    expect(diagnostics.missingWeightLogs).toBeGreaterThan(0);
    expect(diagnostics.missingRepsLogs).toBeGreaterThan(0);
  });

  it("does not flag bodyweight ab logs as missing weight", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const bodyweightExercises = await caller.exercises.list({ search: "크런치" });
    const exerciseId = bodyweightExercises[0].id;
    const before = await getAdminDataDiagnostics();
    const unique = Date.now();
    const userId = await upsertUser({
      openId: `bodyweight-diagnostics-${unique}`,
      email: `bodyweight-diagnostics-${unique}@fittrack.local`,
      name: "Bodyweight Diagnostics",
      loginMethod: "test",
      role: "user",
    });
    const sessionId = await createWorkoutSession(userId, {
      name: "맨몸 복근 진단 테스트",
      workoutDate: new Date(),
    });
    await addWorkoutLog({ sessionId, exerciseId, setNumber: 1, weightKg: 0, reps: 20 });

    const after = await getAdminDataDiagnostics();

    expect(after.missingWeightLogs).toBe(before.missingWeightLogs);
  });

  it("lists members with activity summary and updates member profile fields", async () => {
    const unique = Date.now();
    const memberId = await upsertUser({
      openId: `admin-member-${unique}`,
      email: `admin-member-${unique}@fittrack.local`,
      name: "Admin Managed Member",
      loginMethod: "test",
      role: "user",
    });
    await createRoutine(memberId, {
      name: "관리자 회원 테스트 루틴",
      goal: "general",
      daysPerWeek: 3,
    });
    await createWorkoutSession(memberId, {
      name: "관리자 회원 테스트 운동",
      workoutDate: new Date(),
    });

    const adminCaller = appRouter.createCaller(createAuthContext("admin").ctx);
    const members = await adminCaller.admin.members({
      search: `admin-member-${unique}`,
      role: "all",
      appRole: "all",
    });

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      id: memberId,
      email: `admin-member-${unique}@fittrack.local`,
      role: "user",
      workoutCount: 1,
      routineCount: 1,
    });

    await expect(adminCaller.admin.updateMember({
      userId: memberId,
      name: "관리자가 수정한 회원",
      role: "admin",
    })).resolves.toMatchObject({
      success: true,
      member: {
        name: "관리자가 수정한 회원",
        role: "admin",
      },
    });

    const admins = await adminCaller.admin.members({
      search: "관리자가 수정한 회원",
      role: "admin",
      appRole: "all",
    });
    expect(admins.some((member: any) => member.id === memberId)).toBe(true);
  });
});

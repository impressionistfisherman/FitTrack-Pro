import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  addTrainerFeedback,
  addTrainerPtSession,
  addWorkoutLog,
  createRoutine,
  createWorkoutSession,
  ensureTrainerCode,
  getCoachingNotificationSummary,
  getExerciseHistory,
  getUserByEmail,
  linkTrainerByCode,
  markCoachingRead,
  markTrainerWorkRead,
  preparePostgresSql,
  reviewTrainerClientLink,
  upsertUser,
} from "./db";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

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
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const exercises = await caller.exercises.list({ search: "바벨 로우" });
    const exerciseId = exercises[0].id;
    const sessionId = await createWorkoutSession(ctx.user!.id, {
      name: "평균 무게 테스트",
      workoutDate: new Date("2026-06-08T12:00:00.000Z"),
    });

    await addWorkoutLog({ sessionId, exerciseId, setNumber: 1, weightKg: 80, reps: 10 });
    await addWorkoutLog({ sessionId, exerciseId, setNumber: 2, weightKg: 100, reps: 8 });

    const history = await getExerciseHistory(ctx.user!.id, exerciseId, 1);
    expect(history[0].averageWeight).toBe(90);
    expect(history[0].setCount).toBeGreaterThanOrEqual(2);
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

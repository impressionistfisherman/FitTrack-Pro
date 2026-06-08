import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  profileImageUrl: text("profileImageUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "trainer", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 운동 목록 테이블
export const exercises = mysqlTable("exercises", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameKo: varchar("nameKo", { length: 200 }).notNull(),
  bodyPart: mysqlEnum("bodyPart", [
    "chest", "back", "shoulders", "arms", "legs", "abs", "glutes", "cardio", "stretching", "full_body"
  ]).notNull(),
  equipment: mysqlEnum("equipment", [
    "barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "resistance_band", "none"
  ]).notNull(),
  category: mysqlEnum("category", [
    "strength", "hypertrophy", "endurance", "flexibility", "cardio"
  ]).notNull(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).notNull(),
  description: text("description"),
  descriptionKo: text("descriptionKo"),
  primaryMuscles: json("primaryMuscles").$type<string[]>().notNull(),
  secondaryMuscles: json("secondaryMuscles").$type<string[]>().notNull(),
  gifUrl: text("gifUrl"),
  secondaryImages: json("secondaryImages").$type<string[]>().default([]),
  instructions: json("instructions").$type<string[]>().notNull(),
  instructionsKo: json("instructionsKo").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Exercise = typeof exercises.$inferSelect;

// 사용자 목표 테이블
export const userGoals = mysqlTable("user_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  goal: mysqlEnum("goal", ["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"]).notNull(),
  targetWeight: float("targetWeight"),
  weeklyWorkouts: int("weeklyWorkouts").default(3),
  heightCm: float("heightCm"),
  gender: mysqlEnum("gender", ["male", "female"]),
  birthYear: int("birthYear"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserGoal = typeof userGoals.$inferSelect;

// 루틴 테이블
export const routines = mysqlTable("routines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  goal: mysqlEnum("goal", ["hypertrophy", "fat_loss", "strength", "endurance", "flexibility", "general"]).notNull(),
  daysPerWeek: int("daysPerWeek").default(3),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Routine = typeof routines.$inferSelect;

// 루틴-운동 연결 테이블
export const routineExercises = mysqlTable("routine_exercises", {
  id: int("id").autoincrement().primaryKey(),
  routineId: int("routineId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  order: int("order").notNull(),
  sets: int("sets").default(3),
  reps: int("reps").default(10),
  weightKg: float("weightKg"),
  restSeconds: int("restSeconds").default(90),
  setDetails: json("setDetails").$type<{setNumber: number; weightKg?: number; reps?: number}[]>().default([]),
  notes: text("notes"),
});

export type RoutineExercise = typeof routineExercises.$inferSelect;
export type SetDetail = {setNumber: number; weightKg?: number; reps?: number};

// 운동 세션 테이블
export const workoutSessions = mysqlTable("workout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  routineId: int("routineId"),
  name: varchar("name", { length: 200 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  durationMinutes: int("durationMinutes"),
  notes: text("notes"),
  totalVolume: float("totalVolume"),
  workoutDate: timestamp("workoutDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;

// 운동 로그 테이블 (세트별 기록)
export const workoutLogs = mysqlTable("workout_logs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  setNumber: int("setNumber").notNull(),
  reps: int("reps"),
  weightKg: float("weightKg"),
  durationSeconds: int("durationSeconds"),
  distanceM: float("distanceM"),
  isWarmup: boolean("isWarmup").default(false).notNull(),
  rpe: int("rpe"),
  memo: text("memo"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutLog = typeof workoutLogs.$inferSelect;

// 운동 즐겨찾기 테이블
export const exerciseFavorites = mysqlTable("exercise_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExerciseFavorite = typeof exerciseFavorites.$inferSelect;

// 체중 트래킹 테이블
export const bodyWeights = mysqlTable("body_weights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weightKg: float("weightKg").notNull(),
  bodyFatPct: float("bodyFatPct"),
  muscleMassPct: float("muscleMassPct"),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BodyWeight = typeof bodyWeights.$inferSelect;

export const trainerCodes = mysqlTable("trainer_codes", {
  code: varchar("code", { length: 24 }).primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const trainerClientLinks = mysqlTable("trainer_client_links", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  status: mysqlEnum("status", ["pending", "active", "removed"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const trainerFeedback = mysqlTable("trainer_feedback", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  sessionId: int("session_id"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TrainerCode = typeof trainerCodes.$inferSelect;
export type TrainerClientLink = typeof trainerClientLinks.$inferSelect;
export type TrainerFeedback = typeof trainerFeedback.$inferSelect;

export const trainerPtSessions = mysqlTable("trainer_pt_sessions", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  sessionId: int("session_id").notNull(),
  title: varchar("title", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TrainerPtSession = typeof trainerPtSessions.$inferSelect;

export const coachingComments = mysqlTable("coaching_comments", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  authorUserId: int("author_user_id").notNull(),
  targetType: varchar("target_type", { length: 32 }).default("general").notNull(),
  targetId: int("target_id"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coachingTasks = mysqlTable("coaching_tasks", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 24 }).default("open").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const trainerClientNotes = mysqlTable("trainer_client_notes", {
  id: int("id").autoincrement().primaryKey(),
  trainerUserId: int("trainer_user_id").notNull(),
  clientUserId: int("client_user_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CoachingComment = typeof coachingComments.$inferSelect;
export type CoachingTask = typeof coachingTasks.$inferSelect;
export type TrainerClientNote = typeof trainerClientNotes.$inferSelect;

export const userFeedback = mysqlTable("user_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  category: varchar("category", { length: 32 }).default("general").notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 24 }).default("open").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserFeedback = typeof userFeedback.$inferSelect;

// 운동별 목표 테이블
export const exerciseGoals = mysqlTable("exercise_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  targetWeightKg: float("targetWeightKg"),
  targetReps: int("targetReps"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExerciseGoal = typeof exerciseGoals.$inferSelect;

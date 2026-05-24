import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "full_body",
  "cardio",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "skipped",
]);

// ─── Programs ─────────────────────────────────────────────────────────────────

/**
 * A program is a collection of workout templates, e.g. "Push / Pull / Legs".
 */
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Workouts ─────────────────────────────────────────────────────────────────

/**
 * A workout is a single routine inside a program, e.g. "Push Day A".
 */
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  programId: integer("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Exercises ────────────────────────────────────────────────────────────────

/**
 * Global exercise library, e.g. "Bench Press".
 */
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  muscleGroup: muscleGroupEnum("muscle_group").notNull(),
  secondaryMuscleGroup: muscleGroupEnum("secondary_muscle_group"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workout Exercises ────────────────────────────────────────────────────────

/**
 * Junction table: maps an exercise to a workout with target sets/reps.
 */
export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .references(() => workouts.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id, { onDelete: "cascade" })
    .notNull(),
  targetSets: integer("target_sets").default(3).notNull(),
  targetRepsMin: integer("target_reps_min").default(8),
  targetRepsMax: integer("target_reps_max").default(12),
  targetWeight: real("target_weight"),
  restTimerSets: integer("rest_timer_sets").default(90), // Rest seconds between sets
  restTimerExercise: integer("rest_timer_exercise").default(120), // Rest seconds after this exercise
  orderIndex: integer("order_index").default(0).notNull(),
  notes: text("notes"),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

/**
 * An active or completed workout instance tied to a date.
 */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").references(() => workouts.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  status: sessionStatusEnum("status").default("in_progress").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  bodyWeight: real("body_weight"),
});

// ─── Sets ─────────────────────────────────────────────────────────────────────

/**
 * The actual logged performance data: Weight x Reps per set.
 */
export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  rpe: real("rpe"), // Rate of Perceived Exertion (optional)
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const programsRelations = relations(programs, ({ many }) => ({
  workouts: many(workouts),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  program: one(programs, {
    fields: [workouts.programId],
    references: [programs.id],
  }),
  workoutExercises: many(workoutExercises),
  sessions: many(sessions),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
  sets: many(sets),
}));

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [sessions.workoutId],
    references: [workouts.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  session: one(sessions, {
    fields: [sets.sessionId],
    references: [sessions.id],
  }),
  exercise: one(exercises, {
    fields: [sets.exerciseId],
    references: [exercises.id],
  }),
}));

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type MuscleGroup = (typeof muscleGroupEnum.enumValues)[number];
export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];

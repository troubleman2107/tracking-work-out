"use server";

import { db } from "@/db";
import {
  programs,
  workouts,
  exercises,
  workoutExercises,
  sessions,
  sets,
  NewProgram,
  NewWorkout,
  NewWorkoutExercise,
  NewSession,
  NewSet,
} from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Programs ────────────────────────────────────────────────────────────────

export async function getPrograms() {
  return db.select().from(programs).orderBy(desc(programs.createdAt));
}

export async function createProgram(data: Pick<NewProgram, "name" | "description">) {
  const [program] = await db.insert(programs).values(data).returning();
  revalidatePath("/planner");
  return program;
}

export async function deleteProgram(id: number) {
  await db.delete(programs).where(eq(programs.id, id));
  revalidatePath("/planner");
}

// ─── Workouts ────────────────────────────────────────────────────────────────

export async function getWorkoutsForProgram(programId: number) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.programId, programId))
    .orderBy(asc(workouts.orderIndex));
}

export async function getWorkoutWithExercises(workoutId: number) {
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
    with: {
      workoutExercises: {
        orderBy: asc(workoutExercises.orderIndex),
        with: { exercise: true },
      },
    },
  });
  return workout;
}

export async function createWorkout(data: Pick<NewWorkout, "programId" | "name" | "notes">) {
  const existing = await db
    .select()
    .from(workouts)
    .where(eq(workouts.programId, data.programId));
  const [workout] = await db
    .insert(workouts)
    .values({ ...data, orderIndex: existing.length })
    .returning();
  revalidatePath("/planner");
  return workout;
}

export async function deleteWorkout(id: number) {
  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath("/planner");
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export async function getAllExercises() {
  return db.select().from(exercises).orderBy(asc(exercises.name));
}

export async function createExercise(
  data: Pick<typeof exercises.$inferInsert, "name" | "muscleGroup" | "secondaryMuscleGroup" | "instructions">
) {
  const [exercise] = await db.insert(exercises).values(data).returning();
  revalidatePath("/planner");
  return exercise;
}

// ─── Workout Exercises ───────────────────────────────────────────────────────

export async function addExerciseToWorkout(data: NewWorkoutExercise) {
  const existing = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, data.workoutId));
  const [we] = await db
    .insert(workoutExercises)
    .values({ ...data, orderIndex: existing.length })
    .returning();
  revalidatePath("/planner");
  return we;
}

export async function removeExerciseFromWorkout(id: number) {
  await db.delete(workoutExercises).where(eq(workoutExercises.id, id));
  revalidatePath("/planner");
}

export async function updateWorkoutExercise(
  id: number,
  data: Partial<Pick<NewWorkoutExercise, "targetSets" | "targetRepsMin" | "targetRepsMax" | "targetWeight" | "notes" | "restTimerSets" | "restTimerExercise">>
) {
  await db.update(workoutExercises).set(data).where(eq(workoutExercises.id, id));
  revalidatePath("/planner");
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions() {
  return db
    .select({
      id: sessions.id,
      name: sessions.name,
      status: sessions.status,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
      workoutId: sessions.workoutId,
    })
    .from(sessions)
    .orderBy(desc(sessions.startedAt));
}

export async function getActiveSession() {
  return db.query.sessions.findFirst({
    where: eq(sessions.status, "in_progress"),
    orderBy: desc(sessions.startedAt),
    with: {
      sets: {
        with: { exercise: true },
        orderBy: [asc(sets.exerciseId), asc(sets.setNumber)],
      },
      workout: {
        with: {
          workoutExercises: {
            orderBy: asc(workoutExercises.orderIndex),
            with: { exercise: true },
          },
        },
      },
    },
  });
}

export async function getSessionById(sessionId: number) {
  return db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      sets: {
        with: { exercise: true },
        orderBy: [asc(sets.exerciseId), asc(sets.setNumber)],
      },
      workout: {
        with: {
          workoutExercises: {
            orderBy: asc(workoutExercises.orderIndex),
            with: { exercise: true },
          },
        },
      },
    },
  });
}

export async function startSession(
  workoutId: number,
  name: string,
  startedAt?: Date
): Promise<{ id: number }> {
  const [session] = await db
    .insert(sessions)
    .values({
      workoutId,
      name,
      status: "in_progress",
      ...(startedAt ? { startedAt } : {}),
    })
    .returning({ id: sessions.id });
  revalidatePath("/log");
  return session;
}

export async function completeSession(sessionId: number) {
  await db
    .update(sessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(sessions.id, sessionId));
  revalidatePath("/log");
  revalidatePath("/dashboard");
}

export async function cancelSession(sessionId: number) {
  await db
    .update(sessions)
    .set({ status: "skipped" })
    .where(eq(sessions.id, sessionId));
  revalidatePath("/log");
  revalidatePath("/history");
}

export async function deleteSession(sessionId: number) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  revalidatePath("/log");
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

export async function resumeSession(sessionId: number) {
  // Optional: Mark other active sessions as skipped to avoid conflicts
  await db
    .update(sessions)
    .set({ status: "skipped" })
    .where(eq(sessions.status, "in_progress"));

  await db
    .update(sessions)
    .set({ status: "in_progress", completedAt: null })
    .where(eq(sessions.id, sessionId));
    
  revalidatePath("/log");
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

// ─── Sets ────────────────────────────────────────────────────────────────────

export async function logSet(data: Omit<NewSet, "loggedAt">) {
  const [set] = await db.insert(sets).values(data).returning();
  revalidatePath("/log");
  return set;
}

export async function updateSet(
  id: number,
  data: Partial<Pick<NewSet, "weight" | "reps" | "isCompleted" | "notes" | "rpe">>
) {
  const [set] = await db.update(sets).set(data).where(eq(sets.id, id)).returning();
  revalidatePath("/log");
  return set;
}

export async function deleteSet(id: number) {
  await db.delete(sets).where(eq(sets.id, id));
  revalidatePath("/log");
}

export async function toggleSetComplete(id: number, isCompleted: boolean) {
  const [set] = await db
    .update(sets)
    .set({ isCompleted })
    .where(eq(sets.id, id))
    .returning();
  revalidatePath("/log");
  return set;
}

export async function reorderSets(updates: { id: number; setNumber: number }[]) {
  // Update all sets in parallel or sequentially. For SQLite/Postgres simple updates, sequential is fine
  for (const update of updates) {
    await db
      .update(sets)
      .set({ setNumber: update.setNumber })
      .where(eq(sets.id, update.id));
  }
  revalidatePath("/log");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getProgressDataForExercise(exerciseId: number) {
  // Fetch all completed sets for this exercise, joined with session date
  const rows = await db
    .select({
      sessionId: sets.sessionId,
      sessionDate: sessions.startedAt,
      weight: sets.weight,
      reps: sets.reps,
    })
    .from(sets)
    .innerJoin(sessions, eq(sets.sessionId, sessions.id))
    .where(
      and(
        eq(sets.exerciseId, exerciseId),
        eq(sessions.status, "completed"),
        eq(sets.isCompleted, true)
      )
    )
    .orderBy(asc(sessions.startedAt));

  // Group by session, compute Brzycki 1RM and Total Volume per session
  const sessionMap = new Map<
    number,
    { date: Date; sets: { weight: number; reps: number }[] }
  >();

  for (const row of rows) {
    if (!sessionMap.has(row.sessionId)) {
      sessionMap.set(row.sessionId, { date: row.sessionDate, sets: [] });
    }
    sessionMap.get(row.sessionId)!.sets.push({ weight: row.weight, reps: row.reps });
  }

  return Array.from(sessionMap.entries()).map(([sessionId, { date, sets: sessionSets }]) => {
    const totalVolume = sessionSets.reduce((acc, s) => acc + s.weight * s.reps, 0);
    // Brzycki 1RM = weight / (1.0278 - 0.0278 * reps)
    const best1RM = Math.max(
      ...sessionSets.map((s) =>
        s.reps === 1 ? s.weight : s.weight / (1.0278 - 0.0278 * s.reps)
      )
    );
    return {
      sessionId,
      date: date.toISOString().split("T")[0],
      totalVolume: Math.round(totalVolume),
      estimated1RM: Math.round(best1RM * 10) / 10,
    };
  });
}

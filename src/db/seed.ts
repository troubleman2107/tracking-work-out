/**
 * Seed script — populates the DB with a starter exercise library
 * and a sample "Push / Pull / Legs" program.
 *
 * Run with:  npm run db:seed
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const exerciseLibrary: schema.NewExercise[] = [
  // Chest
  { name: "Bench Press", muscleGroup: "chest", secondaryMuscleGroup: "triceps" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", secondaryMuscleGroup: "shoulders" },
  { name: "Cable Fly", muscleGroup: "chest" },
  { name: "Push-Up", muscleGroup: "chest", secondaryMuscleGroup: "triceps" },
  { name: "Dips", muscleGroup: "chest", secondaryMuscleGroup: "triceps" },
  // Back
  { name: "Pull-Up", muscleGroup: "back", secondaryMuscleGroup: "biceps" },
  { name: "Barbell Row", muscleGroup: "back", secondaryMuscleGroup: "biceps" },
  { name: "Lat Pulldown", muscleGroup: "back", secondaryMuscleGroup: "biceps" },
  { name: "Seated Cable Row", muscleGroup: "back" },
  { name: "Deadlift", muscleGroup: "back", secondaryMuscleGroup: "glutes" },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "shoulders", secondaryMuscleGroup: "triceps" },
  { name: "Lateral Raise", muscleGroup: "shoulders" },
  { name: "Face Pull", muscleGroup: "shoulders", secondaryMuscleGroup: "back" },
  { name: "Front Raise", muscleGroup: "shoulders" },
  // Arms
  { name: "Barbell Curl", muscleGroup: "biceps" },
  { name: "Hammer Curl", muscleGroup: "biceps", secondaryMuscleGroup: "forearms" },
  { name: "Tricep Pushdown", muscleGroup: "triceps" },
  { name: "Skull Crushers", muscleGroup: "triceps" },
  // Legs
  { name: "Squat", muscleGroup: "quads", secondaryMuscleGroup: "glutes" },
  { name: "Romanian Deadlift", muscleGroup: "hamstrings", secondaryMuscleGroup: "glutes" },
  { name: "Leg Press", muscleGroup: "quads" },
  { name: "Leg Curl", muscleGroup: "hamstrings" },
  { name: "Leg Extension", muscleGroup: "quads" },
  { name: "Hip Thrust", muscleGroup: "glutes" },
  { name: "Calf Raise", muscleGroup: "calves" },
  { name: "Walking Lunge", muscleGroup: "quads", secondaryMuscleGroup: "glutes" },
  // Core
  { name: "Plank", muscleGroup: "core" },
  { name: "Ab Wheel Rollout", muscleGroup: "core" },
  { name: "Cable Crunch", muscleGroup: "core" },
  { name: "Hanging Leg Raise", muscleGroup: "core" },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Insert exercises
  console.log("  → Inserting exercises...");
  const insertedExercises = await db
    .insert(schema.exercises)
    .values(exerciseLibrary)
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${insertedExercises.length} exercises inserted`);

  // 2. Create a sample program
  console.log("  → Creating sample program...");
  const [program] = await db
    .insert(schema.programs)
    .values({ name: "Push / Pull / Legs", description: "Classic 6-day PPL hypertrophy split" })
    .returning();

  // 3. Create workouts inside the program
  const [pushDay] = await db
    .insert(schema.workouts)
    .values({ programId: program.id, name: "Push Day", orderIndex: 0 })
    .returning();

  const [pullDay] = await db
    .insert(schema.workouts)
    .values({ programId: program.id, name: "Pull Day", orderIndex: 1 })
    .returning();

  const [legDay] = await db
    .insert(schema.workouts)
    .values({ programId: program.id, name: "Leg Day", orderIndex: 2 })
    .returning();

  // Helper to find exercise by name from insertedExercises
  const allExercises = await db.select().from(schema.exercises);
  const find = (name: string) => allExercises.find((e) => e.name === name)!;

  // 4. Map exercises to workouts
  await db.insert(schema.workoutExercises).values([
    // Push Day
    { workoutId: pushDay.id, exerciseId: find("Bench Press").id, targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, orderIndex: 0 },
    { workoutId: pushDay.id, exerciseId: find("Incline Dumbbell Press").id, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, orderIndex: 1 },
    { workoutId: pushDay.id, exerciseId: find("Overhead Press").id, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, orderIndex: 2 },
    { workoutId: pushDay.id, exerciseId: find("Lateral Raise").id, targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, orderIndex: 3 },
    { workoutId: pushDay.id, exerciseId: find("Tricep Pushdown").id, targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, orderIndex: 4 },
    // Pull Day
    { workoutId: pullDay.id, exerciseId: find("Pull-Up").id, targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, orderIndex: 0 },
    { workoutId: pullDay.id, exerciseId: find("Barbell Row").id, targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, orderIndex: 1 },
    { workoutId: pullDay.id, exerciseId: find("Lat Pulldown").id, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, orderIndex: 2 },
    { workoutId: pullDay.id, exerciseId: find("Face Pull").id, targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, orderIndex: 3 },
    { workoutId: pullDay.id, exerciseId: find("Barbell Curl").id, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, orderIndex: 4 },
    // Leg Day
    { workoutId: legDay.id, exerciseId: find("Squat").id, targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, orderIndex: 0 },
    { workoutId: legDay.id, exerciseId: find("Romanian Deadlift").id, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, orderIndex: 1 },
    { workoutId: legDay.id, exerciseId: find("Leg Press").id, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, orderIndex: 2 },
    { workoutId: legDay.id, exerciseId: find("Leg Curl").id, targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, orderIndex: 3 },
    { workoutId: legDay.id, exerciseId: find("Calf Raise").id, targetSets: 4, targetRepsMin: 15, targetRepsMax: 20, orderIndex: 4 },
  ]);

  console.log("  ✓ Sample program 'Push / Pull / Legs' created");
  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

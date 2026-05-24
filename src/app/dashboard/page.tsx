import type { Metadata } from "next";
import { getAllExercises } from "@/lib/actions";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your progressive overload — 1RM trends and volume over time.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const exercises = await getAllExercises();

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
          Progressive Overload
        </p>
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualize your strength gains over time.
        </p>
      </header>

      <DashboardClient exercises={exercises} />
    </div>
  );
}

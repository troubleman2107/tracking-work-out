import type { Metadata } from "next";
import { getPrograms } from "@/lib/actions";
import { PlannerClient } from "@/components/planner/PlannerClient";

export const metadata: Metadata = {
  title: "Planner",
  description: "Create workout programs, add exercises, and define target sets.",
};

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const programs = await getPrograms();

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
          Routine Builder
        </p>
        <h1 className="text-3xl font-bold gradient-text">Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Design your programs and workout templates.
        </p>
      </header>

      <PlannerClient initialPrograms={programs} />
    </div>
  );
}

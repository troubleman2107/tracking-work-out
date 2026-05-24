import type { Metadata } from "next";
import { getActiveSession, getPrograms } from "@/lib/actions";
import { LoggerClient } from "@/components/logger/LoggerClient";

export const metadata: Metadata = {
  title: "Workout Log",
  description: "Log your sets, track weight and reps, and complete your workout.",
};

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [activeSession, programs] = await Promise.all([
    getActiveSession(),
    getPrograms(),
  ]);

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
          Training Session
        </p>
        <h1 className="text-3xl font-bold gradient-text">Workout Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your sets and crush your goals.
        </p>
      </header>

      <LoggerClient activeSession={activeSession as any} programs={programs} />
    </div>
  );
}

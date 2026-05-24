import type { Metadata } from "next";
import { getSessions } from "@/lib/actions";
import { HistoryClient } from "@/components/history/HistoryClient";

export const metadata: Metadata = {
  title: "History",
  description: "Review all your past workout sessions.",
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const sessions = await getSessions();

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
          Workout Archive
        </p>
        <h1 className="text-3xl font-bold gradient-text">History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review all your past sessions.
        </p>
      </header>

      <HistoryClient sessions={sessions} />
    </div>
  );
}

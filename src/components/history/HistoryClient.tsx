"use client";

import { useState, useTransition } from "react";
import { getSessionById, deleteSession, resumeSession } from "@/lib/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  XCircle,
  Trash2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SessionItem {
  id: number;
  name: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  workoutId: number | null;
}

interface HistoryClientProps {
  sessions: SessionItem[];
}

type SessionDetail = Awaited<ReturnType<typeof getSessionById>>;

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(start: Date, end: Date | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function HistoryClient({ sessions }: HistoryClientProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, SessionDetail>>({});
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);
  const [deleteSessionName, setDeleteSessionName] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleToggle = (sessionId: number) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    if (!details[sessionId]) {
      startTransition(async () => {
        const detail = await getSessionById(sessionId);
        setDetails((prev) => ({ ...prev, [sessionId]: detail }));
      });
    }
  };

  const router = useRouter();

  const handleDeleteSession = (sessionId: number, name: string) => {
    setDeleteSessionId(sessionId);
    setDeleteSessionName(name);
  };

  const confirmDeleteSession = () => {
    if (!deleteSessionId) return;
    startTransition(async () => {
      await deleteSession(deleteSessionId);
      toast.success(`Deleted session "${deleteSessionName}"`);
      setDeleteSessionId(null);
    });
  };

  const handleResumeSession = (sessionId: number) => {
    startTransition(async () => {
      await resumeSession(sessionId);
      toast.success("Session resumed. Redirecting to logger...");
      router.push("/log");
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Sessions Yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Complete your first workout to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isExpanded = expandedId === session.id;
        const detail = details[session.id];
        const duration = formatDuration(session.startedAt, session.completedAt);

        return (
          <Card
            key={session.id}
            className="glass border-border/50 overflow-hidden"
          >
            <button
              id={`history-session-${session.id}`}
              className="w-full text-left"
              onClick={() => handleToggle(session.id)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        session.status === "completed"
                          ? "bg-primary/15"
                          : session.status === "in_progress"
                          ? "bg-chart-3/15"
                          : "bg-muted"
                      )}
                    >
                      {session.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : session.status === "in_progress" ? (
                        <Clock className="w-5 h-5 text-chart-3" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {session.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(session.startedAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] capitalize border-0",
                            session.status === "completed"
                              ? "bg-primary/10 text-primary"
                              : session.status === "in_progress"
                              ? "bg-chart-3/10 text-chart-3"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {session.status.replace("_", " ")}
                        </Badge>
                        {duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-border/40 px-4 pb-4 pt-3">
                {isPending && !detail ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Loading sets...
                  </div>
                ) : detail ? (
                  <div className="space-y-3">
                    {/* Group sets by exercise */}
                    {(() => {
                      const exerciseMap = new Map<
                        number,
                        { name: string; sets: typeof detail.sets }
                      >();
                      for (const set of detail.sets) {
                        if (!exerciseMap.has(set.exerciseId)) {
                          exerciseMap.set(set.exerciseId, {
                            name: set.exercise.name,
                            sets: [],
                          });
                        }
                        exerciseMap.get(set.exerciseId)!.sets.push(set);
                      }

                      return Array.from(exerciseMap.entries()).map(
                        ([exId, { name, sets: exSets }]) => {
                          const totalVol = exSets.reduce(
                            (acc: number, s: typeof exSets[0]) => acc + s.weight * s.reps,
                            0
                          );
                          const best1RM = Math.max(
                            ...exSets.map((s: typeof exSets[0]) =>
                              s.reps === 1
                                ? s.weight
                                : s.weight / (1.0278 - 0.0278 * s.reps)
                            )
                          );
                          return (
                            <div key={exId} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-foreground">
                                  {name}
                                </p>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-muted-foreground">
                                    Vol: {Math.round(totalVol)}kg
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    1RM: ~{Math.round(best1RM)}kg
                                  </span>
                                </div>
                              </div>
                              {exSets.map((set) => (
                                <div
                                  key={set.id}
                                  className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs",
                                    set.isCompleted
                                      ? "bg-primary/8 text-foreground"
                                      : "bg-secondary/30 text-muted-foreground"
                                  )}
                                >
                                  <span className="text-muted-foreground font-medium">
                                    Set {set.setNumber}
                                  </span>
                                  <span className="font-bold">
                                    {set.weight}kg × {set.reps}
                                  </span>
                                  {set.isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }
                      );
                    })()}
                    {detail.sets.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No sets logged.
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeSession(session.id)}
                        disabled={isPending}
                        className="flex-1 text-xs gap-1.5 h-8 bg-secondary/50 border-border/50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit / Resume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id, session.name)}
                        disabled={isPending}
                        className="flex-1 text-xs gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-border/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        );
      })}

      <Dialog open={deleteSessionId !== null} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteSessionName}"? This action cannot be undone and will remove all logged sets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="destructive"
              onClick={confirmDeleteSession}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Deleting..." : "Delete Session"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteSessionId(null)}
              disabled={isPending}
              className="w-full bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

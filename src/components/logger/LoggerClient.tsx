"use client";

import { useState, useTransition, useEffect } from "react";
import { Program } from "@/db/schema";
import {
  getWorkoutsForProgram,
  getWorkoutWithExercises,
  startSession,
  completeSession,
  cancelSession,
  logSet,
  updateSet,
  deleteSet,
  toggleSetComplete,
  reorderSets,
} from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Dumbbell,
  Play,
  Flag,
  X,
  Trophy,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Clock,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types mirroring what comes from the DB
interface SetRow {
  id: number;
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  exerciseId: number;
  sessionId: number;
  notes: string | null;
  rpe: number | null;
  loggedAt: Date;
}

interface ExerciseRow {
  id: number;
  name: string;
  muscleGroup: string;
  secondaryMuscleGroup: string | null;
  instructions: string | null;
  createdAt: Date;
}

interface WorkoutExerciseRow {
  id: number;
  workoutId: number;
  exerciseId: number;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  restTimerSets: number | null;
  restTimerExercise: number | null;
  orderIndex: number;
  notes: string | null;
  exercise: ExerciseRow;
}

interface ActiveSession {
  id: number;
  name: string;
  status: string;
  startedAt: Date;
  workoutId: number | null;
  sets: SetRow[];
  workout: {
    id: number;
    name: string;
    workoutExercises: WorkoutExerciseRow[];
  } | null;
}

// ─── Session Timer Component ────────────────────────────────────────────────
function SessionTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - start) / 1000));
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-mono font-bold">
      <Clock className="w-3.5 h-3.5" />
      {h > 0
        ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`}
    </div>
  );
}

// ─── Active Rest Timer Component ──────────────────────────────────────────────
function ActiveRestTimer({
  endTime,
  exerciseName,
  onClose,
}: {
  endTime: number;
  exerciseName: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));

  useEffect(() => {
    setLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        toast.success("Rest time is over! Let's get back to work 💪");
        
        // Push Notification logic
        if ("Notification" in window && Notification.permission === "granted") {
          const title = "Rest Time is Over! 💪";
          const options = {
            body: `Time for your next set of ${exerciseName}.`,
            icon: "/icon-192.png",
          };
          
          try {
            // Standard approach (Works on Desktop and iOS PWA)
            new Notification(title, options);
          } catch (e) {
            console.error("Standard Notification failed, trying SW fallback:", e);
            // Fallback for Chrome on Android which requires Service Worker
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, options);
              });
            }
          }
        }

        onClose();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, onClose, exerciseName]);

  const m = Math.floor(left / 60);
  const s = left % 60;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border-2 border-primary shadow-2xl shadow-primary/20 rounded-xl p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
            Resting: {exerciseName}
          </p>
          <div className="text-3xl font-mono font-bold text-foreground">
            {m}:{s.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onClose()}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InlineRestTimer({ endTime }: { endTime: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));

  useEffect(() => {
    setLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    const interval = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (left <= 0) return null;

  const m = Math.floor(left / 60);
  const s = left % 60;

  return (
    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 font-mono text-xs px-1.5">
      <Clock className="w-3 h-3 mr-1 inline" />
      {m}:{s.toString().padStart(2, "0")}
    </Badge>
  );
}

// ─── Sortable Set Row Component ─────────────────────────────────────────────
function SortableSetRow({
  set,
  onToggle,
  onDelete,
  onEdit,
}: {
  set: SetRow;
  onToggle: (id: number, isCompleted: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, weight: number, reps: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: set.id });

  const [localWeight, setLocalWeight] = useState(String(set.weight));
  const [localReps, setLocalReps] = useState(String(set.reps));

  useEffect(() => {
    setLocalWeight(String(set.weight));
    setLocalReps(String(set.reps));
  }, [set.weight, set.reps]);

  const handleBlur = () => {
    const w = parseFloat(localWeight);
    const r = parseInt(localReps, 10);
    if (!isNaN(w) && !isNaN(r) && w >= 0 && r > 0) {
      if (w !== set.weight || r !== set.reps) {
        onEdit(set.id, w, r);
      }
    } else {
      setLocalWeight(String(set.weight));
      setLocalReps(String(set.reps));
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[24px_24px_1fr_1fr_32px_32px] gap-2 items-center px-1 py-1.5 rounded-lg transition-colors",
        set.isCompleted
          ? "bg-primary/8 text-foreground"
          : "bg-secondary/30 text-muted-foreground",
        isDragging && "shadow-md ring-1 ring-primary/20 opacity-90"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-xs font-bold text-center text-muted-foreground">
        {set.setNumber}
      </span>
      <input
        type="number"
        value={localWeight}
        onChange={(e) => setLocalWeight(e.target.value)}
        onBlur={handleBlur}
        className="w-full bg-transparent text-sm font-semibold text-center outline-none focus:bg-secondary/50 focus:ring-1 focus:ring-primary rounded py-0.5 transition-all"
        aria-label="Edit weight"
      />
      <input
        type="number"
        value={localReps}
        onChange={(e) => setLocalReps(e.target.value)}
        onBlur={handleBlur}
        className="w-full bg-transparent text-sm font-semibold text-center outline-none focus:bg-secondary/50 focus:ring-1 focus:ring-primary rounded py-0.5 transition-all"
        aria-label="Edit reps"
      />
      <button
        id={`btn-toggle-set-${set.id}`}
        onClick={() => onToggle(set.id, set.isCompleted)}
        className="flex items-center justify-center"
        aria-label={set.isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {set.isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/50" />
        )}
      </button>
      <button
        id={`btn-delete-set-${set.id}`}
        onClick={() => onDelete(set.id)}
        className="flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
        aria-label="Delete set"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface LoggerClientProps {
  activeSession: ActiveSession | null;
  programs: Program[];
}

export function LoggerClient({ activeSession, programs }: LoggerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Session data
  const [session, setSession] = useState<ActiveSession | null>(activeSession);

  // Start session flow
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(() => {
    return String(programs.find((p) => p.isActive)?.id ?? programs[0]?.id ?? "");
  });
  const [workouts, setWorkouts] = useState<Awaited<ReturnType<typeof getWorkoutsForProgram>>>([]);
  
  useEffect(() => {
    if (selectedProgramId && workouts.length === 0) {
      startTransition(async () => {
        const wkts = await getWorkoutsForProgram(Number(selectedProgramId));
        setWorkouts(wkts);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split("T")[0];
  });
  
  const [programOpen, setProgramOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  // Active Rest Timer state
  const [activeRest, setActiveRest] = useState<{
    endTime: number;
    exerciseName: string;
    exerciseId: number;
  } | null>(null);

  const startRestTimer = (exerciseId: number, completedCount: number) => {
    const we = session?.workout?.workoutExercises.find((w) => w.exerciseId === exerciseId);
    const isLastSet = we ? completedCount >= we.targetSets : false;
    const restSeconds = isLastSet ? (we?.restTimerExercise ?? 120) : (we?.restTimerSets ?? 90);
    setActiveRest({
      endTime: Date.now() + restSeconds * 1000,
      exerciseName: we?.exercise.name ?? "Exercise",
      exerciseId: exerciseId,
    });
  };

  // Per-exercise weight/reps input state
  const [inputs, setInputs] = useState<
    Record<number, { weight: string; reps: string }>
  >({});

  // Collapsed exercises
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const handleProgramChange = async (programId: string | null) => {
    if (!programId) return;
    setSelectedProgramId(programId);
    setSelectedWorkoutId("");
    const wkts = await getWorkoutsForProgram(Number(programId));
    setWorkouts(wkts);
  };

  const handleStartSession = () => {
    if (!selectedWorkoutId) return;

    // Request notification permissions for the Rest Timer
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    startTransition(async () => {
      const wkt = workouts.find((w) => w.id === Number(selectedWorkoutId));
      const sessionName = wkt?.name ?? "Workout";
      
      let startedAt = new Date();
      if (sessionDate) {
        const [year, month, day] = sessionDate.split("-").map(Number);
        startedAt.setFullYear(year, month - 1, day);
      }
      
      const newSession = await startSession(Number(selectedWorkoutId), sessionName, startedAt);
      // Load full session data
      const fullWorkout = await getWorkoutWithExercises(Number(selectedWorkoutId));
      setSession({
        id: newSession.id,
        name: sessionName,
        status: "in_progress",
        startedAt,
        workoutId: Number(selectedWorkoutId),
        sets: [],
        workout: fullWorkout
          ? {
              id: fullWorkout.id,
              name: fullWorkout.name,
              workoutExercises: fullWorkout.workoutExercises,
            }
          : null,
      });
      setStartDialogOpen(false);
      toast.success(`${sessionName} started! Let's go! 💪`);
    });
  };

  const handleLogSet = (exerciseId: number) => {
    if (!session) return;
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    
    const { weight, reps } = inputs[exerciseId] ?? { weight: "", reps: "" };
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
      toast.error("Enter valid weight and reps.");
      return;
    }

    // Count existing sets for this exercise
    const existingSets = (session.sets).filter(
      (s) => s.exerciseId === exerciseId
    );
    const setNumber = existingSets.length + 1;

    startTransition(async () => {
      const newSet = await logSet({
        sessionId: session.id,
        exerciseId,
        setNumber,
        weight: w,
        reps: r,
        isCompleted: true,
      });
      setSession((prev) =>
        prev ? { ...prev, sets: [...prev.sets, newSet] } : prev
      );
      // Clear inputs for this exercise
      setInputs((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: "" } }));
      
      const completedCount = existingSets.filter((s) => s.isCompleted).length + 1;
      startRestTimer(exerciseId, completedCount);
      toast.success(`Set ${setNumber} logged ✓`, { duration: 1500 });
    });
  };

  const handleToggleSet = (setId: number, current: boolean) => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    
    startTransition(async () => {
      await toggleSetComplete(setId, !current);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              sets: prev.sets.map((s) =>
                s.id === setId ? { ...s, isCompleted: !current } : s
              ),
            }
          : prev
      );
      if (!current) {
        // Find the exercise ID for this set
        const set = session?.sets.find((s) => s.id === setId);
        if (set) {
          const existingSets = session?.sets.filter((s) => s.exerciseId === set.exerciseId) || [];
          const completedCount = existingSets.filter((s) => s.isCompleted || s.id === setId).length;
          startRestTimer(set.exerciseId, completedCount);
        }
      }
    });
  };

  const handleDeleteSet = (setId: number) => {
    startTransition(async () => {
      await deleteSet(setId);
      setSession((prev) =>
        prev
          ? { ...prev, sets: prev.sets.filter((s) => s.id !== setId) }
          : prev
      );
    });
  };

  const handleEditSet = (setId: number, weight: number, reps: number) => {
    startTransition(async () => {
      await updateSet(setId, { weight, reps });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              sets: prev.sets.map((s) =>
                s.id === setId ? { ...s, weight, reps } : s
              ),
            }
          : prev
      );
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, exerciseId: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !session) return;

    const exerciseSets = session.sets.filter((s) => s.exerciseId === exerciseId);
    const oldIndex = exerciseSets.findIndex((s) => s.id === active.id);
    const newIndex = exerciseSets.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSetsList = arrayMove(exerciseSets, oldIndex, newIndex);
      
      // Re-assign set numbers
      const updatedSets = newSetsList.map((s, idx) => ({ ...s, setNumber: idx + 1 }));

      // Update local state optimistically
      setSession((prev) => {
        if (!prev) return prev;
        const otherSets = prev.sets.filter((s) => s.exerciseId !== exerciseId);
        return {
          ...prev,
          sets: [...otherSets, ...updatedSets].sort((a, b) => {
             if (a.exerciseId !== b.exerciseId) return a.exerciseId - b.exerciseId;
             return a.setNumber - b.setNumber;
          }),
        };
      });

      // Persist order to DB
      startTransition(async () => {
        await reorderSets(
          updatedSets.map((s) => ({ id: s.id, setNumber: s.setNumber }))
        );
      });
    }
  };

  const handleCompleteSession = () => {
    if (!session) return;
    startTransition(async () => {
      await completeSession(session.id);
      setSession(null);
      setCompleteDialogOpen(false);
      toast.success("Workout complete! Great work! 🏆");
      router.refresh();
    });
  };

  const handleCancelSession = () => {
    if (!session) return;
    startTransition(async () => {
      await cancelSession(session.id);
      setSession(null);
      toast("Session cancelled.");
      router.refresh();
    });
  };

  // Compute completion stats
  const completedSets = session?.sets.filter((s) => s.isCompleted).length ?? 0;
  const totalTargetSets =
    session?.workout?.workoutExercises.reduce(
      (acc, we) => acc + we.targetSets,
      0
    ) ?? 0;
  const progressPct =
    totalTargetSets > 0 ? (completedSets / totalTargetSets) * 100 : 0;

  // ── NO ACTIVE SESSION ─────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="space-y-5">
        <Card className="glass border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-chart-2" />
          <CardContent className="py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 glow-brand">
              <Dumbbell className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Ready to Train?
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Start a workout session based on one of your planned programs.
            </p>
            <Button
              id="btn-start-session"
              onClick={() => setStartDialogOpen(true)}
              size="lg"
              className="bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Workout
            </Button>
          </CardContent>
        </Card>

        {/* Quick-start dialog */}
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary fill-current" />
                Start Workout
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Program
                </label>
                <Popover open={programOpen} onOpenChange={setProgramOpen}>
                  <PopoverTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-between mt-1.5 bg-secondary/50 border-border/50 text-foreground font-normal"
                    )}
                    role="combobox"
                    aria-expanded={programOpen}
                  >
                    {selectedProgramId
                      ? programs.find((p) => String(p.id) === selectedProgramId)?.name
                      : "Select program..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] sm:w-[350px] p-0 bg-card border-border/50">
                    <Command>
                      <CommandInput placeholder="Search program..." />
                      <CommandList>
                        <CommandEmpty>No program found.</CommandEmpty>
                        <CommandGroup>
                          {programs.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => {
                                handleProgramChange(String(p.id));
                                setProgramOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-primary",
                                  selectedProgramId === String(p.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {workouts.length > 0 && (
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Workout Day
                    </label>
                    <Popover open={workoutOpen} onOpenChange={setWorkoutOpen}>
                      <PopoverTrigger
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full justify-between mt-1.5 bg-secondary/50 border-border/50 text-foreground font-normal"
                        )}
                        role="combobox"
                        aria-expanded={workoutOpen}
                      >
                        {selectedWorkoutId
                          ? workouts.find((w) => String(w.id) === selectedWorkoutId)?.name
                          : "Select day..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] sm:w-[350px] p-0 bg-card border-border/50">
                        <Command>
                          <CommandInput placeholder="Search day..." />
                          <CommandList>
                            <CommandEmpty>No workout day found.</CommandEmpty>
                            <CommandGroup>
                              {workouts.map((w) => (
                                <CommandItem
                                  key={w.id}
                                  value={w.name}
                                  onSelect={() => {
                                    setSelectedWorkoutId(String(w.id));
                                    setWorkoutOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-primary",
                                      selectedWorkoutId === String(w.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {w.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date Logged
                    </label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="mt-1.5 bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>
              )}

              <Button
                id="btn-confirm-start"
                onClick={handleStartSession}
                disabled={!selectedWorkoutId || isPending}
                className="w-full bg-primary text-primary-foreground gap-2"
                size="lg"
              >
                <Play className="w-4 h-4 fill-current" />
                {isPending ? "Starting..." : "Start Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── ACTIVE SESSION ────────────────────────────────────────────────────────

  let estMinutes = 0;
  if (session.workout?.workoutExercises) {
    const estTimeSeconds = session.workout.workoutExercises.reduce((total, we) => {
      const repsTime = we.targetSets * ((we.targetRepsMax || 10) * 3);
      const setsRestTime = Math.max(0, we.targetSets - 1) * (we.restTimerSets ?? 90);
      const exerciseRestTime = we.restTimerExercise ?? 120;
      return total + repsTime + setsRestTime + exerciseRestTime;
    }, 0);
    estMinutes = Math.round(estTimeSeconds / 60);
  }

  return (
    <div className="space-y-5">
      {/* Session header */}
      <Card className="bg-card/40 backdrop-blur-2xl border border-border/50 overflow-hidden sticky top-4 z-40 shadow-xl shadow-background/50">
        <div className="h-1 bg-gradient-to-r from-primary to-chart-2" />
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    In Progress
                  </span>
                </div>
                <SessionTimer startedAt={session.startedAt} />
                {estMinutes > 0 && (
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/50 py-0 h-5">
                    Est. ~{estMinutes}m
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {session.name}
              </h2>
            </div>
            <button
              id="btn-cancel-session"
              onClick={handleCancelSession}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Cancel session"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completedSets} / {totalTargetSets} sets
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-2 bg-secondary" />
          </div>
        </CardContent>
      </Card>

      {/* Exercise cards */}
      {session.workout?.workoutExercises.map((we) => {
        const exerciseSets = session.sets.filter(
          (s) => s.exerciseId === we.exerciseId
        );
        const completedCount = exerciseSets.filter((s) => s.isCompleted).length;
        const allDone = completedCount >= we.targetSets;
        const input = inputs[we.exerciseId] ?? { weight: "", reps: "" };
        const isCollapsed = collapsedExercises.has(we.exerciseId);

        return (
          <Card
            key={we.id}
            className={cn(
              "glass border-border/50 overflow-hidden transition-all duration-200",
              allDone && "border-primary/30 bg-primary/3"
            )}
          >
            {/* Exercise header */}
            <button
              id={`exercise-toggle-${we.exerciseId}`}
              className="w-full text-left"
              onClick={() =>
                setCollapsedExercises((prev) => {
                  const next = new Set(prev);
                  next.has(we.exerciseId)
                    ? next.delete(we.exerciseId)
                    : next.add(we.exerciseId);
                  return next;
                })
              }
            >
              <CardHeader className="pb-0 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
                        allDone
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {allDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{completedCount}/{we.targetSets}</span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center">
                        {we.exercise.name}
                        {activeRest?.exerciseId === we.exerciseId && (
                          <InlineRestTimer endTime={activeRest.endTime} />
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {we.targetSets} sets · {we.targetRepsMin}–
                        {we.targetRepsMax} reps
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Rest: {we.restTimerSets ?? 90}s · {we.restTimerExercise ?? 120}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize bg-primary/10 text-primary border-0 hidden sm:flex"
                    >
                      {we.exercise.muscleGroup.replace("_", " ")}
                    </Badge>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </button>

            {!isCollapsed && (
              <CardContent className="pt-3 pb-4 px-4 space-y-3">
                {/* Logged sets */}
                {exerciseSets.length > 0 && (
                  <div className="space-y-1.5">
                    {/* Table header */}
                    <div className="grid grid-cols-[24px_24px_1fr_1fr_32px_32px] gap-2 px-1">
                      <span />
                      <span className="text-[10px] text-muted-foreground font-medium text-center">#</span>
                      <span className="text-[10px] text-muted-foreground font-medium text-center">KG</span>
                      <span className="text-[10px] text-muted-foreground font-medium text-center">REPS</span>
                      <span className="text-[10px] text-muted-foreground font-medium text-center">✓</span>
                      <span />
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, we.exerciseId)}
                    >
                      <SortableContext
                        items={exerciseSets.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {exerciseSets.map((set) => (
                          <SortableSetRow
                            key={set.id}
                            set={set}
                            onToggle={handleToggleSet}
                            onDelete={handleDeleteSet}
                            onEdit={handleEditSet}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id={`weight-input-${we.exerciseId}`}
                      type="number"
                      inputMode="decimal"
                      placeholder={we.targetWeight ? String(we.targetWeight) : "kg"}
                      value={input.weight}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [we.exerciseId]: { ...input, weight: e.target.value },
                        }))
                      }
                      className="bg-secondary/50 border-border/50 text-center pr-8 h-11 text-base font-semibold"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      kg
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm font-medium">×</span>
                  <div className="flex-1 relative">
                    <Input
                      id={`reps-input-${we.exerciseId}`}
                      type="number"
                      inputMode="numeric"
                      placeholder={we.targetRepsMin ? String(we.targetRepsMin) : "reps"}
                      value={input.reps}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [we.exerciseId]: { ...input, reps: e.target.value },
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleLogSet(we.exerciseId)
                      }
                      className="bg-secondary/50 border-border/50 text-center pr-10 h-11 text-base font-semibold"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      reps
                    </span>
                  </div>
                  <Button
                    id={`btn-log-set-${we.exerciseId}`}
                    onClick={() => handleLogSet(we.exerciseId)}
                    disabled={isPending}
                    size="icon"
                    className="h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-md shadow-primary/20"
                    aria-label="Log set"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Finish button */}
      <div className="sticky bottom-20 pt-2">
        <Button
          id="btn-finish-session"
          onClick={() => setCompleteDialogOpen(true)}
          size="lg"
          className="w-full bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow py-6 text-base font-semibold"
        >
          <Flag className="w-5 h-5" />
          Finish Workout
        </Button>
      </div>

      {/* Completion dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm mx-auto text-center">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center glow-brand">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold">
              Finish Workout?
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm mb-2">
            You completed{" "}
            <span className="text-foreground font-semibold">
              {completedSets} sets
            </span>{" "}
            across{" "}
            <span className="text-foreground font-semibold">
              {session.workout?.workoutExercises.length ?? 0} exercises
            </span>
            . Great session!
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              id="btn-confirm-complete"
              onClick={handleCompleteSession}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground gap-2"
              size="lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isPending ? "Saving..." : "Complete Session"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCompleteDialogOpen(false)}
              className="text-muted-foreground"
            >
              Keep Going
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useTransition, useEffect } from "react";
import { Program } from "@/db/schema";
import { MuscleGroup } from "@/db/schema";
import {
  createProgram,
  deleteProgram,
  getWorkoutsForProgram,
  createWorkout,
  deleteWorkout,
  getWorkoutWithExercises,
  getAllExercises,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  updateWorkoutExercise,
  createExercise,
  setActiveProgram,
} from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronRight,
  Dumbbell,
  FolderOpen,
  ListPlus,
  Edit3,
  Check,
  ChevronsUpDown,
  Clock,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlannerClientProps {
  initialPrograms: Program[];
}

type WorkoutWithExercises = Awaited<ReturnType<typeof getWorkoutWithExercises>>;
type WorkoutsForProgram = Awaited<ReturnType<typeof getWorkoutsForProgram>>;

export function PlannerClient({ initialPrograms }: PlannerClientProps) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(() => {
    return initialPrograms.find((p) => p.isActive)?.id ?? initialPrograms[0]?.id ?? null;
  });
  const [workouts, setWorkouts] = useState<WorkoutsForProgram>([]);
  const [selectedWorkout, setSelectedWorkout] =
    useState<WorkoutWithExercises | null>(null);
  const [exercises, setExercises] = useState<
    Awaited<ReturnType<typeof getAllExercises>>
  >([]);
  const [isPending, startTransition] = useTransition();

  // New Program dialog state
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramDesc, setNewProgramDesc] = useState("");
  const [programDialogOpen, setProgramDialogOpen] = useState(false);

  // New Workout dialog state
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);

  // Add Exercise to Workout dialog state
  const [addExDialogOpen, setAddExDialogOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [targetSets, setTargetSets] = useState("3");
  const [targetRepsMin, setTargetRepsMin] = useState("8");
  const [targetRepsMax, setTargetRepsMax] = useState("12");
  const [restTimerSets, setRestTimerSets] = useState("90");
  const [restTimerExercise, setRestTimerExercise] = useState("120");
  const [openCombobox, setOpenCombobox] = useState(false);

  // Create New Exercise dialog state
  const [createExDialogOpen, setCreateExDialogOpen] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>("chest");
  const [newExInstructions, setNewExInstructions] = useState("");

  const loadWorkoutsForProgram = (programId: number) => {
    startTransition(async () => {
      const wkts = await getWorkoutsForProgram(programId);
      setWorkouts(wkts);
      setSelectedWorkout(null);
    });
  };

  useEffect(() => {
    if (selectedProgramId && workouts.length === 0) {
      loadWorkoutsForProgram(selectedProgramId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectProgram = (program: Program) => {
    if (selectedProgramId === program.id) {
      setSelectedProgramId(null);
      setWorkouts([]);
      setSelectedWorkout(null);
    } else {
      setSelectedProgramId(program.id);
      loadWorkoutsForProgram(program.id);
    }
  };

  const handleSelectWorkout = (workoutId: number) => {
    if (selectedWorkout?.id === workoutId) {
      setSelectedWorkout(null);
      return;
    }
    startTransition(async () => {
      const wkt = await getWorkoutWithExercises(workoutId);
      setSelectedWorkout(wkt ?? null);
      // Also load exercises for the add-exercise dialog
      if (exercises.length === 0) {
        const exs = await getAllExercises();
        setExercises(exs);
      }
    });
  };

  const handleCreateProgram = async () => {
    if (!newProgramName.trim()) return;
    startTransition(async () => {
      const program = await createProgram({
        name: newProgramName.trim(),
        description: newProgramDesc.trim() || undefined,
      });
      setPrograms((prev) => [program, ...prev]);
      setSelectedProgramId(program.id);
      setWorkouts([]);
      setSelectedWorkout(null);
      setNewProgramName("");
      setNewProgramDesc("");
      setProgramDialogOpen(false);
      toast.success(`Program "${program.name}" created!`);
    });
  };

  const handleDeleteProgram = (id: number, name: string) => {
    startTransition(async () => {
      await deleteProgram(id);
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      if (selectedProgramId === id) {
        setSelectedProgramId(null);
        setWorkouts([]);
        setSelectedWorkout(null);
      }
      toast.success(`Program "${name}" deleted.`);
    });
  };

  const handleSetActive = (program: Program) => {
    startTransition(async () => {
      await setActiveProgram(program.id);
      setPrograms((prev) =>
        prev.map((p) => ({
          ...p,
          isActive: p.id === program.id,
        }))
      );
      toast.success(`"${program.name}" is now the active program!`);
    });
  };

  const handleCreateWorkout = async () => {
    if (!newWorkoutName.trim() || !selectedProgramId) return;
    startTransition(async () => {
      await createWorkout({
        programId: selectedProgramId,
        name: newWorkoutName.trim(),
      });
      const updated = await getWorkoutsForProgram(selectedProgramId);
      setWorkouts(updated);
      setNewWorkoutName("");
      setWorkoutDialogOpen(false);
      toast.success(`Workout "${newWorkoutName.trim()}" added!`);
    });
  };

  const handleDeleteWorkout = (id: number, name: string) => {
    startTransition(async () => {
      await deleteWorkout(id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      if (selectedWorkout?.id === id) setSelectedWorkout(null);
      toast.success(`Workout "${name}" deleted.`);
    });
  };

  const handleAddExercise = async () => {
    if (!selectedExerciseId || !selectedWorkout) return;
    startTransition(async () => {
      await addExerciseToWorkout({
        workoutId: selectedWorkout.id,
        exerciseId: Number(selectedExerciseId),
        targetSets: Number(targetSets),
        targetRepsMin: Number(targetRepsMin),
        targetRepsMax: Number(targetRepsMax),
        restTimerSets: Number(restTimerSets) || 90,
        restTimerExercise: Number(restTimerExercise) || 120,
      });
      const updated = await getWorkoutWithExercises(selectedWorkout.id);
      setSelectedWorkout(updated ?? null);
      setSelectedExerciseId("");
      setAddExDialogOpen(false);
      toast.success("Exercise added to workout!");
    });
  };

  const handleCreateExercise = () => {
    if (!newExName.trim()) return;
    startTransition(async () => {
      const ex = await createExercise({
        name: newExName.trim(),
        muscleGroup: newExMuscle,
        instructions: newExInstructions.trim() || undefined,
      });
      // Append to local exercise list immediately
      setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedExerciseId(String(ex.id));
      setNewExName("");
      setNewExInstructions("");
      setCreateExDialogOpen(false);
      toast.success(`"${ex.name}" added to exercise library!`);
    });
  };

  const handleRemoveExercise = (weId: number, name: string) => {
    startTransition(async () => {
      await removeExerciseFromWorkout(weId);
      setSelectedWorkout((prev: WorkoutWithExercises | null) =>
        prev
          ? {
              ...prev,
              workoutExercises: prev.workoutExercises.filter(
                (we: { id: number }) => we.id !== weId
              ),
            }
          : null
      );
      toast.success(`${name} removed.`);
    });
  };

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <div className="space-y-5">
      {/* ── Programs ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          Programs
        </h2>
        <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                id="btn-new-program"
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                New
              </Button>
            }
          />
          <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle>Create Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="program-name">Name</Label>
                <Input
                  id="program-name"
                  placeholder="e.g. Push / Pull / Legs"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  className="mt-1.5 bg-secondary/50 border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProgram()}
                />
              </div>
              <div>
                <Label htmlFor="program-desc">Description (optional)</Label>
                <Input
                  id="program-desc"
                  placeholder="6-day hypertrophy split..."
                  value={newProgramDesc}
                  onChange={(e) => setNewProgramDesc(e.target.value)}
                  className="mt-1.5 bg-secondary/50 border-border/50"
                />
              </div>
              <Button
                id="btn-create-program-confirm"
                onClick={handleCreateProgram}
                disabled={!newProgramName.trim() || isPending}
                className="w-full bg-primary text-primary-foreground"
              >
                {isPending ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {programs.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="py-10 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No programs yet. Create one to start planning!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <Card
              key={program.id}
              onClick={() => handleSelectProgram(program)}
              className={`glass border-border/50 cursor-pointer transition-all duration-200 hover:border-primary/40 ${
                selectedProgramId === program.id
                  ? "border-primary/60 bg-primary/5"
                  : ""
              }`}
            >
              <CardContent className="py-3.5 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {program.name}
                  </p>
                  {program.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {program.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!program.isActive) handleSetActive(program);
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      program.isActive 
                        ? "text-yellow-500 bg-yellow-500/10" 
                        : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                    )}
                    aria-label={program.isActive ? "Active program" : "Set as active"}
                  >
                    <Star className={cn("w-4 h-4", program.isActive && "fill-current")} />
                  </button>
                  {selectedProgramId === program.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                  <button
                    id={`btn-delete-program-${program.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProgram(program.id, program.name);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Delete ${program.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Workouts for selected program ── */}
      {selectedProgram && (
        <>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary" />
              <span className="line-clamp-1">{selectedProgram.name}</span>
            </h2>
            <Dialog open={workoutDialogOpen} onOpenChange={setWorkoutDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    size="sm"
                    id="btn-new-workout"
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Day
                  </Button>
                }
              />
              <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle>Add Workout Day</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="workout-name">Name</Label>
                    <Input
                      id="workout-name"
                      placeholder="e.g. Push Day A"
                      value={newWorkoutName}
                      onChange={(e) => setNewWorkoutName(e.target.value)}
                      className="mt-1.5 bg-secondary/50 border-border/50"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateWorkout()
                      }
                    />
                  </div>
                  <Button
                    id="btn-create-workout-confirm"
                    onClick={handleCreateWorkout}
                    disabled={!newWorkoutName.trim() || isPending}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    {isPending ? "Adding..." : "Add Day"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {workouts.length === 0 && !isPending && (
            <Card className="glass border-border/50">
              <CardContent className="py-8 text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No workout days yet. Add a day to this program.
                </p>
              </CardContent>
            </Card>
          )}

          {workouts.map((workout) => (
            <Card
              key={workout.id}
              className={`glass border-border/50 cursor-pointer transition-all duration-200 hover:border-primary/40 ${
                selectedWorkout?.id === workout.id
                  ? "border-primary/60 bg-primary/5"
                  : ""
              }`}
              onClick={() => handleSelectWorkout(workout.id)}
            >
              <CardContent className="py-3.5 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{workout.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      selectedWorkout?.id === workout.id ? "rotate-90" : ""
                    }`}
                  />
                  <button
                    id={`btn-delete-workout-${workout.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkout(workout.id, workout.name);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Delete ${workout.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* ── Exercises for selected workout ── */}
      {selectedWorkout && (
        <>
          <Separator className="bg-border/50" />
          {(() => {
            const estTimeSeconds = (selectedWorkout.workoutExercises as NonNullable<typeof selectedWorkout>["workoutExercises"]).reduce((total, we) => {
              const repsTime = we.targetSets * ((we.targetRepsMax || 10) * 3);
              const setsRestTime = Math.max(0, we.targetSets - 1) * (we.restTimerSets ?? 90);
              const exerciseRestTime = we.restTimerExercise ?? 120;
              return total + repsTime + setsRestTime + exerciseRestTime;
            }, 0);
            const estMinutes = Math.round(estTimeSeconds / 60);

            return (
              <>
                <div className="flex items-center justify-between">
                  <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    {selectedWorkout.name}
                  </h2>
                  {estMinutes > 0 && (
                    <p className="text-xs text-muted-foreground ml-7 flex items-center gap-1 mt-0.5 font-medium">
                      <Clock className="w-3 h-3" />
                      Est. ~{estMinutes} min
                    </p>
                  )}
                </div>
                <Dialog open={addExDialogOpen} onOpenChange={setAddExDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    size="sm"
                    id="btn-add-exercise"
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Exercise
                  </Button>
                }
              />
              <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle>Add Exercise to Workout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {/* Exercise selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>Exercise</Label>
                      {/* Inline "Create New" trigger */}
                      <Dialog open={createExDialogOpen} onOpenChange={setCreateExDialogOpen}>
                        <DialogTrigger
                          render={
                            <button
                              id="btn-open-create-exercise"
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              <Plus className="w-3 h-3" />
                              Create new
                            </button>
                          }
                        />
                        <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
                          <DialogHeader>
                            <DialogTitle>Create New Exercise</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div>
                              <Label htmlFor="new-ex-name">Name</Label>
                              <Input
                                id="new-ex-name"
                                placeholder="e.g. Bulgarian Split Squat"
                                value={newExName}
                                onChange={(e) => setNewExName(e.target.value)}
                                className="mt-1.5 bg-secondary/50 border-border/50"
                                onKeyDown={(e) => e.key === "Enter" && handleCreateExercise()}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-ex-muscle">Primary Muscle Group</Label>
                              <Select
                                value={newExMuscle}
                                onValueChange={(v) => v && setNewExMuscle(v as MuscleGroup)}
                              >
                                <SelectTrigger
                                  id="new-ex-muscle"
                                  className="mt-1.5 bg-secondary/50 border-border/50"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border/50">
                                  {([
                                    "chest","back","shoulders","biceps","triceps",
                                    "forearms","core","glutes","quads","hamstrings",
                                    "calves","full_body","cardio",
                                  ] as MuscleGroup[]).map((mg) => (
                                    <SelectItem key={mg} value={mg} className="capitalize">
                                      {mg.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="new-ex-instructions">Instructions (optional)</Label>
                              <Input
                                id="new-ex-instructions"
                                placeholder="Cues, form tips..."
                                value={newExInstructions}
                                onChange={(e) => setNewExInstructions(e.target.value)}
                                className="mt-1.5 bg-secondary/50 border-border/50"
                              />
                            </div>
                            <Button
                              id="btn-create-exercise-confirm"
                              onClick={handleCreateExercise}
                              disabled={!newExName.trim() || isPending}
                              className="w-full bg-primary text-primary-foreground"
                            >
                              {isPending ? "Creating..." : "Create Exercise"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full justify-between bg-secondary/50 border-border/50 font-normal h-10 px-3 py-2"
                        )}
                        role="combobox"
                        aria-expanded={openCombobox}
                      >
                        {selectedExerciseId
                          ? (
                            <div className="flex items-center gap-2 truncate">
                              <span>{exercises.find((ex) => String(ex.id) === selectedExerciseId)?.name}</span>
                              <Badge variant="secondary" className="text-[10px] capitalize bg-primary/10 text-primary border-0">
                                {exercises.find((ex) => String(ex.id) === selectedExerciseId)?.muscleGroup.replace("_", " ")}
                              </Badge>
                            </div>
                          )
                          : exercises.length === 0
                            ? "No exercises — create one first"
                            : "Select exercise..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] sm:w-[350px] p-0 bg-card border-border/50">
                        <Command>
                          <CommandInput placeholder="Search exercise..." />
                          <CommandList className="max-h-64">
                            <CommandEmpty>No exercise found.</CommandEmpty>
                            <CommandGroup>
                              {exercises.map((ex) => (
                                <CommandItem
                                  key={ex.id}
                                  value={ex.name}
                                  onSelect={() => {
                                    setSelectedExerciseId(String(ex.id));
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedExerciseId === String(ex.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>{ex.name}</span>
                                  <Badge
                                    variant="secondary"
                                    className="ml-auto text-[10px] capitalize bg-primary/10 text-primary border-0"
                                  >
                                    {ex.muscleGroup.replace("_", " ")}
                                  </Badge>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {exercises.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Your exercise library is empty.{" "}
                        <button
                          className="text-primary underline"
                          onClick={() => setCreateExDialogOpen(true)}
                        >
                          Create your first exercise
                        </button>{" "}
                        or run{" "}
                        <code className="bg-secondary px-1 rounded text-[10px]">npm run db:seed</code>
                        {" "}to load 30 presets.
                      </p>
                    )}
                  </div>

                  {/* Target sets/reps */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="target-sets">Sets</Label>
                      <Input
                        id="target-sets"
                        type="number"
                        min="1"
                        max="10"
                        value={targetSets}
                        onChange={(e) => setTargetSets(e.target.value)}
                        className="mt-1.5 bg-secondary/50 border-border/50 text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reps-min">Reps Min</Label>
                      <Input
                        id="reps-min"
                        type="number"
                        min="1"
                        value={targetRepsMin}
                        onChange={(e) => setTargetRepsMin(e.target.value)}
                        className="mt-1.5 bg-secondary/50 border-border/50 text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reps-max">Reps Max</Label>
                      <Input
                        id="reps-max"
                        type="number"
                        min="1"
                        value={targetRepsMax}
                        onChange={(e) => setTargetRepsMax(e.target.value)}
                        className="mt-1.5 bg-secondary/50 border-border/50 text-center"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rest-sets" className="text-xs">Rest Between Sets (s)</Label>
                      <Input
                        id="rest-sets"
                        type="number"
                        min="0"
                        value={restTimerSets}
                        onChange={(e) => setRestTimerSets(e.target.value)}
                        className="mt-1.5 bg-secondary/50 border-border/50 text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rest-ex" className="text-xs">Rest After Exercise (s)</Label>
                      <Input
                        id="rest-ex"
                        type="number"
                        min="0"
                        value={restTimerExercise}
                        onChange={(e) => setRestTimerExercise(e.target.value)}
                        className="mt-1.5 bg-secondary/50 border-border/50 text-center"
                      />
                    </div>
                  </div>
                  <Button
                    id="btn-add-exercise-confirm"
                    onClick={handleAddExercise}
                    disabled={!selectedExerciseId || isPending}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    {isPending ? "Adding..." : "Add to Workout"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedWorkout.workoutExercises.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-8 text-center">
                <Edit3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No exercises yet. Add exercises to this day.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(selectedWorkout.workoutExercises as NonNullable<typeof selectedWorkout>["workoutExercises"]).map((we, idx) => (
                <Card key={we.id} className="glass border-border/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <p className="font-medium text-sm text-foreground">
                            {we.exercise.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] capitalize bg-primary/10 text-primary border-0"
                          >
                            {we.exercise.muscleGroup.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {we.targetSets} sets ·{" "}
                          {we.targetRepsMin}–{we.targetRepsMax} reps
                          {we.targetWeight
                            ? ` · ${we.targetWeight}kg`
                            : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Rest: {we.restTimerSets ?? 90}s between sets · {we.restTimerExercise ?? 120}s after
                        </p>
                      </div>
                      <button
                        id={`btn-remove-ex-${we.id}`}
                        onClick={() =>
                          handleRemoveExercise(we.id, we.exercise.name)
                        }
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mt-0.5"
                        aria-label={`Remove ${we.exercise.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </>
          );
        })()}
        </>
      )}
    </div>
  );
}

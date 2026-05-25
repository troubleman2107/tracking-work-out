"use client";

import { useState, useTransition } from "react";
import { Exercise } from "@/db/schema";
import {
  getProgressDataForExercise,
  getProgressDataForWorkoutId,
} from "@/lib/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OneRMChart } from "./OneRMChart";
import { VolumeChart } from "./VolumeChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  BarChart3,
  Dumbbell,
  Zap,
  Calendar,
  Activity,
  Check,
  ChevronsUpDown,
} from "lucide-react";

interface ProgressData {
  sessionId: number;
  date: string;
  totalVolume: number;
  estimated1RM: number;
  exerciseVolumes?: { name: string; volume: number }[];
}

interface OverallSessionData {
  sessionId: number;
  name: string;
  date: string;
  totalVolume: number;
  estimated1RM: number;
  totalSets: number;
}

interface WorkoutInfo {
  id: number;
  name: string;
  programId: number;
  programName: string;
}

interface DashboardClientProps {
  exercises: Exercise[];
  overallSessions: OverallSessionData[];
  workouts: WorkoutInfo[];
}

export function DashboardClient({
  exercises,
  overallSessions,
  workouts,
}: DashboardClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedExercise = exercises.find(
    (e) => e.id === Number(selectedExerciseId),
  );

  const handleExerciseChange = (value: string | null) => {
    if (!value) return;
    setSelectedExerciseId(value);
    startTransition(async () => {
      const data = await getProgressDataForExercise(Number(value));
      setProgressData(data);
    });
  };

  const latest1RM = progressData.at(-1)?.estimated1RM ?? 0;
  const prev1RM = progressData.at(-2)?.estimated1RM ?? 0;
  const rmChange = latest1RM - prev1RM;

  const totalVolumeLast = progressData.at(-1)?.totalVolume ?? 0;
  const totalVolumePrev = progressData.at(-2)?.totalVolume ?? 0;
  const volChange = totalVolumeLast - totalVolumePrev;

  // Workout Tab State
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [workoutData, setWorkoutData] = useState<ProgressData[]>([]);

  const handleWorkoutChange = (value: string | null) => {
    if (!value) return;
    setSelectedWorkoutId(value);
    startTransition(async () => {
      const data = await getProgressDataForWorkoutId(Number(value));
      setWorkoutData(data);
    });
  };

  const selectedWorkout = workouts.find(
    (w) => w.id === Number(selectedWorkoutId),
  );
  const latestWorkoutVol = workoutData.at(-1)?.totalVolume ?? 0;
  const prevWorkoutVol = workoutData.at(-2)?.totalVolume ?? 0;
  const workoutVolChange = latestWorkoutVol - prevWorkoutVol;

  const latestWorkoutSession = workoutData.at(-1);
  const prevWorkoutSession = workoutData.at(-2);
  const workoutBreakdown: {
    name: string;
    current: number;
    prev: number;
    diff: number;
  }[] = [];

  if (latestWorkoutSession?.exerciseVolumes) {
    const prevVols = new Map<string, number>();
    if (prevWorkoutSession?.exerciseVolumes) {
      for (const ev of prevWorkoutSession.exerciseVolumes) {
        prevVols.set(ev.name, ev.volume);
      }
    }

    for (const ev of latestWorkoutSession.exerciseVolumes) {
      const prevVol = prevVols.get(ev.name) || 0;
      workoutBreakdown.push({
        name: ev.name,
        current: ev.volume,
        prev: prevVol,
        diff: ev.volume - prevVol,
      });
    }
  }

  return (
    <Tabs defaultValue="exercise" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-xl">
        <TabsTrigger
          value="exercise"
          className="rounded-lg text-[11px] sm:text-sm px-1"
        >
          By Exercise
        </TabsTrigger>
        <TabsTrigger
          value="workout"
          className="rounded-lg text-[11px] sm:text-sm px-1"
        >
          By Workout
        </TabsTrigger>
        <TabsTrigger
          value="session"
          className="rounded-lg text-[11px] sm:text-sm px-1"
        >
          All Sessions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="exercise" className="space-y-6 mt-0">
        {/* Exercise Selector */}
        <Card className="glass border-border/50">
          <CardContent className="pt-5">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Exercise
            </label>
            <Popover open={exerciseOpen} onOpenChange={setExerciseOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={exerciseOpen}
                    className={cn(
                      "w-full justify-between bg-secondary/50 border-border/50 h-12 text-base font-normal",
                      !selectedExerciseId && "text-muted-foreground",
                    )}
                  />
                }
              >
                {selectedExerciseId ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{selectedExercise?.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize bg-primary/10 text-primary border-0 shrink-0"
                    >
                      {selectedExercise?.muscleGroup.replace("_", " ")}
                    </Badge>
                  </div>
                ) : (
                  "Search an exercise..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-4rem)] max-w-[576px] p-0"
                align="start"
              >
                <Command className="w-full">
                  <CommandInput
                    placeholder="Search exercise..."
                    className="h-9 w-full"
                  />
                  <CommandList>
                    <CommandEmpty>No exercise found.</CommandEmpty>
                    <CommandGroup>
                      {exercises.map((exercise) => (
                        <CommandItem
                          value={exercise.name}
                          key={exercise.id}
                          onSelect={() => {
                            handleExerciseChange(String(exercise.id));
                            setExerciseOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedExerciseId === String(exercise.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex items-center justify-between w-full">
                            <span>{exercise.name}</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] capitalize bg-primary/10 text-primary border-0 ml-2"
                            >
                              {exercise.muscleGroup.replace("_", " ")}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* No selection state */}
        {!selectedExerciseId && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Pick an Exercise
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Select an exercise above to see your strength progress and volume
              trends over time.
            </p>
          </div>
        )}

        {/* Loading state */}
        {isPending && selectedExerciseId && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-muted-foreground text-sm">Loading data...</p>
          </div>
        )}

        {/* No data yet */}
        {!isPending && selectedExerciseId && progressData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Data Yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Complete a workout session with{" "}
              <span className="text-foreground font-medium">
                {selectedExercise?.name}
              </span>{" "}
              to start tracking progress.
            </p>
          </div>
        )}

        {/* Charts */}
        {!isPending && progressData.length > 0 && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Est. 1RM
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {latest1RM}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      kg
                    </span>
                  </p>
                  {rmChange !== 0 && (
                    <p
                      className={`text-xs mt-1 font-medium ${
                        rmChange > 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {rmChange > 0 ? "↑" : "↓"} {Math.abs(rmChange).toFixed(1)}{" "}
                      from last
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-chart-2" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Volume
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {totalVolumeLast.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      kg
                    </span>
                  </p>
                  {volChange !== 0 && (
                    <p
                      className={`text-xs mt-1 font-medium ${
                        volChange > 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {volChange > 0 ? "↑" : "↓"}{" "}
                      {Math.abs(volChange).toLocaleString()} from last
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 1RM Chart */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Estimated 1-Rep Max Trend
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Brzycki formula: Weight ÷ (1.0278 − 0.0278 × Reps)
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <OneRMChart data={progressData} />
              </CardContent>
            </Card>

            {/* Volume Chart */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-chart-2" />
                  Total Volume per Session
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sum of Weight × Reps across all sets
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <VolumeChart data={progressData} />
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="workout" className="space-y-6 mt-0">
        <Card className="glass border-border/50">
          <CardContent className="pt-5">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Workout Day
            </label>
            <Popover open={workoutOpen} onOpenChange={setWorkoutOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workoutOpen}
                    className={cn(
                      "w-full justify-between bg-secondary/50 border-border/50 h-12 text-base font-normal",
                      !selectedWorkoutId && "text-muted-foreground",
                    )}
                  />
                }
              >
                {selectedWorkoutId ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{selectedWorkout?.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-primary/10 text-primary border-0 shrink-0"
                    >
                      {selectedWorkout?.programName}
                    </Badge>
                  </div>
                ) : (
                  "Search a workout day..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-4rem)] max-w-[576px] p-0"
                align="start"
              >
                <Command className="w-full">
                  <CommandInput
                    placeholder="Search workout day..."
                    className="h-9 w-full"
                  />
                  <CommandList>
                    <CommandEmpty>No workout found.</CommandEmpty>
                    <CommandGroup>
                      {workouts.map((workout) => (
                        <CommandItem
                          value={workout.name}
                          key={workout.id}
                          onSelect={() => {
                            handleWorkoutChange(String(workout.id));
                            setWorkoutOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedWorkoutId === String(workout.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex items-center justify-between w-full">
                            <span>{workout.name}</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-primary/10 text-primary border-0 ml-2"
                            >
                              {workout.programName}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {!selectedWorkoutId && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Pick a Workout Day
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Select a workout to see how its total volume has grown over time.
            </p>
          </div>
        )}

        {isPending && selectedWorkoutId && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-muted-foreground text-sm">Loading data...</p>
          </div>
        )}

        {!isPending && selectedWorkoutId && workoutData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Data Yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Complete {selectedWorkout?.name} to start tracking its volume
              history.
            </p>
          </div>
        )}

        {!isPending && workoutData.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total Strength
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {workoutData.at(-1)?.estimated1RM ?? 0}{" "}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      kg
                    </span>
                  </p>
                  {(workoutData.at(-1)?.estimated1RM ?? 0) -
                    (workoutData.at(-2)?.estimated1RM ?? 0) !==
                    0 && (
                    <p
                      className={`text-xs mt-1 font-medium ${(workoutData.at(-1)?.estimated1RM ?? 0) - (workoutData.at(-2)?.estimated1RM ?? 0) > 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {(workoutData.at(-1)?.estimated1RM ?? 0) -
                        (workoutData.at(-2)?.estimated1RM ?? 0) >
                      0
                        ? "↑"
                        : "↓"}{" "}
                      {Math.abs(
                        (workoutData.at(-1)?.estimated1RM ?? 0) -
                          (workoutData.at(-2)?.estimated1RM ?? 0),
                      ).toFixed(1)}{" "}
                      from last
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-chart-2" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Workout Volume
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {latestWorkoutVol.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      kg
                    </span>
                  </p>
                  {workoutVolChange !== 0 && (
                    <p
                      className={`text-xs mt-1 font-medium ${workoutVolChange > 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {workoutVolChange > 0 ? "↑" : "↓"}{" "}
                      {Math.abs(workoutVolChange).toLocaleString()} from last
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Total Strength Score
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sum of estimated 1RMs for all exercises
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <OneRMChart data={workoutData} />
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-chart-2" />
                  Volume History
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Total volume pushed during {selectedWorkout?.name}
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <VolumeChart data={workoutData} />
              </CardContent>
            </Card>

            {workoutBreakdown.length > 0 && (
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Exercise Volume Breakdown
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Changes from the previous session
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3 mt-2">
                  {workoutBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-sm font-bold">
                          {item.current.toLocaleString()} kg
                        </span>
                        {item.diff !== 0 ? (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 border-0 ${item.diff > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                          >
                            {item.diff > 0 ? "↑" : "↓"}{" "}
                            {Math.abs(item.diff).toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 border-0 bg-muted text-muted-foreground"
                          >
                            -
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="session" className="space-y-6 mt-0">
        {overallSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Sessions Yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Complete a workout session to see your overall volume history.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total Workouts
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {overallSessions.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-chart-2" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total Sets
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {overallSessions.reduce((acc, s) => acc + s.totalSets, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Daily Total Strength Score
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sum of estimated 1RMs across every workout day
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <OneRMChart
                  data={overallSessions.map((s) => ({
                    date: s.date,
                    totalVolume: s.totalVolume,
                    estimated1RM: s.estimated1RM || 0,
                    sessionId: s.sessionId,
                  }))}
                />
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-chart-2" />
                  Total Volume Across All Exercises
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sum of Weight × Reps for every session
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <VolumeChart
                  data={overallSessions.map((s) => ({
                    date: s.date,
                    totalVolume: s.totalVolume,
                    estimated1RM: s.estimated1RM || 0,
                    sessionId: s.sessionId,
                  }))}
                />
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

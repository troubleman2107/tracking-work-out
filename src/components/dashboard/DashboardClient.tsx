"use client";

import { useState, useTransition } from "react";
import { Exercise } from "@/db/schema";
import { getProgressDataForExercise } from "@/lib/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OneRMChart } from "./OneRMChart";
import { VolumeChart } from "./VolumeChart";
import { TrendingUp, BarChart3, Dumbbell, Zap } from "lucide-react";

interface ProgressData {
  sessionId: number;
  date: string;
  totalVolume: number;
  estimated1RM: number;
}

interface DashboardClientProps {
  exercises: Exercise[];
}

export function DashboardClient({ exercises }: DashboardClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedExercise = exercises.find(
    (e) => e.id === Number(selectedExerciseId)
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

  return (
    <div className="space-y-6">
      {/* Exercise Selector */}
      <Card className="glass border-border/50">
        <CardContent className="pt-5">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Select Exercise
          </label>
          <Select onValueChange={handleExerciseChange} value={selectedExerciseId}>
            <SelectTrigger
              id="exercise-selector"
              className="w-full bg-secondary/50 border-border/50 h-12 text-base"
            >
              <SelectValue placeholder="Choose an exercise to analyze..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50 max-h-72">
              {exercises.map((exercise) => (
                <SelectItem
                  key={exercise.id}
                  value={String(exercise.id)}
                  className="text-sm py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span>{exercise.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize bg-primary/10 text-primary border-0"
                    >
                      {exercise.muscleGroup.replace("_", " ")}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    {rmChange > 0 ? "↑" : "↓"} {Math.abs(rmChange).toFixed(1)} from last
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
    </div>
  );
}

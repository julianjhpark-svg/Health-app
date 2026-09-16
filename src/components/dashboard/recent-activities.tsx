"use client";

import * as React from "react";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import type { Activity } from "@/lib/types";
import {
  activityChipClass,
  activityIcon,
  activityLabel,
  intensityBadge,
  timeAgo,
} from "./constants";

export function RecentActivities({
  activities,
  loading,
  onChanged,
  onLogClick,
}: {
  activities: Activity[] | null;
  loading: boolean;
  onChanged: () => void;
  onLogClick: () => void;
}) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Could not delete the workout.");
      }
      toast({ title: "Workout removed" });
      onChanged();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Your last logged workouts.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !activities ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="rounded-full bg-muted p-3" aria-hidden="true">
              <Dumbbell className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No workouts yet — log your first session!
            </p>
            <Button size="sm" className="min-h-11 sm:min-h-9" onClick={onLogClick}>
              <Plus className="size-4" aria-hidden="true" />
              Log a workout
            </Button>
          </div>
        ) : (
          <ul
            className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-thin"
            aria-label="Recent workouts"
          >
            {activities.map((activity) => {
              const Icon = activityIcon(activity.type);
              const intensity = intensityBadge(activity.intensity);
              return (
                <li
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                >
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${activityChipClass(activity.type)}`}
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {activity.title || activityLabel(activity.type)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activity.durationMin} min · {Math.round(activity.calories)} kcal
                      {activity.distanceKm != null
                        ? ` · ${activity.distanceKm} km`
                        : ""}
                      {activity.performedAt ? ` · ${timeAgo(activity.performedAt)}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={intensity.variant}
                    className={`${intensity.className} shrink-0`}
                  >
                    {intensity.label}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${activity.title || activityLabel(activity.type)}`}
                        disabled={deletingId === activity.id}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {activity.title || activityLabel(activity.type)} —{" "}
                          {activity.durationMin} min. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => void handleDelete(activity.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

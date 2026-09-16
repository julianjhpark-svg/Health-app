"use client";

import * as React from "react";
import { format } from "date-fns";
import { Play, ScanSearch, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAnalyses } from "@/hooks/use-dashboard-data";
import { SPORT_LABELS, type FormAnalysis } from "@/lib/types";
import { activityLabel, scoreBadgeClass, timeAgo } from "./constants";
import { ScoreRing } from "./score-ring";
import { AnalysisReportBody } from "./analysis-report";

export function HistoryTab({
  refreshKey,
  onGoToCoach,
  onChanged,
}: {
  refreshKey: number;
  onGoToCoach: () => void;
  onChanged: () => void;
}) {
  const analyses = useAnalyses(refreshKey);
  const [selected, setSelected] = React.useState<FormAnalysis | null>(null);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Could not delete the analysis.");
      }
      toast({ title: "Analysis deleted" });
      setSelected(null);
      onChanged();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const loading = analyses.loading && !analyses.data;
  const items = analyses.data ?? [];

  return (
    <div className="space-y-4">
      {loading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
          data-testid="history-skeleton"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border bg-card">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : analyses.error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 p-10 text-center">
          <p className="text-sm font-medium text-destructive">
            Couldn't load your analyses
          </p>
          <p className="text-sm text-muted-foreground">{analyses.error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center">
          <div className="rounded-full bg-muted p-3" aria-hidden="true">
            <ScanSearch className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No analyses yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a photo or video of your movement and the AI coach will
            break down your technique.
          </p>
          <Button onClick={onGoToCoach}>Try the AI Form Coach</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((analysis) => {
            const sportLabel =
              SPORT_LABELS[analysis.sport as keyof typeof SPORT_LABELS] ??
              activityLabel(analysis.sport);
            return (
              <button
                key={analysis.id}
                type="button"
                onClick={() => setSelected(analysis)}
                aria-label={`View ${sportLabel} analysis, score ${Math.round(analysis.score)} of 100`}
                className="group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {analysis.mediaType === "video" ? (
                    <>
                      <video
                        muted
                        preload="metadata"
                        src={analysis.thumbPath ?? analysis.mediaPath}
                        className="h-full w-full object-cover"
                        aria-hidden="true"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Play
                          className="size-10 text-white drop-shadow"
                          aria-hidden="true"
                        />
                      </div>
                    </>
                  ) : (
                    <img
                      src={analysis.thumbPath ?? analysis.mediaPath}
                      alt={`${sportLabel} movement snapshot`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <Badge
                    className={`absolute right-2 top-2 ${scoreBadgeClass(analysis.score)}`}
                  >
                    {Math.round(analysis.score)}/100
                  </Badge>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{sportLabel}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(analysis.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {analysis.verdict}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <AnalysisDetailDialog
            analysis={selected}
            onDelete={(id) => handleDelete(id)}
          />
        )}
      </Dialog>
    </div>
  );
}

function AnalysisDetailDialog({
  analysis,
  onDelete,
}: {
  analysis: FormAnalysis;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const sportLabel =
    SPORT_LABELS[analysis.sport as keyof typeof SPORT_LABELS] ??
    activityLabel(analysis.sport);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(analysis.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{sportLabel} — form analysis</DialogTitle>
        <DialogDescription>
          {format(new Date(analysis.createdAt), "MMMM d, yyyy 'at' h:mm a")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="overflow-hidden rounded-xl border bg-muted">
          {analysis.mediaType === "video" ? (
            <video
              controls
              preload="metadata"
              src={analysis.mediaPath}
              className="max-h-72 w-full bg-black object-contain"
            />
          ) : (
            <img
              src={analysis.mediaPath}
              alt={`${sportLabel} analyzed media`}
              className="max-h-72 w-full object-contain"
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          <ScoreRing score={analysis.score} size={96} />
          <p className="text-base font-semibold leading-snug">
            {analysis.verdict}
          </p>
        </div>

        <AnalysisReportBody analysis={analysis} />
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete analysis
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
              <AlertDialogDescription>
                The media and coach feedback will be permanently removed. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogClose asChild>
          <Button variant="secondary" disabled={deleting}>
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}

"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Camera,
  Loader2,
  ScanSearch,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { FormAnalysis, SportKey } from "@/lib/types";
import { SPORTS, SPORT_LABELS } from "@/lib/types";
import {
  MAX_MEDIA_BYTES,
  extractVideoFrames,
  formatBytes,
  type ExtractedFrame,
} from "@/lib/media-client";
import { activityLabel } from "./constants";
import { ScoreRing } from "./score-ring";
import { AnalysisReportBody } from "./analysis-report";

const FRAME_COUNT = 6;
const ANALYSIS_TIMEOUT_MS = 120_000;

const HINTS = [
  "Shoot side-on so joints and alignment are visible.",
  "Use good, even lighting — avoid strong backlight.",
  "Keep your full body in frame throughout the movement.",
];

export function CoachTab({ onAnalyzed }: { onAnalyzed: () => void }) {
  const [sport, setSport] = React.useState<SportKey>("squat");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [frames, setFrames] = React.useState<ExtractedFrame[]>([]);
  const [extracting, setExtracting] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [result, setResult] = React.useState<FormAnalysis | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewUrlRef = React.useRef<string | null>(null);

  const isVideo = file?.type.startsWith("video/") ?? false;
  const framesReady = !isVideo || frames.length > 0;
  const canSubmit =
    !!file && !extracting && !submitting && framesReady;

  // Live elapsed-seconds counter while the (slow) analysis request runs.
  React.useEffect(() => {
    if (!submitting) {
      setElapsed(0);
      return;
    }
    const interval = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [submitting]);

  // Revoke object URLs on unmount.
  React.useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function clearFile() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setFile(null);
    setFrames([]);
    setExtracting(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetAll() {
    clearFile();
    setNotes("");
    setSport("squat");
    setResult(null);
  }

  async function handleFile(nextFile: File | undefined | null) {
    if (!nextFile) return;
    const isImage = nextFile.type.startsWith("image/");
    const isVideoFile = nextFile.type.startsWith("video/");
    if (!isImage && !isVideoFile) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Please choose a photo or a video of your movement.",
      });
      return;
    }
    if (nextFile.size > MAX_MEDIA_BYTES) {
      toast({
        variant: "destructive",
        title: "File is too large",
        description: `Maximum size is ${formatBytes(MAX_MEDIA_BYTES)}.`,
      });
      return;
    }

    clearFile();
    const url = URL.createObjectURL(nextFile);
    previewUrlRef.current = url;
    setFile(nextFile);
    setPreviewUrl(url);
    setFrames([]);

    if (isVideoFile) {
      setExtracting(true);
      try {
        const extracted = await extractVideoFrames(nextFile, FRAME_COUNT);
        setFrames(extracted);
      } catch (err) {
        clearFile();
        toast({
          variant: "destructive",
          title: "Couldn't read the video",
          description:
            err instanceof Error
              ? err.message
              : "Try an MP4 or WebM file instead.",
        });
      } finally {
        setExtracting(false);
      }
    }
  }

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      ANALYSIS_TIMEOUT_MS
    );

    try {
      const formData = new FormData();
      formData.append("media", file);
      formData.append("sport", sport);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (isVideo) {
        formData.append(
          "frames",
          JSON.stringify(frames.map((frame) => frame.dataUrl))
        );
      }

      const res = await fetch("/api/analyses", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error || `Analysis failed with status ${res.status}.`
        );
      }
      const data = (await res.json()) as { analysis: FormAnalysis };
      setResult(data.analysis);
      toast({
        title: "Analysis ready",
        description: "Your coach feedback is in — check the right panel.",
      });
      onAnalyzed();
    } catch (err) {
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";
      toast({
        variant: "destructive",
        title: isAbort ? "Analysis timed out" : "Analysis failed",
        description: isAbort
          ? "It took longer than 2 minutes and was cancelled. Try a smaller file."
          : err instanceof Error
            ? err.message
            : "Something went wrong.",
      });
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left — upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-4 text-primary" aria-hidden="true" />
            Upload your movement
          </CardTitle>
          <CardDescription>
            Photo or video — videos get frame-by-frame review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="coach-sport">Sport</Label>
            <Select
              value={sport}
              onValueChange={(value) => setSport(value as SportKey)}
              disabled={submitting}
            >
              <SelectTrigger id="coach-sport" className="w-full">
                <SelectValue placeholder="Pick a sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SPORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            aria-label="Choose a photo or video of your movement"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
            }}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleFile(event.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary hover:bg-primary/5"
              }`}
            >
              <div className="rounded-full bg-primary/10 p-3" aria-hidden="true">
                <Upload className="size-6 text-primary" />
              </div>
              <span className="text-sm font-medium">
                Drop a photo or video here, or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                Images and videos up to {formatBytes(MAX_MEDIA_BYTES)}
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                    {isVideo ? " · video" : " · photo"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={clearFile}
                  aria-label="Remove selected file"
                  disabled={submitting}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>

              {isVideo ? (
                <video
                  controls
                  src={previewUrl ?? undefined}
                  className="mx-auto max-h-64 w-full rounded-lg"
                />
              ) : (
                previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Selected movement preview"
                    className="mx-auto max-h-64 rounded-lg object-contain"
                  />
                )
              )}

              {isVideo && (
                <div>
                  {extracting ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Extracting frames…
                      </p>
                      <div className="flex gap-2 overflow-hidden">
                        {Array.from({ length: FRAME_COUNT }).map((_, index) => (
                          <Skeleton
                            key={index}
                            className="h-14 w-20 shrink-0 rounded-md"
                          />
                        ))}
                      </div>
                    </div>
                  ) : frames.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {frames.map((frame, index) => (
                          <div
                            key={index}
                            className="w-20 shrink-0"
                            aria-hidden="true"
                          >
                            <img
                              src={frame.dataUrl}
                              alt=""
                              className="h-14 w-20 rounded-md border object-cover"
                            />
                            <p className="mt-0.5 text-center text-[10px] text-muted-foreground">
                              {frame.timestampSec.toFixed(1)}s
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {frames.length} frames will be analyzed
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="coach-notes">
              Anything to focus on?{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="coach-notes"
              rows={3}
              placeholder="e.g. My knee caves in on the way down"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
            />
          </div>

          <Button
            className="h-11 w-full"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            {submitting
              ? `Analyzing your form… ${elapsed}s`
              : "Analyze My Form"}
          </Button>
        </CardContent>
      </Card>

      {/* Right — feedback */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="size-4 text-primary" aria-hidden="true" />
            Coach feedback
          </CardTitle>
          <CardDescription>
            Saved to your history automatically.
          </CardDescription>
        </CardHeader>

        {!result && !submitting ? (
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center">
              <div className="rounded-full bg-muted p-3" aria-hidden="true">
                <ScanSearch className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Your AI coach report will appear here
              </p>
              <ul className="space-y-1.5 text-left text-xs text-muted-foreground">
                {HINTS.map((hint, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        ) : submitting && !result ? (
          <CardContent className="space-y-4" aria-live="polite">
            <div className="flex items-center gap-4">
              <Skeleton className="size-28 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Reviewing your movement with AI… {elapsed}s
            </p>
          </CardContent>
        ) : result ? (
          <>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={result.score} size={112} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-snug">
                    {result.verdict}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {SPORT_LABELS[result.sport as SportKey] ??
                      activityLabel(result.sport)}{" "}
                    ·{" "}
                    {format(new Date(result.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <AnalysisReportBody analysis={result} />
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Save is automatic — this report is in your history.
                </p>
                <Button variant="outline" onClick={resetAll}>
                  Analyze another
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-generated guidance for healthy adults. Stop if you feel pain
                and consult a professional.
              </p>
            </CardFooter>
          </>
        ) : null}
      </Card>
    </div>
  );
}

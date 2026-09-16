"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  INTENSITIES,
  type ActivityType,
  type Intensity,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const INTENSITY_OPTIONS: Array<{
  value: Intensity;
  label: string;
  hint: string;
}> = [
  { value: "light", label: "Light", hint: "Easy pace" },
  { value: "moderate", label: "Moderate", hint: "Steady effort" },
  { value: "hard", label: "Hard", hint: "All out" },
];

const formSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().max(120, "Keep the title under 120 characters"),
  durationMin: z
    .string()
    .min(1, "Duration is required")
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1440,
      "Enter between 1 and 1440 minutes"
    ),
  intensity: z.enum(INTENSITIES),
  distanceKm: z.string().refine(
    (v) =>
      v === "" ||
      (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0 && Number(v) <= 1000),
    "Enter a distance in km, e.g. 5.2"
  ),
  notes: z.string().max(2000, "Keep notes under 2000 characters"),
  performedAt: z.string().min(1, "Pick a date"),
});

type ActivityFormValues = z.infer<typeof formSchema>;

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DEFAULTS: ActivityFormValues = {
  type: "running",
  title: "",
  durationMin: "",
  intensity: "moderate",
  distanceKm: "",
  notes: "",
  performedAt: "",
};

export function LogActivityDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  const type = form.watch("type");
  const typeLabel = ACTIVITY_TYPE_LABELS[type];
  const errors = form.formState.errors;

  React.useEffect(() => {
    if (open) {
      form.reset({ ...DEFAULTS, performedAt: todayISO() });
    }
  }, [open, form]);

  async function onSubmit(values: ActivityFormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.type,
          title: values.title.trim() ? values.title.trim() : undefined,
          durationMin: Number(values.durationMin),
          intensity: values.intensity,
          distanceKm: values.distanceKm === "" ? null : Number(values.distanceKm),
          notes: values.notes.trim() ? values.notes.trim() : undefined,
          // Past days anchor to local noon (avoids TZ day-drift); today uses "now"
          // so a fresh workout never shows a future relative time.
          performedAt: values.performedAt
            ? values.performedAt === todayISO()
              ? new Date().toISOString()
              : new Date(`${values.performedAt}T12:00:00`).toISOString()
            : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error || "Could not save your workout. Please try again."
        );
      }
      toast({
        title: "Workout logged",
        description: `${typeLabel} · ${Number(values.durationMin)} min — nice work.`,
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't log workout",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log an activity</DialogTitle>
          <DialogDescription>
            Track a workout — calories are estimated automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="activity-type">Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as ActivityType)
                    }
                  >
                    <SelectTrigger
                      id="activity-type"
                      className="w-full"
                      aria-invalid={!!errors.type}
                    >
                      <SelectValue placeholder="Choose a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTIVITY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activity-date">Date</Label>
              <Input
                id="activity-date"
                type="date"
                max={todayISO()}
                aria-invalid={!!errors.performedAt}
                {...form.register("performedAt")}
              />
              {errors.performedAt && (
                <p className="text-xs text-destructive">
                  {errors.performedAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activity-title">
              Title{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="activity-title"
              placeholder={typeLabel}
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="activity-duration">Duration (minutes)</Label>
              <Input
                id="activity-duration"
                type="number"
                min={1}
                max={1440}
                inputMode="numeric"
                placeholder="45"
                aria-invalid={!!errors.durationMin}
                {...form.register("durationMin")}
              />
              {errors.durationMin && (
                <p className="text-xs text-destructive">
                  {errors.durationMin.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activity-distance">
                Distance (km){" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="activity-distance"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                placeholder="5.0"
                aria-invalid={!!errors.distanceKm}
                {...form.register("distanceKm")}
              />
              <p className="text-xs text-muted-foreground">
                Great for runs, rides and swims.
              </p>
              {errors.distanceKm && (
                <p className="text-xs text-destructive">
                  {errors.distanceKm.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Intensity</Label>
            <Controller
              control={form.control}
              name="intensity"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as Intensity)}
                  className="grid grid-cols-3 gap-2"
                >
                  {INTENSITY_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`intensity-${option.value}`}
                      className="flex min-h-11 cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 font-normal transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:font-medium"
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        {option.label}
                        <RadioGroupItem
                          id={`intensity-${option.value}`}
                          value={option.value}
                          className="size-4"
                        />
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.hint}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.intensity && (
              <p className="text-xs text-destructive">
                {errors.intensity.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activity-notes">
              Notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="activity-notes"
              rows={3}
              placeholder="How did it feel?"
              aria-invalid={!!errors.notes}
              {...form.register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Dumbbell className="size-4" aria-hidden="true" />
              )}
              {submitting ? "Saving…" : "Save workout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

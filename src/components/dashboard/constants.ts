import {
  Activity,
  Bike,
  CirclePlay,
  Dumbbell,
  Flower2,
  Footprints,
  Goal,
  PersonStanding,
  Volleyball,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ACTIVITY_TYPE_LABELS,
  type ActivityType,
  type Intensity,
} from "@/lib/types";

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  strength: Dumbbell,
  yoga: Flower2,
  basketball: Volleyball,
  soccer: Goal,
  tennis: CirclePlay,
  hiit: Zap,
  walking: PersonStanding,
  other: Activity,
};

const ACTIVITY_CHIP_STYLES: Record<ActivityType, string> = {
  running: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cycling: "bg-green-500/10 text-green-600 dark:text-green-400",
  swimming: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  strength: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  yoga: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  basketball: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  soccer: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  tennis: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  hiit: "bg-red-500/10 text-red-600 dark:text-red-400",
  walking: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
};

export function activityIcon(type: string): LucideIcon {
  return ACTIVITY_ICONS[type as ActivityType] ?? Activity;
}

export function activityChipClass(type: string): string {
  return ACTIVITY_CHIP_STYLES[type as ActivityType] ?? ACTIVITY_CHIP_STYLES.other;
}

export function activityLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type as ActivityType] ?? "Other";
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function scoreColor(score: number): string {
  if (score >= 80) return "var(--chart-1)";
  if (score >= 60) return "var(--chart-2)";
  return "var(--destructive)";
}

export function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-primary text-primary-foreground";
  if (score >= 60) return "bg-amber-500 text-white";
  return "bg-destructive text-white";
}

export interface IntensityBadgeMeta {
  label: string;
  variant: "secondary" | "outline";
  className: string;
}

export function intensityBadge(intensity: string): IntensityBadgeMeta {
  switch (intensity as Intensity) {
    case "light":
      return { label: "Light", variant: "secondary", className: "" };
    case "hard":
      return {
        label: "Hard",
        variant: "outline",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    default:
      return { label: "Moderate", variant: "outline", className: "" };
  }
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

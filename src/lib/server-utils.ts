import { ACTIVITY_TYPES, INTENSITIES, SPORTS, type ActivityType, type Intensity, type SportKey } from "@/lib/types";

// ---------------------------------------------------------------------------
// Calories estimation (MET-inspired values, kcal/min for a ~70kg adult)
// ---------------------------------------------------------------------------
const KCAL_PER_MIN: Record<ActivityType, number> = {
  running: 11,
  cycling: 8.5,
  swimming: 10,
  strength: 6,
  yoga: 4,
  basketball: 8.5,
  soccer: 9,
  tennis: 7.5,
  hiit: 10,
  walking: 4.5,
  other: 6.5,
};

const INTENSITY_FACTOR: Record<Intensity, number> = {
  light: 0.8,
  moderate: 1.0,
  hard: 1.25,
};

export function estimateCalories(
  type: string,
  durationMin: number,
  intensity: string
): number {
  const perMin = KCAL_PER_MIN[(type as ActivityType) in KCAL_PER_MIN ? (type as ActivityType) : "other"];
  const factor = INTENSITY_FACTOR[(intensity as Intensity) in INTENSITY_FACTOR ? (intensity as Intensity) : "moderate"];
  return Math.round(perMin * durationMin * factor);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
export function isActivityType(v: unknown): v is ActivityType {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

export function isIntensity(v: unknown): v is Intensity {
  return typeof v === "string" && (INTENSITIES as readonly string[]).includes(v);
}

export function isSportKey(v: unknown): v is SportKey {
  return typeof v === "string" && (SPORTS as readonly string[]).includes(v);
}

export function isMediaMime(mime: string): mime is `image/${string}` | `video/${string}` {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

// ---------------------------------------------------------------------------
// Robust JSON extraction from an LLM response
// ---------------------------------------------------------------------------
export function extractJsonBlock(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "```")
    .trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : cleaned;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function asStringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}

export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Date helpers (server-local day buckets)
// ---------------------------------------------------------------------------
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

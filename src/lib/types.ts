// Shared DTOs for FormFit — used by both API routes and UI

export const ACTIVITY_TYPES = [
  "running",
  "cycling",
  "swimming",
  "strength",
  "yoga",
  "basketball",
  "soccer",
  "tennis",
  "hiit",
  "walking",
  "other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  strength: "Weight Training",
  yoga: "Yoga",
  basketball: "Basketball",
  soccer: "Soccer",
  tennis: "Tennis",
  hiit: "HIIT",
  walking: "Walking",
  other: "Other",
};

export const INTENSITIES = ["light", "moderate", "hard"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const SPORTS = [
  "squat",
  "deadlift",
  "bench",
  "running",
  "golf",
  "tennis_serve",
  "basketball_shot",
  "yoga",
  "swimming",
  "other",
] as const;

export type SportKey = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<SportKey, string> = {
  squat: "Squat",
  deadlift: "Deadlift",
  bench: "Bench Press",
  running: "Running Gait",
  golf: "Golf Swing",
  tennis_serve: "Tennis Serve",
  basketball_shot: "Basketball Shot",
  yoga: "Yoga Pose",
  swimming: "Swimming Stroke",
  other: "Other / General",
};

export interface Activity {
  id: string;
  type: string;
  title: string;
  durationMin: number;
  intensity: string;
  calories: number;
  distanceKm: number | null;
  notes: string | null;
  performedAt: string; // ISO
  createdAt: string; // ISO
}

export interface DayBucket {
  date: string; // yyyy-mm-dd
  label: string; // Mon, Tue...
  minutes: number;
  calories: number;
  workouts: number;
}

export interface TypeSlice {
  type: string;
  minutes: number;
  count: number;
}

export interface StatsResponse {
  week: { workouts: number; minutes: number; calories: number };
  lastWeek: { workouts: number; minutes: number; calories: number };
  streakDays: number;
  daily: DayBucket[];
  byType: TypeSlice[];
}

export interface FrameNote {
  frame: string; // data URL or media path
  note: string;
}

export interface FormAnalysis {
  id: string;
  sport: string;
  mediaType: "photo" | "video";
  mediaPath: string;
  thumbPath: string | null;
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  drills: string[];
  safetyWarnings: string[];
  frameNotes: FrameNote[];
  createdAt: string; // ISO
}

export interface ActivityFormValues {
  type: ActivityType;
  title?: string;
  durationMin: number;
  intensity: Intensity;
  distanceKm?: number | null;
  notes?: string;
  performedAt?: string;
}

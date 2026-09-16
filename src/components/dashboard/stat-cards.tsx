"use client";

import {
  CalendarCheck,
  Dumbbell,
  Flame,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatsResponse } from "@/lib/types";
import { FadeIn } from "./fade-in";

interface StatCardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass?: string;
  delta: number | null;
  footnote?: string;
}

export function StatCards({ stats }: { stats: StatsResponse }) {
  const defs: StatCardDef[] = [
    {
      label: "This Week Workouts",
      value: stats.week.workouts,
      icon: Dumbbell,
      delta: stats.week.workouts - stats.lastWeek.workouts,
    },
    {
      label: "Active Minutes",
      value: stats.week.minutes,
      icon: Timer,
      delta: stats.week.minutes - stats.lastWeek.minutes,
    },
    {
      label: "Calories",
      value: Math.round(stats.week.calories),
      icon: Flame,
      iconClass: "bg-orange-500/10 text-orange-500",
      delta:
        Math.round(stats.week.calories) - Math.round(stats.lastWeek.calories),
    },
    {
      label: "Day Streak",
      value: stats.streakDays,
      icon: CalendarCheck,
      delta: null,
      footnote: "days in a row",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {defs.map((def, index) => (
        <FadeIn key={def.label} delay={0.05 * index}>
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {def.label}
              </CardTitle>
              <CardAction>
                <div
                  className={`rounded-lg p-2 ${
                    def.iconClass ?? "bg-primary/10 text-primary"
                  }`}
                  aria-hidden="true"
                >
                  <def.icon className="size-5" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {def.value.toLocaleString()}
              </div>
              <DeltaLine delta={def.delta} footnote={def.footnote} />
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

function DeltaLine({
  delta,
  footnote,
}: {
  delta: number | null;
  footnote?: string;
}) {
  if (footnote) {
    return <p className="mt-1 text-xs text-muted-foreground">{footnote}</p>;
  }
  if (delta === null) return null;
  if (delta > 0) {
    return (
      <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        +{delta} vs last week
      </p>
    );
  }
  if (delta === 0) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">Same as last week</p>
    );
  }
  return <p className="mt-1 text-xs text-muted-foreground">{delta} vs last week</p>;
}

export function StatCardsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      aria-hidden="true"
      data-testid="stat-cards-skeleton"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="gap-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Skeleton className="h-4 w-28" />
            </CardTitle>
            <CardAction>
              <Skeleton className="size-9 rounded-lg" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

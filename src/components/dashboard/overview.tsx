"use client";

import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActivities, useStats } from "@/hooks/use-dashboard-data";
import { StatCards, StatCardsSkeleton } from "./stat-cards";
import {
  ChartsSkeleton,
  MinutesBarChart,
  TypeDonut,
} from "./activity-charts";
import { RecentActivities } from "./recent-activities";

export function Overview({
  refreshKey,
  onChanged,
  onLogClick,
}: {
  refreshKey: number;
  onChanged: () => void;
  onLogClick: () => void;
}) {
  const stats = useStats(refreshKey);
  const activities = useActivities(refreshKey);
  const statsLoading = stats.loading && !stats.data;

  return (
    <div className="space-y-6">
      {statsLoading ? (
        <StatCardsSkeleton />
      ) : stats.data ? (
        <StatCards stats={stats.data} />
      ) : stats.error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Stats unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{stats.error}</p>
          </CardContent>
        </Card>
      ) : null}

      {statsLoading ? (
        <ChartsSkeleton />
      ) : stats.data ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <MinutesBarChart daily={stats.data.daily} />
          <TypeDonut byType={stats.data.byType} />
        </div>
      ) : null}

      <RecentActivities
        activities={activities.data}
        loading={activities.loading}
        onChanged={onChanged}
        onLogClick={onLogClick}
      />
    </div>
  );
}

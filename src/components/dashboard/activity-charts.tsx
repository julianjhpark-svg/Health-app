"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity as ActivityIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DayBucket, TypeSlice } from "@/lib/types";
import { CHART_COLORS, activityLabel } from "./constants";

function tipCardClass(): string {
  return "rounded-lg border bg-card px-3 py-2 text-sm shadow-md";
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface BarTipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
    payload?: DayBucket;
  }>;
}

function BarTooltip({ active, payload }: BarTipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;
  return (
    <div className={tipCardClass()}>
      <p className="font-medium">{bucket.date}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {bucket.minutes} min · {bucket.workouts}{" "}
        {bucket.workouts === 1 ? "workout" : "workouts"} ·{" "}
        {Math.round(bucket.calories)} kcal
      </p>
    </div>
  );
}

interface DonutTipProps {
  active?: boolean;
  payload?: Array<{
    payload?: { name: string; value: number; count: number };
  }>;
}

function DonutTooltip({ active, payload }: DonutTipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className={tipCardClass()}>
      <p className="font-medium">{item.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Math.round(item.value)} min · {item.count}{" "}
        {item.count === 1 ? "session" : "sessions"}
      </p>
    </div>
  );
}

export function MinutesBarChart({ daily }: { daily: DayBucket[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Active minutes — last 7 days</CardTitle>
        <CardDescription>
          Daily training volume across all logged workouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.15}
              />
              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                tickMargin={8}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                width={40}
              />
              <Tooltip
                content={<BarTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              <Bar
                dataKey="minutes"
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TypeDonut({ byType }: { byType: TypeSlice[] }) {
  const data = byType.map((slice) => ({
    name: activityLabel(slice.type),
    value: Math.round(slice.minutes),
    count: slice.count,
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Minutes by activity</CardTitle>
        <CardDescription>Where your training time went.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-muted p-3" aria-hidden="true">
              <ActivityIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No workouts logged yet — your activity mix will show up here.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend
                  formatter={(value: unknown) => truncate(String(value), 14)}
                  wrapperStyle={{ fontSize: 12 }}
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChartsSkeleton() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-5"
      aria-hidden="true"
      data-testid="charts-skeleton"
    >
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            <div className="h-5 w-56 rounded bg-muted" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-lg bg-muted/60" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            <div className="h-5 w-44 rounded bg-muted" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-lg bg-muted/60" />
        </CardContent>
      </Card>
    </div>
  );
}

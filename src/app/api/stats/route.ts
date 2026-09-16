import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { DayBucket, StatsResponse, TypeSlice } from "@/lib/types";
import { DAY_LABELS, dayKey } from "@/lib/server-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// GET /api/stats — weekly summary, streak, daily buckets, type breakdown
export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to view your stats." }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6); // 7-day window ending today
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setMilliseconds(-1);
    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 29);

    const [weekRows, lastWeekRows, monthRows] = await Promise.all([
      db.activity.findMany({
        where: { userId, performedAt: { gte: weekStart } },
        select: { durationMin: true, calories: true, performedAt: true, type: true },
      }),
      db.activity.findMany({
        where: { userId, performedAt: { gte: lastWeekStart, lte: lastWeekEnd } },
        select: { durationMin: true, calories: true },
      }),
      db.activity.findMany({
        where: { userId, performedAt: { gte: monthStart } },
        select: { durationMin: true, type: true },
      }),
    ]);

    const sum = (rows: { durationMin: number; calories: number }[]) =>
      rows.reduce(
        (acc, r) => ({
          workouts: acc.workouts + 1,
          minutes: acc.minutes + r.durationMin,
          calories: acc.calories + r.calories,
        }),
        { workouts: 0, minutes: 0, calories: 0 }
      );

    // 7 daily buckets, oldest -> newest
    const byDay = new Map<string, DayBucket>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      byDay.set(dayKey(d), {
        date: dayKey(d),
        label: DAY_LABELS[d.getDay()],
        minutes: 0,
        calories: 0,
        workouts: 0,
      });
    }
    for (const r of weekRows) {
      const bucket = byDay.get(dayKey(r.performedAt));
      if (bucket) {
        bucket.minutes += r.durationMin;
        bucket.calories += r.calories;
        bucket.workouts += 1;
      }
    }
    const daily = [...byDay.values()];

    // Minutes by type over the last 30 days
    const typeMap = new Map<string, TypeSlice>();
    for (const r of monthRows) {
      const slice = typeMap.get(r.type) ?? { type: r.type, minutes: 0, count: 0 };
      slice.minutes += r.durationMin;
      slice.count += 1;
      typeMap.set(r.type, slice);
    }
    const byType = [...typeMap.values()].sort((a, b) => b.minutes - a.minutes);

    // Streak: consecutive days with >=1 activity, anchored on today (or yesterday)
    const activeDays = new Set<string>();
    const streakLookback = new Date(today);
    streakLookback.setDate(streakLookback.getDate() - 90);
    const streakRows = await db.activity.findMany({
      where: { userId, performedAt: { gte: streakLookback } },
      select: { performedAt: true },
    });
    for (const r of streakRows) activeDays.add(dayKey(r.performedAt));

    let streakDays = 0;
    const cursor = new Date(today);
    if (!activeDays.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1); // streak may still be alive from yesterday
    }
    while (activeDays.has(dayKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const stats: StatsResponse = {
      week: sum(weekRows),
      lastWeek: sum(lastWeekRows),
      streakDays,
      daily,
      byType,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/stats failed:", error);
    return NextResponse.json({ error: "Failed to compute stats." }, { status: 500 });
  }
}

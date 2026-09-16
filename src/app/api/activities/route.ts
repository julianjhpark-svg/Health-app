import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { Activity } from "@/lib/types";
import { estimateCalories, isActivityType, isIntensity } from "@/lib/server-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/activities?limit=50 — the signed-in user's workouts, newest first
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to view your activities." }, { status: 401 });
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    const rows = await db.activity.findMany({
      where: { userId },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const activities: Activity[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      durationMin: r.durationMin,
      intensity: r.intensity,
      calories: r.calories,
      distanceKm: r.distanceKm,
      notes: r.notes,
      performedAt: r.performedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("GET /api/activities failed:", error);
    return NextResponse.json({ error: "Failed to load activities." }, { status: 500 });
  }
}

// POST /api/activities — log a workout for the signed-in user
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to log activities." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const errors: string[] = [];

    if (!isActivityType(b.type)) errors.push("type must be one of the supported activity types.");
    const durationMin = Number(b.durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 1 || durationMin > 1440) {
      errors.push("durationMin must be between 1 and 1440 minutes.");
    }
    if (!isIntensity(b.intensity ?? "moderate")) errors.push("intensity must be light, moderate or hard.");
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    const type = b.type as string;
    const intensity = (b.intensity ?? "moderate") as string;
    const duration = Math.round(durationMin);

    let title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) {
      title = type.charAt(0).toUpperCase() + type.slice(1);
    }
    if (title.length > 80) title = title.slice(0, 80);

    let distanceKm: number | null = null;
    if (b.distanceKm !== undefined && b.distanceKm !== null && b.distanceKm !== "") {
      const d = Number(b.distanceKm);
      if (!Number.isFinite(d) || d < 0 || d > 1000) {
        return NextResponse.json({ error: "distanceKm must be a number between 0 and 1000." }, { status: 400 });
      }
      distanceKm = d;
    }

    const notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim().slice(0, 500) : null;

    let performedAt = new Date();
    if (typeof b.performedAt === "string" && b.performedAt) {
      const parsed = new Date(b.performedAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "performedAt must be a valid ISO date." }, { status: 400 });
      }
      performedAt = parsed;
    }
    if (performedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "performedAt cannot be more than a day in the future." }, { status: 400 });
    }

    const calories = estimateCalories(type, duration, intensity);

    const created = await db.activity.create({
      data: {
        type,
        title,
        durationMin: duration,
        intensity,
        calories,
        distanceKm,
        notes,
        performedAt,
        userId,
      },
    });

    const activity: Activity = {
      id: created.id,
      type: created.type,
      title: created.title,
      durationMin: created.durationMin,
      intensity: created.intensity,
      calories: created.calories,
      distanceKm: created.distanceKm,
      notes: created.notes,
      performedAt: created.performedAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/activities failed:", error);
    return NextResponse.json({ error: "Failed to log the activity." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE /api/activities/:id — only the owner can delete
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { id } = await params;
    const result = await db.activity.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Activity not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/activities/:id failed:", error);
    return NextResponse.json({ error: "Failed to delete the activity." }, { status: 500 });
  }
}

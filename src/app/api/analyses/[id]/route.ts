import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE /api/analyses/:id — removes the row and best-effort deletes its files
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
    const existing = await db.formAnalysis.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }

    await db.formAnalysis.delete({ where: { id } });

    const files = new Set<string>();
    files.add(existing.mediaPath);
    if (existing.thumbPath) files.add(existing.thumbPath);
    try {
      const notes = JSON.parse(existing.frameNotes) as Array<{ frame?: string }>;
      for (const n of Array.isArray(notes) ? notes : []) {
        if (typeof n?.frame === "string" && n.frame.startsWith("/uploads/")) files.add(n.frame);
      }
    } catch {
      // ignore malformed frameNotes
    }

    await Promise.allSettled(
      [...files].map((p) => fs.unlink(path.join(process.cwd(), "public", p)))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/analyses/:id failed:", error);
    return NextResponse.json({ error: "Failed to delete the analysis." }, { status: 500 });
  }
}

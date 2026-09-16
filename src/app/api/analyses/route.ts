import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { FormAnalysis, FrameNote } from "@/lib/types";
import {
  asStringArray,
  clampScore,
  extractJsonBlock,
  isMediaMime,
  isSportKey,
} from "@/lib/server-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_MEDIA_BYTES = 80 * 1024 * 1024;
const MAX_FRAMES = 8;
const ALLOWED_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "gif",
  "mp4", "webm", "mov", "avi", "m4v",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/x-m4v": "m4v",
};

const SPORT_COACHING_HINTS: Record<string, string> = {
  squat: "a barbell/bodyweight squat",
  deadlift: "a deadlift",
  bench: "a bench press",
  running: "running gait/stride",
  golf: "a golf swing",
  tennis_serve: "a tennis serve",
  basketball_shot: "a basketball shot",
  yoga: "a yoga pose",
  swimming: "a swimming stroke",
  other: "a sport movement",
};

interface AnalysisRow {
  id: string;
  sport: string;
  mediaType: string;
  mediaPath: string;
  thumbPath: string | null;
  score: number;
  verdict: string;
  strengths: string;
  improvements: string;
  drills: string;
  safetyWarnings: string;
  frameNotes: string;
  createdAt: Date;
}

export function serializeAnalysis(row: AnalysisRow): FormAnalysis {
  const safeParse = <T,>(raw: string, fallback: T): T => {
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };
  return {
    id: row.id,
    sport: row.sport,
    mediaType: row.mediaType === "video" ? "video" : "photo",
    mediaPath: row.mediaPath,
    thumbPath: row.thumbPath,
    score: row.score,
    verdict: row.verdict,
    strengths: safeParse<string[]>(row.strengths, []),
    improvements: safeParse<string[]>(row.improvements, []),
    drills: safeParse<string[]>(row.drills, []),
    safetyWarnings: safeParse<string[]>(row.safetyWarnings, []),
    frameNotes: safeParse<FrameNote[]>(row.frameNotes, []),
    createdAt: row.createdAt.toISOString(),
  };
}

async function saveBuffer(buf: Buffer, ext: string): Promise<string> {
  const name = `${Date.now()}_${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  await fs.writeFile(filePath, buf);
  return `/uploads/${name}`;
}

async function saveDataUrlImage(dataUrl: string, index: number, batchId: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid frame data URL.");
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buf = Buffer.from(match[2], "base64");
  const name = `frame_${batchId}_${index}.${ALLOWED_EXT.has(ext) ? ext : "jpg"}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

function buildCoachPrompt(sport: string, notes: string | null, frameCount: number): string {
  const performing = SPORT_COACHING_HINTS[sport] ?? "a sport movement";
  return [
    "You are an expert sports biomechanics coach reviewing an athlete's technique from images.",
    `The athlete is performing: ${performing}.`,
    notes ? `The athlete specifically asks you to pay attention to: "${notes}".` : "",
    `You are given ${frameCount} image${frameCount > 1 ? "s, ordered chronologically (frames extracted from their video)" : ""}.`,
    "Analyze posture, joint alignment, body positioning and movement mechanics relevant to this sport. Use plain text only.",
    "",
    "Respond with ONLY a JSON object, no markdown fences, exactly in this shape:",
    '{"score": <integer 0-100 form quality>,',
    ' "verdict": "<1-2 sentence overall assessment>",',
    ' "strengths": ["<specific thing done well>"],',
    ' "improvements": ["<specific, actionable correction>"],',
    ' "drills": ["<concrete drill or cue to practice>"],',
    ' "safetyWarnings": ["<form issue that risks injury; empty array if none>"],',
    ' "frameNotes": [{"frame": <0-based image index>, "note": "<what to fix or notice in this specific image>"}]}',
    "",
    "Rules: 2-4 items each in strengths, improvements and drills. Be concrete about body positions (e.g. \"knees tracking over toes\", \"neutral spine\", \"elbow under the ball\"). Keep each item under 160 characters. If the image shows no person or is too unclear to judge, set score to 0, explain in the verdict, and put one item in each array describing what a better photo/video would need.",
  ]
    .filter(Boolean)
    .join("\n");
}

// GET /api/analyses — the signed-in user's history, newest first
export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to view your analyses." }, { status: 401 });
    }

    const rows = await db.formAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ analyses: rows.map(serializeAnalysis) });
  } catch (error) {
    console.error("GET /api/analyses failed:", error);
    return NextResponse.json({ error: "Failed to load analyses." }, { status: 500 });
  }
}

// POST /api/analyses — multipart: media, sport, notes?, frames? (JSON array of data URLs)
export async function POST(request: NextRequest) {
  let savedPaths: string[] = [];
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to analyze your form." }, { status: 401 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
    }

    const media = form.get("media");
    const sportRaw = form.get("sport");
    const notesRaw = form.get("notes");
    const framesRaw = form.get("frames");

    if (!(media instanceof File) || media.size === 0) {
      return NextResponse.json({ error: "Please attach a photo or video of your movement." }, { status: 400 });
    }
    if (media.size > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: "File is too large (max 80 MB)." }, { status: 413 });
    }
    if (!isMediaMime(media.type)) {
      return NextResponse.json({ error: "Only image or video files are supported." }, { status: 415 });
    }
    if (typeof sportRaw !== "string" || !isSportKey(sportRaw)) {
      return NextResponse.json({ error: "Please choose which sport you're performing." }, { status: 400 });
    }
    const sport = sportRaw;
    const mediaType = media.type.startsWith("video/") ? "video" : "photo";
    const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim().slice(0, 300) : null;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // ---- Persist the original media ----
    const extFromMime = EXT_BY_MIME[media.type];
    const extFromFile = media.name.includes(".") ? media.name.split(".").pop()!.toLowerCase() : undefined;
    const ext = extFromMime ?? (extFromFile && ALLOWED_EXT.has(extFromFile) ? extFromFile : mediaType === "video" ? "mp4" : "jpg");
    const mediaBuf = Buffer.from(await media.arrayBuffer());
    const mediaPath = await saveBuffer(mediaBuf, ext);
    savedPaths.push(mediaPath);

    // ---- Collect images for the AI (photo itself, or client-extracted frames) ----
    const imageUrls: string[] = [];
    const framePaths: string[] = [];
    const batchId = randomUUID().slice(0, 8);

    if (mediaType === "photo") {
      const mime = media.type === "image/png" ? "image/png" : media.type === "image/webp" ? "image/webp" : "image/jpeg";
      imageUrls.push(`data:${mime};base64,${mediaBuf.toString("base64")}`);
      framePaths.push(mediaPath);
    } else {
      let frameUrls: string[] = [];
      if (typeof framesRaw === "string" && framesRaw) {
        try {
          const parsed = JSON.parse(framesRaw);
          if (Array.isArray(parsed)) {
            frameUrls = parsed.filter((u): u is string => typeof u === "string" && u.startsWith("data:image/")).slice(0, MAX_FRAMES);
          }
        } catch {
          // fall through — treated as no frames
        }
      }
      if (frameUrls.length === 0) {
        return NextResponse.json(
          { error: "We couldn't read frames from this video in your browser. Try a shorter MP4 clip or upload a photo instead." },
          { status: 400 }
        );
      }
      for (let i = 0; i < frameUrls.length; i++) {
        const p = await saveDataUrlImage(frameUrls[i], i, batchId);
        savedPaths.push(p);
        framePaths.push(p);
        imageUrls.push(frameUrls[i]);
      }
    }

    const thumbPath = mediaType === "photo" ? mediaPath : framePaths[0] ?? null;

    // ---- Ask the AI coach ----
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();

    const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      { type: "text", text: buildCoachPrompt(sport, notes, imageUrls.length) },
      ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("The AI coach took too long to respond. Please try again.")), 90_000)
    );

    let feedbackText: string | undefined;
    try {
      const completion = (await Promise.race([
        zai.chat.completions.createVision({
          model: "glm-4.6v",
          messages: [{ role: "user", content }],
          thinking: { type: "disabled" },
        }),
        timeout,
      ])) as { choices?: Array<{ message?: { content?: string } }> };
      feedbackText = completion.choices?.[0]?.message?.content;
    } finally {
      // no-op: timeout timer left to settle is harmless in serverless-less runtime
    }

    if (!feedbackText) {
      throw new Error("The AI coach returned an empty response. Please try again.");
    }

    // ---- Parse + normalize the AI response ----
    const parsed = extractJsonBlock(feedbackText) as Record<string, unknown>;
    const score = clampScore(parsed.score);
    const verdict = typeof parsed.verdict === "string" ? parsed.verdict.slice(0, 600) : "Analysis completed.";
    const strengths = asStringArray(parsed.strengths, 4);
    const improvements = asStringArray(parsed.improvements, 4);
    const drills = asStringArray(parsed.drills, 4);
    const safetyWarnings = asStringArray(parsed.safetyWarnings, 3);

    const rawFrameNotes = Array.isArray(parsed.frameNotes) ? parsed.frameNotes : [];
    const frameNotes: FrameNote[] = rawFrameNotes
      .map((fn) => {
        if (!fn || typeof fn !== "object") return null;
        const rec = fn as Record<string, unknown>;
        const idx = typeof rec.frame === "number" ? rec.frame : Number.parseInt(String(rec.frame ?? ""), 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= framePaths.length) return null;
        if (typeof rec.note !== "string" || !rec.note.trim()) return null;
        return { frame: framePaths[idx], note: rec.note.trim().slice(0, 240) };
      })
      .filter((v): v is FrameNote => v !== null)
      .slice(0, MAX_FRAMES);

    // ---- Persist the analysis ----
    const created = await db.formAnalysis.create({
      data: {
        userId,
        sport,
        mediaType,
        mediaPath,
        thumbPath,
        score,
        verdict,
        strengths: JSON.stringify(strengths),
        improvements: JSON.stringify(improvements),
        drills: JSON.stringify(drills),
        safetyWarnings: JSON.stringify(safetyWarnings),
        frameNotes: JSON.stringify(frameNotes),
      },
    });

    return NextResponse.json({ analysis: serializeAnalysis(created) }, { status: 201 });
  } catch (error) {
    // Best-effort cleanup so we never leave orphan files after a failure.
    await Promise.allSettled(savedPaths.map((p) => fs.unlink(path.join(process.cwd(), "public", p))));
    console.error("POST /api/analyses failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to analyze the movement. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

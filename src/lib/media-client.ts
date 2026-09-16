"use client";

// Client-side helpers for preparing media before upload to the AI Form Coach.

export interface ExtractedFrame {
  dataUrl: string;
  timestampSec: number;
}

export const MAX_MEDIA_BYTES = 80 * 1024 * 1024; // 80 MB hard cap
export const TARGET_FRAME_WIDTH = 640;
export const DEFAULT_FRAME_COUNT = 6;

function drawToDataUrl(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string {
  const ratio = video.videoHeight / (video.videoWidth || 1);
  const width = Math.min(TARGET_FRAME_WIDTH, video.videoWidth || TARGET_FRAME_WIDTH);
  const height = Math.max(1, Math.round(width * (ratio || 0.5625)));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Timed out while seeking in video.")),
      8000
    );
    const onSeeked = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Failed to seek in video."));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

/**
 * Extracts evenly spaced JPEG frames (as data URLs) from a video file so the
 * AI coach can analyze the movement across time. Safe: rejects if metadata
 * cannot be read (e.g. unsupported codec).
 */
export async function extractVideoFrames(
  file: File,
  count: number = DEFAULT_FRAME_COUNT
): Promise<ExtractedFrame[]> {
  if (typeof document === "undefined") {
    throw new Error("Video frames can only be extracted in the browser.");
  }
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.src = url;

  const canvas = document.createElement("canvas");
  const frames: ExtractedFrame[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("Could not read this video. Try an MP4/WebM file.")),
        15000
      );
      const onMeta = () => {
        window.clearTimeout(timer);
        resolve();
      };
      const onErr = () => {
        window.clearTimeout(timer);
        reject(new Error("Could not read this video. Try an MP4/WebM file."));
      };
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("This video has no readable duration. Try re-exporting it.");
    }

    // Skip the first/last 5% to avoid intro/black frames.
    const start = duration * 0.05;
    const end = Math.max(start + 0.1, duration * 0.95);
    const span = end - start;
    const step = count > 1 ? span / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const t = start + step * i;
      try {
        await seekTo(video, t);
        frames.push({ dataUrl: drawToDataUrl(video, canvas), timestampSec: t });
      } catch {
        // Skip frames that fail to seek; keep going.
        continue;
      }
    }

    if (frames.length === 0) {
      throw new Error("No frames could be extracted from this video.");
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

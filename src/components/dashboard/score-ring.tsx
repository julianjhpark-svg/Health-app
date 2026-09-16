"use client";

import { motion, useReducedMotion } from "framer-motion";
import { scoreColor } from "./constants";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  score,
  size = 128,
}: {
  score: number;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const big = size >= 112;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Form score ${Math.round(score)} out of 100`}
    >
      <svg
        viewBox="0 0 128 128"
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct) }}
          transition={{
            duration: reduceMotion ? 0 : 1.1,
            ease: "easeOut",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`${big ? "text-4xl" : "text-2xl"} font-bold leading-none tabular-nums`}
        >
          {Math.round(score)}
        </span>
        <span
          className={`${big ? "text-xs" : "text-[10px]"} mt-1 text-muted-foreground`}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

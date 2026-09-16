"use client";

import {
  CheckCircle2,
  Dumbbell,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FormAnalysis } from "@/lib/types";

function Checklist({
  title,
  bulletIcon: Icon,
  bulletClass,
  items,
  emptyText,
}: {
  title: string;
  bulletIcon: LucideIcon;
  bulletClass: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 shrink-0 ${bulletClass}`} aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Shared body of an AI coach report — used by the Coach tab result panel
 * and the History detail dialog.
 */
export function AnalysisReportBody({ analysis }: { analysis: FormAnalysis }) {
  return (
    <div className="space-y-5">
      {analysis.safetyWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Safety first</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {analysis.safetyWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Checklist
          title="What you're doing well"
          bulletIcon={CheckCircle2}
          bulletClass="text-emerald-500"
          items={analysis.strengths}
          emptyText="No strengths detected yet."
        />
        <Checklist
          title="Level up"
          bulletIcon={TrendingUp}
          bulletClass="text-amber-500"
          items={analysis.improvements}
          emptyText="No improvement notes."
        />
      </div>

      {analysis.drills.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Dumbbell className="size-4 text-primary" aria-hidden="true" />
            Coach-assigned drills
          </h4>
          <ol className="mt-3 space-y-2.5">
            {analysis.drills.map((drill, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span>{drill}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {analysis.frameNotes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">Frame-by-frame notes</h4>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {analysis.frameNotes.map((frameNote, index) => (
              <figure key={index} className="w-44 shrink-0">
                <img
                  src={frameNote.frame}
                  alt={`Frame ${index + 1} of the analyzed movement`}
                  className="h-24 w-full rounded-md border object-cover"
                  loading="lazy"
                />
                <figcaption className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {index + 1}.
                  </span>{" "}
                  {frameNote.note}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

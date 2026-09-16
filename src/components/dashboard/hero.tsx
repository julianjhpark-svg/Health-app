"use client";

import { Dumbbell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "./fade-in";

export function Hero({
  onAnalyzeClick,
  onLogClick,
}: {
  onAnalyzeClick: () => void;
  onLogClick: () => void;
}) {
  return (
    <FadeIn>
      <section
        aria-labelledby="hero-heading"
        className="hero-grid-bg rounded-2xl border p-6 sm:p-10"
      >
        <div className="max-w-2xl">
          <h1
            id="hero-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Own your <span className="text-primary">training</span>.
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Log every workout, and let AI watch your form — upload a photo or
            video of any sport movement and get instant coaching feedback.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-11" onClick={onAnalyzeClick}>
              <Sparkles className="size-4" aria-hidden="true" />
              Analyze My Form
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              onClick={onLogClick}
            >
              <Dumbbell className="size-4" aria-hidden="true" />
              Log Activity
            </Button>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

"use client";

import * as React from "react";
import { toast } from "@/hooks/use-toast";
import type { Activity, FormAnalysis, StatsResponse } from "@/lib/types";

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small fetch-on-demand helper: refetches whenever `refreshKey` changes,
 * exposes { data, loading, error } and surfaces failures via a destructive
 * toast (once per failed request).
 */
function useApiResource<T>(
  url: string,
  refreshKey: number,
  pick: (raw: unknown) => T,
  errorTitle: string
): ResourceState<T> {
  const [state, setState] = React.useState<ResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return (await res.json()) as unknown;
      })
      .then((raw) => {
        if (cancelled) return;
        setState({ data: pick(raw), loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong.";
        setState({ data: null, loading: false, error: message });
        toast({ variant: "destructive", title: errorTitle, description: message });
      });

    return () => {
      cancelled = true;
    };
  }, [url, refreshKey]);

  return state;
}

function pickArray<T>(key: string): (raw: unknown) => T[] {
  return (raw: unknown) => {
    if (raw && typeof raw === "object" && key in raw) {
      const arr = (raw as Record<string, unknown>)[key];
      if (Array.isArray(arr)) return arr as T[];
    }
    return [];
  };
}

export function useActivities(refreshKey: number): ResourceState<Activity[]> {
  return useApiResource<Activity[]>(
    "/api/activities?limit=50",
    refreshKey,
    pickArray<Activity>("activities"),
    "Couldn't load your workouts"
  );
}

export function useStats(refreshKey: number): ResourceState<StatsResponse> {
  return useApiResource<StatsResponse>(
    "/api/stats",
    refreshKey,
    (raw) => raw as StatsResponse,
    "Couldn't load your stats"
  );
}

export function useAnalyses(
  refreshKey: number
): ResourceState<FormAnalysis[]> {
  return useApiResource<FormAnalysis[]>(
    "/api/analyses",
    refreshKey,
    pickArray<FormAnalysis>("analyses"),
    "Couldn't load your analyses"
  );
}

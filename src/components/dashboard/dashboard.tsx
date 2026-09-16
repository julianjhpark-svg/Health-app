"use client";

import * as React from "react";
import { Activity as ActivityIcon, BarChart3, Camera, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardUser } from "./user-menu";
import { Header } from "./header";
import { Hero } from "./hero";
import { Overview } from "./overview";
import { CoachTab } from "./coach";
import { HistoryTab } from "./history";
import { LogActivityDialog } from "./log-activity-dialog";

export function Dashboard({ user = null }: { user?: DashboardUser | null }) {
  const [tab, setTab] = React.useState<string>("overview");
  const [logOpen, setLogOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const bumpRefresh = React.useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const openLog = React.useCallback(() => setLogOpen(true), []);
  const goCoach = React.useCallback(() => setTab("coach"), []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header user={user} onLogClick={openLog} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Hero onAnalyzeClick={goCoach} onLogClick={openLog} />

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="h-11 w-full justify-start overflow-x-auto p-1 scrollbar-thin sm:h-10 sm:w-fit sm:justify-center">
            <TabsTrigger value="overview" className="gap-2 px-4">
              <BarChart3 className="size-4" aria-hidden="true" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="coach" className="gap-2 px-4">
              <Camera className="size-4" aria-hidden="true" />
              AI Form Coach
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-4">
              <History className="size-4" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Overview
              refreshKey={refreshKey}
              onChanged={bumpRefresh}
              onLogClick={openLog}
            />
          </TabsContent>

          <TabsContent value="coach" className="mt-6">
            <CoachTab onAnalyzed={bumpRefresh} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <HistoryTab
              refreshKey={refreshKey}
              onGoToCoach={goCoach}
              onChanged={bumpRefresh}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t bg-card/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-sm sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5" aria-hidden="true">
              <ActivityIcon className="size-4 text-primary" />
            </div>
            <span className="font-semibold">FormFit</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            AI feedback is general guidance — not medical advice.
          </p>
          <p
            className="text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            © {new Date().getFullYear()} FormFit
          </p>
        </div>
      </footer>

      <LogActivityDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        onSaved={bumpRefresh}
      />
    </div>
  );
}

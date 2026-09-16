"use client";

import { useRouter } from "next/navigation";
import { Activity, Dumbbell, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu, type DashboardUser } from "./user-menu";

export function Header({
  user,
  onLogClick,
}: {
  user: DashboardUser | null;
  onLogClick: () => void;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-xl bg-primary/10 p-2" aria-hidden="true">
            <Activity className="size-5 text-primary" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight">
            FormFit
          </span>
          <span className="hidden rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground md:inline-flex">
            Train smarter · Move better
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="h-11"
              onClick={() => router.push("/signin")}
              aria-label="Sign in"
            >
              <LogIn className="size-4" aria-hidden="true" />
              <span className="hidden min-[420px]:inline">Sign in</span>
            </Button>
          )}
          <Button
            size="lg"
            className="h-11"
            onClick={onLogClick}
            aria-label="Log activity"
          >
            <Dumbbell className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Log Activity</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

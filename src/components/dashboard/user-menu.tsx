"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  name: string | null;
  email: string;
};

/* Deterministic pastel families (no blue/indigo) keyed off the email hash. */
const AVATAR_COLOR_CLASSES = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
];

function getInitials(name: string | null, email: string): string {
  const display =
    name && name.trim().length > 0 ? name.trim() : email.trim();
  const segments = display.split(/\s+/).filter(Boolean);
  if (segments.length === 0) return "U";
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return `${segments[0].charAt(0)}${segments[segments.length - 1].charAt(
    0
  )}`.toUpperCase();
}

function getAvatarColor(email: string): string {
  let hash = 0;
  for (const ch of email) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

export function UserMenu({ user }: { user: DashboardUser }) {
  const displayName =
    user.name && user.name.trim().length > 0 ? user.name.trim() : "Athlete";
  const initials = React.useMemo(
    () => getInitials(user.name, user.email),
    [user.name, user.email]
  );
  const colorClass = React.useMemo(
    () => getAvatarColor(user.email),
    [user.email]
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="hidden min-w-0 max-w-[10rem] truncate text-sm font-medium sm:block"
        title={displayName}
      >
        {displayName}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full"
            aria-label="Account menu"
            aria-haspopup="menu"
          >
            <Avatar className="size-8">
              <AvatarFallback
                className={cn(
                  "select-none text-xs font-semibold",
                  colorClass
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <p className="truncate text-sm font-semibold leading-tight">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void signOut({ callbackUrl: "/signin" });
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

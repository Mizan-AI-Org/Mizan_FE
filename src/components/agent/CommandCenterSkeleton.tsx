import React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  message?: string;
};

function PriorityCardSkeleton({ quiet = false }: { quiet?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-panel px-3.5 py-3 shadow-xs",
        quiet ? "border border-border/60 bg-card/60" : "border border-border/70 bg-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-4 w-4/5 max-w-md" />
          <Skeleton className="h-3.5 w-full max-w-sm" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function GlanceTileSkeleton() {
  return (
    <div className="rounded-panel border border-border/70 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        <Skeleton className="h-3 w-3 rounded-sm opacity-40" />
      </div>
      <Skeleton className="mt-2.5 h-6 w-10" />
      <Skeleton className="mt-1 h-3 w-16" />
    </div>
  );
}

/** Skeleton placeholder matching Command Center layout while briefing loads. */
export function CommandCenterSkeleton({
  className,
  message = "Preparing today's briefing…",
}: Props) {
  return (
    <div
      className={cn("space-y-section", className)}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Header hero */}
      <section className="relative overflow-hidden rounded-panel border border-border/70 bg-card px-5 py-5 shadow-xs sm:px-6 sm:py-6">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-56 max-w-full sm:h-9 sm:w-72" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <p className="relative mt-5 flex items-center justify-center gap-2 text-caption text-muted-foreground sm:justify-start">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
          {message}
        </p>
      </section>

      {/* Glance KPIs */}
      <section className="os-section" aria-hidden>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlanceTileSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Filter bar */}
      <nav
        className="flex flex-wrap gap-1.5 rounded-panel border border-border/60 bg-card/80 p-2 shadow-xs"
        aria-hidden
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-[4.5rem] rounded-full" />
        ))}
      </nav>

      {/* Next actions */}
      <section className="os-section space-y-3" aria-hidden>
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <ul className="space-y-2">
          <li>
            <PriorityCardSkeleton />
          </li>
          <li>
            <PriorityCardSkeleton />
          </li>
          <li>
            <PriorityCardSkeleton quiet />
          </li>
        </ul>
      </section>
    </div>
  );
}

export default CommandCenterSkeleton;

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

function SignalCardSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="rounded-panel border border-border/80 bg-card px-4 py-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className={cn("h-6 w-full max-w-md", tall && "max-w-lg")} />
          <Skeleton className="h-4 w-full max-w-sm" />
          <div className="flex gap-2.5 rounded-control border border-border/60 bg-muted/30 px-3 py-2.5">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full max-w-xs" />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-40">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CommandCentreSkeleton({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <div
      className={cn("min-w-0 space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={t("command.preparing")}
    >
      {/* Agent co-pilot strip */}
      <section className="flex flex-wrap items-center gap-4 rounded-panel border border-border/80 bg-muted/20 px-4 py-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
      </section>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full max-w-lg" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </header>

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-panel border border-border/80 bg-card px-4 py-3 shadow-xs"
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </section>

      {/* Filters */}
      <nav className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </nav>

      {/* Decide now */}
      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <SignalCardSkeleton tall />
        <SignalCardSkeleton />
      </section>

      {/* Watching lane */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <SignalCardSkeleton />
      </section>

      <p className="sr-only">{t("command.preparing")}</p>
    </div>
  );
}

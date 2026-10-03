import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

function SignalCardSkeleton() {
  return (
    <div className="rounded-panel border border-border/80 bg-card px-4 py-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

export function CommandCentreSkeleton({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <div
      className={cn("min-w-0 space-y-5 px-4 py-5 md:px-6 lg:px-8 lg:py-6", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={t("command.preparing")}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-full max-w-sm" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card/80 px-3 py-2.5">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </section>

      <Skeleton className="h-48 w-full rounded-2xl" />

      <Skeleton className="h-4 w-32" />

      <nav className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </nav>

      <section className="space-y-3">
        <SignalCardSkeleton />
        <SignalCardSkeleton />
      </section>

      <p className="sr-only">{t("command.preparing")}</p>
    </div>
  );
}

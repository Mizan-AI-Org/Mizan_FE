import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MIZAN_ELEVATED_CARD } from "@/lib/mizan-ui";
import { useLanguage } from "@/hooks/use-language";

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

      <div className={cn(MIZAN_ELEVATED_CARD, "space-y-3 p-5")}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(MIZAN_ELEVATED_CARD, "p-5")}>
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </section>

      <p className="sr-only">{t("command.preparing")}</p>
    </div>
  );
}

import { Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { TENANT_SEARCH_GROUPS } from "@/lib/api";
import type { OpsSearchHit } from "./useOpsSearch";

/** Grouped results of the command search, with the "Ask Miya" fallback always last. */
export function CommandSearchResults({
  hits,
  loading,
  query,
  onPick,
  onAsk,
}: {
  hits: OpsSearchHit[];
  loading: boolean;
  query: string;
  onPick: (hit: OpsSearchHit) => void;
  onAsk: (query: string) => void;
}) {
  const { t } = useLanguage();
  const trimmed = query.trim();
  return (
    <div className="border-b border-border/60 px-3 py-2" data-testid="command-search-results">
      {loading && hits.length === 0 ? (
        <p className="flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("command.palette.searching")}
        </p>
      ) : hits.length === 0 ? (
        <p className="px-1 py-1.5 text-sm text-muted-foreground">{t("command.palette.no_results")}</p>
      ) : (
        TENANT_SEARCH_GROUPS.map((group) => {
          const rows = hits.filter((h) => h.group === group);
          if (!rows.length) return null;
          return (
            <div key={group} className="pb-1.5">
              <p className="px-1 pb-1 pt-1 text-caption font-medium uppercase tracking-wide text-muted-foreground">
                {t(`command.search.group_${group}`)}
              </p>
              <ul className="space-y-0.5">
                {rows.map((hit) => (
                  <li key={hit.key}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 rounded-control px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                      onClick={() => onPick(hit)}
                    >
                      <span className="min-w-0 truncate">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="shrink-0 truncate text-caption text-muted-foreground">{hit.subtitle}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
      <button
        type="button"
        className="mt-1 flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-start text-sm font-medium text-primary hover:bg-muted/60"
        onClick={() => onAsk(trimmed)}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("command.search.ask_miya", { query: trimmed })}
      </button>
    </div>
  );
}

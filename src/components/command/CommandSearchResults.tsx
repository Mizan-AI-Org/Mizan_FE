import React from "react";
import { useLanguage } from "@/hooks/use-language";
import type { OpsSearchGroup, OpsSearchHit } from "./useOpsSearch";

const ORDER: OpsSearchGroup[] = ["tasks", "requests", "incidents", "invoices", "reminders", "meetings", "staff"];

export function CommandSearchResults({
  hits,
  loading,
  onPick,
}: {
  hits: OpsSearchHit[];
  loading: boolean;
  onPick: (hit: OpsSearchHit) => void;
}) {
  const { t } = useLanguage();
  if (!hits.length) {
    return loading ? (
      <p className="px-4 py-3 text-sm text-muted-foreground">{t("command.search.loading", { defaultValue: "Searching…" })}</p>
    ) : null;
  }
  return (
    <div className="max-h-80 overflow-y-auto border-b border-border/60 px-3 py-2">
      {ORDER.map((group) => {
        const rows = hits.filter((h) => h.group === group);
        if (!rows.length) return null;
        return (
          <div key={group} className="pb-1.5">
            <p className="px-1 pb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t(`command.search.group.${group}`, { defaultValue: group })}
            </p>
            <ul className="space-y-0.5">
              {rows.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-control px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                    onClick={() => onPick(hit)}
                  >
                    <span className="truncate">{hit.label}</span>
                    <span className="shrink-0 text-caption text-muted-foreground">{hit.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

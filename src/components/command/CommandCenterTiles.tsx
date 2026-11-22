import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { useModules } from "@/hooks/use-modules";
import type { ModuleKey } from "@/lib/types";
import { COMMAND_ROUTES } from "@/lib/commandCentre";
import { cn } from "@/lib/utils";

type TileDef = { id: string; href: string; moduleId?: ModuleKey; count?: "active_work" | "open_incidents" };

/** Cursor's shortcuts (Nov 22: Google Calendar, Orders and Attendance retired). Nothing Accountability- or Progress-like belongs here. */

/** Shortcut tiles. Routes live in COMMAND_ROUTES; billable modules hide their tile when switched off. */
export const COMMAND_TILES: TileDef[] = [
  { id: "operations", href: COMMAND_ROUTES.operations, count: "active_work" },
  { id: "performance", href: COMMAND_ROUTES.performance },
  { id: "incidents", href: COMMAND_ROUTES.incidents, moduleId: "incidents", count: "open_incidents" },
];

/** Selected until the user changes it (and whenever a stored choice is empty or invalid). */
export const DEFAULT_TILE_IDS: string[] = ["operations", "performance", "incidents"];

const TILE_IDS = new Set(COMMAND_TILES.map((tile) => tile.id));
const STORAGE = "mizan.commandTiles";

const storageKey = (userId: string | undefined) => (userId ? `${STORAGE}.${userId}` : STORAGE);

/** Pure: keep only known tile ids; an empty, missing or invalid choice means the default three. */
export function sanitizeSelection(raw: unknown): string[] {
  const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && TILE_IDS.has(id)) : [];
  return ids.length > 0 ? ids : [...DEFAULT_TILE_IDS];
}

function readSelection(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function CommandCenterTiles({
  metrics,
}: {
  metrics?: { active_work: number; open_incidents: number };
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isEnabled } = useModules();
  const key = storageKey(user?.id);
  const overview = useQuery({
    queryKey: ["operations-overview", "tiles"],
    queryFn: () => api.getOperationsOverview({ pageSize: 1 }),
    staleTime: 30_000,
  });
  const counts = {
    active_work: overview.data?.summary?.open ?? metrics?.active_work,
    open_incidents: overview.data?.counts?.incidents ?? metrics?.open_incidents,
  };
  const [selected, setSelected] = useState<string[]>(() => sanitizeSelection(readSelection(storageKey(undefined))));

  useEffect(() => {
    const stored = readSelection(key);
    if (stored) setSelected(sanitizeSelection(stored));
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(selected));
    } catch {
      /* private mode: the choice lasts until reload */
    }
  }, [key, selected]);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const available = COMMAND_TILES.filter((tile) => isEnabled(tile.moduleId));
  const shown = available.filter((tile) => selected.includes(tile.id));

  return (
    <section className="space-y-3" aria-label={t("cursorUi.cmd.tiles.aria")} data-testid="command-tiles">
      <div className="flex flex-wrap gap-2">
        {available.map((tile) => (
          <button
            key={tile.id}
            type="button"
            aria-pressed={selected.includes(tile.id)}
            onClick={() => toggle(tile.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              selected.includes(tile.id) ? "border-primary bg-primary/10" : "border-border text-muted-foreground",
            )}
          >
            {t(`cursorUi.cmd.tiles.${tile.id}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map((tile) => {
          const n = tile.count ? counts[tile.count] : undefined;
          return (
            <Link
              key={tile.id}
              to={tile.href}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/40"
            >
              <div className="text-lg font-semibold">{t(`cursorUi.cmd.tiles.${tile.id}`)}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {tile.count === "active_work"
                  ? t("cursorUi.cmd.tiles.open_count", { count: n ?? 0 })
                  : tile.count === "open_incidents"
                    ? t("cursorUi.cmd.tiles.incident_count", { count: n ?? 0 })
                    : t("cursorUi.cmd.tiles.open")}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { useModules } from "@/hooks/use-modules";
import type { ModuleKey } from "@/lib/types";
import { COMMAND_ROUTES } from "@/lib/commandCentre";
import { cn } from "@/lib/utils";

type TileDef = { id: string; href: string; moduleId?: ModuleKey; count?: "active_work" | "open_incidents" };

/** Shortcut tiles. Routes live in COMMAND_ROUTES; billable modules hide their tile when switched off. */
export const COMMAND_TILES: TileDef[] = [
  { id: "operations", href: COMMAND_ROUTES.operations, count: "active_work" },
  { id: "accountability", href: COMMAND_ROUTES.accountability, moduleId: "accountability" },
  { id: "progress", href: COMMAND_ROUTES.progress },
  { id: "performance", href: COMMAND_ROUTES.performance },
  { id: "calendar", href: COMMAND_ROUTES.calendar },
  { id: "orders", href: COMMAND_ROUTES.orders },
  { id: "incidents", href: COMMAND_ROUTES.incidents, moduleId: "incidents", count: "open_incidents" },
  { id: "attendance", href: COMMAND_ROUTES.attendance, moduleId: "attendance" },
];

const TILE_IDS = new Set(COMMAND_TILES.map((tile) => tile.id));
const STORAGE = "mizan.commandTiles";

const storageKey = (userId: string | undefined) => (userId ? `${STORAGE}.${userId}` : STORAGE);

/** Pure: keep only known tile ids; an empty or missing choice means all tiles. */
export function sanitizeSelection(raw: string[] | undefined): string[] {
  const ids = (raw ?? []).filter((id) => TILE_IDS.has(id));
  return ids.length > 0 ? ids : COMMAND_TILES.map((tile) => tile.id);
}

function readSelection(key: string): string[] | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : undefined;
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
          const n = tile.count && metrics ? metrics[tile.count] : undefined;
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

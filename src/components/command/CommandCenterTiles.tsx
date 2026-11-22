import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const TILES = [
  { id: "operations", label: "Operations", href: "/dashboard/operations/live" },
  { id: "performance", label: "Staff performance", href: "/dashboard/employees/performance" },
  { id: "incidents", label: "Incidents", href: "/dashboard/operations/incidents" },
] as const;

const TILE_IDS = new Set(TILES.map((tile) => tile.id));

const STORAGE = "mizan.commandTiles";

function storageKey(userId: string | undefined) {
  return userId ? `${STORAGE}.${userId}` : STORAGE;
}

function sanitizeSelection(raw: string[] | undefined): string[] {
  const ids = (raw ?? []).filter((id) => TILE_IDS.has(id as (typeof TILES)[number]["id"]));
  return ids.length > 0 ? ids : TILES.map((tile) => tile.id);
}

export function CommandCenterTiles() {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(undefined));
      return sanitizeSelection(raw ? (JSON.parse(raw) as string[]) : undefined);
    } catch {
      return TILES.map((tile) => tile.id);
    }
  });
  const overview = useQuery({ queryKey: ["operations-overview", "tiles"], queryFn: () => api.getOperationsOverview({}) });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSelected(sanitizeSelection(JSON.parse(raw) as string[]));
    } catch {
      /* keep the current choice */
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(selected));
  }, [key, selected]);

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => toggle(tile.id)}
            className={`rounded-full border px-3 py-1 text-xs ${selected.includes(tile.id) ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}
          >
            {tile.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.filter((tile) => selected.includes(tile.id)).map((tile) => (
          <Link key={tile.id} to={tile.href} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/40">
            <div className="text-lg font-semibold">{tile.label}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {tile.id === "operations" ? `${overview.data?.summary.open ?? "—"} open` : null}
              {tile.id === "incidents" ? `${overview.data?.counts.incidents ?? "—"} incidents` : null}
              {tile.id !== "operations" && tile.id !== "incidents" ? "Open" : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
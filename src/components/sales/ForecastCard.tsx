import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, LineChart, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDemandEvent, getDemandEvents, getForecast, removeDemandEvent } from "@/lib/salesApi";
import { useLanguage } from "@/hooks/use-language";

/** Tomorrow per dish, how close past forecasts were, and the days the owner knows will be different. */
export function ForecastCard({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const forecast = useQuery({ queryKey: ["sales-forecast"], queryFn: getForecast });
  const events = useQuery({ queryKey: ["demand-events"], queryFn: getDemandEvents });
  const [form, setForm] = useState({ startsOn: "", extraCovers: "", pct: "", note: "" });

  const refresh = () => {
    for (const key of ["sales-forecast", "demand-events", "buy-list"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const add = useMutation({
    mutationFn: () =>
      addDemandEvent({
        startsOn: form.startsOn,
        note: form.note,
        ...(form.extraCovers ? { extraCovers: Number(form.extraCovers) } : {}),
        ...(form.pct ? { multiplier: 1 + Number(form.pct) / 100 } : {}),
      }),
    onSuccess: () => {
      setForm({ startsOn: "", extraCovers: "", pct: "", note: "" });
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const remove = useMutation({ mutationFn: removeDemandEvent, onSuccess: refresh });

  const acc = forecast.data?.accuracy;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b">
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <LineChart className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">{t("forecast.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {acc?.accuracyPct != null
              ? t("forecast.accuracy", { pct: acc.accuracyPct, days: acc.days })
              : t("forecast.accuracy_pending")}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {forecast.data && forecast.data.dishes.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {t("forecast.tomorrow")}
              {forecast.data.dayReasons.length > 0 && ` · ${forecast.data.dayReasons.join(", ")}`}
            </p>
            <ul className="divide-y">
              {forecast.data.dishes.slice(0, 8).map((dish) => (
                <li key={dish.name} className="flex justify-between py-1.5 text-sm">
                  <span className="truncate">{dish.name}</span>
                  <span className="tabular-nums text-muted-foreground">~{Math.round(dish.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("forecast.no_history")}</p>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("forecast.events_title")}</h3>
          <ul className="space-y-1">
            {(events.data ?? []).map((ev) => (
              <li key={ev.id} className="flex items-center gap-2 text-sm">
                <span className="tabular-nums text-muted-foreground">{ev.startsOn}</span>
                <span className="flex-1 truncate">
                  {ev.note || t("forecast.event")}
                  {ev.extraCovers ? ` · +${ev.extraCovers}` : ""}
                  {ev.multiplier !== 1 ? ` · ×${ev.multiplier}` : ""}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={t("forecast.remove_event")}
                  onClick={() => remove.mutate(ev.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="grid grid-cols-2 sm:grid-cols-[130px_90px_80px_1fr_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <Input
              type="date"
              required
              aria-label={t("forecast.event_date")}
              value={form.startsOn}
              onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
            />
            <Input
              inputMode="numeric"
              aria-label={t("forecast.extra_guests")}
              placeholder={t("forecast.extra_guests")}
              value={form.extraCovers}
              onChange={(e) => setForm({ ...form, extraCovers: e.target.value })}
            />
            <Input
              inputMode="decimal"
              aria-label={t("forecast.change_pct")}
              placeholder="±%"
              value={form.pct}
              onChange={(e) => setForm({ ...form, pct: e.target.value })}
            />
            <Input
              aria-label={t("forecast.event_note")}
              placeholder={t("forecast.event_note")}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <Button type="submit" size="sm" disabled={!form.startsOn || (!form.extraCovers && !form.pct)}>
              <CalendarPlus className="w-4 h-4 mr-1" aria-hidden />
              {t("forecast.add_event")}
            </Button>
          </form>
        </section>
      </CardContent>
    </Card>
  );
}

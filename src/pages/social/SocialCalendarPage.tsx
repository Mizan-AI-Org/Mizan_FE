import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, LayoutList, Loader2, Plus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { SocialPostComposerDialog } from "@/components/social/social-post-composer-dialog";
import { cn } from "@/lib/utils";
import { arSA, enUS, fr } from "date-fns/locale";
import { useLanguage } from "@/hooks/use-language";

type CalendarMode = "week" | "month";
type ViewMode = "list" | "calendar";

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function rangeForMode(anchor: Date, mode: CalendarMode) {
  if (mode === "week") {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    const end = endOfWeek(anchor, { weekStartsOn: 0 });
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return { start: gridStart, end: gridEnd, days: eachDayOfInterval({ start: gridStart, end: gridEnd }), monthStart };
}

type Props = { embedded?: boolean };

export default function SocialCalendarPage({ embedded }: Props = {}) {
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : language === "ar" ? arSA : enUS;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [embeddedView, setEmbeddedView] = useState<ViewMode>("calendar");
  const [embeddedCalendarMode, setEmbeddedCalendarMode] = useState<CalendarMode>("week");
  const [rangeOffset, setRangeOffset] = useState(0);

  const view: ViewMode = embedded
    ? embeddedView
    : searchParams.get("view") === "list"
      ? "list"
      : "calendar";

  const calendarMode: CalendarMode = embedded
    ? embeddedCalendarMode
    : searchParams.get("cal") === "month"
      ? "month"
      : "week";

  const [composerOpen, setComposerOpen] = useState(false);

  const anchor = useMemo(() => {
    const base = new Date();
    if (calendarMode === "week") return addWeeks(base, rangeOffset);
    return addMonths(startOfMonth(base), rangeOffset);
  }, [calendarMode, rangeOffset]);

  const range = useMemo(() => rangeForMode(anchor, calendarMode), [anchor, calendarMode]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-calendar", dateKey(range.start), dateKey(range.end)],
    queryFn: () => socialApi.calendar(dateKey(range.start), dateKey(range.end)),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown>>>();
    for (const ev of data || []) {
      const key = String(ev.start || "").slice(0, 10);
      if (!key) continue;
      map.set(key, [...(map.get(key) || []), ev]);
    }
    return map;
  }, [data]);

  const setView = (v: ViewMode) => {
    if (embedded) setEmbeddedView(v);
    else setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("view", v);
      return next;
    });
  };

  const setCalMode = (m: CalendarMode) => {
    setRangeOffset(0);
    if (embedded) setEmbeddedCalendarMode(m);
    else setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("cal", m);
      return next;
    });
  };

  const periodLabel =
    calendarMode === "week"
      ? `${format(range.start, "MMM d", { locale: dateLocale })} – ${format(range.end, "MMM d, yyyy", { locale: dateLocale })}`
      : format(anchor, "MMMM yyyy", { locale: dateLocale });
  const weekdayLabels = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 0 }),
    end: endOfWeek(new Date(), { weekStartsOn: 0 }),
  }).map((day) => format(day, "EEE", { locale: dateLocale }));

  const viewToggle = (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => v && setView(v as ViewMode)}
      className="rounded-lg border p-0.5"
    >
      <ToggleGroupItem value="list" className="gap-1 px-3">
        <LayoutList className="h-4 w-4" />
        {t("social.calendar.list")}
      </ToggleGroupItem>
      <ToggleGroupItem value="calendar" className="gap-1 px-3">
        <CalendarIcon className="h-4 w-4" />
        {t("social.calendar.calendar")}
      </ToggleGroupItem>
    </ToggleGroup>
  );

  const calModeToggle = (
    <ToggleGroup
      type="single"
      value={calendarMode}
      onValueChange={(v) => v && setCalMode(v as CalendarMode)}
      className="rounded-lg border p-0.5"
    >
      <ToggleGroupItem value="week" className="px-3">
        {t("social.calendar.week")}
      </ToggleGroupItem>
      <ToggleGroupItem value="month" className="px-3">
        {t("social.calendar.month")}
      </ToggleGroupItem>
    </ToggleGroup>
  );

  const toolbar = (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {view === "calendar" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("social.calendar.prev")}
            onClick={() => setRangeOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-medium">{periodLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("social.calendar.next")}
            onClick={() => setRangeOffset((o) => o + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setRangeOffset(0)}>
            {t("social.calendar.today")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {view === "calendar" ? calModeToggle : null}
        {viewToggle}
      </div>
    </div>
  );

  const inner = (
    <>
      {toolbar}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {t("social.calendar.load_error")}{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            {t("common.retry")}
          </button>
        </p>
      ) : view === "list" ? (
        !data?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("social.calendar.empty")}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {data.map((ev) => (
              <li key={String(ev.id)}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => navigate(`/dashboard/social-media/content/${ev.id}`)}
                >
                  <span>{String(ev.title)}</span>
                  <span className="text-sm text-muted-foreground">
                    {String(ev.start)} · {String(ev.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div
            className={cn(
              "grid grid-cols-7 gap-1",
              calendarMode === "week" ? "min-h-[120px]" : "min-h-[320px]",
            )}
          >
            {range.days.map((day) => {
              const key = dateKey(day);
              const events = byDay.get(key) || [];
              const inMonth = calendarMode === "week" || isSameMonth(day, range.monthStart ?? anchor);
              const isToday = dateKey(day) === dateKey(new Date());
              return (
                <div
                  key={key}
                  className={cn(
                    "flex min-h-[88px] flex-col rounded-lg border p-1.5 sm:min-h-[100px] sm:p-2",
                    inMonth ? "bg-muted/10" : "bg-muted/5 opacity-60",
                    isToday && "ring-2 ring-primary/40",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {format(day, calendarMode === "week" ? "EEE d" : "d", { locale: dateLocale })}
                  </p>
                  <div className="mt-1 flex-1 space-y-0.5 overflow-hidden">
                    {events.map((ev) => (
                      <button
                        key={String(ev.id)}
                        type="button"
                        className="block w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-[10px] hover:bg-primary/20 sm:text-[11px]"
                        onClick={() => navigate(`/dashboard/social-media/content/${ev.id}`)}
                      >
                        {String(ev.title)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!embedded ? <SocialPostComposerDialog open={composerOpen} onOpenChange={setComposerOpen} /> : null}
    </>
  );

  if (embedded) return inner;

  return (
    <SocialPageShell
      title={t("social.calendar.title")}
      description={t("social.calendar.desc")}
      actions={
        <>
          {viewToggle}
          <Button className="gap-2" onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> {t("social.calendar.add_post")}
          </Button>
        </>
      }
    >
      {inner}
    </SocialPageShell>
  );
}

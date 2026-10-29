import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, Download, Loader2, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/types";

const STATUS_TONE: Record<PresenceStatus, string> = {
  on_time: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  late: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  not_yet_in: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  absent_unreported: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  absent_reported: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  absent_justified: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  on_leave: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  unscheduled_in: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  upcoming: "bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
};

function token() {
  return localStorage.getItem("access_token") || "";
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Live / daily presence and the monthly clock-in recap (floor staff only; managers do not clock in). */
export default function PresenceRecap() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("month") ? "month" : "day");
  const [day, setDay] = useState(todayIso());
  const [month, setMonth] = useState(params.get("month") || todayIso().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  const dayQuery = useQuery({
    queryKey: ["people-day-presence", day],
    queryFn: () => api.getDayPresence(token(), day),
    enabled: tab === "day",
    refetchInterval: day === todayIso() ? 60_000 : false,
  });
  const monthQuery = useQuery({
    queryKey: ["people-month-recap", month],
    queryFn: () => api.getMonthlyAttendance(token(), month),
    enabled: tab === "month",
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadMonthlyAttendanceCsv(token(), month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const s = dayQuery.data?.summary || {};

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">{t("hr.presence.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="day">{t("hr.presence.tab_day")}</TabsTrigger>
              <TabsTrigger value="month">{t("hr.presence.tab_month")}</TabsTrigger>
            </TabsList>
            {tab === "day" ? (
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value || todayIso())} className="w-auto" />
            ) : (
              <div className="flex gap-2">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value || month)} className="w-auto" />
                <Button variant="outline" onClick={exportCsv} disabled={exporting}>
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 me-1" />} CSV
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="day" className="pt-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Badge variant="outline">
                {t("hr.presence.present")}: {s.present ?? 0}/{s.expected ?? 0}
              </Badge>
              <Badge variant="outline">{t("hr.presence.late")}: {s.late ?? 0}</Badge>
              <Badge variant="outline">{t("hr.presence.not_yet_in")}: {s.not_yet_in ?? 0}</Badge>
              <Badge variant="outline">
                {t("hr.presence.absent_reported")}: {(s.absent_reported ?? 0) + (s.absent_justified ?? 0)}
              </Badge>
              <Badge variant="outline" className="text-red-600">
                {t("hr.presence.absent_unreported")}: {s.absent_unreported ?? 0}
              </Badge>
              <Badge variant="outline">{t("hr.presence.on_leave")}: {s.on_leave ?? 0}</Badge>
            </div>
            {dayQuery.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (dayQuery.data?.staff.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">{t("hr.presence.nobody")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("hr.presence.col_staff")}</TableHead>
                      <TableHead>{t("hr.presence.col_shift")}</TableHead>
                      <TableHead>{t("hr.presence.col_clock_in")}</TableHead>
                      <TableHead>{t("hr.presence.col_status")}</TableHead>
                      <TableHead>{t("hr.presence.col_hours")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayQuery.data!.staff.map((r) => (
                      <TableRow key={r.staffId}>
                        <TableCell>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-[11px] text-slate-500">{r.role}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.shiftStart ? `${r.shiftStart}–${r.shiftEnd}` : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.clockIn || "—"}
                          {r.site ? <span className="text-[11px] text-slate-500"> · {r.site}</span> : null}
                          {r.photoUrl ? (
                            <a href={r.photoUrl} target="_blank" rel="noopener noreferrer" className="ms-1 inline-flex align-middle text-slate-400 hover:text-emerald-600" aria-label={t("hr.presence.photo")}>
                              <Camera className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap", STATUS_TONE[r.status])}>
                            {t(`hr.presence.${r.status}`)}
                            {r.status === "late" ? ` +${r.lateMinutes} min` : ""}
                          </span>
                          {r.absence ? (
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              {t(`hr.absence.reason.${r.absence.reason}`, { defaultValue: r.absence.reasonLabel })}
                              {r.absence.justification ? (
                                <a href={r.absence.justification.url} target="_blank" rel="noopener noreferrer" className="ms-1 inline-flex text-emerald-600" aria-label={t("hr.absence.view_justification")}>
                                  <Paperclip className="w-3 h-3" />
                                </a>
                              ) : null}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{r.hours ? `${r.hours}h` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="month" className="pt-4">
            {monthQuery.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (monthQuery.data?.staff.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">{t("hr.presence.nobody")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("hr.presence.col_staff")}</TableHead>
                      <TableHead>{t("hr.month.present")}</TableHead>
                      <TableHead>{t("hr.month.rate")}</TableHead>
                      <TableHead>{t("hr.month.late")}</TableHead>
                      <TableHead>{t("hr.month.absences")}</TableHead>
                      <TableHead>{t("hr.month.no_show")}</TableHead>
                      <TableHead>{t("hr.month.leave")}</TableHead>
                      <TableHead>{t("hr.presence.col_hours")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthQuery.data!.staff.map((r) => (
                      <TableRow key={r.staffId}>
                        <TableCell>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-[11px] text-slate-500">{r.role}</p>
                        </TableCell>
                        <TableCell>
                          {r.days_present}/{r.scheduled_shifts}
                        </TableCell>
                        <TableCell>{r.attendance_rate === null ? "—" : `${r.attendance_rate}%`}</TableCell>
                        <TableCell className={cn(r.late_count >= 3 && "text-amber-600 font-semibold")}>
                          {r.late_count} · {r.late_minutes} min
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[12px]">
                          <span className="text-emerald-700 dark:text-emerald-400">{r.absences_justified}✓</span>{" "}
                          <span className="text-amber-600">{r.absences_pending}…</span>{" "}
                          <span className="text-red-600">{r.absences_unjustified}✗</span>
                        </TableCell>
                        <TableCell className={cn(r.absent_unreported > 0 && "text-red-600 font-semibold")}>{r.absent_unreported}</TableCell>
                        <TableCell>{r.leave_days}</TableCell>
                        <TableCell>{r.hours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, RefreshCw, Plug, Users } from "lucide-react";

/** Backend errors that mean no provider / credentials (not upstream/API outages). */
function isReservationConnectionConfigError(message: string | undefined): boolean {
  if (!message?.trim()) return false;
  const m = message.toLowerCase();
  return (
    m.includes("reservation provider") ||
    m.includes("eat now restaurant id is required") ||
    m.includes("api key and restaurant id") ||
    (m.includes("eat now") && m.includes("required") && m.includes("settings")) ||
    m.includes("configure it in settings") ||
    m.includes("save them in settings")
  );
}

export default function ReservationsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"));

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["eatnow-reservations", accessToken, startDate, endDate],
    queryFn: () => api.getEatNowReservations(accessToken!, startDate, endDate),
    enabled: !!accessToken,
  });

  const rows = data?.reservations ?? [];
  const rawErrorMessage =
    isError && error instanceof Error
      ? error.message
      : !isLoading && data && !data.success
        ? data.error ?? ""
        : "";
  const notConnected =
    !isLoading &&
    (isError || (data != null && !data.success)) &&
    isReservationConnectionConfigError(rawErrorMessage);

  return (
    <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600 shrink-0" />
            {t("dashboard.reservations.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.reservations.page_subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="w-full border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            {t("dashboard.reservations.date_range")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              disabled={notConnected}
            />
            <span className="text-muted-foreground">{t("dashboard.reservations.date_to")}</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              disabled={notConnected}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.reservations.loading")}</p>
          )}
          {!isLoading && notConnected && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-5 dark:border-amber-900/50 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3 min-w-0">
                <Plug className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {t("dashboard.reservations.not_connected_title")}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {t("dashboard.reservations.connect_settings")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={() => navigate("/dashboard/settings")}
              >
                {t("dashboard.reservations.open_settings")}
              </Button>
            </div>
          )}
          {!isLoading && !notConnected && isError && (
            <p className="text-sm text-destructive py-4">
              {(error as Error)?.message || t("dashboard.reservations.load_failed")}
            </p>
          )}
          {!isLoading && !notConnected && data && !data.success && (
            <p className="text-sm text-destructive py-4">{data.error || t("dashboard.reservations.load_failed")}</p>
          )}
          {!isLoading && !notConnected && data?.success && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("dashboard.reservations.empty_table")}
            </p>
          )}
          {!isLoading && !notConnected && data?.success && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Covers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id || `${r.start_time}-${r.guest_name}`}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.start_time ? String(r.start_time) : "—"}
                      </TableCell>
                      <TableCell>{r.guest_name || "—"}</TableCell>
                      <TableCell>{r.covers ?? "—"}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge variant="secondary" className="font-normal">
                            {String(r.status)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                        {r.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { api, API_BASE } from "../lib/api";
import {
  isBookingSystemConnected,
  RESERVATION_BOOKING_CONNECT_PATH,
  type ReservationSettingsSnapshot,
} from "@/lib/reservationConnection";
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
import { CloudDownload, Plug, RefreshCw, Users } from "lucide-react";
import { PAGE_SHELL } from "@/lib/page-shell";
import { toast } from "sonner";

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

type ReservationsPanelProps = { embedded?: boolean };

export function ReservationsPanel({ embedded = false }: ReservationsPanelProps) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [isImporting, setIsImporting] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["unified-settings-reservations", accessToken],
    queryFn: async (): Promise<ReservationSettingsSnapshot> => {
      const r = await fetch(`${API_BASE}/settings/unified/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return {};
      return (await r.json()) as ReservationSettingsSnapshot;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const bookingConnected = isBookingSystemConnected(settingsQuery.data);

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["eatnow-reservations", accessToken, startDate, endDate],
    queryFn: () => api.getEatNowReservations(accessToken!, startDate, endDate),
    enabled: !!accessToken && bookingConnected,
  });

  const rows = data?.reservations ?? [];
  const rawErrorMessage =
    isError && error instanceof Error
      ? error.message
      : !isLoading && data && !data.success
        ? data.error ?? ""
        : "";
  const notConnected = !settingsQuery.isLoading && !bookingConnected;
  const apiConfigError =
    !isLoading &&
    bookingConnected &&
    (isError || (data != null && !data.success)) &&
    isReservationConnectionConfigError(rawErrorMessage);

  const goConnectBooking = () => navigate(RESERVATION_BOOKING_CONNECT_PATH);

  async function handleImportFromEatNowApi() {
    if (!accessToken) return;
    setIsImporting(true);
    try {
      const res = await api.postEatNowReservationsSync(accessToken, {
        start_date: startDate,
        end_date: endDate,
      });
      const n = res.imported ?? 0;
      toast.success(t("dashboard.reservations.import_success", { count: String(n) }));
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.reservations.load_failed"));
    } finally {
      setIsImporting(false);
    }
  }

  const shellClass = embedded ? "space-y-6" : `${PAGE_SHELL} space-y-6 py-8`;

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {embedded ? (
          <p className="text-sm text-muted-foreground">
            {notConnected
              ? t("dashboard.reservations.page_subtitle_disconnected")
              : t("dashboard.reservations.page_subtitle")}
          </p>
        ) : (
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Users className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
              {t("dashboard.reservations.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {notConnected
                ? t("dashboard.reservations.page_subtitle_disconnected")
                : t("dashboard.reservations.page_subtitle")}
            </p>
          </div>
        )}
        {bookingConnected ? (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleImportFromEatNowApi()}
              disabled={isLoading || isImporting}
              title={t("dashboard.reservations.import_from_api_title")}
            >
              <CloudDownload className={`mr-2 h-4 w-4 ${isImporting ? "animate-pulse" : ""}`} />
              {t("dashboard.reservations.import_from_api")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isImporting}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {t("dashboard.reservations.refresh")}
            </Button>
          </div>
        ) : null}
      </div>

      {settingsQuery.isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("dashboard.reservations.loading")}
        </p>
      ) : notConnected ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-start gap-4 rounded-xl border border-border/80 bg-card px-5 py-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            <Plug className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">
                {t("dashboard.reservations.not_connected_title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.reservations.connect_booking_body")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onClick={goConnectBooking}
          >
            <Plug className="mr-2 h-4 w-4" />
            {t("dashboard.reservations.connect_booking_system")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">
              {t("dashboard.reservations.date_range")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-muted-foreground">{t("dashboard.reservations.date_to")}</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>

          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.reservations.loading")}
            </p>
          )}

          {!isLoading && apiConfigError && (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-foreground">
                {rawErrorMessage || t("dashboard.reservations.connect_settings")}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={goConnectBooking}>
                {t("dashboard.reservations.open_settings")}
              </Button>
            </div>
          )}

          {!isLoading && isError && !apiConfigError && (
            <p className="py-4 text-sm text-destructive">
              {(error as Error)?.message || t("dashboard.reservations.load_failed")}
            </p>
          )}

          {!isLoading && data && !data.success && !apiConfigError && (
            <p className="py-4 text-sm text-destructive">
              {data.error || t("dashboard.reservations.load_failed")}
            </p>
          )}

          {!isLoading && data?.success && rows.length === 0 && (
            <div className="space-y-1 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("dashboard.reservations.empty_table")}</p>
              <p className="mx-auto max-w-md text-xs text-muted-foreground">
                {t("dashboard.reservations.empty_import_hint")}
              </p>
            </div>
          )}

          {!isLoading && data?.success && rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.reservations.col_when")}</TableHead>
                    <TableHead>{t("dashboard.reservations.col_guest")}</TableHead>
                    <TableHead>{t("dashboard.reservations.covers")}</TableHead>
                    <TableHead>{t("dashboard.reservations.col_status")}</TableHead>
                    <TableHead>{t("dashboard.reservations.col_contact")}</TableHead>
                    <TableHead>{t("dashboard.reservations.col_notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id || `${r.start_time}-${r.guest_name}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {r.start_time ? String(r.start_time) : "-"}
                      </TableCell>
                      <TableCell>{r.guest_name || "-"}</TableCell>
                      <TableCell>{r.covers ?? "-"}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge variant="secondary" className="font-normal">
                            {String(r.status)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {r.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReservationsPage() {
  return <ReservationsPanel />;
}

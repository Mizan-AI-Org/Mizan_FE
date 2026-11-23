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
import { CloudDownload, Plug, Plus, RefreshCw, Users } from "lucide-react";
import ReservationDialog, { type ReservationRow } from "@/components/reservations/ReservationDialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReservationRow | null>(null);

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
    enabled: !!accessToken,
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

  async function changeStatus(id: string, status: "seated" | "completed" | "cancelled" | "no_show") {
    if (!accessToken) return;
    if (status === "cancelled" && !window.confirm(t("reservations.confirm_cancel"))) return;
    try {
      await api.setReservationStatus(accessToken, id, status);
      toast.success(t("reservations.status_updated"));
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reservations.form.save_failed"));
    }
  }

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
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button type="button" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {t("reservations.new")}
          </Button>
        </div>
        {bookingConnected ? (
          <div className="flex flex-wrap items-center gap-2">
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
      ) : (
        <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5">
          {notConnected ? (
            <div role="status" className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plug className="h-4 w-4 shrink-0" aria-hidden />
                {t("dashboard.reservations.connect_booking_body")}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={goConnectBooking}>
                {t("dashboard.reservations.connect_booking_system")}
              </Button>
            </div>
          ) : null}
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
                    <TableHead>{t("reservations.form.table")}</TableHead>
                    <TableHead>{t("dashboard.reservations.col_notes")}</TableHead>
                    <TableHead className="text-right">{t("reservations.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id || `${r.start_time}-${r.guest_name}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {r.start_time ? new Date(r.start_time).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>{r.guest_name || "-"}</TableCell>
                      <TableCell>{r.covers ?? "-"}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge variant="secondary" className="font-normal">
                            {t(`reservations.status.${String(r.status)}`)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.table || "-"}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {r.notes || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {r.status === "cancelled" || r.status === "completed" || r.status === "no_show" ? null : (
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                              {t("reservations.edit")}
                            </Button>
                            {r.status === "seated" ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => void changeStatus(r.id, "completed")}>
                                {t("reservations.complete")}
                              </Button>
                            ) : (
                              <Button type="button" size="sm" variant="ghost" onClick={() => void changeStatus(r.id, "seated")}>
                                {t("reservations.seat")}
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="ghost" onClick={() => void changeStatus(r.id, "no_show")}>
                              {t("reservations.no_show")}
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void changeStatus(r.id, "cancelled")}>
                              {t("common.cancel")}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
      <ReservationDialog
        open={dialogOpen}
        accessToken={accessToken || ""}
        reservation={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void refetch()}
      />
    </div>
  );
}

export default function ReservationsPage() {
  return <ReservationsPanel />;
}

import { ArrowRight, Package, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CommandBriefingSnapshot, CommandCentrePayload } from "@/lib/commandCentre";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

const DOMAIN_LABEL_KEYS: Record<string, string> = {
  operations: "nav.operations",
  employees: "nav.employees",
  products: "nav.products",
  suppliers: "nav.suppliers",
  financials: "nav.financials",
  customers: "nav.customers",
};

function severityBorder(severity?: string) {
  if (severity === "critical") return "border-critical-border/80 bg-critical-muted/50 shadow-sm";
  if (severity === "high") return "border-high/35 bg-high-muted/40 shadow-sm";
  return "border-border/80 bg-card shadow-sm";
}

type Props = {
  data: CommandCentrePayload;
};

export function CommandOperationsOverview({ data }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const briefing: CommandBriefingSnapshot | undefined = data.briefing;
  const live = briefing?.live;
  const onShift = live?.clockedIn?.length ?? live?.todaysClockIns?.length ?? data.metrics.people_working;
  const missingClock = live?.missingClockIns?.length ?? 0;
  const upcoming = briefing?.upcomingShifts ?? [];
  const inventoryCount = briefing?.inventoryAlerts?.length ?? 0;
  const pulse =
    (briefing?.whatsHappening || live?.summary || "").trim() ||
    (data.domain_attention?.length
      ? t("command.ops_pulse_fallback", {
          defaultValue: "Review the areas below for what needs attention across the business.",
        })
      : "");

  const domains = data.domain_attention ?? [];
  const showStaffing = onShift > 0 || upcoming.length > 0 || missingClock > 0;
  const nextShifts = upcoming.slice(0, 3);

  return (
    <section
      aria-label={t("command.ops_overview")}
      className="command-ops-panel space-y-4 rounded-2xl border border-border/70 bg-gradient-to-b from-primary/[0.04] to-card p-4 shadow-sm md:p-5"
    >
      {pulse ? (
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{pulse}</p>
      ) : null}

      {showStaffing || inventoryCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {onShift > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard/employees/attendance")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-caption font-medium text-foreground hover:bg-muted/50"
            >
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("command.on_shift", { count: onShift, defaultValue: `${onShift} on shift` })}
            </button>
          ) : null}
          {upcoming.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard/employees/shifts")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-caption font-medium text-foreground hover:bg-muted/50"
            >
              {t("command.scheduled", {
                count: upcoming.length,
                defaultValue: `${upcoming.length} scheduled later`,
              })}
            </button>
          ) : null}
          {missingClock > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard/employees/attendance")}
              className="inline-flex items-center gap-1.5 rounded-full border border-high/50 bg-high-muted/30 px-3 py-1.5 text-caption font-medium text-high-foreground hover:bg-high-muted/50"
            >
              {t("command.missing_clock", {
                count: missingClock,
                defaultValue: `${missingClock} missing clock-in`,
              })}
            </button>
          ) : null}
          {inventoryCount > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard/products/inventory")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-caption font-medium text-foreground hover:bg-muted/50"
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {t("command.low_stock", {
                count: inventoryCount,
                defaultValue: `${inventoryCount} low-stock items`,
              })}
            </button>
          ) : null}
        </div>
      ) : null}

      {nextShifts.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
          <p className="mb-2 text-caption font-medium text-muted-foreground">
            {t("command.next_shifts", { defaultValue: "Next on the schedule" })}
          </p>
          <ul className="space-y-1.5">
            {nextShifts.map((shift) => (
              <li
                key={shift.id || `${shift.staffName}-${shift.startsAt}`}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-medium text-foreground">
                  {shift.staffName || t("command.unassigned_shift", { defaultValue: "Shift" })}
                  {shift.roleLabel ? (
                    <span className="ms-1.5 font-normal text-muted-foreground">· {shift.roleLabel}</span>
                  ) : null}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {shift.start_time && shift.end_time
                    ? `${shift.start_time}–${shift.end_time}`
                    : shift.startsAt
                      ? new Date(shift.startsAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {domains.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t("command.domains_title")}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((area) => {
              const labelKey = DOMAIN_LABEL_KEYS[area.domain] || `nav.${area.domain}`;
              const detail = area.detail_key
                ? t(area.detail_key, { ...(area.detail_params || {}), defaultValue: area.detail })
                : area.detail;
              return (
                <button
                  key={area.domain}
                  type="button"
                  onClick={() => navigate(area.href)}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border px-3 py-3 text-start transition-colors hover:bg-background/80",
                    severityBorder(area.severity),
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {t(labelKey, { defaultValue: area.title })}
                  </span>
                  <span className="line-clamp-2 text-caption text-muted-foreground">{detail}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-caption font-medium text-primary">
                    {t("command.view_area", { defaultValue: "Open" })}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

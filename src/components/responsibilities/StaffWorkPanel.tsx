import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { api, type StaffWorkTask } from "@/lib/api";

function taskStatus(row: StaffWorkTask, t: (key: string, fallback?: string) => string) {
  if (row.overdue) return t("status.OVERDUE", "Overdue");
  const known = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
  if (known.includes(row.status)) return t(`status.${row.status}`);
  return row.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function TaskBucket({
  label,
  rows,
  empty,
  t,
}: {
  label: string;
  rows: StaffWorkTask[];
  empty: string;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <section className="rounded-xl border border-border/70 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {!rows.length ? <p className="text-xs text-muted-foreground">{empty}</p> : null}
      </div>
      {rows.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-baseline gap-3 text-sm">
              <span className="truncate">{row.title}</span>
              <span className="text-end text-xs text-muted-foreground">{taskStatus(row, t)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function StaffWorkPanel({ staffId }: { staffId: string }) {
  const { t } = useLanguage();
  const workQuery = useQuery({
    queryKey: ["staff-work", staffId],
    queryFn: () => api.getStaffWork(staffId),
    enabled: Boolean(staffId),
  });

  const work = workQuery.data;

  if (workQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("cursorUi.resp.loading")}</p>;
  if (workQuery.isError || !work) return <p className="text-sm text-destructive">{t("cursorUi.resp.load_error")}</p>;

  return (
    <div className="space-y-4" data-testid="staff-work-panel">
      <h4 className="text-sm font-semibold">{t("cursorUi.resp.work_title", "Work")}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TaskBucket label={t("cursorUi.resp.work_active", "Active")} rows={work.active} empty={t("cursorUi.resp.work_empty", "None")} t={t} />
        <TaskBucket label={t("cursorUi.resp.work_pending", "Pending")} rows={work.pending} empty={t("cursorUi.resp.work_empty", "None")} t={t} />
        <TaskBucket label={t("cursorUi.resp.work_overdue", "Overdue")} rows={work.overdue} empty={t("cursorUi.resp.work_empty", "None")} t={t} />
        <TaskBucket label={t("cursorUi.resp.work_done", "Completed")} rows={work.completed} empty={t("cursorUi.resp.work_empty", "None")} t={t} />
      </div>
      <section className="space-y-1">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t("cursorUi.resp.work_history", "History")}</p>
        <ul className="space-y-1">
          {(work.history || []).map((row) => (
            <li key={row.id} className="text-xs text-muted-foreground">
              {row.reason} · {row.kind} · {row.created_at.slice(0, 10)}
            </li>
          ))}
        </ul>
        {!work.history?.length ? <p className="text-xs text-muted-foreground">{t("cursorUi.resp.work_empty", "None")}</p> : null}
      </section>
    </div>
  );
}

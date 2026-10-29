import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { listArchived, restoreItem, type ArchiveKind, type ArchivedRow } from "@/lib/archiveApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Everything archived in the last weeks (tasks, incidents, checklists, menu, food safety checks...), restorable
 * for 30 days. Miya does the same with list-archived / restore-item. */

const KINDS: ArchiveKind[] = [
  "task",
  "incident",
  "reminder",
  "announcement",
  "sop",
  "process_template",
  "checklist_template",
  "menu_item",
  "menu_category",
  "shift_template",
  "control_point",
];

export default function ArchivedPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ArchiveKind | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery<ArchivedRow[]>({
    queryKey: ["archived", kind],
    queryFn: () => listArchived(kind || undefined),
  });

  const restore = async (row: ArchivedRow) => {
    setBusy(row.id);
    try {
      await restoreItem(row.kind, row.id);
      toast.success(t("archive.restored_named", { name: row.title }));
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("archive.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("archive.subtitle")}</p>
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={kind}
          aria-label={t("archive.filter")} onChange={(e) => setKind(e.target.value as ArchiveKind | "")}>
          <option value="">{t("archive.all_kinds")}</option>
          {KINDS.map((k) => <option key={k} value={k}>{t(`archive.kinds.${k}`)}</option>)}
        </select>
      </div>
      <Card>
        <CardContent className="space-y-1 p-4">
          {isLoading && <p className="text-sm text-muted-foreground">{t("archive.loading")}</p>}
          {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
          {!isLoading && !error && !data?.length && <p className="text-sm text-muted-foreground">{t("archive.empty")}</p>}
          {data?.map((row) => (
            <div key={`${row.kind}-${row.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`archive.kinds.${row.kind}`)} · {new Date(row.archivedAt).toLocaleString()}
                </p>
              </div>
              {row.restorable ? (
                <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => restore(row)}>
                  <ArchiveRestore className="mr-1 h-4 w-4" />
                  {t("archive.restore")}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{t("archive.expired")}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

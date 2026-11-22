import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskAssigneePicker } from "@/components/dashboard/TaskAssigneePicker";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { OPERATIONS_OVERVIEW_KEY } from "@/pages/operations/useOperationsOverview";
import { laneOf, operationsDetailHref, type OperationsAction, type OperationsItem } from "@/pages/operations/contract";

type StatusAction = "got_it" | "need_help" | "done";
const STATUS_OF: Record<StatusAction, "GOT_IT" | "NEED_HELP" | "COMPLETED"> = {
  got_it: "GOT_IT",
  need_help: "NEED_HELP",
  done: "COMPLETED",
};

export function OperationsItemSheet({
  item,
  onClose,
  onOpenFull,
}: {
  item: OperationsItem | null;
  onClose: () => void;
  /** Hand a task to the layout's full task sheet (?task=) or go to the row's own page. */
  onOpenFull?: (item: OperationsItem, href: string | null) => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [sendingBack, setSendingBack] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setSendingBack(false);
    setNote("");
  }, [item?.id]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [OPERATIONS_OVERVIEW_KEY] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-task-demand", item?.id] });
  };
  const failed = (error: unknown) => toast.error(error instanceof Error ? error.message : t("cursorUi.ops.action_failed"));

  const respond = useMutation({
    mutationFn: (action: StatusAction) => {
      if (!item) return Promise.resolve(null);
      return api.updateDashboardTaskStatus(item.id, STATUS_OF[action]);
    },
    onSuccess: () => {
      refresh();
      toast.success(t("cursorUi.ops.updated"));
      onClose();
    },
    onError: failed,
  });

  // Claim-first: the first "Je prends" wins; a late tap is told who has it (the server's message, in the user's language).
  const claim = useMutation({
    mutationFn: () => api.claimOperationsItem(item!.kind, item!.id),
    onSuccess: (result) => {
      refresh();
      if (result.won) toast.success(result.message || t("cursorUi.ops.claim_won"));
      else toast.info(result.message || t("cursorUi.ops.claim_lost", { name: result.claimedBy?.name || "" }));
    },
    onError: failed,
  });

  const assign = useMutation({
    mutationFn: (assigneeId: string | null) => api.updateDashboardTaskAssignee(item!.id, assigneeId),
    onSuccess: () => {
      refresh();
      toast.success(t("cursorUi.ops.assigned"));
    },
    onError: failed,
  });

  const review = useMutation({
    mutationFn: (input: { approve: boolean; note?: string }) => api.reviewDashboardTask(item!.id, input.approve, input.note),
    onSuccess: (_data, input) => {
      refresh();
      toast.success(t(input.approve ? "cursorUi.ops.validated" : "cursorUi.ops.sent_back"));
      onClose();
    },
    onError: failed,
  });

  const can = (action: OperationsAction) => Boolean(item?.actions?.includes(action));
  const busy = respond.isPending || claim.isPending || assign.isPending || review.isPending;
  const href = item ? operationsDetailHref(item) : null;

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{item.title}</SheetTitle>
              <SheetDescription className="sr-only">{t(`cursorUi.ops.category.${item.category}`)}</SheetDescription>
            </SheetHeader>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={t("cursorUi.ops.row_type")} value={t(`cursorUi.ops.category.${item.category}`)} />
              <Row label={t("cursorUi.ops.row_status")} value={t(`cursorUi.ops.lane.${laneOf(item)}`)} />
              <Row label={t("cursorUi.ops.row_assignee")} value={item.assignee?.name || t("cursorUi.ops.unassigned")} />
              <Row label={t("cursorUi.ops.priority")} value={t(`cursorUi.ops.priority_${item.priority}`, { defaultValue: item.priority })} />
              {item.dueAt ? <Row label={t("cursorUi.ops.row_due")} value={item.dueAt.slice(0, 10)} /> : null}
            </dl>

            {item.claim?.open && !item.claim.claimable ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("cursorUi.ops.claim_waiting_long")}</p>
            ) : null}
            {item.claim?.claimedBy && !item.claim.open && item.claim.claimedBy.id !== item.assignee?.id ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("cursorUi.ops.claim_lost", { name: item.claim.claimedBy.name })}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {can("claim") ? (
                <Button type="button" onClick={() => claim.mutate()} disabled={busy}>
                  {t("cursorUi.ops.claim")}
                </Button>
              ) : null}
              {can("got_it") ? (
                <Button type="button" variant="outline" onClick={() => respond.mutate("got_it")} disabled={busy}>
                  {t("cursorUi.ops.got_it")}
                </Button>
              ) : null}
              {can("need_help") ? (
                <Button type="button" variant="outline" onClick={() => respond.mutate("need_help")} disabled={busy}>
                  {t("cursorUi.ops.need_help")}
                </Button>
              ) : null}
              {can("done") ? (
                <Button type="button" onClick={() => respond.mutate("done")} disabled={busy}>
                  {t("cursorUi.ops.done")}
                </Button>
              ) : null}
            </div>

            {can("assign") ? (
              <div className="mt-6 space-y-2">
                <div className="text-sm font-medium">{t("cursorUi.ops.assign")}</div>
                <TaskAssigneePicker
                  assigneeId={item.assignee?.id ?? null}
                  assigneeName={item.assignee?.name ?? null}
                  onChange={(id) => assign.mutate(id)}
                  isUpdating={assign.isPending}
                />
              </div>
            ) : null}

            {can("validate") || can("send_back") ? (
              <div className="mt-6 space-y-2 rounded-lg border border-border/70 p-3">
                <div className="text-sm font-medium">{t("cursorUi.ops.review_title")}</div>
                {sendingBack ? (
                  <>
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t("cursorUi.ops.send_back_note")}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" disabled={busy} onClick={() => review.mutate({ approve: false, note })}>
                        {t("cursorUi.ops.send_back")}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setSendingBack(false)}>
                        {t("cursorUi.ops.cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    {can("validate") ? (
                      <Button type="button" disabled={busy} onClick={() => review.mutate({ approve: true })}>
                        {t("cursorUi.ops.validate")}
                      </Button>
                    ) : null}
                    {can("send_back") ? (
                      <Button type="button" variant="outline" disabled={busy} onClick={() => setSendingBack(true)}>
                        {t("cursorUi.ops.send_back")}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {onOpenFull && (item.kind === "task" || href) ? (
              <div className="mt-6">
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => onOpenFull(item, href)}>
                  {t("cursorUi.ops.open_full")}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}

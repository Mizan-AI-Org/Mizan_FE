import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { OperationsItem } from "@/pages/operations/contract";

export function OperationsItemSheet({
  item,
  onClose,
}: {
  item: OperationsItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mine = Boolean(item?.assignee?.id && user?.id && item.assignee.id === user.id);
  const respond = useMutation({
    mutationFn: (status: "GOT_IT" | "NEED_HELP" | "COMPLETED") => {
      if (!item || item.kind !== "task") return Promise.resolve(null);
      return api.updateDashboardTaskStatus(item.id, status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operations-overview"] });
      onClose();
    },
  });

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{item.title}</SheetTitle>
            </SheetHeader>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Type" value={item.category.replace(/_/g, " ")} />
              <Row label="Status" value={item.status} />
              <Row label="Assignee" value={item.assignee?.name || "Unassigned"} />
              <Row label="Priority" value={item.priority} />
              {item.dueAt ? <Row label="Due" value={item.dueAt.slice(0, 10)} /> : null}
            </dl>
            {item.kind === "task" && (mine || user?.role === "MANAGER" || user?.role === "SUPERVISOR") ? (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => respond.mutate("GOT_IT")} disabled={respond.isPending}>
                  Got it
                </Button>
                <Button type="button" variant="outline" onClick={() => respond.mutate("NEED_HELP")} disabled={respond.isPending}>
                  Need help
                </Button>
                <Button type="button" onClick={() => respond.mutate("COMPLETED")} disabled={respond.isPending}>
                  Done
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
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { socialApi } from "@/lib/social-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  platform: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Meta: pick Facebook Page / linked Instagram account for this tenant. */
export function SocialConnectionTargetDialog({ platform, label, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-connection-targets", platform],
    queryFn: () => socialApi.listConnectionTargets(platform),
    enabled: open && !!platform,
  });

  useEffect(() => {
    if (!open) setSelectedPageId(null);
  }, [open]);

  const save = useMutation({
    mutationFn: () => socialApi.setConnectionTarget(platform, selectedPageId!),
    onSuccess: () => {
      toast.success(`${label} connected for this location`);
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["social-overview"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const targets = data?.targets || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose {label} account</DialogTitle>
          <DialogDescription>
            Select which Page{platform === "instagram" ? " and Instagram profile" : ""} this restaurant should use.
            Other tenants on Mizan keep their own selections.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError || targets.length === 0 ? (
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              No eligible Pages found. Use a Facebook login that manages your business Page
              {platform === "instagram" ? " with a linked Instagram professional account" : ""}.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ul className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
            {targets.map((t) => (
              <li key={t.page_id}>
                <button
                  type="button"
                  onClick={() => setSelectedPageId(t.page_id)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                    selectedPageId === t.page_id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/35",
                  )}
                >
                  <p className="font-medium">{t.page_name || t.page_id}</p>
                  {platform === "instagram" && t.instagram_username ? (
                    <p className="text-xs text-muted-foreground">@{t.instagram_username}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedPageId || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

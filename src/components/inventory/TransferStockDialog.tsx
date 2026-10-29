import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchScope } from "@/contexts/BranchScopeContext";
import { useBusinessLocations } from "@/hooks/use-business-locations";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";

type ItemBrief = { id: string; name: string; unit?: string };

type Transfer = {
  id: string;
  code: string;
  status: "draft" | "sent" | "received" | "cancelled";
  source: { id: string; name: string };
  destination: { id: string; name: string };
  lines: { itemId: string; name: string; unit: string; quantity: number; quantityReceived: number | null }[];
  value: number;
};

type Line = { itemId: string; quantity: string };

function headers(): Record<string, string> {
  const token = localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: headers(), ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || data?.detail || res.statusText);
  return (data?.data ?? data) as T;
}

/** Move stock between branches, and receive or cancel what is on its way (multi-branch businesses). */
export function TransferStockDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemBrief[];
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { branches: mine, selectedBranch, home } = useBranchScope();
  const { data: allBranches = [] } = useBusinessLocations();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: "" }]);

  useEffect(() => {
    if (!open) return;
    setSource(selectedBranch?.id || home?.id || mine[0]?.id || "");
    setDestination("");
    setLines([{ itemId: "", quantity: "" }]);
  }, [open, selectedBranch, home, mine]);

  const transfers = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: () => call<Transfer[]>("/inventory/transfers/?status=sent"),
    enabled: open,
  });

  const unit = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i.unit || ""])), [items]);
  const destinations = allBranches.filter((b) => b.is_active !== false && b.id !== source);
  const ready =
    source && destination && lines.some((l) => l.itemId && Number(l.quantity) > 0);

  const done = () => {
    void queryClient.invalidateQueries();
  };

  const send = useMutation({
    mutationFn: () =>
      call<Transfer>("/inventory/transfers/", {
        method: "POST",
        body: JSON.stringify({
          fromLocation: source,
          toLocation: destination,
          lines: lines
            .filter((l) => l.itemId && Number(l.quantity) > 0)
            .map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
        }),
      }),
    onSuccess: (row) => {
      toast.success(t("branches.transfer.sent", { code: row.code, branch: row.destination.name }));
      done();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || t("branches.transfer.failed")),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "receive" | "cancel" }) =>
      call<Transfer>(`/inventory/transfers/${id}/${action}/`, { method: "POST", body: "{}" }),
    onSuccess: (row) => {
      toast.success(
        row.status === "received"
          ? t("branches.transfer.received", { code: row.code })
          : t("branches.transfer.cancelled", { code: row.code }),
      );
      done();
    },
    onError: (err: Error) => toast.error(err.message || t("branches.transfer.failed")),
  });

  const inTransit = transfers.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" aria-hidden />
            {t("branches.transfer.title")}
          </DialogTitle>
          <DialogDescription>{t("branches.transfer.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1">
              <Label>{t("branches.transfer.from")}</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder={t("branches.move.pick")} />
                </SelectTrigger>
                <SelectContent>
                  {mine.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden />
            <div className="space-y-1">
              <Label>{t("branches.transfer.to")}</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger>
                  <SelectValue placeholder={t("branches.move.pick")} />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("branches.transfer.items")}</Label>
            {lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={line.itemId}
                  onValueChange={(itemId) =>
                    setLines((rows) => rows.map((r, i) => (i === index ? { ...r, itemId } : r)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("branches.transfer.pick_item")} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  inputMode="decimal"
                  placeholder={unit[line.itemId] || t("branches.transfer.qty")}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((rows) => rows.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))
                  }
                  aria-label={t("branches.transfer.qty")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))}
                  aria-label={t("branches.transfer.remove_line")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, { itemId: "", quantity: "" }])}>
              <Plus className="me-1 h-4 w-4" />
              {t("branches.transfer.add_line")}
            </Button>
          </div>

          {inTransit.length > 0 ? (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">{t("branches.transfer.in_transit")}</p>
              {inTransit.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{row.code}</Badge>
                      <span className="truncate">
                        {row.source.name} → {row.destination.name}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.lines.map((l) => `${l.quantity} ${l.unit} ${l.name}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" onClick={() => act.mutate({ id: row.id, action: "receive" })} disabled={act.isPending}>
                      {t("branches.transfer.receive")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: row.id, action: "cancel" })} disabled={act.isPending}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={() => send.mutate()} disabled={!ready || send.isPending}>
            {send.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t("branches.transfer.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

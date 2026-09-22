import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PackageCheck, Truck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { InventoryItem } from "../../lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SHELL } from "@/lib/page-shell";
import { useLanguage } from "@/hooks/use-language";

function statusBadge(status: string, label: string) {
    const value = status.toLowerCase();
    if (value === "received") return <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-700">{label}</Badge>;
    if (value === "pending") return <Badge variant="secondary">{label}</Badge>;
    return <Badge variant="outline">{label}</Badge>;
}

export default function PurchaseOrdersPage() {
    const { t, language } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [itemId, setItemId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["purchasing", accessToken],
        queryFn: () => api.getPurchasing(accessToken!),
        enabled: !!accessToken,
    });

    const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: () => api.createPurchasingOrder(accessToken!, { itemId, quantity, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchasing"] });
            toast.success(t("deliveries.created"));
            setIsCreateDialogOpen(false);
            setItemId("");
            setQuantity(1);
            setReason("");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const receiveMutation = useMutation({
        mutationFn: (id: string) => api.receivePurchaseOrder(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchasing"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("deliveries.received_toast"));
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const orders = data?.orders || [];
    const recommendations = data?.recommendations || [];

    return (
        <div className={`${PAGE_SHELL} py-8 space-y-6`}>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Truck className="h-7 w-7 text-primary" />
                        {t("deliveries.title")}
                    </h1>
                    <p className="text-muted-foreground">{t("deliveries.subtitle")}</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("deliveries.new_order")}
                </Button>
            </div>

            {recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">{t("deliveries.suggested")}</CardTitle>
                        <CardDescription>{t("deliveries.suggested_desc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recommendations.map((rec) => (
                            <div key={rec.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                                <div>
                                    <p className="font-medium text-foreground">{rec.name}</p>
                                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        setItemId(rec.id);
                                        setQuantity(Math.max(1, rec.suggestedQuantity || 1));
                                        setReason(rec.reason || t("deliveries.demand_reason"));
                                        setIsCreateDialogOpen(true);
                                    }}
                                >
                                    {t("purchasing.order_qty", { qty: rec.suggestedQuantity, unit: rec.unit })}
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <p className="p-6 text-sm text-muted-foreground">{t("deliveries.loading")}</p>
                    ) : orders.length === 0 ? (
                        <p className="p-8 text-center text-muted-foreground">{t("deliveries.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("deliveries.col.item")}</TableHead>
                                    <TableHead>{t("deliveries.col.qty")}</TableHead>
                                    <TableHead>{t("deliveries.col.status")}</TableHead>
                                    <TableHead>{t("deliveries.col.created")}</TableHead>
                                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium text-foreground">{order.itemName || t("deliveries.col.item")}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>{statusBadge(order.status, t(`deliveries.status.${order.status.toLowerCase()}`, { defaultValue: order.status || t("deliveries.status.ordered") }))}</TableCell>
                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleString(language) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {order.status.toLowerCase() !== "received" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => receiveMutation.mutate(order.id)}
                                                    disabled={receiveMutation.isPending}
                                                >
                                                    <PackageCheck className="w-4 h-4 mr-2" />
                                                    {t("deliveries.receive")}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("deliveries.dialog_title")}</DialogTitle>
                        <DialogDescription>{t("deliveries.dialog_desc")}</DialogDescription>
                    </DialogHeader>
                    <form
                        autoComplete="off"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!itemId) {
                                toast.error(t("deliveries.item_required"));
                                return;
                            }
                            createMutation.mutate();
                        }}
                    >
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="delivery-item">{t("deliveries.col.item")}</Label>
                                <Select value={itemId} onValueChange={setItemId}>
                                    <SelectTrigger id="delivery-item">
                                        <SelectValue placeholder={t("deliveries.select_item")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventoryItems.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name} ({t("deliveries.on_hand", { count: item.current_stock, unit: item.unit })})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery-qty">{t("deliveries.col.qty")}</Label>
                                <Input
                                    id="delivery-qty"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    autoComplete="off"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery-reason">{t("deliveries.reason")}</Label>
                                <Input
                                    id="delivery-reason"
                                    autoComplete="off"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={t("deliveries.reason_optional")}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending || !itemId}>
                                {createMutation.isPending ? t("deliveries.creating") : t("deliveries.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

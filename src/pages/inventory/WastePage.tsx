import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
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

const REASON_VALUES = ["spoilage", "prep", "overproduction", "other"] as const;

export default function WastePage() {
    const { t, language } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [itemId, setItemId] = useState("");
    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("spoilage");
    const [notes, setNotes] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["waste", accessToken],
        queryFn: () => api.getWasteSummary(accessToken!, 30),
        enabled: !!accessToken,
    });

    const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const recordMutation = useMutation({
        mutationFn: () =>
            api.recordWaste(accessToken!, {
                itemId: itemId || undefined,
                itemName,
                quantity,
                reason,
                notes,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["waste"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("waste.recorded"));
            setOpen(false);
            setItemId("");
            setItemName("");
            setQuantity(1);
            setReason("spoilage");
            setNotes("");
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const byReason = data?.byReason || {};
    const events = data?.events || [];

    return (
        <div className={`${PAGE_SHELL} py-8 space-y-6`}>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Trash2 className="h-7 w-7 text-primary" />
                        {t("waste.title")}
                    </h1>
                    <p className="text-muted-foreground">{t("waste.subtitle")}</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("waste.record")}
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>{t("waste.total")}</CardDescription>
                        <CardTitle className="text-foreground">{data?.totalQuantity ?? 0}</CardTitle>
                    </CardHeader>
                </Card>
                {REASON_VALUES.map((value) => (
                    <Card key={value}>
                        <CardHeader className="pb-2">
                            <CardDescription>{t(`waste.reason.${value}`)}</CardDescription>
                            <CardTitle className="text-foreground">{byReason[value] ?? 0}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">{t("waste.recent")}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <p className="p-6 text-sm text-muted-foreground">{t("waste.loading")}</p>
                    ) : events.length === 0 ? (
                        <p className="p-8 text-center text-muted-foreground">{t("waste.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("waste.col.when")}</TableHead>
                                    <TableHead>{t("waste.col.item")}</TableHead>
                                    <TableHead>{t("waste.col.qty")}</TableHead>
                                    <TableHead>{t("waste.col.reason")}</TableHead>
                                    <TableHead>{t("waste.col.notes")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {event.createdAt ? new Date(event.createdAt).toLocaleString(language) : "—"}
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">{event.itemName || "—"}</TableCell>
                                        <TableCell>{event.quantity}</TableCell>
                                        <TableCell>{t(`waste.reason.${event.reason}`, { defaultValue: event.reason })}</TableCell>
                                        <TableCell className="text-muted-foreground">{event.notes || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("waste.record")}</DialogTitle>
                        <DialogDescription>{t("waste.dialog_desc")}</DialogDescription>
                    </DialogHeader>
                    <form
                        autoComplete="off"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!itemId && !itemName.trim()) {
                                toast.error(t("waste.item_required"));
                                return;
                            }
                            recordMutation.mutate();
                        }}
                    >
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>{t("waste.field.item")}</Label>
                                <Select
                                    value={itemId}
                                    onValueChange={(value) => {
                                        setItemId(value);
                                        const match = inventoryItems.find((item) => item.id === value);
                                        if (match) setItemName(match.name);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("waste.field.item_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventoryItems.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="waste-name">{t("waste.field.name")}</Label>
                                <Input
                                    id="waste-name"
                                    name="waste-item-name"
                                    autoComplete="off"
                                    data-1p-ignore
                                    data-lpignore="true"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder={t("waste.field.name_placeholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="waste-qty">{t("waste.field.qty")}</Label>
                                <Input
                                    id="waste-qty"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    autoComplete="off"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("waste.col.reason")}</Label>
                                <Select value={reason} onValueChange={setReason}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REASON_VALUES.map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {t(`waste.reason.${value}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="waste-notes">{t("waste.col.notes")}</Label>
                                <Input
                                    id="waste-notes"
                                    autoComplete="off"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={recordMutation.isPending}>
                                {recordMutation.isPending ? t("common.saving") : t("common.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

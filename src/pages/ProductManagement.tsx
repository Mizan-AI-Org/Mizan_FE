import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { InventoryItem } from "@/lib/types";
import { PAGE_SHELL } from "@/lib/page-shell";
import { useLanguage } from "@/hooks/use-language";

const emptyItem = {
    name: "",
    unit: "unit",
    current_stock: 0,
    min_stock_level: 0,
};

export default function ProductManagement() {
    const { t } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyItem);

    const { data: products = [], isLoading } = useQuery<InventoryItem[]>({
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: () =>
            api.createInventoryItem(accessToken!, {
                name: form.name,
                description: "",
                category: "",
                unit: form.unit || "unit",
                current_stock: form.current_stock,
                min_stock_level: form.min_stock_level,
                cost_per_unit: 0,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("catalog.added"));
            setOpen(false);
            setForm(emptyItem);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={`${PAGE_SHELL} py-8 space-y-6`}>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t("catalog.title")}</h1>
                    <p className="text-muted-foreground">{t("catalog.subtitle")}</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t("catalog.add")}
                </Button>
            </div>

            {products.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center space-y-2">
                        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                        <p className="text-foreground font-medium">{t("catalog.empty_title")}</p>
                        <p className="text-sm text-muted-foreground">{t("catalog.empty_desc")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <Card key={product.id}>
                            <CardHeader className="flex-row items-start justify-between gap-2">
                                <CardTitle className="text-foreground">{product.name}</CardTitle>
                                {product.current_stock <= product.min_stock_level && (
                                    <Badge variant="destructive">{t("catalog.low")}</Badge>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                    {t("catalog.on_hand")}: <span className="text-foreground font-medium">{product.current_stock} {product.unit}</span>
                                </p>
                                <p className="text-muted-foreground">{t("catalog.reorder_at", { count: product.min_stock_level, unit: product.unit })}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("catalog.add")}</DialogTitle>
                        <DialogDescription>{t("catalog.dialog_desc")}</DialogDescription>
                    </DialogHeader>
                    <form
                        autoComplete="off"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!form.name.trim()) {
                                toast.error(t("catalog.name_required"));
                                return;
                            }
                            createMutation.mutate();
                        }}
                    >
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="catalog-name">{t("catalog.field.name")}</Label>
                                <Input
                                    id="catalog-name"
                                    name="catalog-item-name"
                                    autoComplete="off"
                                    data-1p-ignore
                                    data-lpignore="true"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="catalog-unit">{t("catalog.field.unit")}</Label>
                                <Input
                                    id="catalog-unit"
                                    autoComplete="off"
                                    value={form.unit}
                                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    placeholder={t("catalog.field.unit_placeholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="catalog-stock">{t("catalog.field.count")}</Label>
                                <Input
                                    id="catalog-stock"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    autoComplete="off"
                                    value={form.current_stock}
                                    onChange={(e) => setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="catalog-min">{t("catalog.field.min")}</Label>
                                <Input
                                    id="catalog-min"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    autoComplete="off"
                                    value={form.min_stock_level}
                                    onChange={(e) => setForm({ ...form, min_stock_level: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t("common.saving") : t("catalog.add")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

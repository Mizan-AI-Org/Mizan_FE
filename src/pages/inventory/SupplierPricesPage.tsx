import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Supplier, SupplierPriceQuote } from "../../lib/types";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

type PriceRow = SupplierPriceQuote & {
  supplierId: string;
  supplierName: string;
};

type SortKey = "itemName" | "supplierName" | "price" | "recordedAt";

function flattenSupplierPrices(suppliers: Supplier[]): PriceRow[] {
  return suppliers.flatMap((supplier) =>
    (supplier.prices ?? []).map((quote) => ({
      ...quote,
      supplierId: supplier.id,
      supplierName: supplier.name,
    }))
  );
}

export default function SupplierPricesPage() {
  const { t } = useLanguage();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("itemName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    item_name: "",
    price: "",
    unit: "kg",
    currency: "MAD",
  });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", accessToken],
    queryFn: () => api.getSuppliers(accessToken!),
    enabled: !!accessToken,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordSupplierPrice(accessToken!, form.supplierId, {
        item_name: form.item_name.trim(),
        price: form.price,
        unit: form.unit,
        currency: form.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(t("suppliers.prices.toast_recorded"));
      setDialogOpen(false);
      setForm({
        supplierId: "",
        item_name: "",
        price: "",
        unit: "kg",
        currency: "MAD",
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const rows = useMemo(() => flattenSupplierPrices(suppliers), [suppliers]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matched = term
      ? rows.filter(
          (row) =>
            row.itemName.toLowerCase().includes(term) ||
            row.supplierName.toLowerCase().includes(term)
        )
      : rows;

    return [...matched].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "price") {
        cmp = parseFloat(a.price) - parseFloat(b.price);
      } else if (sortKey === "recordedAt") {
        cmp = (a.recordedAt ?? "").localeCompare(b.recordedAt ?? "");
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [rows, searchTerm, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierId || !form.item_name.trim() || !form.price) {
      toast.error(t("suppliers.prices.validation_required"));
      return;
    }
    recordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">{t("suppliers.prices.loading")}</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("suppliers.prices.title")}</h1>
          <p className="text-muted-foreground">{t("suppliers.prices.subtitle")}</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-primary hover:bg-primary/90"
          disabled={suppliers.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("suppliers.prices.record_button")}
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-6 text-muted-foreground">
            {t("suppliers.prices.no_suppliers")}{" "}
            <Link to="/dashboard/suppliers/directory" className="text-primary underline">
              {t("nav.suppliers.directory")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("suppliers.prices.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("itemName")} className="cursor-pointer">
                    <div className="flex items-center">
                      {t("suppliers.prices.col_item")} <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => toggleSort("supplierName")} className="cursor-pointer">
                    <div className="flex items-center">
                      {t("suppliers.prices.col_supplier")}{" "}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => toggleSort("price")} className="cursor-pointer">
                    <div className="flex items-center">
                      {t("suppliers.prices.col_price")} <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>{t("suppliers.prices.col_unit")}</TableHead>
                  <TableHead onClick={() => toggleSort("recordedAt")} className="cursor-pointer">
                    <div className="flex items-center">
                      {t("suppliers.prices.col_recorded")}{" "}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t("suppliers.prices.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.itemName}</TableCell>
                      <TableCell>{row.supplierName}</TableCell>
                      <TableCell>
                        {row.price} {row.currency}
                      </TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.recordedAt
                          ? new Date(row.recordedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suppliers.prices.dialog_title")}</DialogTitle>
            <DialogDescription>{t("suppliers.prices.dialog_description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("suppliers.prices.col_supplier")}</Label>
              <Select
                value={form.supplierId}
                onValueChange={(supplierId) => setForm((f) => ({ ...f, supplierId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("suppliers.prices.select_supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item_name">{t("suppliers.prices.col_item")}</Label>
              <Input
                id="item_name"
                value={form.item_name}
                onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="price">{t("suppliers.prices.col_price")}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t("suppliers.prices.col_currency")}</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("suppliers.prices.col_unit")}</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={recordMutation.isPending}>
                {t("suppliers.prices.record_button")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

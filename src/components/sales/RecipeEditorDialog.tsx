import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { api } from "@/lib/api";
import { saveRecipe, type Recipe } from "@/lib/salesApi";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";

type Line = { itemId: string; quantity: string; unit: string; wastePct: string };

const UNITS = ["g", "kg", "ml", "cl", "l", "pc"];

/** One portion of a dish, ingredient by ingredient. Saving here is the owner's word: the recipe is confirmed. */
export function RecipeEditorDialog({
  dishId,
  dishName,
  recipe,
  onClose,
  onSaved,
}: {
  dishId: string;
  dishName: string;
  recipe?: Recipe;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const { accessToken } = useAuth();
  const items = useQuery({
    queryKey: ["inventory-items", accessToken],
    queryFn: () => api.getInventoryItems(accessToken!),
    enabled: !!accessToken,
  });
  const [lines, setLines] = useState<Line[]>(
    recipe?.lines
      .filter((l) => l.itemId)
      .map((l) => ({ itemId: l.itemId!, quantity: String(l.quantity), unit: l.unit, wastePct: String(l.wastePct || "") })) ?? [
      { itemId: "", quantity: "", unit: "g", wastePct: "" },
    ],
  );
  const [saving, setSaving] = useState(false);
  const update = (i: number, patch: Partial<Line>) =>
    setLines((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const valid = lines.every((l) => l.itemId && Number(l.quantity) > 0);

  async function save() {
    setSaving(true);
    try {
      await saveRecipe({
        dish: dishId,
        status: "confirmed",
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unit: l.unit,
          ...(l.wastePct ? { wastePct: Number(l.wastePct) } : {}),
        })),
      });
      toast.success(t("recipes.saved"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("recipes.editor_title", { dish: dishName })}</DialogTitle>
          <DialogDescription>{t("recipes.editor_help")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_88px_80px_72px_36px] gap-2 items-center">
              <Select value={line.itemId || undefined} onValueChange={(itemId) => update(i, { itemId })}>
                <SelectTrigger aria-label={t("recipes.ingredient")}>
                  <SelectValue placeholder={t("recipes.ingredient")} />
                </SelectTrigger>
                <SelectContent>
                  {(items.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                aria-label={t("recipes.quantity")}
                placeholder={t("recipes.quantity")}
                value={line.quantity}
                onChange={(e) => update(i, { quantity: e.target.value })}
              />
              <Select value={line.unit} onValueChange={(unit) => update(i, { unit })}>
                <SelectTrigger aria-label={t("recipes.unit")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                aria-label={t("recipes.waste")}
                placeholder={t("recipes.waste")}
                value={line.wastePct}
                onChange={(e) => update(i, { wastePct: e.target.value })}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("recipes.remove_line")}
                onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLines((rows) => [...rows, { itemId: "", quantity: "", unit: "g", wastePct: "" }])}
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden />
            {t("recipes.add_line")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!valid || saving || !lines.length} onClick={save}>
            {t("recipes.save_confirmed")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChefHat, Link2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import {
  addPosItemsToMenu,
  confirmRecipes,
  deleteRecipe,
  getRecipes,
  getUnlinkedPosItems,
  linkPosItem,
  type Recipe,
} from "@/lib/salesApi";
import { useLanguage } from "@/hooks/use-language";
import { RecipeEditorDialog } from "./RecipeEditorDialog";

const SEGMENTS = [
  { key: "confirmed", className: "bg-emerald-500" },
  { key: "estimated", className: "bg-amber-400" },
  { key: "asIs", className: "bg-sky-400" },
  { key: "missing", className: "bg-slate-400" },
  { key: "unlinked", className: "bg-slate-300 dark:bg-slate-600" },
] as const;

/** How exact the buy list can be: the share of sales on confirmed recipes, and the fixes that raise it. */
export function RecipeCoverageCard({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const agent = useAgentPanelOptional();
  const [editing, setEditing] = useState<{ dishId: string; dishName: string; recipe?: Recipe } | null>(null);
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: getRecipes });
  const unlinked = useQuery({ queryKey: ["pos-items-unlinked"], queryFn: getUnlinkedPosItems });

  const refresh = () => {
    for (const key of ["recipes", "pos-items-unlinked", "buy-list", "sales-day"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const run = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      toast.success(t("recipes.saved"));
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const shares = recipes.data?.coverage.shares;
  const estimated = (recipes.data?.recipes ?? []).filter((r) => r.status === "estimated");
  const dishes = [
    ...(recipes.data?.recipes ?? []).filter((r) => r.menuItemId).map((r) => ({ id: r.menuItemId!, name: r.name })),
    ...(recipes.data?.dishesWithoutRecipe ?? []),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{t("recipes.title")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("recipes.subtitle")}</p>
          </div>
        </div>
        {agent && (recipes.data?.dishesWithoutRecipe.length ?? 0) > 0 && (
          <Button size="sm" variant="outline" onClick={() => agent.askAgent(t("recipes.draft_prompt"))}>
            <Sparkles className="w-4 h-4 mr-1.5" aria-hidden />
            {t("recipes.draft_with_miya")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-5 space-y-6">
        {shares && (
          <div>
            <p className="text-sm mb-2">
              <span className="text-2xl font-bold tabular-nums">{shares.confirmed}%</span>{" "}
              <span className="text-muted-foreground">{t("recipes.coverage_line")}</span>
            </p>
            <div
              className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={SEGMENTS.map((s) => `${t(`recipes.share.${s.key}`)} ${shares[s.key]}%`).join(", ")}
            >
              {SEGMENTS.map((s) =>
                shares[s.key] > 0 ? (
                  <div key={s.key} className={`${s.className} h-full`} style={{ width: `${shares[s.key]}%` }} />
                ) : null,
              )}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {SEGMENTS.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.className}`} aria-hidden />
                  {t(`recipes.share.${s.key}`)} {shares[s.key]}%
                </li>
              ))}
            </ul>
          </div>
        )}

        {(unlinked.data?.items.length ?? 0) > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="w-4 h-4" aria-hidden />
                {t("recipes.unlinked_title", { count: unlinked.data!.count, pct: unlinked.data!.unlinkedShare })}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => run.mutate(() => addPosItemsToMenu())}>
                {t("recipes.add_all_to_menu")}
              </Button>
            </div>
            <ul className="divide-y rounded-lg border">
              {unlinked.data!.items.slice(0, 8).map((item) => (
                <li key={item.name} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="font-medium min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{item.share}%</span>
                  <Select
                    defaultValue={item.suggestedMenuItemId ?? undefined}
                    onValueChange={(menuItemId) => run.mutate(() => linkPosItem({ name: item.name, menuItemId }))}
                  >
                    <SelectTrigger className="h-8 w-44 text-xs" aria-label={t("recipes.link_to_dish")}>
                      <SelectValue placeholder={t("recipes.link_to_dish")} />
                    </SelectTrigger>
                    <SelectContent>
                      {dishes.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => run.mutate(() => linkPosItem({ name: item.name, ignore: true }))}
                  >
                    {t("recipes.not_a_product")}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("recipes.list_title")}</h3>
            {estimated.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => run.mutate(() => confirmRecipes({ all: true }))}>
                {t("recipes.confirm_all", { count: estimated.length })}
              </Button>
            )}
          </div>
          <ul className="divide-y rounded-lg border">
            {(recipes.data?.recipes ?? []).map((recipe) => (
              <li key={recipe.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium min-w-0 flex-1 truncate">{recipe.name}</span>
                <Badge
                  variant="outline"
                  className={
                    recipe.status === "confirmed"
                      ? "text-emerald-700 dark:text-emerald-400 border-emerald-300"
                      : "text-amber-700 dark:text-amber-400 border-amber-300"
                  }
                >
                  {t(`recipes.status.${recipe.status}`)}
                </Badge>
                {recipe.foodCostPct != null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("recipes.food_cost", { pct: recipe.foodCostPct })}
                  </span>
                )}
                {recipe.status === "estimated" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t("recipes.confirm")}
                    onClick={() => run.mutate(() => confirmRecipes({ recipes: [recipe.id] }))}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
                {recipe.menuItemId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t("recipes.edit")}
                    onClick={() => setEditing({ dishId: recipe.menuItemId!, dishName: recipe.name, recipe })}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={t("recipes.delete")}
                  onClick={() => run.mutate(() => deleteRecipe(recipe.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
            {(recipes.data?.dishesWithoutRecipe ?? []).slice(0, 12).map((dish) => (
              <li key={dish.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{dish.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setEditing({ dishId: dish.id, dishName: dish.name })}
                >
                  {t("recipes.add")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
      {editing && (
        <RecipeEditorDialog
          dishId={editing.dishId}
          dishName={editing.dishName}
          recipe={editing.recipe}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

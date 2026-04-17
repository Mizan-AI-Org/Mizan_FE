import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useDashboardCategories,
  useDashboardCategoryMutations,
  useDashboardCustomWidgetsList,
  type DashboardCategoryRow,
  type DashboardCustomWidgetRow,
} from "@/hooks/use-dashboard-categories";

const ICON_OPTIONS: string[] = [
  "sparkles",
  "clipboard-check",
  "clipboard-list",
  "list-todo",
  "calendar",
  "calendar-days",
  "users",
  "package",
  "shopping-cart",
  "file-text",
  "bar-chart-2",
  "hard-hat",
  "store",
  "inbox",
  "activity",
  "shield-alert",
  "clock",
  "heart",
  "layout-grid",
];

type QuickAddState = {
  title: string;
  icon: string;
};

const emptyQuickAdd = (): QuickAddState => ({
  title: "",
  icon: "sparkles",
});

/**
 * One category card: header (move / rename / delete) + collapsible body with
 * the shortcuts that live inside the category and an inline "quick add" form
 * pre-scoped to it.
 */
function CategoryGroup({
  row,
  index,
  count,
  widgets,
  expanded,
  canEdit,
  pending,
  creatingWidget,
  t,
  onToggle,
  onRename,
  onMove,
  onDelete,
  onQuickAddWidget,
  onDeleteWidget,
}: {
  row: DashboardCategoryRow;
  index: number;
  count: number;
  widgets: DashboardCustomWidgetRow[];
  expanded: boolean;
  canEdit: boolean;
  pending: boolean;
  creatingWidget: boolean;
  t: (k: string) => string;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onQuickAddWidget: (
    categoryId: string,
    body: { title: string; icon: string },
    onDone: () => void,
  ) => void;
  onDeleteWidget: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [quick, setQuick] = useState<QuickAddState>(emptyQuickAdd);

  const widgetCount = widgets.length;

  const handleQuickAdd = () => {
    const title = quick.title.trim();
    if (!title) {
      toast.error(t("dashboard.manage.widget_title_required"));
      return;
    }
    onQuickAddWidget(
      row.id,
      { title, icon: quick.icon },
      () => setQuick(emptyQuickAdd()),
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-700 disabled:opacity-40 dark:hover:border-slate-700"
            onClick={() => onMove(row.id, -1)}
            disabled={index === 0 || pending}
            aria-label={t("dashboard.manage.move_up")}
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-700 disabled:opacity-40 dark:hover:border-slate-700"
            onClick={() => onMove(row.id, 1)}
            disabled={index >= count - 1 || pending}
            aria-label={t("dashboard.manage.move_down")}
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggle(row.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-expanded={expanded}
          aria-label={expanded ? t("dashboard.manage.collapse") : t("dashboard.manage.expand")}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {editing ? (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="h-8 flex-1 text-sm"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) {
                  toast.error(t("dashboard.manage.name_required"));
                  return;
                }
                onRename(row.id, trimmed);
                setEditing(false);
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-500"
              onClick={() => {
                setName(row.name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onToggle(row.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {row.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {widgetCount === 0
                  ? t("dashboard.manage.category_no_shortcuts")
                  : t("dashboard.manage.category_shortcuts_count").replace(
                      "{{count}}",
                      String(widgetCount),
                    )}
              </div>
            </button>
            {canEdit && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-slate-600"
                  onClick={() => setEditing(true)}
                  aria-label={t("dashboard.manage.rename")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => onDelete(row.id)}
                  aria-label={t("dashboard.manage.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 px-3 py-3 space-y-3">
          {widgets.length > 0 ? (
            <ul className="space-y-1.5">
              {widgets.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {w.title}
                    </div>
                    {w.subtitle && (
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {w.subtitle}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => onDeleteWidget(w.id)}
                      aria-label={t("dashboard.manage.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.manage.category_no_shortcuts_long")}
            </p>
          )}

          {canEdit && (
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {t("dashboard.manage.quick_add_title")}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <Input
                  value={quick.title}
                  onChange={(e) => setQuick((s) => ({ ...s, title: e.target.value }))}
                  placeholder={t("dashboard.manage.widget_title_placeholder")}
                  className="h-9 text-sm"
                  maxLength={255}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAdd();
                  }}
                />
                <Select
                  value={quick.icon}
                  onValueChange={(v) => setQuick((s) => ({ ...s, icon: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t("dashboard.manage.icon_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((ic) => (
                      <SelectItem key={ic} value={ic}>
                        {ic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={handleQuickAdd}
                  disabled={!quick.title.trim() || creatingWidget}
                >
                  <Plus className="h-4 w-4" />
                  {t("dashboard.manage.add_shortcut")}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
                {t("dashboard.manage.auto_link_hint")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WidgetRow({
  row,
  categories,
  t,
  onUpdate,
  onDelete,
}: {
  row: DashboardCustomWidgetRow;
  categories: DashboardCategoryRow[];
  t: (k: string) => string;
  onUpdate: (
    id: string,
    body: {
      title?: string;
      subtitle?: string;
      icon?: string;
      category_id?: string | null;
    },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [icon, setIcon] = useState(row.icon || "sparkles");
  const [cat, setCat] = useState<string | "__none__">(row.category_id ?? "__none__");
  const dirty =
    title !== row.title ||
    icon !== (row.icon || "sparkles") ||
    cat !== (row.category_id ?? "__none__");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("dashboard.manage.widget_slot")} {row.slot_id.slice(0, 18)}…
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={() => onDelete(row.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("dashboard.manage.widget_title_placeholder")}
          className="h-9 text-sm"
          maxLength={255}
        />
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t("dashboard.manage.icon_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((ic) => (
              <SelectItem key={ic} value={ic}>
                {ic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={cat}
          onValueChange={(v) => setCat(v as typeof cat)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t("dashboard.manage.category_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              {t("dashboard.manage.category_uncategorized")}
            </SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {row.link_url && (
          <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
            {t("dashboard.manage.auto_link_resolved")}: {row.link_url}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!dirty}
          className="ml-auto"
          onClick={() =>
            onUpdate(row.id, {
              title: title.trim() || row.title,
              icon,
              category_id: cat === "__none__" ? null : cat,
            })
          }
        >
          {t("dashboard.manage.save_changes")}
        </Button>
      </div>
    </div>
  );
}

export function ManageDashboardCategoriesDialog({
  open,
  onOpenChange,
  t,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: (k: string) => string;
  canEdit: boolean;
}) {
  const categoriesQ = useDashboardCategories(open);
  const widgetsQ = useDashboardCustomWidgetsList(open);
  const {
    createCategory,
    updateCategory,
    deleteCategory,
    createWidget,
    updateWidget,
    deleteWidget,
  } = useDashboardCategoryMutations();

  const categories = categoriesQ.data ?? [];
  const widgets = widgetsQ.data ?? [];
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name)),
    [categories],
  );

  const widgetsByCategory = useMemo(() => {
    const map = new Map<string, DashboardCustomWidgetRow[]>();
    for (const w of widgets) {
      if (!w.category_id) continue;
      const list = map.get(w.category_id) ?? [];
      list.push(w);
      map.set(w.category_id, list);
    }
    return map;
  }, [widgets]);

  const uncategorized = useMemo(
    () => widgets.filter((w) => !w.category_id),
    [widgets],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) setExpanded({});
  }, [open]);

  const toggleExpanded = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const [newName, setNewName] = useState("");
  const [newWidget, setNewWidget] = useState<{
    title: string;
    icon: string;
    category_id: string | "__none__";
    add_to_dashboard: boolean;
  }>({
    title: "",
    icon: "sparkles",
    category_id: "__none__",
    add_to_dashboard: true,
  });

  const handleCreateCategory = () => {
    const name = newName.trim();
    if (!name) return;
    const nextOrder =
      orderedCategories.length > 0
        ? (orderedCategories[orderedCategories.length - 1]?.order_index ?? 0) + 1
        : 0;
    createCategory.mutate(
      { name, order_index: nextOrder },
      {
        onSuccess: (res: unknown) => {
          setNewName("");
          const created = (res as { category?: { id?: string } } | undefined)?.category;
          if (created?.id) {
            setExpanded((s) => ({ ...s, [created.id as string]: true }));
          }
          toast.success(t("dashboard.manage.category_created"));
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
          toast.error(msg);
        },
      },
    );
  };

  const handleMove = (id: string, dir: -1 | 1) => {
    const idx = orderedCategories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= orderedCategories.length) return;
    const a = orderedCategories[idx];
    const b = orderedCategories[swapIdx];
    updateCategory.mutate({ id: a.id, body: { order_index: b.order_index } });
    updateCategory.mutate({ id: b.id, body: { order_index: a.order_index } });
  };

  const handleCreateWidget = () => {
    const title = newWidget.title.trim();
    if (!title) {
      toast.error(t("dashboard.manage.widget_title_required"));
      return;
    }
    createWidget.mutate(
      {
        title,
        icon: newWidget.icon,
        category_id: newWidget.category_id === "__none__" ? null : newWidget.category_id,
        add_to_dashboard: newWidget.add_to_dashboard,
      },
      {
        onSuccess: () => {
          setNewWidget({
            title: "",
            icon: "sparkles",
            category_id: newWidget.category_id,
            add_to_dashboard: true,
          });
          toast.success(t("dashboard.manage.widget_created"));
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
          toast.error(msg);
        },
      },
    );
  };

  const handleQuickAddWidget = (
    categoryId: string,
    body: { title: string; icon: string },
    onDone: () => void,
  ) => {
    createWidget.mutate(
      {
        title: body.title,
        icon: body.icon,
        category_id: categoryId,
        add_to_dashboard: true,
      },
      {
        onSuccess: () => {
          onDone();
          toast.success(t("dashboard.manage.widget_created"));
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
          toast.error(msg);
        },
      },
    );
  };

  const pending =
    createCategory.isPending ||
    updateCategory.isPending ||
    deleteCategory.isPending ||
    createWidget.isPending ||
    updateWidget.isPending ||
    deleteWidget.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[3100] max-w-lg sm:max-w-3xl border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            {t("dashboard.manage.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {t("dashboard.manage.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="categories" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">
              {t("dashboard.manage.tab_categories")}
            </TabsTrigger>
            <TabsTrigger value="widgets">
              {t("dashboard.manage.tab_widgets")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {canEdit && (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("dashboard.manage.new_category_placeholder")}
                  className="h-9 text-sm"
                  maxLength={80}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCreateCategory}
                  disabled={!newName.trim() || pending}
                >
                  <Plus className="h-4 w-4" />
                  {t("dashboard.manage.add_category")}
                </Button>
              </div>
            )}

            {categoriesQ.isLoading ? (
              <p className="text-sm text-slate-500">{t("common.loading")}</p>
            ) : orderedCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                {t("dashboard.manage.categories_empty")}
              </div>
            ) : (
              <div className="space-y-2">
                {orderedCategories.map((row, i) => (
                  <CategoryGroup
                    key={row.id}
                    row={row}
                    index={i}
                    count={orderedCategories.length}
                    widgets={widgetsByCategory.get(row.id) ?? []}
                    expanded={!!expanded[row.id]}
                    canEdit={canEdit}
                    pending={pending}
                    creatingWidget={createWidget.isPending}
                    t={t}
                    onToggle={toggleExpanded}
                    onRename={(id, name) =>
                      updateCategory.mutate({ id, body: { name } }, {
                        onError: (e: unknown) => {
                          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
                          toast.error(msg);
                        },
                      })
                    }
                    onMove={handleMove}
                    onDelete={(id) => {
                      if (!window.confirm(t("dashboard.manage.category_delete_confirm"))) return;
                      deleteCategory.mutate(id, {
                        onSuccess: () => toast.success(t("dashboard.manage.category_deleted")),
                        onError: (e: unknown) => {
                          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
                          toast.error(msg);
                        },
                      });
                    }}
                    onQuickAddWidget={handleQuickAddWidget}
                    onDeleteWidget={(id) => {
                      if (!window.confirm(t("dashboard.manage.widget_delete_confirm"))) return;
                      deleteWidget.mutate(id, {
                        onSuccess: () => toast.success(t("dashboard.manage.widget_deleted")),
                        onError: (e: unknown) => {
                          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
                          toast.error(msg);
                        },
                      });
                    }}
                  />
                ))}
              </div>
            )}

            {uncategorized.length > 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 px-3 py-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("dashboard.manage.category_uncategorized")} ({uncategorized.length})
                </div>
                <ul className="space-y-1.5">
                  {uncategorized.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                          {w.title}
                        </div>
                        {w.subtitle && (
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {w.subtitle}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("dashboard.manage.uncategorized_hint")}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="widgets" className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {canEdit && (
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  {t("dashboard.manage.new_widget")}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
                  <Input
                    value={newWidget.title}
                    onChange={(e) => setNewWidget((s) => ({ ...s, title: e.target.value }))}
                    placeholder={t("dashboard.manage.widget_title_placeholder")}
                    className="h-9 text-sm"
                    maxLength={255}
                  />
                  <Select
                    value={newWidget.icon}
                    onValueChange={(v) => setNewWidget((s) => ({ ...s, icon: v }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("dashboard.manage.icon_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((ic) => (
                        <SelectItem key={ic} value={ic}>
                          {ic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newWidget.category_id}
                    onValueChange={(v) =>
                      setNewWidget((s) => ({ ...s, category_id: v as typeof s.category_id }))
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("dashboard.manage.category_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("dashboard.manage.category_uncategorized")}
                      </SelectItem>
                      {orderedCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
                    {t("dashboard.manage.auto_link_hint")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleCreateWidget}
                    disabled={!newWidget.title.trim() || pending}
                  >
                    <Plus className="h-4 w-4" />
                    {t("dashboard.manage.create_widget")}
                  </Button>
                </div>
              </div>
            )}

            {widgetsQ.isLoading ? (
              <p className="text-sm text-slate-500">{t("common.loading")}</p>
            ) : widgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                {t("dashboard.manage.widgets_empty")}
              </div>
            ) : (
              <div className="space-y-2">
                {widgets.map((w) => (
                  <WidgetRow
                    key={w.id}
                    row={w}
                    categories={orderedCategories}
                    t={t}
                    onUpdate={(id, body) =>
                      updateWidget.mutate({ id, body }, {
                        onSuccess: () => toast.success(t("dashboard.manage.widget_updated")),
                        onError: (e: unknown) => {
                          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
                          toast.error(msg);
                        },
                      })
                    }
                    onDelete={(id) => {
                      if (!window.confirm(t("dashboard.manage.widget_delete_confirm"))) return;
                      deleteWidget.mutate(id, {
                        onSuccess: () => toast.success(t("dashboard.manage.widget_deleted")),
                        onError: (e: unknown) => {
                          const msg = e instanceof Error ? e.message : t("dashboard.manage.save_failed");
                          toast.error(msg);
                        },
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

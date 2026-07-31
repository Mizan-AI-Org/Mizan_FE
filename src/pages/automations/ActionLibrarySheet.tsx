import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  Edit,
  FileText,
  GitBranch,
  Inbox,
  MessageSquare,
  Search,
  Tag,
  Timer,
  UserCheck,
  Webhook,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { actionLabel, categoryLabel } from "./automations-i18n";
import type { CatalogItem } from "./automation-types";

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_message: MessageSquare,
  send_template: FileText,
  add_tag: Tag,
  remove_tag: Tag,
  assign_conversation: UserCheck,
  update_contact_field: Edit,
  create_task: CheckSquare,
  create_staff_request: Inbox,
  wait: Timer,
  condition: GitBranch,
  send_webhook: Webhook,
  close_conversation: CheckCircle2,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CatalogItem[];
  onSelect: (actionId: string) => void;
};

export function ActionLibrarySheet({ open, onOpenChange, actions, onSelect }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const ids = [...new Set(actions.map((a) => a.category))];
    return ["all", ...ids];
  }, [actions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      const label = actionLabel(t, a.id, a.label).toLowerCase();
      return label.includes(q) || a.id.includes(q);
    });
  }, [actions, category, query, t]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of filtered) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("automations.builder.action_library")}</SheetTitle>
          <SheetDescription>{t("automations.builder.action_library_desc")}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("automations.library.search_actions")}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                  category === cat
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400",
                )}
              >
                {cat === "all"
                  ? t("automations.library.all_categories")
                  : categoryLabel(t, "action", cat)}
              </button>
            ))}
          </div>

          <div className="space-y-4 pb-6">
            {[...grouped.entries()].map(([cat, items]) => (
              <div key={cat}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {categoryLabel(t, "action", cat)}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const Icon = ACTION_ICONS[item.id] || MessageSquare;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelect(item.id);
                          onOpenChange(false);
                          setQuery("");
                        }}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-emerald-950/20"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <Icon className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {actionLabel(t, item.id, item.label)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

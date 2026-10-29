import { Store } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_BRANCHES, useBranchScope } from "@/contexts/BranchScopeContext";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

/** Header branch picker. Hidden for single-branch businesses and for people who cover one branch only. */
export function BranchSwitcher({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { multiBranch, canSeeSeveral, branches, selected, setSelected } = useBranchScope();
  if (!multiBranch || !canSeeSeveral) return null;
  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger
        className={cn("h-9 w-auto min-w-[9rem] max-w-[14rem] gap-2 border-border/80 bg-transparent", className)}
        aria-label={t("branches.switcher.label")}
      >
        <Store className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[2100]">
        <SelectItem value={ALL_BRANCHES}>{t("branches.switcher.all")}</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

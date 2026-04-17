import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, RefreshCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import {
  PermissionBuckets,
  useRBACCatalog,
  useRolePermissionMutations,
  useRolePermissions,
} from "@/hooks/use-permissions";

type BucketKey = keyof PermissionBuckets;

const ALLOWED_EDITORS = ["SUPER_ADMIN", "ADMIN", "OWNER"] as const;

const emptyBuckets = (): PermissionBuckets => ({ apps: [], widgets: [], actions: [] });

function applyBuckets(
  current: PermissionBuckets,
  bucket: BucketKey,
  id: string,
  enabled: boolean,
): PermissionBuckets {
  const set = new Set(current[bucket]);
  if (enabled) set.add(id);
  else set.delete(id);
  return { ...current, [bucket]: Array.from(set) };
}

export default function RolePermissionsPage() {
  const { user } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const { toast } = useToast();

  const allowed = user && ALLOWED_EDITORS.includes(user.role as (typeof ALLOWED_EDITORS)[number]);

  const catalogQ = useRBACCatalog(!!allowed);
  const savedQ = useRolePermissions(!!allowed);
  const { save, reset } = useRolePermissionMutations();

  const [selectedRole, setSelectedRole] = useState<string>("MANAGER");
  const [draft, setDraft] = useState<PermissionBuckets>(emptyBuckets());
  const [dirty, setDirty] = useState(false);

  const savedByRole = useMemo(() => {
    const map = new Map<string, PermissionBuckets>();
    for (const row of savedQ.data ?? []) map.set(row.role, row.permissions);
    return map;
  }, [savedQ.data]);

  useEffect(() => {
    const defaults = catalogQ.data?.role_defaults?.[selectedRole];
    const saved = savedByRole.get(selectedRole);
    setDraft(saved ?? defaults ?? emptyBuckets());
    setDirty(false);
  }, [catalogQ.data, savedByRole, selectedRole]);

  if (!allowed) return <Navigate to="/unauthorized" replace />;

  const catalog = catalogQ.data;
  const loading = catalogQ.isLoading || savedQ.isLoading;

  const toggle = (bucket: BucketKey, id: string, enabled: boolean) => {
    setDraft((curr) => applyBuckets(curr, bucket, id, enabled));
    setDirty(true);
  };

  const selectAll = (bucket: BucketKey) => {
    const ids = (catalog?.[bucket] ?? []).map((e) => e.id);
    setDraft((curr) => ({ ...curr, [bucket]: ids }));
    setDirty(true);
  };

  const clearAll = (bucket: BucketKey) => {
    setDraft((curr) => ({ ...curr, [bucket]: [] }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({ role: selectedRole, permissions: draft });
      setDirty(false);
      toast({ title: t("rbac.toast.saved") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("rbac.toast.save_failed"),
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleReset = async () => {
    try {
      await reset.mutateAsync(selectedRole);
      toast({ title: t("rbac.toast.reset_done") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("rbac.toast.save_failed"),
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const renderBucket = (bucket: BucketKey) => {
    const entries = catalog?.[bucket] ?? [];
    const draftIds = new Set(draft[bucket]);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t(`rbac.bucket.${bucket}.help` as const)}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => selectAll(bucket)}>
              {t("rbac.actions.select_all")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearAll(bucket)}>
              {t("rbac.actions.clear")}
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {entries.map((entry) => {
            const checked = draftIds.has(entry.id);
            return (
              <label
                key={entry.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(bucket, entry.id, v === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium break-words">{entry.label}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{entry.id}</div>
                </div>
              </label>
            );
          })}
          {entries.length === 0 && (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("rbac.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("rbac.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={reset.isPending || !savedByRole.has(selectedRole)}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("rbac.actions.reset_defaults")}
          </Button>
          <Button onClick={handleSave} disabled={!dirty || save.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? t("rbac.actions.saving") : t("rbac.actions.save")}
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
          <label className="text-sm font-medium">{t("rbac.role_label")}</label>
          <div className="max-w-xs">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(catalog?.editable_roles ?? []).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {savedByRole.has(selectedRole)
              ? t("rbac.badge.custom")
              : t("rbac.badge.defaults")}
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <Tabs defaultValue="apps" className="w-full">
            <TabsList>
              <TabsTrigger value="apps">
                {t("rbac.tabs.apps")} ({draft.apps.length})
              </TabsTrigger>
              <TabsTrigger value="widgets">
                {t("rbac.tabs.widgets")} ({draft.widgets.length})
              </TabsTrigger>
              <TabsTrigger value="actions">
                {t("rbac.tabs.actions")} ({draft.actions.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="apps" className="pt-4">{renderBucket("apps")}</TabsContent>
            <TabsContent value="widgets" className="pt-4">{renderBucket("widgets")}</TabsContent>
            <TabsContent value="actions" className="pt-4">{renderBucket("actions")}</TabsContent>
          </Tabs>
        )}
      </section>
    </div>
  );
}

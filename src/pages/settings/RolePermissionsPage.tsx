import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { LayoutGrid, Layers, RefreshCcw, Save, Search, ShieldCheck, Users, X, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SettingsSection,
  SettingsStickyActions,
  settingsFieldClassName,
} from "@/components/settings/SettingsSection";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { PAGE_SHELL } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import {
  AssignableUser,
  PermissionBuckets,
  useAssignableUsers,
  useRBACCatalog,
  useRolePermissionMutations,
  useRolePermissions,
  useUserPermissionMutations,
  useUserPermissions,
} from "@/hooks/use-permissions";

type BucketKey = keyof PermissionBuckets;
type Scope = "role" | "users";

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

function userInitials(u: Pick<AssignableUser, "first_name" | "last_name" | "email" | "full_name">) {
  const fn = (u.first_name || "").trim();
  const ln = (u.last_name || "").trim();
  if (fn || ln) return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || "?";
  const full = (u.full_name || u.email || "").trim();
  return full.charAt(0).toUpperCase() || "?";
}

export default function RolePermissionsPage() {
  const { user } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const { toast } = useToast();

  const allowed = user && ALLOWED_EDITORS.includes(user.role as (typeof ALLOWED_EDITORS)[number]);

  const catalogQ = useRBACCatalog(!!allowed);
  const savedRolesQ = useRolePermissions(!!allowed);
  const assignableQ = useAssignableUsers(!!allowed);
  const userPermsQ = useUserPermissions(!!allowed);
  const { save: saveRole, reset: resetRole } = useRolePermissionMutations();
  const { saveMany, reset: resetUser } = useUserPermissionMutations();

  const [scope, setScope] = useState<Scope>("role");
  const [selectedRole, setSelectedRole] = useState<string>("MANAGER");
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [permTab, setPermTab] = useState<"apps" | "widgets" | "actions">("apps");
  const [draft, setDraft] = useState<PermissionBuckets>(emptyBuckets());
  const [dirty, setDirty] = useState(false);

  const savedByRole = useMemo(() => {
    const map = new Map<string, PermissionBuckets>();
    for (const row of savedRolesQ.data ?? []) map.set(row.role, row.permissions);
    return map;
  }, [savedRolesQ.data]);

  const overrideByUserId = useMemo(() => {
    const map = new Map<string, PermissionBuckets>();
    for (const row of userPermsQ.data ?? []) map.set(row.user_id, row.permissions);
    return map;
  }, [userPermsQ.data]);

  const users = assignableQ.data ?? [];

  const userById = useMemo(() => {
    const map = new Map<string, AssignableUser>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.role]
        .filter(Boolean)
        .some((s) => (s || "").toLowerCase().includes(q)),
    );
  }, [users, query]);

  useEffect(() => {
    if (scope === "role") {
      const defaults = catalogQ.data?.role_defaults?.[selectedRole];
      const saved = savedByRole.get(selectedRole);
      setDraft(saved ?? defaults ?? emptyBuckets());
      setDirty(false);
      return;
    }
    if (selectedUserIds.length === 0) {
      setDraft(emptyBuckets());
      setDirty(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const primaryId = selectedUserIds[0];
      try {
        const res = await api.getUserPermissions(primaryId);
        if (cancelled) return;
        setDraft(res.permissions);
        setDirty(false);
      } catch {
        const primary = userById.get(primaryId);
        const defaults =
          (primary && catalogQ.data?.role_defaults?.[primary.role]) || emptyBuckets();
        if (!cancelled) {
          setDraft(defaults);
          setDirty(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, selectedRole, selectedUserIds, catalogQ.data, savedByRole, userById]);

  if (!allowed) return <Navigate to="/unauthorized" replace />;

  const catalog = catalogQ.data;
  const loading =
    catalogQ.isLoading || savedRolesQ.isLoading || assignableQ.isLoading || userPermsQ.isLoading;

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

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedUserIds((curr) => {
      if (checked) return curr.includes(id) ? curr : [...curr, id];
      return curr.filter((x) => x !== id);
    });
  };

  const selectAllVisible = () => {
    setSelectedUserIds((curr) => {
      const next = new Set(curr);
      for (const u of filteredUsers) next.add(u.id);
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelectedUserIds([]);

  const handleSave = async () => {
    try {
      if (scope === "role") {
        await saveRole.mutateAsync({ role: selectedRole, permissions: draft });
        setDirty(false);
        toast({ title: t("rbac.toast.saved") });
        return;
      }
      if (selectedUserIds.length === 0) return;
      const res = await saveMany.mutateAsync({
        userIds: selectedUserIds,
        permissions: draft,
      });
      setDirty(false);
      toast({
        title: t("rbac.users.save_done", { count: res.applied_count }),
        description:
          res.missing_user_ids.length > 0
            ? t("rbac.users.missing_hint", { count: res.missing_user_ids.length })
            : undefined,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: scope === "role" ? t("rbac.toast.save_failed") : t("rbac.users.save_failed"),
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleReset = async () => {
    try {
      if (scope === "role") {
        await resetRole.mutateAsync(selectedRole);
        toast({ title: t("rbac.toast.reset_done") });
        return;
      }
      const targets = selectedUserIds.filter((id) => overrideByUserId.has(id));
      if (targets.length === 0) return;
      await Promise.all(targets.map((id) => resetUser.mutateAsync(id)));
      setConfirmResetOpen(false);
      toast({ title: t("rbac.users.reset_done") });
    } catch (err) {
      toast({
        variant: "destructive",
        title: scope === "role" ? t("rbac.toast.save_failed") : t("rbac.users.reset_failed"),
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const renderBucket = (bucket: BucketKey) => {
    const entries = catalog?.[bucket] ?? [];
    const draftIds = new Set(draft[bucket]);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            {t(`rbac.bucket.${bucket}.help` as const)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => selectAll(bucket)}
            >
              {t("rbac.actions.select_all")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => clearAll(bucket)}
            >
              {t("rbac.actions.clear")}
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {entries.map((entry) => {
            const checked = draftIds.has(entry.id);
            return (
              <label
                key={entry.id}
                title={entry.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                  checked
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(bucket, entry.id, v === true)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug min-w-0">
                  {entry.label}
                </span>
              </label>
            );
          })}
          {entries.length === 0 ? (
            <div className="text-sm text-slate-500 col-span-full py-6 text-center">—</div>
          ) : null}
        </div>
      </div>
    );
  };

  const roleBadge = savedByRole.has(selectedRole)
    ? t("rbac.badge.custom")
    : t("rbac.badge.defaults");

  const selectedUsers = selectedUserIds
    .map((id) => userById.get(id))
    .filter((u): u is AssignableUser => !!u);

  const selectedHasAnyOverride = selectedUsers.some((u) => overrideByUserId.has(u.id));

  const primaryUser = selectedUsers[0];
  const userScopeHint =
    selectedUsers.length === 0
      ? t("rbac.users.none_selected")
      : selectedUsers.length === 1
        ? overrideByUserId.has(primaryUser!.id)
          ? t("rbac.users.starting_from_override")
          : t("rbac.users.starting_from_role", { role: primaryUser!.role })
        : t("rbac.users.multiple_selected_hint", { count: selectedUsers.length });

  const saveDisabled =
    scope === "role"
      ? !dirty || saveRole.isPending
      : selectedUserIds.length === 0 || !dirty || saveMany.isPending;
  const saveLabel =
    (scope === "role" ? saveRole.isPending : saveMany.isPending)
      ? t("rbac.actions.saving")
      : t("rbac.actions.save");

  const resetDisabled =
    scope === "role"
      ? resetRole.isPending || !savedByRole.has(selectedRole)
      : resetUser.isPending || !selectedHasAnyOverride;

  const showEditor = !loading && !(scope === "users" && selectedUserIds.length === 0);

  return (
    <div className={`${PAGE_SHELL} pb-24 lg:pb-8 space-y-4`}>
      <header className="min-w-0">
        <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white">
          {t("rbac.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("rbac.subtitle")}
        </p>
      </header>

      <SettingsSection
        icon={<Users className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        title={t("rbac.scope.label")}
        description={t("rbac.scope.section_desc")}
      >
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 w-fit">
          {(
            [
              { id: "role" as const, label: t("rbac.scope.role"), icon: ShieldCheck },
              { id: "users" as const, label: t("rbac.scope.users"), icon: Users },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = scope === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-200"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {scope === "role" ? (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="space-y-2 w-full sm:max-w-xs">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("rbac.role_label")}
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className={cn(settingsFieldClassName, "h-11")}>
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
            <Badge
              variant="outline"
              className={cn(
                "h-fit text-xs font-medium",
                savedByRole.has(selectedRole)
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400",
              )}
            >
              {roleBadge}
            </Badge>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("rbac.users.select_hint")}</p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-slate-900">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("rbac.users.search_placeholder")}
                    className={cn(settingsFieldClassName, "pl-9 h-10")}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={selectAllVisible}>
                    {t("rbac.users.select_all_visible")}
                  </Button>
                  {selectedUserIds.length > 0 ? (
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                      <X className="h-3 w-3 mr-1" />
                      {t("rbac.users.clear_selection")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 text-center">
                    {users.length === 0 ? t("rbac.users.none_available") : "—"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredUsers.map((u) => {
                      const checked = selectedUserIds.includes(u.id);
                      const overriden = overrideByUserId.has(u.id) || u.has_override;
                      return (
                        <label
                          key={u.id}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors",
                            checked
                              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/30"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleUser(u.id, v === true)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 text-xs font-semibold">
                            {userInitials(u)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                              {u.full_name || u.email}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {u.role}
                            </Badge>
                            {overriden ? (
                              <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                                {t("rbac.users.override_badge")}
                              </Badge>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedUserIds.length > 0 ? (
                    <span className="text-slate-500">
                      {t("rbac.users.selected_count", { count: selectedUserIds.length })}
                    </span>
                  ) : null}
                  {primaryUser && selectedUsers.length === 1 ? (
                    <>
                      <Badge variant="secondary" className="text-[10px]">
                        {primaryUser.role}
                      </Badge>
                      <Badge
                        variant={overrideByUserId.has(primaryUser.id) ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {overrideByUserId.has(primaryUser.id)
                          ? t("rbac.users.override_badge")
                          : t("rbac.users.role_badge")}
                      </Badge>
                    </>
                  ) : null}
                </div>
                <p className="text-slate-500">{userScopeHint}</p>
              </div>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        icon={<LayoutGrid className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
        title={t("rbac.permissions_section_title")}
        description={t("rbac.permissions_section_desc")}
        actions={
          dirty ? (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {t("rbac.unsaved_badge")}
            </Badge>
          ) : null
        }
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">{t("common.loading")}</div>
        ) : !showEditor ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-10 text-sm text-slate-500 text-center">
            {t("rbac.users.none_selected")}
          </div>
        ) : (
          <Tabs
            value={permTab}
            onValueChange={(v) => setPermTab(v as "apps" | "widgets" | "actions")}
            className="w-full"
          >
            <TabsList className="h-auto w-full sm:w-auto flex flex-wrap justify-start gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl">
              <TabsTrigger
                value="apps"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-emerald-200"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("rbac.tabs.apps")}
                <span className="tabular-nums text-[11px] opacity-70">({draft.apps.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="widgets"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-emerald-200"
              >
                <Layers className="h-3.5 w-3.5" />
                {t("rbac.tabs.widgets")}
                <span className="tabular-nums text-[11px] opacity-70">({draft.widgets.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-emerald-200"
              >
                <Zap className="h-3.5 w-3.5" />
                {t("rbac.tabs.actions")}
                <span className="tabular-nums text-[11px] opacity-70">({draft.actions.length})</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="apps" className="mt-4 focus-visible:outline-none">
              {renderBucket("apps")}
            </TabsContent>
            <TabsContent value="widgets" className="mt-4 focus-visible:outline-none">
              {renderBucket("widgets")}
            </TabsContent>
            <TabsContent value="actions" className="mt-4 focus-visible:outline-none">
              {renderBucket("actions")}
            </TabsContent>
          </Tabs>
        )}
      </SettingsSection>

      <SettingsStickyActions hint={dirty ? t("settings.save_hint") : undefined}>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => {
            if (scope === "users") setConfirmResetOpen(true);
            else void handleReset();
          }}
          disabled={resetDisabled}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          {t("rbac.actions.reset_defaults")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveLabel}
        </Button>
      </SettingsStickyActions>

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rbac.users.reset_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rbac.users.reset_confirm", {
                count: selectedUserIds.filter((id) => overrideByUserId.has(id)).length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {t("rbac.actions.reset_defaults")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

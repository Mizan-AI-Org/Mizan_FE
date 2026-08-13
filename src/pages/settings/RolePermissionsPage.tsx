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
type PermTab = "apps" | "widgets" | "actions";

const ALLOWED_EDITORS = ["SUPER_ADMIN", "ADMIN", "OWNER"] as const;

const PERM_TABS: { id: PermTab; bucket: BucketKey; icon: typeof LayoutGrid }[] = [
  { id: "apps", bucket: "apps", icon: LayoutGrid },
  { id: "widgets", bucket: "widgets", icon: Layers },
  { id: "actions", bucket: "actions", icon: Zap },
];

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
  const [permTab, setPermTab] = useState<PermTab>("apps");
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

  const activeBucket = PERM_TABS.find((tab) => tab.id === permTab)?.bucket ?? "apps";

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
        {entries.map((entry) => {
          const checked = draftIds.has(entry.id);
          return (
            <label
              key={entry.id}
              title={entry.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors min-w-0",
                checked
                  ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/35"
                  : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => toggle(bucket, entry.id, v === true)}
                className="h-4 w-4 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-snug truncate">
                {t(`rbac.feature.${entry.id}`, { defaultValue: entry.label })}
              </span>
            </label>
          );
        })}
        {entries.length === 0 ? (
          <div className="text-sm text-slate-500 col-span-full py-8 text-center">-</div>
        ) : null}
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
    <div className={`${PAGE_SHELL} pb-24 lg:pb-8 space-y-3`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("rbac.title")}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("rbac.subtitle")}
          </p>
        </div>
        {dirty ? (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {t("rbac.unsaved_badge")}
          </Badge>
        ) : null}
      </header>

      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
        {/* Scope + role toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80">
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
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-surface-sunken text-emerald-800 shadow-sm dark:text-emerald-200"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {scope === "role" ? (
            <>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className={cn(settingsFieldClassName, "h-9 w-[140px] text-xs font-semibold")}>
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
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium hidden sm:inline-flex",
                  savedByRole.has(selectedRole)
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400",
                )}
              >
                {roleBadge}
              </Badge>
            </>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedUserIds.length > 0
                ? t("rbac.users.selected_count", { count: selectedUserIds.length })
                : t("rbac.users.select_hint")}
            </span>
          )}

          <div className="flex-1 min-w-[8px]" />

          {/* Permission type tabs - inline in toolbar */}
          <div className="flex flex-wrap gap-0.5 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80">
            {PERM_TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPermTab(id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap",
                  permTab === id
                    ? "bg-surface-sunken text-emerald-800 shadow-sm dark:text-emerald-200"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                {t(`rbac.tabs.${id}` as const)}
                <span className="tabular-nums opacity-60">({draft[id].length})</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "grid min-h-[420px]",
            scope === "users" ? "lg:grid-cols-[minmax(220px,260px)_1fr]" : "grid-cols-1",
          )}
        >
          {scope === "users" ? (
            <aside className="border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 flex flex-col min-h-0">
              <div className="p-2 border-b border-slate-200/80 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("rbac.users.search_placeholder")}
                    className={cn(settingsFieldClassName, "pl-8 h-9 text-sm")}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={selectAllVisible}>
                    {t("rbac.users.select_all_visible")}
                  </Button>
                  {selectedUserIds.length > 0 ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={clearSelection}>
                      <X className="h-3 w-3 mr-0.5" />
                      {t("rbac.users.clear_selection")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[min(52vh,520px)] lg:max-h-none">
                {filteredUsers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    {users.length === 0 ? t("rbac.users.none_available") : "-"}
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const checked = selectedUserIds.includes(u.id);
                    const overriden = overrideByUserId.has(u.id) || u.has_override;
                    return (
                      <label
                        key={u.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-lg border cursor-pointer transition-colors",
                          checked
                            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/30"
                            : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleUser(u.id, v === true)}
                          className="h-4 w-4 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 text-[10px] font-bold">
                          {userInitials(u)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{u.full_name || u.email}</div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <span>{u.role}</span>
                            {overriden ? (
                              <span className="text-emerald-600 dark:text-emerald-400">· {t("rbac.users.override_badge")}</span>
                            ) : null}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </aside>
          ) : null}

          <div className="flex flex-col min-h-0 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
                {t(`rbac.bucket.${activeBucket}.help` as const)}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => selectAll(activeBucket)}
                >
                  {t("rbac.actions.select_all")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => clearAll(activeBucket)}
                >
                  {t("rbac.actions.clear")}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-slate-500">{t("common.loading")}</div>
              ) : !showEditor ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-12 text-sm text-slate-500 text-center">
                  {t("rbac.users.none_selected")}
                </div>
              ) : (
                renderBucket(activeBucket)
              )}
            </div>
          </div>
        </div>
      </div>

      <SettingsStickyActions hint={dirty ? t("settings.save_hint") : undefined}>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
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
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
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

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, RefreshCcw, Save, Search, Users, X } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
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

  // Role-scope state.
  const [selectedRole, setSelectedRole] = useState<string>("MANAGER");

  // User-scope state.
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Shared draft.
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

  // Reload draft whenever scope / selection / underlying data changes.
  useEffect(() => {
    if (scope === "role") {
      const defaults = catalogQ.data?.role_defaults?.[selectedRole];
      const saved = savedByRole.get(selectedRole);
      setDraft(saved ?? defaults ?? emptyBuckets());
      setDirty(false);
      return;
    }
    // scope === "users"
    if (selectedUserIds.length === 0) {
      setDraft(emptyBuckets());
      setDirty(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Primary user = first selected. Load full effective permissions
      // (including their role fallback) from the server so the editor
      // mirrors what they see today.
      const primaryId = selectedUserIds[0];
      try {
        const res = await api.getUserPermissions(primaryId);
        if (cancelled) return;
        setDraft(res.permissions);
        setDirty(false);
      } catch {
        // Fall back to catalog defaults for the user's role.
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
      // scope === "users"
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
      // scope === "users"
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
          {entries.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------
  // Scope-specific metadata shown above the permission editor.
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Top-right action buttons.
  // ---------------------------------------------------------------------
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
      </header>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
        {/* Scope toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
          <label className="text-sm font-medium">{t("rbac.scope.label")}</label>
          <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)} className="w-auto">
            <TabsList>
              <TabsTrigger value="role" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("rbac.scope.role")}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-3.5 w-3.5" />
                {t("rbac.scope.users")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {scope === "role" ? (
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
            <p className="text-xs text-muted-foreground">{roleBadge}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("rbac.users.select_hint")}</p>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/40 flex flex-col">
              {/* Search + bulk controls */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("rbac.users.search_placeholder")}
                    className="pl-7 h-9"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                    {t("rbac.users.select_all_visible")}
                  </Button>
                  {selectedUserIds.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      <X className="h-3 w-3 mr-1" />
                      {t("rbac.users.clear_selection")}
                    </Button>
                  )}
                </div>
              </div>

              {/* User grid — 1 / 2 / 3 columns depending on viewport. */}
              <div className="max-h-[26rem] overflow-y-auto p-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                            checked
                              ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleUser(u.id, v === true)}
                          />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {userInitials(u)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {u.full_name || u.email}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {u.role}
                            </Badge>
                            {overriden && (
                              <Badge className="text-[10px]">
                                {t("rbac.users.override_badge")}
                              </Badge>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer: selection count + context badges + hint */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedUserIds.length > 0 && (
                    <span className="text-muted-foreground">
                      {t("rbac.users.selected_count", { count: selectedUserIds.length })}
                    </span>
                  )}
                  {primaryUser && selectedUsers.length === 1 && (
                    <>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {primaryUser.role}
                      </Badge>
                      <Badge
                        variant={overrideByUserId.has(primaryUser.id) ? "default" : "outline"}
                      >
                        {overrideByUserId.has(primaryUser.id)
                          ? t("rbac.users.override_badge")
                          : t("rbac.users.role_badge")}
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground">{userScopeHint}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : scope === "users" && selectedUserIds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-muted-foreground text-center">
            {t("rbac.users.none_selected")}
          </div>
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
            <TabsContent value="apps" className="pt-4">
              {renderBucket("apps")}
            </TabsContent>
            <TabsContent value="widgets" className="pt-4">
              {renderBucket("widgets")}
            </TabsContent>
            <TabsContent value="actions" className="pt-4">
              {renderBucket("actions")}
            </TabsContent>
          </Tabs>
        )}

        {/* Bottom action bar — separated from content with a divider. */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (scope === "users") setConfirmResetOpen(true);
              else void handleReset();
            }}
            disabled={resetDisabled}
            className="w-full sm:w-auto"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("rbac.actions.reset_defaults")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveDisabled}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveLabel}
          </Button>
        </div>
      </section>

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

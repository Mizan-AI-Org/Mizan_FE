import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";

export type PermissionBuckets = {
  apps: string[];
  widgets: string[];
  actions: string[];
};

export type EffectivePermissions = {
  role: string;
  source: "privileged" | "user" | "tenant" | "defaults";
  permissions: PermissionBuckets;
};

export type AssignableUser = {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  has_override: boolean;
};

export type UserPermissionRow = {
  user_id: string;
  permissions: PermissionBuckets;
  updated_by: string | null;
  updated_at: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
};

export type RBACCatalog = {
  apps: { id: string; label: string }[];
  widgets: { id: string; label: string }[];
  actions: { id: string; label: string }[];
  editable_roles: string[];
  privileged_roles: string[];
  role_defaults: Record<string, PermissionBuckets>;
};

export type RolePermissionRow = {
  role: string;
  permissions: PermissionBuckets;
  updated_by: string | null;
  updated_at: string | null;
};

const ME_KEY = ["rbac", "me"] as const;
const CATALOG_KEY = ["rbac", "catalog"] as const;
const ROLE_PERMS_KEY = ["rbac", "role-permissions"] as const;
const ASSIGNABLE_USERS_KEY = ["rbac", "assignable-users"] as const;
const USER_PERMS_KEY = ["rbac", "user-permissions"] as const;

/**
 * Resolve the current user's effective permissions and expose `can*` helpers.
 *
 * While loading (or when the user is unauthenticated) every helper returns
 * `true`, so we never flash an empty UI before the first response lands.
 */
export function usePermissions() {
  const { accessToken } = useAuth() as AuthContextType;

  const query = useQuery({
    queryKey: [...ME_KEY, accessToken],
    queryFn: () => api.getEffectivePermissions(),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const sets = useMemo(() => {
    const p = query.data?.permissions;
    return {
      apps: new Set(p?.apps ?? []),
      widgets: new Set(p?.widgets ?? []),
      actions: new Set(p?.actions ?? []),
    };
  }, [query.data]);

  const isPrivileged = query.data?.source === "privileged";
  const ready = query.isSuccess;

  const canApp = (id: string) => (!ready ? true : isPrivileged || sets.apps.has(id));
  const canWidget = (id: string) => (!ready ? true : isPrivileged || sets.widgets.has(id));
  const canAction = (id: string) => (!ready ? true : isPrivileged || sets.actions.has(id));

  return {
    isLoading: query.isLoading,
    isPrivileged,
    role: query.data?.role ?? "",
    source: query.data?.source,
    permissions: query.data?.permissions,
    canApp,
    canWidget,
    canAction,
  };
}

export function useRBACCatalog(enabled = true) {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: () => api.getRBACCatalog(),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function useRolePermissions(enabled = true) {
  return useQuery({
    queryKey: ROLE_PERMS_KEY,
    queryFn: async (): Promise<RolePermissionRow[]> => {
      const res = await api.listRolePermissions();
      return res.results ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useRolePermissionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ROLE_PERMS_KEY });
    qc.invalidateQueries({ queryKey: ME_KEY });
  };

  const save = useMutation({
    mutationFn: ({
      role,
      permissions,
    }: {
      role: string;
      permissions: PermissionBuckets;
    }) => api.updateRolePermissions(role, permissions),
    onSuccess: invalidate,
  });

  const reset = useMutation({
    mutationFn: (role: string) => api.resetRolePermissions(role),
    onSuccess: invalidate,
  });

  return { save, reset };
}

export function useAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: ASSIGNABLE_USERS_KEY,
    queryFn: async (): Promise<AssignableUser[]> => {
      const res = await api.listAssignableUsers();
      return res.results ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUserPermissions(enabled = true) {
  return useQuery({
    queryKey: USER_PERMS_KEY,
    queryFn: async (): Promise<UserPermissionRow[]> => {
      const res = await api.listUserPermissions();
      return res.results ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUserPermissionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: USER_PERMS_KEY });
    qc.invalidateQueries({ queryKey: ASSIGNABLE_USERS_KEY });
    qc.invalidateQueries({ queryKey: ME_KEY });
  };

  const save = useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: PermissionBuckets;
    }) => api.updateUserPermissions(userId, permissions),
    onSuccess: invalidate,
  });

  const saveMany = useMutation({
    mutationFn: ({
      userIds,
      permissions,
    }: {
      userIds: string[];
      permissions: PermissionBuckets;
    }) => api.bulkUpdateUserPermissions(userIds, permissions),
    onSuccess: invalidate,
  });

  const reset = useMutation({
    mutationFn: (userId: string) => api.resetUserPermissions(userId),
    onSuccess: invalidate,
  });

  return { save, saveMany, reset };
}

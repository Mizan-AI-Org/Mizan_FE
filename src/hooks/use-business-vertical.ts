import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import {
  type BusinessVertical,
  parseBusinessVertical,
} from "@/config/staffInviteRolesByVertical";

export type CustomStaffRoleRow = { id: string; name: string };

export type UnifiedStaffSettings = {
  businessVertical: BusinessVertical;
  customStaffRoles: CustomStaffRoleRow[];
};

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

function parseVertical(data: unknown): BusinessVertical {
  const v = (data as { business_vertical?: string } | null)?.business_vertical;
  return parseBusinessVertical(v);
}

function parseCustomRoles(data: unknown): CustomStaffRoleRow[] {
  const raw = (data as { custom_staff_roles?: unknown } | null)?.custom_staff_roles;
  if (!Array.isArray(raw)) return [];
  const out: CustomStaffRoleRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: string }).id || "").trim();
    const name = String((item as { name?: string }).name || "").trim();
    if (id && name) out.push({ id, name });
  }
  return out;
}

/**
 * Business vertical + custom role titles from `GET /settings/unified/`.
 */
export function useBusinessVertical() {
  return useQuery({
    queryKey: ["settings", "business_vertical"],
    queryFn: async (): Promise<UnifiedStaffSettings> => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/settings/unified/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      return {
        businessVertical: parseVertical(data),
        customStaffRoles: parseCustomRoles(data),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Build `/staff/invite/` body fields from composite role (e.g. `CUSTOM:<uuid>`). */
export function splitInviteRoleSelection(roleComposite: string): {
  role: string;
  custom_role_id?: string;
} {
  if (roleComposite.startsWith("CUSTOM:")) {
    const id = roleComposite.slice("CUSTOM:".length).trim();
    return id ? { role: "CUSTOM", custom_role_id: id } : { role: "MANAGER" };
  }
  return { role: roleComposite };
}

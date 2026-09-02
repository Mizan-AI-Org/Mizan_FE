import type { User } from "@/contexts/AuthContext.types";
import { getImpersonation } from "@/lib/impersonation";

export type AgentRestaurantContext = {
  id: string;
  name: string;
};

/** Resolve Mizan tenant for Agent / LuaPop from user profile or impersonation session. */
export function resolveAgentRestaurantContext(user: User): AgentRestaurantContext | null {
  const impersonation = getImpersonation();
  if (impersonation?.restaurant?.id) {
    return {
      id: String(impersonation.restaurant.id),
      name: impersonation.restaurant.name || "Workspace",
    };
  }

  const id =
    user.restaurant_data?.id ??
    (typeof user.restaurant === "string" && user.restaurant.trim()
      ? user.restaurant
      : undefined);

  if (!id) return null;

  const name =
    user.restaurant_data?.name ||
    user.restaurant_name ||
    (typeof user.restaurant === "object" && user.restaurant !== null
      ? (user.restaurant as { name?: string }).name
      : undefined) ||
    "Workspace";

  return { id: String(id), name };
}

export function buildLuaPopSessionId(
  restaurantId: string,
  userId: string,
  loginNonce: string,
): string {
  return `tenant-${restaurantId}-user-${userId}-${loginNonce}`;
}

export function buildLuaPopBaseSessionId(restaurantId: string, userId: string): string {
  return `tenant-${restaurantId}-user-${userId}`;
}

export function buildLuaPopRuntimeContext(args: {
  restaurantName: string;
  restaurantId: string;
  userFullName: string;
  userId: string;
  role: string;
  accessToken: string;
  businessVertical: string;
  takeOrdersMode?: boolean;
}): string {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [
    `Restaurant: ${args.restaurantName} (ID: ${args.restaurantId})`,
    `User: ${args.userFullName} (ID: ${args.userId})`,
    `Role: ${args.role}`,
    `Token: ${args.accessToken}`,
    `business_vertical: ${args.businessVertical} | tenant_id (API field restaurant_id): ${args.restaurantId} | Current time: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${timezone})`,
    "Operational directives: You are Miya, the AI Operations Manager for this Mizan workspace only. Mizan is multi-vertical (restaurant, retail, manufacturing, construction, healthcare operations, hospitality, professional services, other). Use business_vertical to choose appropriate language; restaurant_id is always the tenant/workspace id. Never hallucinate: verify every answer from the database using that tenant id, date, and staff. Execute actions only when permitted and after validating permissions, staff, and shift exist. Respect role: managers get full team visibility and recommendations; staff see only their own data. Resolve relative dates (e.g. Tuesday 17th) to the current calendar week. When giving insights, label as Verified Data (state confidently), Recommendation (predictive), or Missing Data (state limitation). Precision over creativity; verification over assumption.",
    args.takeOrdersMode
      ? "Order-taking mode: For every guest order, capture and confirm: customer name; phone for takeout/delivery; order type (dine-in, takeout, delivery); table or pickup location; each menu item with quantity and modifiers; allergens and dietary restrictions; special instructions; repeat the full order back for confirmation before closing. Help staff log details accurately."
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

/** Best-effort prefill for Ask Agent deep-links into the embedded LuaPop composer. */
export function prefillLuaPopComposer(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;

  const roots: ParentNode[] = [document];
  const shadowHost = document.querySelector("#lua-shadow-root");
  if (shadowHost?.shadowRoot) roots.push(shadowHost.shadowRoot);

  for (const root of roots) {
    const fields = root.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
      'textarea, input[type="text"], input:not([type])',
    );
    for (const field of fields) {
      if (field.offsetParent === null && field.getClientRects().length === 0) continue;
      field.focus();
      field.value = text;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  }
  return false;
}

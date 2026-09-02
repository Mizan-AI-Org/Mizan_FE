/** Tenant roles with full operational dashboard access. */
export const OPERATIONAL_COMMAND_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OWNER",
  "RESTAURANT_OWNER",
  "MANAGER",
  "GENERAL_MANAGER",
  "SUPERVISOR",
] as const;

export type OperationalCommandRole = (typeof OPERATIONAL_COMMAND_ROLES)[number];

export function hasOperationalCommandRole(role: string | null | undefined): boolean {
  return Boolean(role && OPERATIONAL_COMMAND_ROLES.includes(role as OperationalCommandRole));
}

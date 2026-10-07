import type { TFunction } from "i18next";

/** Human-readable role label for nav, RBAC, and profile. */
export function roleDisplayName(role: string | undefined | null, t: TFunction): string {
  if (!role) return "";
  const code = role.trim().toUpperCase();
  const slug = code.toLowerCase();
  const staffKey = `staff.roles.${slug}`;
  const staffLabel = t(staffKey);
  if (staffLabel !== staffKey) return staffLabel;
  const onboardingKey = `onboarding.roles.${slug}`;
  const onboardingLabel = t(onboardingKey);
  if (onboardingLabel !== onboardingKey) return onboardingLabel;
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Human-readable role label for nav, RBAC, and profile. */
/** Translated label for a known role code, or null when no locale key exists (e.g. CUSTOM titles). */
export function translatedRoleName(role: string | undefined | null, t: (key: string) => string): string | null {
  if (!role) return null;
  const slug = role.trim().toLowerCase();
  for (const prefix of ["staff.roles.", "staff.add_people.roles.", "onboarding.roles."]) {
    const key = `${prefix}${slug}`;
    const label = t(key);
    if (label && label !== key) return label;
  }
  return null;
}

export function roleDisplayName(role: string | undefined | null, t: (key: string) => string): string {
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

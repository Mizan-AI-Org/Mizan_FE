/** Map backend English relative time labels to the active locale. */
export function localizeAgeLabel(
  label: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const raw = (label || "").trim();
  if (!raw || raw === "-") return "-";
  const lower = raw.toLowerCase();
  if (lower === "just now") return t("operations_live.rel.just_now");
  if (lower === "yesterday") return t("operations_live.rel.yesterday");
  let m = lower.match(/^(\d+)\s*m\s*ago$/);
  if (m) return t("operations_live.rel.minutes", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*h\s*ago$/);
  if (m) return t("operations_live.rel.hours", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*d\s*ago$/);
  if (m) return t("operations_live.rel.days", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*w\s*ago$/);
  if (m) return t("operations_live.rel.weeks", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*mo\s*ago$/);
  if (m) return t("operations_live.rel.months", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*y\s*ago$/);
  if (m) return t("operations_live.rel.years", { count: Number(m[1]) });
  return raw;
}

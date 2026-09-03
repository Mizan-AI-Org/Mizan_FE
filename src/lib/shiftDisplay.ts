const ADHOC_MARKER = "[ADHOC_CHECKLIST]";
const LEGACY_ADHOC = /Checklist without rostered shift/i;

type ShiftTitleSource = {
  title?: string | null;
  notes?: string | null;
  task_templates_details?: { name?: string; title?: string }[];
};

/** Calendar-friendly shift title; hides internal ad-hoc checklist markers. */
export function displayShiftTitle(shift: ShiftTitleSource): string {
  const templates = (shift.task_templates_details ?? [])
    .map((t) => (t.name || t.title || "").trim())
    .filter(Boolean);

  if (templates.length === 1) return templates[0];
  if (templates.length === 2) return `${templates[0]}, ${templates[1]}`;
  if (templates.length > 2) {
    return `${templates[0]}, ${templates[1]} (+${templates.length - 2} more)`;
  }

  let raw = (shift.title ?? shift.notes ?? "").trim();
  if (!raw.includes(ADHOC_MARKER)) return raw || "Shift";

  raw = raw.replace(ADHOC_MARKER, "").trim();
  if (LEGACY_ADHOC.test(raw)) return "Process checklist";
  return raw.replace(/\(\s*Processes\s*&\s*Tasks\s*\)\.?$/i, "").trim() || "Process checklist";
}

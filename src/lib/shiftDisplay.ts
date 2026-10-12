const ADHOC_MARKER = "[ADHOC_CHECKLIST]";
const LEGACY_ADHOC = /Checklist without rostered shift/i;

type ShiftTitleSource = {
  title?: string | null;
  notes?: string | null;
  task_templates_details?: { name?: string; title?: string }[];
};

export type ShiftStaffDetail = {
  id: string;
  first_name: string;
  last_name: string;
};

type StaffLookup = {
  id: string;
  user?: { id: string; first_name: string; last_name: string };
  first_name?: string;
  last_name?: string;
  role?: string;
};

/** Match shift assignee ids to roster rows; fall back to API-embedded staff_info on process shifts. */
export function resolveStaffForShiftId(
  staffId: string,
  staffMembers: StaffLookup[],
  details?: ShiftStaffDetail[],
): StaffLookup | undefined {
  const id = String(staffId);
  const fromRoster = staffMembers.find((s) => String(s.id) === id);
  if (fromRoster) return fromRoster;
  const embedded = details?.find((d) => String(d.id) === id);
  if (!embedded) return undefined;
  return {
    id,
    first_name: embedded.first_name,
    last_name: embedded.last_name,
    user: {
      id,
      first_name: embedded.first_name,
      last_name: embedded.last_name,
    },
  };
}

export function staffDisplayName(staff?: StaffLookup): string {
  if (!staff) return "Unknown";
  const first = staff.user?.first_name || staff.first_name || "";
  const last = staff.user?.last_name || staff.last_name || "";
  const name = `${first} ${last}`.trim();
  return name || "Unknown";
}

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

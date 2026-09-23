import { API_BASE } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";
import { loadStaffPickerOptions, type StaffPickerOption } from "@/lib/staffPicker";

export type ChecklistAssignee = {
  id: string;
  name: string;
};

export type AssignedChecklist = {
  id: string;
  kind: "template" | "checklist";
  name: string;
  isActive: boolean;
  stepCount: number;
  assignees: ChecklistAssignee[];
};

type StaffName = { id: string; name: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asList(payload: unknown): Record<string, unknown>[] {
  const body =
    payload && typeof payload === "object" && "success" in (payload as object) && "data" in (payload as object)
      ? unwrapEnvelope<unknown>(payload)
      : payload;
  const raw = Array.isArray(body)
    ? body
    : body && typeof body === "object" && "results" in (body as object)
      ? ((body as { results?: unknown[] }).results ?? [])
      : [];
  return raw.map(asRecord).filter((row): row is Record<string, unknown> => row !== null);
}

function personName(row: Record<string, unknown>, staffById: Map<string, string>): string {
  const explicit = String(row.name ?? "").trim();
  if (explicit) return explicit;
  const joined = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  const id = String(row.id ?? "");
  return staffById.get(id) || "";
}

function peopleFromDetails(raw: unknown, staffById: Map<string, string>): ChecklistAssignee[] {
  if (!Array.isArray(raw)) return [];
  const out: ChecklistAssignee[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const id = String(row.id ?? "");
    const name = personName(row, staffById);
    if (!id || !name) continue;
    out.push({ id, name });
  }
  return out;
}

function peopleFromIds(raw: unknown, staffById: Map<string, string>): ChecklistAssignee[] {
  if (!Array.isArray(raw)) return [];
  const out: ChecklistAssignee[] = [];
  for (const item of raw) {
    const id = String(item ?? "");
    const name = staffById.get(id);
    if (!id || !name) continue;
    out.push({ id, name });
  }
  return out;
}

function dedupePeople(people: ChecklistAssignee[]): ChecklistAssignee[] {
  const seen = new Set<string>();
  const out: ChecklistAssignee[] = [];
  for (const person of people) {
    const key = person.id || person.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(person);
  }
  return out;
}

function executionAssignees(executions: unknown): Map<string, ChecklistAssignee[]> {
  const byTemplate = new Map<string, ChecklistAssignee[]>();
  for (const row of asList(executions)) {
    const template = asRecord(row.template);
    const templateId = String(row.template_id ?? template?.id ?? "");
    if (!templateId) continue;
    const info = asRecord(row.assigned_to_info) ?? asRecord(row.submitted_by);
    const id = String(info?.id ?? row.assigned_to ?? "");
    const name = String(row.assigned_to_name ?? info?.name ?? "").trim()
      || [info?.first_name, info?.last_name].filter(Boolean).join(" ").trim();
    if (!id || !name) continue;
    const current = byTemplate.get(templateId) ?? [];
    current.push({ id, name });
    byTemplate.set(templateId, current);
  }
  return byTemplate;
}

/** Process templates plus checklist templates, each with every assigned person. */
export function mapAssignedChecklists(
  processTemplates: unknown,
  staff: StaffName[],
  checklistTemplates: unknown = [],
  executions: unknown = [],
): AssignedChecklist[] {
  const staffById = new Map(staff.map((person) => [person.id, person.name]));
  const fromExecutions = executionAssignees(executions);
  const rows: AssignedChecklist[] = [];
  const names = new Set<string>();

  for (const row of asList(processTemplates)) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const name = String(row.name ?? "Checklist").trim() || "Checklist";
    const tasks = Array.isArray(row.tasks) ? row.tasks : [];
    const details = peopleFromDetails(row.standing_assignee_details, staffById);
    const fromIds = peopleFromIds(row.standing_assignees, staffById);
    rows.push({
      id,
      kind: "template",
      name,
      isActive: row.is_active !== false,
      stepCount: tasks.length,
      assignees: dedupePeople([...details, ...fromIds]),
    });
    names.add(name.toLowerCase());
  }

  for (const row of asList(checklistTemplates)) {
    const id = String(row.id ?? "");
    const name = String(row.name ?? "Checklist").trim() || "Checklist";
    if (!id || names.has(name.toLowerCase())) continue;
    const stepCount = typeof row.step_count === "number"
      ? row.step_count
      : Array.isArray(row.steps) ? row.steps.length : 0;
    rows.push({
      id,
      kind: "checklist",
      name,
      isActive: row.is_active !== false,
      stepCount,
      assignees: dedupePeople(fromExecutions.get(id) ?? []),
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function loadAssignedChecklists(): Promise<AssignedChecklist[]> {
  const [templates, checklists, executions, staff] = await Promise.all([
    readJson(`${API_BASE}/scheduling/task-templates/?page_size=500`),
    readJson(`${API_BASE}/checklists/templates/`),
    readJson(`${API_BASE}/checklists/executions/?scope=restaurant&page_size=200`),
    loadStaffPickerOptions({ pageSize: 500 }).catch((): StaffPickerOption[] => []),
  ]);
  return mapAssignedChecklists(templates ?? [], staff, checklists ?? [], executions ?? []);
}

/**
 * Parse user-uploaded process definitions into payloads compatible with
 * POST /scheduling/task-templates/
 */

export const VALID_TEMPLATE_TYPES = new Set([
  'CLEANING',
  'TEMPERATURE',
  'OPENING',
  'CLOSING',
  'HEALTH',
  'SOP',
  'MAINTENANCE',
  'COMPLIANCE',
  'SAFETY',
  'QUALITY',
  'CUSTOM',
]);

export const VALID_FREQUENCIES = new Set([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
  'CUSTOM',
]);

export const VALID_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export interface ImportTaskPayload {
  title: string;
  description?: string;
  priority?: string;
  estimated_duration?: number;
}

export interface ImportTemplatePayload {
  name: string;
  description: string;
  template_type: string;
  frequency: string;
  tasks: ImportTaskPayload[];
  priority_level?: string;
  is_active?: boolean;
  is_critical?: boolean;
}

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((c === ',' || c === '\t') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function splitCSVRows(text: string): string[] {
  const lines: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
      continue;
    }
    if ((c === '\n' || (c === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (c === '\r') i++;
      const trimmed = cur.trim();
      if (trimmed) lines.push(trimmed);
      cur = '';
      continue;
    }
    if (c === '\r' && !inQuotes) {
      const trimmed = cur.trim();
      if (trimmed) lines.push(trimmed);
      cur = '';
      continue;
    }
    cur += c;
  }
  const last = cur.trim();
  if (last) lines.push(last);
  return lines;
}

function normalizeTemplateType(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (VALID_TEMPLATE_TYPES.has(s)) return s;
  return 'CUSTOM';
}

function normalizeFrequency(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (s === 'YEARLY') return 'ANNUALLY';
  if (VALID_FREQUENCIES.has(s)) return s;
  return 'DAILY';
}

function normalizePriority(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (VALID_PRIORITIES.has(s)) return s;
  return 'MEDIUM';
}

function parseDuration(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function normalizeTask(obj: Record<string, unknown>): ImportTaskPayload | null {
  const title =
    (obj.title as string) ||
    (obj.task_title as string) ||
    (obj.name as string) ||
    '';
  if (!String(title).trim()) return null;
  const description = String(obj.description ?? obj.task_description ?? '').trim() || undefined;
  const priority = normalizePriority(obj.priority ?? obj.task_priority);
  const est =
    parseDuration(obj.estimated_duration) ??
    parseDuration(obj.estimated_minutes) ??
    parseDuration(obj.duration);
  return {
    title: String(title).trim(),
    ...(description ? { description } : {}),
    priority,
    ...(est !== undefined ? { estimated_duration: est } : {}),
  };
}

function extractTasksArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.tasks)) return o.tasks;
    if (Array.isArray(o.localized_tasks)) return o.localized_tasks;
  }
  return [];
}

function templateFromRecord(
  rec: Record<string, unknown>,
  tasks: ImportTaskPayload[],
  index: number
): ImportTemplatePayload | null {
  const nameRaw =
    rec.name ??
    rec.process_name ??
    rec.template_name ??
    rec.title;
  const name = String(nameRaw ?? '').trim();
  if (!name) {
    return {
      name: `Imported process ${index + 1}`,
      description: String(rec.description ?? rec.process_description ?? '').trim(),
      template_type: normalizeTemplateType(rec.template_type ?? rec.type),
      frequency: normalizeFrequency(rec.frequency),
      tasks,
    };
  }
  return {
    name,
    description: String(rec.description ?? rec.process_description ?? '').trim(),
    template_type: normalizeTemplateType(rec.template_type ?? rec.type),
    frequency: normalizeFrequency(rec.frequency),
    tasks,
  };
}

/**
 * Accepts:
 * - { templates: [...] }
 * - [...] array of template objects
 * - single template object
 */
export function parseProcessTemplatesFromJson(text: string): {
  templates: ImportTemplatePayload[];
  errors: string[];
} {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { templates: [], errors: ['Invalid JSON: could not parse file.'] };
  }

  let list: unknown[] = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.templates)) list = o.templates;
    else if (Array.isArray(o.results)) list = o.results;
    else if (o.name !== undefined || o.tasks !== undefined) list = [parsed];
  }

  if (list.length === 0) {
    return { templates: [], errors: ['No process templates found in JSON. Expected an array or { "templates": [...] }.'] };
  }

  const templates: ImportTemplatePayload[] = [];
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Entry ${idx + 1}: skipped (not an object).`);
      return;
    }
    const rec = item as Record<string, unknown>;
    const rawTasks = extractTasksArray(rec);
    const tasks: ImportTaskPayload[] = [];
    rawTasks.forEach((t, ti) => {
      if (t && typeof t === 'object') {
        const nt = normalizeTask(t as Record<string, unknown>);
        if (nt) tasks.push(nt);
      } else if (typeof t === 'string' && t.trim()) {
        tasks.push({ title: t.trim(), priority: 'MEDIUM' });
      } else {
        errors.push(`Template "${String(rec.name || idx + 1)}": task ${ti + 1} skipped (invalid).`);
      }
    });

    if (tasks.length === 0) {
      errors.push(`Template ${idx + 1}: no valid tasks (each task needs a title).`);
      return;
    }

    const tpl = templateFromRecord(rec, tasks, idx);
    if (tpl) {
      const pl = rec.priority_level;
      if (typeof pl === 'string' && VALID_PRIORITIES.has(pl.toUpperCase())) {
        tpl.priority_level = pl.toUpperCase();
      }
      if (typeof rec.is_critical === 'boolean') tpl.is_critical = rec.is_critical;
      if (typeof rec.is_active === 'boolean') tpl.is_active = rec.is_active;
      templates.push(tpl);
    }
  });

  return { templates, errors };
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key) rec[key] = cells[i] ?? '';
  });
  return rec;
}

function cell(
  row: Record<string, string>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/**
 * CSV: header row, then one row per task.
 * Group rows by process_name (or template_name / name). Same group = one template, multiple tasks.
 * Columns (aliases): process_name, template_name, task_title, task_description, template_type, frequency, priority, estimated_minutes
 */
export function parseProcessTemplatesFromCsv(text: string): {
  templates: ImportTemplatePayload[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows = splitCSVRows(text);
  if (rows.length < 2) {
    return { templates: [], errors: ['CSV must include a header row and at least one data row.'] };
  }

  const headerCells = parseCSVLine(rows[0]);
  const headers = headerCells.map((h) => normalizeHeader(h));
  if (headers.every((h) => !h)) {
    return { templates: [], errors: ['CSV header row is empty.'] };
  }

  const dataRows: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = parseCSVLine(rows[r]);
    if (cells.every((c) => !c.trim())) continue;
    dataRows.push(rowToRecord(headerCells, cells));
  }

  if (dataRows.length === 0) {
    return { templates: [], errors: ['No data rows in CSV.'] };
  }

  const hasTaskCol = dataRows.some(
    (row) =>
      cell(row, 'task_title', 'task', 'task_name', 'title').length > 0
  );
  if (!hasTaskCol) {
    return {
      templates: [],
      errors: [
        'CSV must include a task column: task_title (or task, task_name, title).',
      ],
    };
  }

  type Group = {
    description: string;
    template_type: string;
    frequency: string;
    tasks: ImportTaskPayload[];
  };

  const groups = new Map<string, Group>();

  for (const row of dataRows) {
    const pname =
      cell(row, 'process_name', 'template_name', 'process', 'name') || 'Imported process';
    const taskTitle = cell(row, 'task_title', 'task', 'task_name', 'title');
    if (!taskTitle) {
      errors.push(`Skipped row: missing task_title for process "${pname}".`);
      continue;
    }

    if (!groups.has(pname)) {
      groups.set(pname, {
        description: cell(row, 'process_description', 'template_description', 'description'),
        template_type: normalizeTemplateType(cell(row, 'template_type', 'type')),
        frequency: normalizeFrequency(cell(row, 'frequency')),
        tasks: [],
      });
    }
    const g = groups.get(pname)!;
    if (!g.description) {
      const d = cell(row, 'process_description', 'template_description', 'description');
      if (d) g.description = d;
    }
    const tt = cell(row, 'template_type', 'type');
    if (tt) g.template_type = normalizeTemplateType(tt);
    const fq = cell(row, 'frequency');
    if (fq) g.frequency = normalizeFrequency(fq);

    const taskDesc = cell(row, 'task_description', 'task_desc');
    const pr = normalizePriority(cell(row, 'priority', 'task_priority'));
    const est =
      parseDuration(cell(row, 'estimated_minutes', 'estimated_duration', 'duration'));

    g.tasks.push({
      title: taskTitle,
      ...(taskDesc ? { description: taskDesc } : {}),
      priority: pr,
      ...(est !== undefined ? { estimated_duration: est } : {}),
    });
  }

  const templates: ImportTemplatePayload[] = [];
  groups.forEach((g, name) => {
    if (g.tasks.length === 0) return;
    templates.push({
      name,
      description: g.description,
      template_type: g.template_type,
      frequency: g.frequency,
      tasks: g.tasks,
    });
  });

  if (templates.length === 0) {
    return { templates: [], errors: errors.length ? errors : ['No valid processes parsed from CSV.'] };
  }

  return { templates, errors };
}

export function parseProcessTemplatesFile(
  text: string,
  fileName: string
): { templates: ImportTemplatePayload[]; errors: string[] } {
  const lower = fileName.toLowerCase();
  const trimmed = text.trim();
  if (lower.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseProcessTemplatesFromJson(text);
  }
  return parseProcessTemplatesFromCsv(text);
}

export const SAMPLE_JSON_EXPORT = `{
  "templates": [
    {
      "name": "Morning line setup",
      "description": "Kitchen opening tasks",
      "template_type": "SOP",
      "frequency": "DAILY",
      "tasks": [
        { "title": "Sanitize stations", "priority": "HIGH", "estimated_duration": 10 },
        { "title": "Stock dry goods", "priority": "MEDIUM", "estimated_duration": 15 }
      ]
    }
  ]
}
`;

export const SAMPLE_CSV_EXPORT = `process_name,process_description,template_type,frequency,task_title,task_description,priority,estimated_minutes
Morning line setup,Kitchen opening tasks,SOP,DAILY,Sanitize stations,,HIGH,10
Morning line setup,,,,Stock dry goods,,MEDIUM,15
`;

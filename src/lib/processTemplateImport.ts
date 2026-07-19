/**
 * Parse user-uploaded process definitions into payloads compatible with
 * POST /scheduling/task-templates/
 *
 * Supported uploads: JSON, CSV, Excel (.xlsx/.xls), Word (.docx), plain text, Markdown.
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

const PROCESS_NAME_KEYS = [
  'name',
  'process_name',
  'process',
  'template_name',
  'template',
  'title',
  'process_title',
  'checklist_name',
  'checklist',
];

const TASK_ARRAY_KEYS = [
  'tasks',
  'localized_tasks',
  'steps',
  'checklist',
  'checklist_items',
  'items',
  'task_list',
  'task_items',
  'activities',
  'actions',
];

const TASK_TITLE_KEYS = [
  'task_title',
  'task',
  'task_name',
  'title',
  'step',
  'step_title',
  'action',
  'activity',
  'checklist_item',
  'item',
  'name',
  'label',
];

const HEADER_HINTS = new Set([
  'process',
  'process_name',
  'processname',
  'template',
  'template_name',
  'templatename',
  'task',
  'task_title',
  'tasktitle',
  'title',
  'name',
  'description',
  'frequency',
  'type',
  'template_type',
  'priority',
  'step',
  'action',
]);

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
    if ((c === ',' || c === '\t' || c === ';') && !inQuotes) {
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

function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
      return obj[key];
    }
  }
  return undefined;
}

function splitInlineTasks(raw: string): string[] {
  return raw
    .split(/\r?\n|;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeTask(obj: Record<string, unknown>): ImportTaskPayload | null {
  const titleRaw = pickField(obj, TASK_TITLE_KEYS);
  const title = titleRaw !== undefined ? String(titleRaw).trim() : '';
  if (!title) return null;
  const description = String(obj.description ?? obj.task_description ?? obj.details ?? '').trim() || undefined;
  const priority = normalizePriority(obj.priority ?? obj.task_priority);
  const est =
    parseDuration(obj.estimated_duration) ??
    parseDuration(obj.estimated_minutes) ??
    parseDuration(obj.duration) ??
    parseDuration(obj.minutes);
  return {
    title,
    ...(description ? { description } : {}),
    priority,
    ...(est !== undefined ? { estimated_duration: est } : {}),
  };
}

function tasksFromUnknown(raw: unknown): ImportTaskPayload[] {
  const tasks: ImportTaskPayload[] = [];
  const arr = extractTasksArray(raw);
  arr.forEach((t) => {
    if (t && typeof t === 'object') {
      const nt = normalizeTask(t as Record<string, unknown>);
      if (nt) tasks.push(nt);
      return;
    }
    if (typeof t === 'string') {
      for (const piece of splitInlineTasks(t)) {
        tasks.push({ title: piece, priority: 'MEDIUM' });
      }
    }
  });
  return tasks;
}

function extractTasksArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of TASK_ARRAY_KEYS) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
    if (typeof o.tasks === 'string') {
      return splitInlineTasks(o.tasks);
    }
  }
  if (typeof raw === 'string') return splitInlineTasks(raw);
  return [];
}

function extractProcessName(rec: Record<string, unknown>, index: number, fallback?: string): string {
  const raw = pickField(rec, PROCESS_NAME_KEYS);
  const name = raw !== undefined ? String(raw).trim() : '';
  if (name) return name;
  if (fallback) return fallback;
  return `Imported process ${index + 1}`;
}

function templateFromRecord(
  rec: Record<string, unknown>,
  tasks: ImportTaskPayload[],
  index: number,
  fallbackName?: string,
): ImportTemplatePayload | null {
  if (tasks.length === 0) return null;
  const tpl: ImportTemplatePayload = {
    name: extractProcessName(rec, index, fallbackName),
    description: String(rec.description ?? rec.process_description ?? rec.summary ?? '').trim(),
    template_type: normalizeTemplateType(rec.template_type ?? rec.type ?? rec.category),
    frequency: normalizeFrequency(rec.frequency),
    tasks,
  };
  const pl = rec.priority_level ?? rec.process_priority;
  if (typeof pl === 'string' && VALID_PRIORITIES.has(pl.toUpperCase())) {
    tpl.priority_level = pl.toUpperCase();
  }
  if (typeof rec.is_critical === 'boolean') tpl.is_critical = rec.is_critical;
  if (typeof rec.is_active === 'boolean') tpl.is_active = rec.is_active;
  return tpl;
}

function collectTemplateList(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];

  const o = parsed as Record<string, unknown>;
  const listKeys = ['templates', 'processes', 'results', 'data', 'items', 'checklists'];
  for (const key of listKeys) {
    const val = o[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      const nested = collectTemplateList(val);
      if (nested.length) return nested;
    }
  }

  if (
    pickField(o, PROCESS_NAME_KEYS) !== undefined ||
    TASK_ARRAY_KEYS.some((k) => o[k] !== undefined)
  ) {
    return [parsed];
  }

  return [];
}

function fileStem(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, '').trim();
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).trim() || 'Imported process';
}

function looksLikeHeader(cells: string[]): boolean {
  const normalized = cells.map((c) => normalizeHeader(c));
  return normalized.some((h) => HEADER_HINTS.has(h) || [...HEADER_HINTS].some((hint) => h.includes(hint)));
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key) rec[key] = cells[i] ?? '';
  });
  return rec;
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function expandTaskCell(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (/[\n;|]/.test(trimmed)) return splitInlineTasks(trimmed);
  return [trimmed];
}

type TaskGroup = {
  description: string;
  template_type: string;
  frequency: string;
  tasks: ImportTaskPayload[];
};

function pushTaskToGroup(group: TaskGroup, row: Record<string, string>, taskTitle: string) {
  const pieces = expandTaskCell(taskTitle);
  for (const title of pieces) {
    const taskDesc = cell(row, 'task_description', 'task_desc', 'description');
    const pr = normalizePriority(cell(row, 'priority', 'task_priority'));
    const est = parseDuration(cell(row, 'estimated_minutes', 'estimated_duration', 'duration', 'minutes'));
    group.tasks.push({
      title,
      ...(taskDesc ? { description: taskDesc } : {}),
      priority: pr,
      ...(est !== undefined ? { estimated_duration: est } : {}),
    });
  }
}

function groupsToTemplates(groups: Map<string, TaskGroup>): ImportTemplatePayload[] {
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
  return templates;
}

function parseRowsToTemplates(
  rows: string[][],
  fileName: string,
): { templates: ImportTemplatePayload[]; errors: string[] } {
  const errors: string[] = [];
  const filtered = rows.filter((r) => r.some((c) => String(c ?? '').trim()));
  if (filtered.length === 0) {
    return { templates: [], errors: ['File has no data rows.'] };
  }

  const defaultProcessName = fileStem(fileName);
  const groups = new Map<string, TaskGroup>();

  const ensureGroup = (name: string, row?: Record<string, string>) => {
    const key = name.trim() || defaultProcessName;
    if (!groups.has(key)) {
      groups.set(key, {
        description: row ? cell(row, 'process_description', 'template_description', 'description') : '',
        template_type: normalizeTemplateType(row ? cell(row, 'template_type', 'type', 'category') : ''),
        frequency: normalizeFrequency(row ? cell(row, 'frequency') : ''),
        tasks: [],
      });
    }
    return groups.get(key)!;
  };

  let dataRows = filtered;
  let useHeaderMap = false;
  let headerCells: string[] = [];

  if (looksLikeHeader(filtered[0])) {
    headerCells = filtered[0];
    dataRows = filtered.slice(1);
    useHeaderMap = true;
  }

  if (useHeaderMap) {
    for (const cells of dataRows) {
      const row = rowToRecord(headerCells, cells);
      const pname =
        cell(row, 'process_name', 'template_name', 'process', 'name', 'checklist_name', 'checklist') ||
        defaultProcessName;
      const taskTitle = cell(row, 'task_title', 'task', 'task_name', 'title', 'step', 'action', 'activity', 'item');
      if (!taskTitle) {
        errors.push(`Skipped row: missing task title for process "${pname}".`);
        continue;
      }
      const g = ensureGroup(pname, row);
      if (!g.description) {
        const d = cell(row, 'process_description', 'template_description', 'description');
        if (d) g.description = d;
      }
      const tt = cell(row, 'template_type', 'type', 'category');
      if (tt) g.template_type = normalizeTemplateType(tt);
      const fq = cell(row, 'frequency');
      if (fq) g.frequency = normalizeFrequency(fq);
      pushTaskToGroup(g, row, taskTitle);
    }
  } else if (filtered[0].length >= 2) {
    for (const cells of filtered) {
      const processName = String(cells[0] ?? '').trim() || defaultProcessName;
      const taskTitle = String(cells[1] ?? '').trim();
      if (!taskTitle) continue;
      const g = ensureGroup(processName);
      pushTaskToGroup(g, {}, taskTitle);
      for (let i = 2; i < cells.length; i++) {
        const extra = String(cells[i] ?? '').trim();
        if (extra) pushTaskToGroup(g, {}, extra);
      }
    }
  } else {
    const g = ensureGroup(defaultProcessName);
    for (const cells of filtered) {
      const taskTitle = String(cells[0] ?? '').trim();
      if (!taskTitle) continue;
      pushTaskToGroup(g, {}, taskTitle);
    }
  }

  const templates = groupsToTemplates(groups);
  if (templates.length === 0) {
    return {
      templates: [],
      errors: errors.length ? errors : ['No valid processes found. Each process needs at least one task title.'],
    };
  }
  return { templates, errors };
}

/**
 * Accepts:
 * - { templates | processes | items: [...] }
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

  const list = collectTemplateList(parsed);
  if (list.length === 0) {
    return {
      templates: [],
      errors: [
        'No process templates found in JSON. Use an array, or an object with "templates" / "processes" / "items".',
      ],
    };
  }

  const templates: ImportTemplatePayload[] = [];
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Entry ${idx + 1}: skipped (not an object).`);
      return;
    }
    const rec = item as Record<string, unknown>;
    const tasks = tasksFromUnknown(rec);
    if (tasks.length === 0) {
      errors.push(`Template ${idx + 1}: no valid tasks (each task needs a title).`);
      return;
    }
    const tpl = templateFromRecord(rec, tasks, idx);
    if (tpl) templates.push(tpl);
  });

  return { templates, errors };
}

export function parseProcessTemplatesFromCsv(text: string, fileName = 'import.csv'): {
  templates: ImportTemplatePayload[];
  errors: string[];
} {
  const rows = splitCSVRows(text).map(parseCSVLine);
  return parseRowsToTemplates(rows, fileName);
}

const TASK_LINE_RE = /^[-*•–—]\s+(.+)$/;
const NUMBERED_TASK_RE = /^\d+[.)]\s+(.+)$/;
const HEADING_RE = /^#{1,6}\s+(.+)$/;
const LABEL_PROCESS_RE = /^(?:process|checklist|template|name)\s*[:：-]\s*(.+)$/i;

function parseProcessTemplatesFromText(text: string, fileName = 'import.txt'): {
  templates: ImportTemplatePayload[];
  errors: string[];
} {
  const errors: string[] = [];
  const defaultName = fileStem(fileName);
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  type Block = { name: string; description: string; tasks: ImportTaskPayload[] };
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current && current.tasks.length > 0) blocks.push(current);
    current = null;
  };

  const startBlock = (name: string) => {
    flush();
    current = { name: name.trim() || defaultName, description: '', tasks: [] };
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(HEADING_RE);
    if (heading) {
      startBlock(heading[1]);
      continue;
    }

    const labeled = line.match(LABEL_PROCESS_RE);
    if (labeled) {
      startBlock(labeled[1]);
      continue;
    }

    const bullet = line.match(TASK_LINE_RE) || line.match(NUMBERED_TASK_RE);
    if (bullet) {
      if (!current) startBlock(defaultName);
      current!.tasks.push({ title: bullet[1].trim(), priority: 'MEDIUM' });
      continue;
    }

    if (!current) {
      startBlock(line);
      continue;
    }

    if (current.tasks.length === 0 && !current.description) {
      if (line.length <= 80) {
        current.name = line;
        continue;
      }
      current.description = line;
      continue;
    }

    startBlock(line);
  }

  flush();

  if (blocks.length === 0) {
    return {
      templates: [],
      errors: ['No processes found in text. Use headings or "Process: Name" plus bullet/numbered tasks.'],
    };
  }

  const templates: ImportTemplatePayload[] = blocks.map((b) => ({
    name: b.name,
    description: b.description,
    template_type: 'CUSTOM',
    frequency: 'DAILY',
    tasks: b.tasks,
  }));

  return { templates, errors };
}

const DOCX_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function extractTextFromDocxXml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Could not read Word document XML.');
  }
  const paragraphs = doc.getElementsByTagNameNS(DOCX_NS, 'p');
  const lines: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const texts = paragraphs[i].getElementsByTagNameNS(DOCX_NS, 't');
    let line = '';
    for (let j = 0; j < texts.length; j++) {
      line += texts[j].textContent || '';
    }
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }
  return lines.join('\n');
}

async function parseProcessTemplatesFromDocx(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<{ templates: ImportTemplatePayload[]; errors: string[] }> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      return {
        templates: [],
        errors: ['Invalid Word document (.docx). Try saving the file as .docx and upload again.'],
      };
    }
    const xml = await xmlFile.async('string');
    const text = extractTextFromDocxXml(xml);
    if (!text.trim()) {
      return {
        templates: [],
        errors: ['Word document is empty or uses unsupported formatting. Try a simple checklist layout.'],
      };
    }
    return parseProcessTemplatesFromText(text, fileName);
  } catch {
    return {
      templates: [],
      errors: ['Could not read Word document. Use .docx format with process headings and bullet/numbered tasks.'],
    };
  }
}

async function parseProcessTemplatesFromXlsx(buffer: ArrayBuffer, fileName: string): Promise<{
  templates: ImportTemplatePayload[];
  errors: string[];
}> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { templates: [], errors: ['Excel file has no sheets.'] };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];
  const normalized = rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
  return parseRowsToTemplates(normalized, fileName);
}

export async function parseProcessTemplatesFile(
  file: File,
): Promise<{ templates: ImportTemplatePayload[]; errors: string[] }> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.doc')) {
    return {
      templates: [],
      errors: [
        'Legacy .doc files are not supported in the browser. Open the file in Word and Save As .docx, then upload again.',
      ],
    };
  }

  if (lower.endsWith('.docx')) {
    return parseProcessTemplatesFromDocx(await file.arrayBuffer(), file.name);
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseProcessTemplatesFromXlsx(await file.arrayBuffer(), file.name);
  }

  const text = await file.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return { templates: [], errors: ['File is empty.'] };
  }

  if (lower.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseProcessTemplatesFromJson(text);
  }

  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return parseProcessTemplatesFromText(text, file.name);
  }

  const csvResult = parseProcessTemplatesFromCsv(text, file.name);
  if (csvResult.templates.length > 0) {
    return csvResult;
  }

  const textResult = parseProcessTemplatesFromText(text, file.name);
  if (textResult.templates.length > 0) {
    return {
      templates: textResult.templates,
      errors: [...csvResult.errors, ...textResult.errors],
    };
  }

  return {
    templates: [],
    errors: csvResult.errors.length
      ? csvResult.errors
      : textResult.errors.length
        ? textResult.errors
        : ['Could not parse file. Try CSV, JSON, Excel, Word (.docx), or a text checklist with bullet tasks.'],
  };
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
Bar close,End of shift,SOP,DAILY,Restock garnishes,,MEDIUM,10
Bar close,,,,Wipe down bar top,,LOW,5
`;

export const SAMPLE_TEXT_EXPORT = `Morning line setup
- Sanitize stations
- Stock dry goods
- Check refrigeration temps

Process: Bar close
1. Restock garnishes
2. Wipe down bar top
3. Lock liquor storage
`;

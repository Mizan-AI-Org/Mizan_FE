/** Parsing the "Add people → Several" paste box: one person per line, "Name, phone, role or job title".
 *
 * A line may use separators (comma, semicolon, tab: a spreadsheet copy) or none at all
 * ("Fatima Zahra 0612345678 Serveuse"). A role code (WAITER, CHEF…) is sent as `role`; any other job title the
 * manager wrote ("Serveuse", "Chef de rang", "Plongeur", "طباخ") is sent as `title` so the backend resolves it
 * (apps/accounts/job_titles.py) and keeps it as the person's label. The name never swallows the title. */

export const ROLE_CODES = ["STAFF", "CHEF", "WAITER", "BARTENDER", "SUPERVISOR", "MANAGER", "ADMIN"];

export type PastedRow = {
  first_name: string;
  last_name: string;
  phone: string;
  /** A role code: written on the line, or the default role when the line has no title. Omitted when a title is
   * given without a code, so the backend picks the role from the title. */
  role?: string;
  /** The job title as written. */
  title?: string;
};

// Words that start or make up a job title (folded: lower case, no accents). Enough to tell "Fatima Zahra
// Serveuse" from a three-word name when the line has no separators; the backend does the real matching.
const TITLE_WORDS = new Set([
  "serveur", "serveuse", "waiter", "waitress", "server", "garcon", "runner", "commis", "sommelier", "sommeliere",
  "hote", "hotesse", "host", "hostess", "chef", "cheffe", "cuisinier", "cuisiniere", "cuisine", "cuisto", "cook",
  "patissier", "patissiere", "boulanger", "boulangere", "baker", "pizzaiolo", "grillardin", "boucher", "plongeur",
  "plongeuse", "plonge", "dishwasher", "steward", "barman", "barmaid", "bartender", "barista", "caissier",
  "caissiere", "cashier", "gerant", "gerante", "manager", "directeur", "directrice", "responsable", "superviseur",
  "superviseuse", "supervisor", "adjoint", "adjointe", "assistant", "assistante", "livreur", "livreuse", "driver",
  "chauffeur", "coursier", "agent", "gardien", "gardienne", "vigile", "securite", "magasinier", "magasiniere",
  "receptionniste", "receptionist", "reception", "accueil", "concierge", "femme", "menage", "nettoyage", "cleaner",
  "technicien", "technicienne", "maintenance", "polyvalent", "polyvalente", "equipier", "equipiere", "stagiaire",
  "apprenti", "apprentie", "intern", "comptable", "secretaire", "maitre", "capitaine", "gouvernante", "employe",
  "employee", "admin", "administrateur", "tbakh", "sarbay", "serbay", "ghassal", "rang", "partie", "salle",
  "bar", "staff", "طباخ", "طباخة", "شيف", "نادل", "نادلة", "سرباي", "كاشير", "مدير", "مديرة", "مسير", "مشرف",
  "مشرفة", "حارس", "منظف", "منظفة", "غسال", "سائق", "موصل", "حلواني", "خباز", "باريستا", "بارمان", "موظف",
  "موظفة", "عامل", "عاملة", "مساعد", "مساعدة", "رئيس", "استقبال",
]);
// Small words inside a title ("Chef de rang", "Agent d'entretien", "Maître d'hôtel").
const CONNECTORS = new Set(["de", "du", "des", "d", "la", "le", "l", "en", "of", "the", "et", "and", "&", "a"]);

const PHONE_PART = /^\+?[\d\s().-]{7,}$/;
const PHONE_IN_TEXT = /\+?\(?\d[\d\s().-]{5,}\d/;

function fold(word: string): string {
  return word.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

function isTitleWord(word: string): boolean {
  const w = fold(word);
  const base = w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w; // "Serveurs"
  return TITLE_WORDS.has(w) || TITLE_WORDS.has(base) || ROLE_CODES.includes(word.toUpperCase());
}

function isConnector(word: string): boolean {
  return CONNECTORS.has(fold(word.split(/['’]/)[0]));
}

/** A whole cell reads as a job title: its first word is a known title word ("Chef de rang", "Agent d'entretien"). */
function looksLikeTitle(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 5 && isTitleWord(words[0]);
}

/** "Fatima Zahra Chef de rang" -> name "Fatima Zahra", title "Chef de rang" (also a leading title group).
 * One name word always stays. */
export function splitNameAndTitle(text: string): { name: string; title: string } {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { name: words.join(" "), title: "" };
  // Trailing group: title words and connectors, ending on a title word.
  let start = words.length;
  for (let i = words.length - 1; i >= 1; i--) {
    if (isTitleWord(words[i])) start = i;
    else if (!(isConnector(words[i]) && start < words.length)) break;
  }
  while (start < words.length && isConnector(words[start])) start++;
  if (start < words.length) return { name: words.slice(0, start).join(" "), title: words.slice(start).join(" ") };
  // Leading group: starts on a title word ("Serveuse Fatima Zahra").
  let end = 0;
  for (let i = 0; i < words.length - 1; i++) {
    if (isTitleWord(words[i])) end = i + 1;
    else if (!(isConnector(words[i]) && end > 0)) break;
  }
  if (end > 0) return { name: words.slice(end).join(" "), title: words.slice(0, end).join(" ") };
  return { name: words.join(" "), title: "" };
}

function splitParts(text: string): string[] {
  return text.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean);
}

export function parseLines(text: string, fallbackRole: string): { rows: PastedRow[]; bad: string[] } {
  const rows: PastedRow[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = splitParts(line);
    let phone = "";
    let before: string[] = [];
    let after: string[] = [];
    const phoneAt = parts.findIndex((p) => PHONE_PART.test(p));
    if (phoneAt >= 0) {
      phone = parts[phoneAt];
      before = parts.slice(0, phoneAt);
      after = parts.slice(phoneAt + 1);
    } else {
      // The number sits inside a cell: "Fatima Zahra 0612345678 Serveuse".
      const cellAt = parts.findIndex((p) => PHONE_IN_TEXT.test(p));
      const found = cellAt >= 0 ? parts[cellAt].match(PHONE_IN_TEXT) : null;
      if (!found || found[0].replace(/\D/g, "").length < 7) {
        bad.push(line);
        continue;
      }
      phone = found[0].trim();
      const cell = parts[cellAt];
      const head = cell.slice(0, found.index).trim();
      const tail = cell.slice((found.index ?? 0) + found[0].length).trim();
      before = [...parts.slice(0, cellAt), ...(head ? [head] : [])];
      after = [...(tail ? [tail] : []), ...parts.slice(cellAt + 1)];
    }

    // A role code written as such (WAITER, CHEF) anywhere on the line is the role. "Chef" or "waiter" written as a
    // word stays a job title: the backend maps it and keeps it as the label.
    let role: string | undefined;
    const dropRole = (list: string[]) =>
      list.filter((p) => {
        if (!role && p === p.toUpperCase() && ROLE_CODES.includes(p)) {
          role = p;
          return false;
        }
        return true;
      });
    before = dropRole(before);
    after = dropRole(after);

    let name = "";
    let title = "";
    if (before.length > 0) {
      // Name before the number; whatever follows it is the title.
      title = after.join(" ");
      if (before.length > 1 && looksLikeTitle(before[before.length - 1]) && !title) {
        title = before.pop() as string;
      } else if (before.length > 1 && looksLikeTitle(before[0]) && !title) {
        title = before.shift() as string;
      }
      name = before.join(" ");
    } else if (after.length > 1) {
      // Number first: "0612345678, Fatima Zahra, Serveuse".
      name = after[0];
      title = after.slice(1).join(" ");
    } else {
      name = after.join(" ");
    }
    if (!title) {
      const split = splitNameAndTitle(name);
      name = split.name;
      title = split.title;
    }
    const words = name.split(/\s+/).filter(Boolean);
    const row: PastedRow = { first_name: words[0] || "", last_name: words.slice(1).join(" "), phone };
    if (title) row.title = title;
    if (role) row.role = role;
    else if (!title) row.role = fallbackRole.toUpperCase();
    rows.push(row);
  }
  return { rows, bad };
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The pasted rows as a CSV for the import preview (POST /staff/import/): line N+2 is rows[N]. */
export function rowsToPreviewCsv(rows: PastedRow[]): string {
  const lines = ["first_name,last_name,phone,title"];
  for (const r of rows) {
    lines.push([r.first_name, r.last_name, r.phone, r.title || r.role || ""].map(csvCell).join(","));
  }
  return lines.join("\n");
}

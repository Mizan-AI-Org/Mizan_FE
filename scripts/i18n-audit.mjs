/**
 * i18n audit: keys used in src, locale parity, and critical-namespace translation gaps.
 * Run: npm run i18n:keys (from Mizan_FE)
 */
import fs from "fs";
import path from "path";

const LOCALES = ["en", "fr", "ar"];
const locales = Object.fromEntries(
  LOCALES.map((lang) => [
    lang,
    JSON.parse(fs.readFileSync(`public/locales/${lang}.json`, "utf8")),
  ]),
);

const enKeys = new Set(Object.keys(locales.en));

const staticKeyRe = /t\(\s*["']([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)["']/gi;
const templatePrefixes = [
  "category.",
  "nav.",
  "operations_live.category.",
  "dashboard.category_tasks.pill_",
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      acc.push(fs.readFileSync(p, "utf8"));
    }
  }
  return acc;
}

const sources = walk("src");
const usedStatic = new Set();
for (const s of sources) {
  let m;
  while ((m = staticKeyRe.exec(s))) usedStatic.add(m[1]);
}

const missingEn = [...usedStatic].filter((k) => !enKeys.has(k)).sort();
const missingAr = [...enKeys].filter((k) => !locales.ar[k]).sort();
const missingFr = [...enKeys].filter((k) => !locales.fr[k]).sort();

const CRITICAL_PREFIXES = [
  "nav.",
  "widgets.",
  "command.",
  "attention.",
  "dashboard.category_tasks.",
  "ai.",
  "financials.",
  "suppliers.prices.",
  "processes_tasks.",
  "category.",
];

function untranslated(lang) {
  const out = [];
  for (const key of enKeys) {
    if (!CRITICAL_PREFIXES.some((p) => key.startsWith(p))) continue;
    const en = locales.en[key];
    const val = locales[lang][key];
    if (typeof en !== "string" || typeof val !== "string") continue;
    if (en.trim() === val.trim() && en.length > 2) out.push(key);
  }
  return out.sort();
}

console.log("=== Static t() keys missing from en.json ===", missingEn.length);
missingEn.slice(0, 30).forEach((k) => console.log(" ", k));
if (missingEn.length > 30) console.log(`  ... +${missingEn.length - 30} more`);

console.log("\n=== en keys missing ar.json ===", missingAr.length);
console.log("=== en keys missing fr.json ===", missingFr.length);

const arGap = untranslated("ar");
const frGap = untranslated("fr");
console.log("\n=== Critical keys where ar still matches en (sample) ===", arGap.length);
arGap.slice(0, 25).forEach((k) => console.log(" ", k));
console.log("\n=== Critical keys where fr still matches en (sample) ===", frGap.length);
frGap.slice(0, 15).forEach((k) => console.log(" ", k));

console.log("\n=== Template literal prefixes (ensure keys exist manually) ===");
templatePrefixes.forEach((p) => console.log(" ", p, "*"));

const ok =
  missingEn.length === 0 &&
  missingAr.length === 0 &&
  missingFr.length === 0;

console.log(ok ? "\n✓ Key parity OK for static t() usage" : "\n✗ Fix missing keys before release");
process.exit(ok ? 0 : 1);

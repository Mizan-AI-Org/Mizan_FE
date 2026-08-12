#!/usr/bin/env node
/**
 * Translation key parity checker.
 *
 * Compares en.json, fr.json, ar.json and reports:
 * - Keys present in one file but missing in another
 * - Potentially untranslated keys (FR value identical to EN for strings > 15 chars)
 *
 * Usage:
 *   node scripts/check-translations.js          # summary
 *   node scripts/check-translations.js --strict  # exits 1 on any missing key
 */
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "public", "locales");
const STRICT = process.argv.includes("--strict");

const INTENTIONALLY_SAME = new Set([
  "auth.forgot.email_placeholder",
  "billing.pending_interval_suffix",
  "staff.placeholder_email",
  "staff.placeholder_phone",
  "onboarding.roles.super_admin",
  "staff.roles.super_admin",
]);

function load(lang) {
  const raw = fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), "utf-8");
  return JSON.parse(raw);
}

const en = load("en");
const fr = load("fr");
const ar = load("ar");

const enKeys = new Set(Object.keys(en));
const frKeys = new Set(Object.keys(fr));
const arKeys = new Set(Object.keys(ar));

const missingFr = [...enKeys].filter((k) => !frKeys.has(k));
const missingAr = [...enKeys].filter((k) => !arKeys.has(k));
const missingEn = [...frKeys].filter((k) => !enKeys.has(k));

let issues = 0;

console.log(`EN keys: ${enKeys.size}`);
console.log(`FR keys: ${frKeys.size}`);
console.log(`AR keys: ${arKeys.size}`);
console.log();

if (missingFr.length) {
  issues += missingFr.length;
  console.log(`Keys in EN missing from FR (${missingFr.length}):`);
  missingFr.forEach((k) => console.log(`  ${k}`));
  console.log();
}

if (missingAr.length) {
  issues += missingAr.length;
  console.log(`Keys in EN missing from AR (${missingAr.length}):`);
  missingAr.forEach((k) => console.log(`  ${k}`));
  console.log();
}

if (missingEn.length) {
  console.log(`Keys in FR/AR but not EN (${missingEn.length}):`);
  missingEn.forEach((k) => console.log(`  ${k}`));
  console.log();
}

const potentiallyUntranslated = [...enKeys].filter((k) => {
  if (!frKeys.has(k)) return false;
  if (INTENTIONALLY_SAME.has(k)) return false;
  const enVal = en[k];
  const frVal = fr[k];
  return (
    typeof enVal === "string" &&
    typeof frVal === "string" &&
    enVal.length > 15 &&
    enVal === frVal &&
    !enVal.includes("{{") &&
    !enVal.includes("Miya") &&
    !enVal.includes("Mizan") &&
    !enVal.includes("WhatsApp") &&
    !enVal.includes("PayGuard") &&
    !enVal.includes("@") &&
    !enVal.includes("http")
  );
});

if (potentiallyUntranslated.length) {
  console.log(
    `Potentially untranslated FR keys (same as EN, >15 chars): ${potentiallyUntranslated.length}`
  );
  potentiallyUntranslated.forEach((k) =>
    console.log(`  ${k}: "${en[k].slice(0, 60)}"`)
  );
  console.log();
}

if (issues === 0) {
  console.log("All translation keys are in parity across EN, FR, and AR.");
} else {
  console.log(`${issues} missing key(s) found.`);
}

if (STRICT && issues > 0) {
  process.exit(1);
}

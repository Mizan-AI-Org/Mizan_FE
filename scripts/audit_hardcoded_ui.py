#!/usr/bin/env python3
"""Report likely hardcoded English UI strings in TSX files."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
SKIP_DIRS = {"test", "types", "lib", "utils", "services", "hooks", "contexts", "context"}
# JSX text: >Word words<
TEXT_RE = re.compile(r">([A-Za-z][A-Za-z0-9 ,.'!?\-–—/]{2,})<")
# Common props with user-visible English
PROP_RE = re.compile(
    r'\b(?:title|label|placeholder|aria-label|alt)\s*=\s*["\']([A-Za-z][^"\']{2,})["\']'
)
ALLOW = re.compile(
    r"^(Mizan|WhatsApp|Telegram|Google|Square|Toast|Lightspeed|Clover|PDF|API|PIN|OK|ID|EN|FR|AR)$",
    re.I,
)


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    if parts & SKIP_DIRS:
        return True
    if "platform-admin" in path.parts:
        return True
    return False


def scan_file(path: Path) -> list[tuple[int, str, str]]:
    text = path.read_text(encoding="utf-8")
    if "useLanguage" in text or "useTranslation" in text or 'i18n.t(' in text:
        uses_i18n = True
    else:
        uses_i18n = False

    hits: list[tuple[int, str, str]] = []
    for i, line in enumerate(text.splitlines(), 1):
        if "t(" in line or "i18n.t(" in line:
            continue
        for match in TEXT_RE.finditer(line):
            val = match.group(1).strip()
            if ALLOW.match(val) or val.startswith("{"):
                continue
            if len(val.split()) >= 2 or val[0].isupper():
                hits.append((i, "text", val))
        for match in PROP_RE.finditer(line):
            val = match.group(1).strip()
            if ALLOW.match(val):
                continue
            hits.append((i, "prop", val))

    if hits and not uses_i18n:
        return hits
    if hits:
        # Still flag obvious English in i18n-aware files
        return [(ln, kind, val) for ln, kind, val in hits if len(val.split()) >= 3]
    return []


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=40, help="Max files to print")
    args = parser.parse_args()

    findings: list[tuple[Path, list[tuple[int, str, str]]]] = []
    for path in sorted(SRC.rglob("*.tsx")):
        if should_skip(path):
            continue
        hits = scan_file(path)
        if hits:
            findings.append((path, hits))

    if not findings:
        print("No obvious hardcoded UI strings found.")
        return 0

    print(f"Found {len(findings)} file(s) with likely hardcoded English UI text:\n")
    for path, hits in findings[: args.limit]:
        rel = path.relative_to(SRC.parent)
        print(f"{rel}")
        for ln, kind, val in hits[:6]:
            print(f"  L{ln} [{kind}] {val[:80]}")
        if len(hits) > 6:
            print(f"  ... +{len(hits) - 6} more")
        print()

    if len(findings) > args.limit:
        print(f"... and {len(findings) - args.limit} more files")

    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Ensure en/fr/ar locale files expose the same translation keys."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "locales"
LANGS = ("en", "fr", "ar")


def load(lang: str) -> dict[str, str]:
    path = ROOT / f"{lang}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def save(lang: str, data: dict[str, str]) -> None:
    path = ROOT / f"{lang}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify or repair locale key parity.")
    parser.add_argument(
        "--fill-from-en",
        action="store_true",
        help="Add keys missing in fr/ar using English text (temporary fallback).",
    )
    args = parser.parse_args()

    locales = {lang: load(lang) for lang in LANGS}
    en_keys = set(locales["en"].keys())
    exit_code = 0

    for lang in ("fr", "ar"):
        lang_keys = set(locales[lang].keys())
        missing = sorted(en_keys - lang_keys)
        extra = sorted(lang_keys - en_keys)

        if missing:
            exit_code = 1
            print(f"{lang}: missing {len(missing)} key(s) vs en")
            for key in missing[:20]:
                print(f"  - {key}")
            if len(missing) > 20:
                print(f"  ... and {len(missing) - 20} more")

            if args.fill_from_en:
                for key in missing:
                    locales[lang][key] = locales["en"][key]
                save(lang, locales[lang])
                print(f"{lang}: filled {len(missing)} key(s) from en")

        if extra:
            exit_code = 1
            print(f"{lang}: {len(extra)} extra key(s) not in en (first 5): {extra[:5]}")

    if exit_code == 0:
        print(f"OK: {len(en_keys)} keys aligned across en/fr/ar")
    elif not args.fill_from_en:
        print("\nRun: python3 scripts/sync_os_i18n.py && npm run i18n:check")
        print("Or:  python3 scripts/ensure_i18n_parity.py --fill-from-en")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())

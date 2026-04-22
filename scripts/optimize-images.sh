#!/usr/bin/env bash
#
# optimize-images.sh — convert every PNG / JPG in public/ to high-quality WebP.
#
# Requires `cwebp` (install: `brew install webp` on macOS, `apt-get install
# webp` on Ubuntu). Safe to re-run: files whose .webp is newer than the
# source are skipped.
#
# Usage (from repo root or anywhere):
#     ./scripts/optimize-images.sh                # process public/
#     ./scripts/optimize-images.sh path/to/dir    # process a custom directory
#     KEEP_ORIGINALS=1 ./scripts/optimize-images.sh   # don't delete sources
#     QUALITY=88 ./scripts/optimize-images.sh     # override default 82
#
# Defaults are tuned for photographic content (hero images, avatars). For
# crisp UI screenshots you may want QUALITY=90.
set -euo pipefail

DIR="${1:-public}"
QUALITY="${QUALITY:-82}"
AVATAR_QUALITY="${AVATAR_QUALITY:-88}"
KEEP_ORIGINALS="${KEEP_ORIGINALS:-0}"

if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp not found. Install with: brew install webp  (or apt install webp)" >&2
  exit 1
fi

if [ ! -d "$DIR" ]; then
  echo "Directory not found: $DIR" >&2
  exit 1
fi

total_before=0
total_after=0

shopt -s nullglob nocaseglob
for src in "$DIR"/*.png "$DIR"/*.jpg "$DIR"/*.jpeg; do
  [ -f "$src" ] || continue

  base="${src%.*}"
  dst="${base}.webp"

  # Skip if WebP is already fresher than source.
  if [ -f "$dst" ] && [ "$dst" -nt "$src" ]; then
    continue
  fi

  # Pick a quality: avatar-style square images get a higher setting.
  fname="$(basename "$src")"
  q="$QUALITY"
  case "$fname" in
    *avatar*|*logo*|*icon*) q="$AVATAR_QUALITY" ;;
  esac

  cwebp -q "$q" -m 6 -mt -quiet "$src" -o "$dst"

  before=$(stat -f%z "$src" 2>/dev/null || stat -c%s "$src")
  after=$(stat -f%z "$dst" 2>/dev/null || stat -c%s "$dst")
  saved=$(( 100 * (before - after) / before ))
  total_before=$(( total_before + before ))
  total_after=$(( total_after + after ))
  printf "  %-45s %8d -> %7d bytes (-%d%%)\n" "$fname" "$before" "$after" "$saved"

  if [ "$KEEP_ORIGINALS" != "1" ]; then
    rm -- "$src"
  fi
done

if [ "$total_before" -gt 0 ]; then
  saved=$(( 100 * (total_before - total_after) / total_before ))
  echo
  printf "Total: %d -> %d bytes (-%d%%)\n" "$total_before" "$total_after" "$saved"
else
  echo "No images to process in $DIR."
fi

#!/usr/bin/env bash
# Build an LG webOS .ipk from the parent web app.
#
# Reuses index.html / app.js / styles.css / sw.js / icon.svg / manifest.webmanifest
# from the project root. webOS-specific config lives in this directory only.
#
# Requirements:
#   - ares-cli  (npm i -g @webosose/ares-cli)
#   - magick or convert  (ImageMagick, for SVG → PNG icon generation)

set -euo pipefail

WEBOS_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$WEBOS_DIR/.." && pwd)"
STAGING="$WEBOS_DIR/staging"

if ! command -v ares-package >/dev/null; then
  echo "error: ares-package not found. Install with: npm i -g @webosose/ares-cli" >&2
  exit 1
fi

# Pick an SVG-to-PNG converter.
svg2png() {
  local src=$1 dst=$2 size=$3
  if command -v magick >/dev/null; then
    magick -background none -size "${size}x${size}" "$src" "$dst"
  elif command -v convert >/dev/null; then
    convert -background none -size "${size}x${size}" "$src" "$dst"
  elif command -v rsvg-convert >/dev/null; then
    rsvg-convert -w "$size" -h "$size" "$src" -o "$dst"
  else
    echo "error: no SVG converter found (need magick, convert, or rsvg-convert)" >&2
    exit 1
  fi
}

echo "→ generating PNG icons from icon.svg"
svg2png "$ROOT_DIR/icon.svg" "$WEBOS_DIR/icon.png" 160
svg2png "$ROOT_DIR/icon.svg" "$WEBOS_DIR/largeIcon.png" 320

echo "→ staging app files"
rm -rf "$STAGING"
mkdir -p "$STAGING"
cp "$ROOT_DIR/index.html" \
   "$ROOT_DIR/app.js" \
   "$ROOT_DIR/styles.css" \
   "$ROOT_DIR/sw.js" \
   "$ROOT_DIR/icon.svg" \
   "$ROOT_DIR/manifest.webmanifest" \
   "$STAGING/"
cp "$WEBOS_DIR/appinfo.json" \
   "$WEBOS_DIR/icon.png" \
   "$WEBOS_DIR/largeIcon.png" \
   "$STAGING/"

echo "→ packaging .ipk"
ares-package --no-minify -o "$WEBOS_DIR" "$STAGING"

echo "✓ done"
ls -1 "$WEBOS_DIR"/*.ipk

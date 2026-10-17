#!/usr/bin/env bash
# Copy the gitignored show art (tools/fetch-art.sh) to the web server.
# The rest of the site deploys with `git pull` on the host; these files never
# go through git because they're copyrighted.
#
# Usage: tools/push-art.sh     (WEB_HOST / WEB_DIR override the defaults)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_HOST=${WEB_HOST:-utilities}
WEB_DIR=${WEB_DIR:-/root/projects/childKeyboard/site}

[ -d "$ROOT_DIR/assets/chars" ] || { echo "error: no assets/chars — run tools/fetch-art.sh first" >&2; exit 1; }

ssh "$WEB_HOST" "mkdir -p '$WEB_DIR/assets'"
scp -rq "$ROOT_DIR/assets/chars" "$ROOT_DIR/assets/backgrounds" "$WEB_HOST:$WEB_DIR/assets/"
echo "✓ copied $(find "$ROOT_DIR/assets" -name '*.webp' | wc -l) images to $WEB_HOST:$WEB_DIR/assets/"

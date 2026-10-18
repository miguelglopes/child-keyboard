#!/usr/bin/env bash
# Pre-generate voice clips for everything the app says (letters + words, quest
# words, digits, level-up, test phrase) with Microsoft's neural voices
# (pt-PT Raquel, en-US Ava) through edge-tts:
#   assets/voice/<lang>/*.mp3    one clip per phrase (~10 KB each)
#   assets/voice/index.json      {lang: {text: clip}} — say() plays a clip when
#                                the exact text has one, else device TTS
#
# Device TTS is poor on Linux (Chrome's only Portuguese voice is Brazilian;
# espeak/Piper read "L." as fifty). Clips are gitignored like the show art:
# run this after changing words, then tools/push-art.sh copies them to the web
# server; webos/build.sh bundles them into the .ipk.
#
# Needs node and uv (edge-tts runs in a throwaway uv environment).
#
# Usage: tools/fetch-voice.sh [--force]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
command -v uv >/dev/null || { echo "error: uv is required (https://docs.astral.sh/uv/)" >&2; exit 1; }

node "$ROOT_DIR/tools/voice/phrases.mjs" |
  uv run --quiet --no-project --with edge-tts python "$ROOT_DIR/tools/voice/generate.py" "$ROOT_DIR/assets/voice" "$@"

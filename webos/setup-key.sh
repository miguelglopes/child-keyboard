#!/usr/bin/env bash
# One-time: create an unencrypted SSH key for the dev TV.
#
# System SSH can't prompt for the passphrase stored in
# ~/.webos/ose/novacom-devices.json, so we derive an unencrypted copy at
# ~/.ssh/lgtv_dev (or $TV_KEY) that install.sh / setup-key.sh can use.

set -euo pipefail

DEST="${TV_KEY:-$HOME/.ssh/lgtv_dev}"

if [[ -f "$DEST" ]]; then
  echo "Key already exists at $DEST. Remove it first to regenerate."
  exit 0
fi

DEVICES_JSON="$HOME/.webos/ose/novacom-devices.json"
if [[ ! -f "$DEVICES_JSON" ]]; then
  echo "error: $DEVICES_JSON not found." >&2
  echo "Register the TV with ares-setup-device first." >&2
  exit 1
fi

read -r KEY_NAME PASSPHRASE < <(python3 -c "
import json
d = json.load(open('$DEVICES_JSON'))
dev = next((x for x in d if x.get('default')), d[0])
print(dev['privateKey']['openSsh'], dev['passphrase'])
")

SOURCE_KEY="$HOME/.ssh/$KEY_NAME"
if [[ ! -f "$SOURCE_KEY" ]]; then
  echo "error: source key $SOURCE_KEY not found" >&2
  exit 1
fi

cp "$SOURCE_KEY" "$DEST"
chmod 600 "$DEST"
ssh-keygen -p -P "$PASSPHRASE" -N '' -f "$DEST" >/dev/null
echo "✓ created unencrypted dev key at $DEST"

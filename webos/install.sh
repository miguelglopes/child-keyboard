#!/usr/bin/env bash
# Push the .ipk to the dev TV and install + launch it.
#
# ares-cli's bundled ssh2 library can't talk to the TV's ancient OpenSSH 6.1
# (host-key algo and SHA-1 signature mismatch with modern OpenSSL). We avoid
# ares-install entirely: scp the .ipk to the TV, then call the Luna IPC
# appInstallService directly over a system SSH that's configured to accept
# the legacy crypto.
#
# Prereqs:
#   - ./webos/build.sh has been run (or pass --build to rebuild)
#   - ~/.ssh/lgtv_dev is an unencrypted copy of the dev key (see IPTV repo's
#     scripts/setup-key for how it's derived from ~/.webos/ose/novacom-devices.json)

set -euo pipefail

: "${TV_HOST:=192.163.2.153}"
: "${TV_PORT:=9922}"
: "${TV_USER:=prisoner}"
: "${TV_KEY:=$HOME/.ssh/lgtv_dev}"
: "${APP_ID:=com.mgl.funkeyboard}"

WEBOS_DIR="$(cd "$(dirname "$0")" && pwd)"
TV_TMP="/media/developer/temp"

if [[ "${1:-}" == "--build" ]]; then
  "$WEBOS_DIR/build.sh"
fi

IPK=$(ls -t "$WEBOS_DIR"/*.ipk 2>/dev/null | head -1 || true)
if [[ -z "$IPK" ]]; then
  echo "error: no .ipk in $WEBOS_DIR — run ./webos/build.sh first (or pass --build)" >&2
  exit 1
fi

if [[ ! -f "$TV_KEY" ]]; then
  echo "error: $TV_KEY not found. See pessoal/iptv repo scripts/setup-key." >&2
  exit 1
fi

export OPENSSL_ENABLE_SHA1_SIGNATURES=1
SSH_OPTS=(
  -o HostKeyAlgorithms=+ssh-rsa
  -o PubkeyAcceptedAlgorithms=+ssh-rsa
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o LogLevel=ERROR
  -i "$TV_KEY"
)

IPK_NAME=$(basename "$IPK")
REMOTE_IPK="$TV_TMP/$IPK_NAME"

echo "→ scp $IPK_NAME → TV"
scp "${SSH_OPTS[@]}" -P "$TV_PORT" -q "$IPK" "$TV_USER@$TV_HOST:$REMOTE_IPK"

echo "→ install + launch $APP_ID"
ssh -tt "${SSH_OPTS[@]}" -p "$TV_PORT" "$TV_USER@$TV_HOST" "
  /usr/bin/luna-send-pub -i -w 30000 \
    'luna://com.webos.appInstallService/dev/install' \
    '{\"id\":\"$APP_ID\",\"ipkUrl\":\"$REMOTE_IPK\",\"subscribe\":true}' 2>&1 | \
  while IFS= read -r line; do
    case \"\$line\" in
      *'\"state\":\"installed\"'*) echo INSTALLED; pkill -P \$\$ luna-send-pub 2>/dev/null; break ;;
      *FAILED*|*failed*) echo \"\$line\" >&2; exit 1 ;;
    esac
  done
  /usr/bin/luna-send-pub -n 1 \
    'luna://com.webos.applicationManager/launch' \
    '{\"id\":\"$APP_ID\"}' >/dev/null
" 2>&1 | tr -d '\r'

echo "✓ deployed $APP_ID"

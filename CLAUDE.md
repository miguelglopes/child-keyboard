# child-keyboard

Vanilla HTML/CSS/JS kid-friendly keyboard playground. No build step for the desktop/PWA target. See [README.md](README.md) for product details.

## Targets

Two deployment targets share the **same source files** at the project root:

| Target  | How it runs                                        |
|---------|----------------------------------------------------|
| Desktop / PWA | Open `index.html` or serve over HTTP (port 8765 is the dev server) |
| LG webOS | Packaged into `.ipk` from the `webos/` directory   |

`app.js` does runtime platform detection via `const isWebOS = !!window.PalmSystem || /web0s|webos/i.test(navigator.userAgent);` and uses it to skip the kiosk/keyboard-lock listeners (already-fullscreen on TV, no Esc key). Everything else is shared. **Do not duplicate source files between targets.**

## webOS deploy flow

```bash
./webos/setup-key.sh        # one-time: create ~/.ssh/lgtv_dev (unencrypted dev key)
./webos/build.sh            # produces webos/com.mgl.funkeyboard_<ver>_all.ipk
./webos/install.sh          # scp + install + launch on TV
./webos/install.sh --build  # rebuild .ipk first, then install
```

Default TV: `192.163.2.153` (override with `TV_HOST=…`). App id: `com.mgl.funkeyboard`. The TV must already be registered with `ares-setup-device` so `~/.webos/ose/novacom-devices.json` has its passphrase + key reference.

### Why `install.sh` instead of `ares-install`

The dev TV runs ancient OpenSSH 6.1 — only offers `ssh-rsa` host keys and SHA-1 signatures. Modern OpenSSL (Fedora 43 / OpenSSH 10) rejects both by default, and ares-cli's bundled `ssh2-streams` can't negotiate the handshake (`signature verification failed`). System `ssh` fails with `error in libcrypto` until you:

- `export OPENSSL_ENABLE_SHA1_SIGNATURES=1` (env var, no system-wide change)
- Pass `-o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa`
- Use an unencrypted key (system SSH can't read the ares passphrase)

`install.sh` does all of that, then `scp`s the `.ipk` to `/media/developer/temp/` and invokes Luna IPC `appInstallService/dev/install` + `applicationManager/launch` over SSH.

### Useful one-liners

```bash
# Tail TV system log
ssh -p 9922 -i ~/.ssh/lgtv_dev \
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  prisoner@192.163.2.153 "tail -f /var/log/messages"

# Close the app
ssh ... prisoner@192.163.2.153 \
  "/usr/bin/luna-send-pub -n 1 'luna://com.webos.applicationManager/dev/closeByAppId' '{\"id\":\"com.mgl.funkeyboard\"}'"
```

## Principles

- Don't add gating/hiding code for behavior that's merely inert on a new platform — only gate code that would actively break.
- Keep webOS-specific config and scripts under `webos/`; the root stays pure web.

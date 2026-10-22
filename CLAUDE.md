# child-keyboard

Vanilla HTML/CSS/JS kid-friendly keyboard playground. No build step for the desktop/PWA target. See [README.md](README.md) for product details.

## Targets

Two deployment targets share the **same source files** at the project root:

| Target  | How it runs                                        |
|---------|----------------------------------------------------|
| Desktop / PWA | Open `index.html` or serve over HTTP (port 8765 is the dev server) |
| LG webOS | Packaged into `.ipk` from the `webos/` directory   |

`app.js` does runtime platform detection via `const isWebOS = !!window.PalmSystem || /web0s|webos/i.test(navigator.userAgent);` and uses it to skip the kiosk/keyboard-lock listeners (already-fullscreen on TV, no Esc key). Everything else is shared. **Do not duplicate source files between targets.**

## Character art (kids'-show themes)

The Patrulha Pata / Masha / Academia Unicórnio / Panda e os Caricas / Mickey themes use official character images and a still from each show as the background. They're copyrighted and the repo is public, so `assets/chars/` and `assets/backgrounds/` are **gitignored** — never commit them. Prefer existing official art over drawing our own (hand-drawn scenery was rejected).

```bash
tools/fetch-art.sh          # download from Fandom wikis → assets/chars/<theme>/<id>.webp (160px)
                            #   + assets/backgrounds/<theme>.webp (1280×720, pre-darkened)
tools/push-art.sh           # scp them to the web server (the rest deploys via git pull)
```

`webos/build.sh` bundles `assets/` into the `.ipk` when present. A missing character image falls back to the emoji in `CHAR_FALLBACK` (`app.js`); a missing background leaves the theme colour.

## Voice clips

Device speech synthesis is poor or missing on some platforms (Linux Chrome's only Portuguese voice is Brazilian; espeak/Piper read "L." as fifty), so everything `say()` speaks is pre-generated with Microsoft's neural voices (pt-PT Raquel, en-US Ava) through edge-tts. `say()` plays the clip for the exact text and falls back to `speechSynthesis` when there's none. Clips are gitignored like the art.

```bash
tools/fetch-voice.sh        # node lists every phrase from app.js's tables → assets/voice/<lang>/*.mp3
                            #   + assets/voice/index.json; only new/changed phrases are synthesized
tools/push-art.sh           # also copies assets/voice/ to the web server
```

Re-run both after adding or changing letters, words or spoken phrases. Letter names are spelled out for the TTS (`L. Leão` is synthesized as "Éle. Leão") — see `LETTER_NAMES` in `tools/voice/phrases.mjs`.

## webOS deploy flow

```bash
./webos/setup-key.sh        # one-time: create ~/.ssh/lgtv_dev (unencrypted dev key)
./webos/build.sh            # produces webos/com.mgl.funkeyboard_<ver>_all.ipk
./webos/install.sh          # scp + install + launch on TV
./webos/install.sh --build  # rebuild .ipk first, then install
```

Default TV: `192.168.1.80` (override with `TV_HOST=…`). If it's asleep, `install.sh` wakes it with Wake-on-LAN (`TV_MAC`, default `d4:8d:26:cf:53:a6`) and waits for dev SSH. App id: `com.mgl.funkeyboard`. The TV must already be registered with `ares-setup-device` so `~/.webos/ose/novacom-devices.json` has its passphrase + key reference.

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
  prisoner@192.168.1.80 "tail -f /var/log/messages"

# Close the app
ssh ... prisoner@192.168.1.80 \
  "/usr/bin/luna-send-pub -n 1 'luna://com.webos.applicationManager/dev/closeByAppId' '{\"id\":\"com.mgl.funkeyboard\"}'"
```

## Principles

- Don't add gating/hiding code for behavior that's merely inert on a new platform — only gate code that would actively break.
- Keep webOS-specific config and scripts under `webos/`; the root stays pure web.

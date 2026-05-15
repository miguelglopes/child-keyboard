# Child Keyboard

A safe, fullscreen keyboard playground for kids — baby up to about age 10. One unified experience: every keypress fires playful animations and sounds (great for a 1-year-old), while a faint word-in-progress and a math equation hover in the corners (older kids notice them and play along).

Inspired by [tinyfingers.net](https://tinyfingers.net/), with more depth so it grows with the child.

## How it works

- **Press any key** → a big letter/number appears with an animal/object that starts with that letter, voice says it, sound plays.
- **Word quest (top)** — a word like `GIRAFA` shows up, the next letter pulses. Press it → it lights up green. Complete the word → big celebration. Wrong key still fires a happy spawn.
- **Math quest (bottom)** — an equation like `3 + 2 = ?` shows up. Press the right digit → celebration. Wrong digit → soft "try again" sound.
- **Touch / click** — works the same as keys (random letter on tap).
- **Counter** — total key smashes, bottom-right corner.

## Parent gate

Hold the **top-left corner for 3 seconds**, then **press the prompted number key** to open settings. (Or: `Ctrl+Alt+S` shortcut.)

Settings:
- Language: English / Português
- Theme: Rainbow, Space, Ocean, Jungle
- Sound / Voice / Show quests / Reduce motion toggles
- Word difficulty: 1–3
- Math difficulty: 0 (1+1) → 4 (×, ÷)
- Fullscreen, Reset counter

## Running

No build step, no dependencies. Just open `index.html` in a browser.

For PWA features (service worker, install-to-home-screen), serve it over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Themes, animations, layout |
| `app.js` | All logic — input, spawns, voice, sound, quests, settings, parent gate |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Offline cache |
| `icon.svg` | App icon |

## Locking down for kids

On the first key or tap, the app enters fullscreen and calls the [Keyboard Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/lock) to capture keys that would normally exit. The kid can keysmash all they want without escaping.

**What this blocks (on Chromium: Chrome, Edge, Vivaldi, Brave):**
- Esc, F11, F12 — fire as `keydown` events but don't exit fullscreen.
- Alt+Tab, ⊞ Win / ⌘ Cmd, browser shortcuts — captured by the page, the OS doesn't act on them.

**Ways out** (for the parent):
- **Hold Esc for 1.5 seconds** — exits cleanly and stays out (won't re-enter on the next keypress).
- **Parent gate** — hold the top-left corner for 3 seconds, press the prompted number, then toggle the Fullscreen button in settings.

**What it doesn't block:**
- Firefox / Safari — no Keyboard Lock support. The app still enters fullscreen and re-enters on the next user gesture if the kid manages to escape, but keys aren't captured. Use OS-level lock-down here.
- The device's hardware Home/Power buttons.

**OS-level lock-down (recommended for tablets):**
- **iOS / iPadOS** — Guided Access (Settings → Accessibility → Guided Access).
- **Android** — Screen pinning (Settings → Security → Screen pinning).
- **Desktop** — install as a PWA; OS kiosk mode varies.

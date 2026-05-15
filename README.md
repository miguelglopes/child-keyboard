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

The app does what it can from inside the browser, but webpages can't fully kiosk a device — for that, use OS-level tools.

**What the app handles:**
- Swallows all keypresses inside the page so Tab, function keys, and most shortcuts do nothing.
- If the tab loses visibility or the app leaves fullscreen, it pauses (sound stops, animations freeze) and shows a "Tap to continue" overlay. A parent tap resumes and re-enters fullscreen.
- Kid keysmashing while paused does nothing — only a deliberate tap resumes.

**What the browser won't let us block** (and how to handle it):
- ⊞ Win / ⌘ Cmd keys, Alt+Tab, OS-level gestures — these never reach the page.
- Fullscreen exit via Esc / F11 — we detect it and pause, but can't prevent it.
- For real lock-down:
  - **iOS / iPadOS** — Guided Access (Settings → Accessibility → Guided Access).
  - **Android** — Screen pinning (Settings → Security → Screen pinning).
  - **Desktop** — install as a PWA + use OS kiosk mode (varies by OS).

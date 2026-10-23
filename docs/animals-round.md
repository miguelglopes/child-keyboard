# Animals round — "Os animais fugiram!"

A short interlude between words. Big animals peek out of hiding, and you
catch them onto a train. It has to work for every age **at the same time**:
a 1-year-old smashing keys, a 3-year-old who knows a few letters, a 5–7
reader, and a bored 8–10 year old, often siblings on one device. It runs on
the kiosk laptop's keyboard, a touch tablet, and the LG TV with its Magic
Remote. The design was iterated with two reviewers until both signed off.
This file records what was decided and why.

The code is in the `ANIMALS ROUND` section of `app.js`; the tables `ANIMALS`
and `GOLDEN` sit above `WORD_MAX_LEVEL` so `tools/voice/phrases.mjs` can read
them.

## One rule set, no age detection

Guessing who is playing breaks with siblings: a baby smashing would flip the
rules and wipe out the older child's challenge. So there's one rule for
everyone:

**Wrong inputs lure, the right one catches.**

- Any key, or a tap anywhere, makes the big animal hop one step toward the
  train. Hops are limited to one per 450 ms (`ANIMAL_HOP_GAP_MS`). Smashing
  still gets a catch about every 3.6 s, and every key still spawns and plays
  its note.
- After 8 hops it jumps in by itself.
- At hop 4 its letter badge grows and pulses, and the voice says the letter
  once ("Éle!").
- Its letter (a real keypress) or a tap/click/OK on the animal catches it
  **instantly**. That gets a bigger reward: sparkle, ding-ding, a glowing
  wagon.
- Every catch says "L. Leão". The letter and the animal are heard together
  every time.
- Held-key repeats and synthetic keys (tappable letters, rain) don't hop.
  Animals never react to hover, so a waving remote catches nothing.
- One letter can serve both targets: the big animal's badge and the golden
  name's next letter. Neither sibling's right answer is taken by the other.
- Uncaught animals never leave. There are no lives and no fail sounds.

For a 3-year-old, the right letter is clearly the faster and better path,
but smashing always works.

## The golden animal (readers, 8–10)

- One per train. It appears after that train's first catch, top centre, with
  no letter badge. Its picture has a name a PT-PT 9-year-old would give
  (🦛 Hipopótamo, 🦘 Canguru…; no 🐊 crocodilo/jacaré).
- It waits 12 s to be noticed. After 5 s the first letter shows faintly, as
  a hint and to teach how it works. If nobody starts, it winks and goes.
- **Keyboard:** typing its first letter starts an attempt. Letters fill the
  name slots.
- **Touch / TV:** tapping it opens a bank of big shuffled tiles: the missing
  letters plus `2 + len/3` confusable decoys (K/Q for C, Z for S, U for O…).
  There's no next-letter highlight. Pointer devices only get names of up to
  8 letters.
- Each correct letter refills a per-letter clock: 4 s on keyboard, 6 s with
  tiles.
  - **Keyboard:** wrong keys cost nothing. On a shared keyboard they can't be
    told apart from a sibling's smashing.
  - **Tiles:** a wrong tile shakes and costs 1 s, at most once a second, so a
    toddler tapping tiles can't empty the clock.
  - Progress never resets. Each attempt is capped at 30 s.
- ⭐ is only awarded when it's sure who spelled it: no wrong tile and no
  burst of 5 keys within a second.
- A full train **waits at the station until its golden animal is caught or
  gone**, so a fast reader still gets the whole notice window. While it
  waits, the train toots and wiggles on any input.

## Lifecycle

A round lasts **two trains, or 60 s**, and always ends at a departure.

1. **At the deadline:** no new train or golden animal. An unengaged golden
   animal leaves, the empty wagons fill one per 600 ms, and the train waits
   for a golden attempt already under way. The upper bound is about 95 s.
   - Rescued animals aren't the child's catches: no stats, no collection,
     no voice.
   - A train with no catches yet just rolls away. A train only counts in the
     stats if something on it was really caught.
2. **During a round:**
   - The word and math quests are hidden, not reset.
   - Rain is off, and the bubbles are removed without popping them.
   - Every key goes to the round. Keys can't reach the quests, the auto
     theme switch, or typed theme names.
3. **Closing:**
   - The quests reappear exactly as they were.
   - A word-win start deals the next word now.
   - The collection card shows for 4 s, or until the next input.
   - Auto theme switching then waits at least 30 s, so the first key
     doesn't swap the theme (and the word) under the card.
4. **Forced close (no card):** any `applyTheme` (a pick or a settings
   change), opening settings, or turning quests off.

## How a round starts

All starts go through `requestAnimals()`, which owns a pending start (with a
token) and re-checks eligibility when it fires. A round needs quests on,
settings closed, no ADIVINHA round, and no other pending or active round.

- **Word win:** the existing 60% bonus roll alternates between ADIVINHA and
  animals, with a 3 min cooldown between animals rounds. There's no roll at
  all while ADIVINHA is on. If animals is
  picked, the next word isn't dealt until the round closes, so a fresh word
  is never swapped out under the child.
- **Typing `COMBOIO` / `ANIMAIS` / `TRAIN` / `ANIMALS`:**
  - Only real keypresses count, and it ignores the cooldown.
  - It doesn't fire if its last letter advanced a quest, or if it's the
    answer to the quest on screen. COMBOIO typed as a quest answer stays an
    answer.
  - The child's word in progress survives the round.
- **Invitation:** for children who rarely finish words.
  - It appears after 4 min of play with no round, at least 40 real
    keypresses or stage taps, and the cooldown over.
  - A 🚂 button waits on the left of the middle band for 20 s.
  - Tapping it, OK, or Enter starts a round. It never starts anything by
    itself.

## Platform notes

- Round buttons act on `pointerdown` and on `click`.
  - One press can arrive as several events (pointerdown, click, and the
    TV's Enter). After an activation, its companions are swallowed for
    400 ms within 30 px of that spot, even once the button is gone (a used
    tile, a caught animal). They don't land on the stage as a lure.
  - There's no `stopPropagation`, because `ensureKiosk()` must still see the
    tap.
- **webOS:** the remote's OK can arrive as Enter. The last pointer position
  is tracked, and Enter over a round button activates it. This runs on webOS
  only; on a desktop, Enter with the mouse resting on the animal is just a
  lure. **Still to verify on the real TV:** OK's exact event sequence and
  the golden-animal timings.
- **Reduce effects (TV default):** hops are translate-only, with no glows or
  filters.
- **Voice:** catch and start lines are priority lines. Every `say()` that
  arrives while one plays is dropped, with no queue. The lock releases on
  the clip's `ended` event, with a 4.5 s fallback (the longest catch line
  runs 3.9 s). Forced lines (Test voice) ignore the lock, and a forced close
  releases it so a theme pick's name is spoken. Lure keys are silent, so the hint is never cut off. The
  departure has no voice line, only toot and fanfare.

## Content and stats

- `ANIMALS`:
  - A `base` pool, plus `ocean`, `jungle` and `space` (👽, topped up with
    base).
  - Words match the letter tables, so most catch lines reuse existing clips.
  - The letter is the word's normalized first letter. Letters with no animal
    are never targets.
- Stats: Catches, Trains and Golden (today and all-time), plus the
  collection (distinct animals, golden count, and a grid of every animal
  caught) in the parent dialog.
- The collection is saved per device in `ck-animals-seen`, per theme. It's a
  shared family collection, not a skill level. "Reiniciar contador" clears
  it along with the stats.
- After changing `ANIMALS` or `GOLDEN`, run `tools/fetch-voice.sh`.

## Deferred

Real animal sounds (free-to-use CC0 recordings on their own audio path),
show characters as rare catches, counting trains, "Quem começa por…?", a
kid-openable album, and a pickable endless mode.

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
- Its letter (a real keypress) catches it **instantly**. That gets a bigger
  reward: sparkle, ding-ding, a glowing wagon. Every animal is a shadow
  (below), so the finger's instant catch is tracing it: a tap on it is a
  piece, or lights the dots under it. Only the plain fallback animal (no
  outline, or no room for one) is still caught by a tap/click/OK on it.
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

## The shadow animal (drawing)

Drawing is a favourite on touch, so every animal escapes as a
**shadow**: a big dotted outline of the animal. Tracing it catches it, and
the drawing stays in the picture as an ink creature, face and all, like a
drawn loop. Nobody is made to draw: the
round's rule still holds, so a keyboard child catches it like any other
animal.

### Which one, and where

- **Every animal.** It's still caught the way animals always were (its
  letter at once, 8 lures otherwise), so a keyboard child plays the round as
  before; tracing is the extra, quick finger way. No animal spawns at or
  after the deadline, so neither does a shadow.
  - A plain hiding animal takes its place only where there's no outline for
    it (below) or no room (a phone on its side).
  - Each animal is picked at spawn, avoiding the golden name's initial (and
    the golden pick avoids the animal out), so catching it by its letter
    can't start a golden attempt by accident.
- **Where it sits:** in the space between the golden column and the train.
  - The golden column's space is reserved at its tallest, because the tile
    bank can open after the shadow is out. That height is the animal, slots,
    clock and tile rows for the current golden name, or the longest
    tile-able name when there's none yet. The rows are computed from the
    bank width and tile size, so portrait gets its second row.
  - It starts below that space with a gap of at least the hit radius plus a
    margin, so a finger tracing the top edge can't land on a tile. It ends
    a gap above the train's measured top.
  - Its height is at most 36vh (less if the space is shorter), and its width
    is capped at 80vw.
  - Across the field it goes to the spot, of a few (centre, then quarters,
    then eighths), that covers the fewest creatures earlier shadows left, the
    first one on a tie, so they stay side by side. Where every spot covers
    one (portrait), that's the centre. It's kept on screen with room on the
    right for its badge, which is centred on the outline's right edge. A creature counts as clear when the new outline's box
    covers at most 15% of it: the face, in its middle, stays visible and
    tappable.
  - Dot positions are cached in px and recomputed on resize or rotation.
- **What it looks like:**
  - 48 dots in one SVG group: plain fills, no filters, no per-dot shadows.
  - The picture shows faintly inside, so the child knows who it is. It's
    sized and placed from the extractor's cropped glyph box, so it lines up
    with the dots and doesn't jump when it fills in.
  - The usual letter badge sits at the top right. There's no hiding spot.
  - The whole shadow (dots, picture, badge) is `pointer-events: none`. It is
    **not** a round button, so a tap, a click or the remote's OK on it never
    catches it.

### Where the outline comes from

Nobody draws it. Each animal's outline is computed when it spawns (cached,
so only an icon's first spawn pays for it). The steps:

1. The emoji is drawn on a 96px offscreen canvas.
2. The canvas is thickened by stamping the glyph at 12 small offsets, so
   legs and tails aren't fiddly. No `ctx.filter`.
3. The edge of the largest blob is followed and resampled to 48 evenly
   spaced points.
4. The points are ordered clockwise from the topmost point. That's the order
   the pieces draw in.

About 1.5 ms per animal on a desktop. Results are cached per icon, failures
included.

**Rejected outlines:**
- The glyph renders as tofu: its mask matches a render of a code point that
  surely has no glyph, or the area inside the followed edge fills more than
  92% of its bounding box. Measuring the edge catches a hollow box or a hex
  box too.
- It's too small (its longest side under half the canvas), or it has fewer
  than 12 edge pixels.

A rejected animal is swapped for another from the pool, up to 3 tries.
After that the train gets a plain animal. Every icon reachable through the
pools (all themes and languages) is checked in the browser. The round's icons are all emoji,
and each device draws its own emoji, so a shipped, precomputed outline
wouldn't match the picture on screen.

### Progress: one set of lit dots

The shadow keeps one set of lit dots, and separately the dots a finger has
been on. A finger's dots count even where a piece lit them first, so a
sibling's keys can't take the drawing away; those dots get a white ring.

- **Its letter** (a real keypress): the instant catch, with the bigger
  reward. A key that is also the golden name's next letter does both, as
  today.
- **Any other real key, or a stage tap:** a **piece**. It lights the next 6
  *unlit* dots in outline order, with the same 450 ms gap as a hop.
  - Like hops, held-key repeats and synthetic keys don't draw pieces. Nor
    does a golden name's next letter.
  - At piece 4 the badge grows and the letter is said.
  - 48 dots / 6 = 8 pieces, so 8 lures always complete it. That's the
    3.6 s-while-smashing guarantee.
- **Tracing** (finger, mouse, the Magic Remote with OK held):
  - Every pressed pointer is hit-tested on its raw positions, coalesced
    events included. That works even where ink stops drawing: no free
    finger slot, the point budget spent, or a stroke frozen at 600 points.
  - A dot within 5vmin of a pointer lights up and counts as the finger's, in
    any order, over any number
    of strokes. The test covers the pointerdown point and the segment between
    successive positions, not only the sampled points, which matters for the
    remote's sparse moves.
  - A tap on unlit dots lights the dots under it, so dot-to-dot tapping is
    tracing too.
  - A dot a finger reaches for the first time plays a soft note from its
    height, rate-limited like ink's notes, so a dot tap is never silent.
    These notes feed the song.
  - A press that was already down when the shadow appeared traces too, and
    is never a tap. While the theme picker is open, tracing pauses, as ink
    does.
  - **Completion:** every dot lit, or all but one with a finger on at least half
    (then the last one lights).
- **Reward:**
  - Letter → instant.
  - A finger on at least half the dots → instant: traced.
  - Otherwise plain. So a sibling's smashing that finishes the last pieces
    doesn't take the drawing away.

### Presses while a shadow is out

- **The lure waits for the release.** A stage press's lure, and its letter
  at the finger, waits until the press ends, kept per pointer with that
  press's own position.
  - On release, a press was **drawing** if it came within the hit radius of
    the outline **and** either reached a dot no finger had touched or moved
    past `INK_START_PX`.
    A drawing press gets no lure, and its letter at the finger is dropped,
    so cards don't land on the outline.
  - Any other press is a tap and gets its piece, however far it smeared, so
    a toddler's messy tap is never a dead input. A tap that doesn't move, on
    dots a finger already touched, is a tap too.
  - A waiting lure is dropped on pointercancel, blur or hidden, round close,
    and the shadow being caught or gone. It's also dropped when a new
    pointerdown arrives with the same pointerId (a mouse released outside
    the window never sends its pointerup).
  - The spawn origin is set when the lure fires.
  - Presses the stage handler already ignores (buttons, tiles, the act
    guard) stay ignored. A creature's face is the exception during a round:
    a tap on it sings and is a tap on the stage as well, so a creature in
    mid-field can't swallow taps.
  - Drawing presses never reach `handleKey`, so they don't count on the key
    counter or in the Keys stat.
- **webOS:** OK can also arrive as Enter, before or after its pointerdown.
  While a shadow is out:
  - A trusted Enter is ignored if a pointer is pressed, or if one went down
    in the last 300 ms.
  - Otherwise its piece waits 300 ms. A pointerdown in that time drops it,
    and the press decides on its release.
  - An Enter within 300 ms after a pointerup is that press's companion and
    is ignored too.
  - An Enter with no pointer press is one piece.
  - `animalsRemoteOk` still claims an Enter over a round button first. The
    golden animal's button is tap-only, since it can be drawn over: its
    Enter gets the same treatment (ignored near a press, otherwise held
    300 ms and dropped by a pointerdown, whose click then decides; a press
    or release under 300 ms ago claims it too), so OK
    held to trace it doesn't open the tiles.
  - All of this applies while any outline is out, the golden one's alone
    included.
  - A waiting Enter's piece is dropped on the same events as a waiting stage
    lure. When it fires, it only counts for the same shadow, still in
    `peek`.

  Still to verify on the TV.

### Strokes that trace it

- Any stroke that lights a dot (or whose pointer did) is marked `traced`.
  The mark names the shadow it traced. `inkEnd` doesn't give it a loop
  creature's face (a one-go trace is a closed loop) while that is still the
  round's current shadow. Once it's gone, or the round is closed or forced
  shut, a stroke still being drawn finishes as ordinary ink.
- Traced strokes otherwise age, idle-fade and get evicted like any ink. Lit
  dots belong to the shadow, so a stroke that ages out loses nothing.
- **At completion, however it happened:**
  - Traced strokes that have ended fade out.
  - Traced strokes still being drawn are cut: faded, and their pointer
    starts over as a fresh press candidate at its current position. The rest
    of the drag is ordinary ink.
  - When fingers drew it, the clean outline takes their place (below).

### The drawing stays

At completion the animal is caught at once, like any other: "G. Gato",
stats and collection, ding-ding for instant, and the picture, now in full,
flies to its wagon.

**When fingers drew it** (a finger on at least half the dots), its outline
stays behind in the picture as an ordinary ink creature:
- It's an ink stroke along the dots in the theme's ink colours, filled, with
  googly eyes and a mouth, the same as a closed loop.
- It bounces and sings the notes its tracing played: dot notes and its
  strokes' notes, kept on the shadow as they play, so a stroke that ages out
  keeps its notes. With fewer than 3, the notes are read off its shape.
- A new creature waits for a priority voice line to finish before it sings,
  so the song comes after "G. Gato", not over it.
- After that it's ink like any other: a tap on its face sings again, it ages
  out, it fades with the picture, and the sponge wipes it. During a round the
  sponge sits top-left, under the parent corner, since the train runs over its
  usual bottom-left spot in portrait. A small phone in portrait (under 700px
  tall) has the golden tiles there, so it has no sponge during a round.
- A later shadow goes where no creature is (see "Which one, and where"). Only
  when every spot is taken (a narrow portrait screen) does it land on one,
  and that creature makes way (fades), so its face neither shows through
  the dots nor takes their taps. Other drawings stay.
- If the ink's point budget is full of strokes still being drawn (the TV),
  there's no creature rather than half of one.

A letter or lure catch with less tracing leaves no creature. Nobody drew it.

### Deadline, closes, motion

- **Deadline:** a shadow is rescued like any animal (all dots light, no
  creature, no voice, no stats), except while a finger is tracing it.
  - A dot a finger reaches for the first time in the last 3 s holds the
    rescue.
  - The hold is capped at 15 s past the deadline. When it runs out, any live
    traced stroke is cut as at completion.
  - A shadow with a finger on half its dots or more is then the child's
    catch, creature and all. Anything less is rescued.
  - The worst case stays under ~95 s. The hold ends by 75 s, and a golden
    attempt can still run to 90 s.
- **Forced close** (theme pick, settings) clears it like everything else.
  Traced strokes stay as plain ink.
- **Reduce motion:** pieces just appear, without the sweep. The creature
  follows the ink's own reduce-motion rules.
- **Reduce effects (TV):** the dots are plain fills with no glow.

### Drawing the golden animal

The golden animal can be drawn too. Spelling it works exactly as before; its
outline is one more way in, for a child who'd rather draw than spell.

- 0.7 s after it appears (once it has settled), 32 small dots go round its
  button, from the same extractor at the same picture size. Hit radius
  2.5vmin, half the shadow's: it's small and sits near the slots.
- It shares the shadow's tracing: one pointer path lights dots on both, the
  same lit/touched sets, notes and completion rule (all dots but one lit, a finger on
  half). Lures never draw golden pieces; it has none.
- A finger reaching a new dot is a go at it: it starts an attempt if it was
  only offered (the tile clock, 6 s), and each new dot refills the clock, so
  it doesn't wink off mid-drawing. So a toddler's single touch on a dot
  starts an attempt too: the 12 s notice ends, and a full train waits for
  it, at most 6 s plus a refill per new dot (capped at 30 s like any
  attempt).
- The button is still a tap-only round button: a tap opens the tiles. A
  press that strays or ends more than 24px away (`TAP_WANDER_PX`, looser
  than a stroke's start, for wobbly taps) is a drag, not a tap, even one
  that loops back to where it started.
- A new golden animal fades an earlier golden's creature where it sits, as
  it appears.
- **Caught by drawing:** it goes to its wagon as a golden catch, but
  without ⭐ (⭐ is for spelling it), and its outline stays behind as an ink
  creature like a shadow's. Earlier creatures under its dots make way.
- **Spelled or gone:** its dots go; strokes that traced it stay as ordinary
  ink, with no creature.

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
  lure. The shadow animal isn't a round button, so OK over it is one piece,
  and an Enter that comes with a pointer press is ignored while it's out.
  **Still to verify on the real TV:** OK's exact event sequence, tracing the
  shadow with OK held, emoji outlines on the TV's canvas, and the
  golden-animal timings.
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

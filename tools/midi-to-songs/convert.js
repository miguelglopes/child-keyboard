#!/usr/bin/env node
// MIDI → SONGS entry converter for child-keyboard.
// Input: a .mid file.
// Output: a `{ name, bpm, notes: [[C4,1],...] }` block to paste into app.js.
//
// usage:
//   node convert.js <file.mid> [options]
//
// options:
//   --name "Title"         song name in output (default: filename)
//   --track N              track index (default: auto-pick non-drum highest-mean-pitch)
//   --list-tracks          print tracks summary and exit
//   --transpose N          semitone offset (default 0)
//   --auto-transpose       auto-pick offset that maximises diatonic-C-major fit
//   --bpm N                override BPM (default: from MIDI header)
//   --start-beat N         skip the first N quarter-notes of the track
//   --max-notes N          stop after N output notes (useful when MIDI loops)
//   --repeat N             value for SONGS entry `repeat:` (default 2)

const { Midi } = require('@tonejs/midi');
const fs = require('fs');
const pathlib = require('path');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { args[key] = true; }
      else { args[key] = next; i++; }
    } else { args._.push(a); }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) {
  console.error('usage: convert.js <file.mid> [options] — see header');
  process.exit(1);
}

const filepath = args._[0];
const midi = new Midi(fs.readFileSync(filepath));

const noteName = (m) => {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
};

// ─── 1. Pick the melody track ─────────────────────────────────────────────────
const trackStats = midi.tracks.map((t, i) => {
  if (t.notes.length === 0) return null;
  const pitches = t.notes.map(n => n.midi);
  return {
    i, count: t.notes.length, channel: t.channel,
    inst: t.instrument && t.instrument.name,
    min: Math.min(...pitches), max: Math.max(...pitches),
    mean: pitches.reduce((a,b)=>a+b,0) / pitches.length,
  };
}).filter(Boolean);

if (args['list-tracks']) {
  trackStats.forEach(t => {
    console.log(`Track ${t.i}: inst=${t.inst} ch=${t.channel} notes=${t.count} pitch=${noteName(t.min)}..${noteName(t.max)} mean=${t.mean.toFixed(1)}`);
  });
  process.exit(0);
}

let trackIdx;
if (args.track !== undefined) {
  trackIdx = Number(args.track);
} else {
  // Heuristic: non-drum (channel != 9), non-trivial note count, highest mean pitch.
  // Melodies sit higher than bass/accompaniment.
  const candidates = trackStats
    .filter(t => t.channel !== 9 && t.count >= 20 && t.count <= 1000)
    .sort((a, b) => b.mean - a.mean);
  if (candidates.length === 0) {
    console.error('No suitable melody track found. Try --list-tracks.');
    process.exit(1);
  }
  trackIdx = candidates[0].i;
  console.error(`# auto-picked track ${trackIdx} (${trackStats.find(t=>t.i===trackIdx).inst})`);
}

const track = midi.tracks[trackIdx];
if (!track || track.notes.length === 0) {
  console.error(`Track ${trackIdx} has no notes.`);
  process.exit(1);
}

// ─── 2. Decide transposition ──────────────────────────────────────────────────
const DIATONIC_SEMIS = new Set([0, 2, 4, 5, 7, 9, 11]); // C major: C D E F G A B

let transpose = Number(args.transpose ?? 0);
if (args['auto-transpose']) {
  let best = 0, bestScore = -1;
  for (let t = -6; t <= 6; t++) {
    const score = track.notes.filter(n => DIATONIC_SEMIS.has(((n.midi + t) % 12 + 12) % 12)).length;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  transpose = best;
  console.error(`# auto-transpose: ${transpose >= 0 ? '+' : ''}${transpose} semitones (${bestScore}/${track.notes.length} notes diatonic)`);
}

// ─── 3. Build output notes ────────────────────────────────────────────────────
const NOTE_NAMES = {
  48: 'C3', 50: 'D3', 52: 'E3', 53: 'F3', 55: 'G3', 57: 'A3', 59: 'B3',
  60: 'C4', 62: 'D4', 64: 'E4', 65: 'F4', 67: 'G4', 69: 'A4', 71: 'B4',
  72: 'C5', 74: 'D5', 76: 'E5', 77: 'F5', 79: 'G5', 81: 'A5', 83: 'B5',
};
const STANDARD_DURS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const quantize = (d) => {
  let best = STANDARD_DURS[0], minDiff = Infinity;
  for (const s of STANDARD_DURS) {
    const diff = Math.abs(s - d);
    if (diff < minDiff) { minDiff = diff; best = s; }
  }
  return best;
};

const bpm = Number(args.bpm ?? (midi.header.tempos[0]?.bpm || 120));
const startBeat = Number(args['start-beat'] ?? 0);
const maxNotes = Number(args['max-notes'] ?? Infinity);

// Sort notes by start tick (defensive). Convert ticks → beats (PPQ ticks per quarter).
const ppq = midi.header.ppq;
const notes = [...track.notes].sort((a, b) => a.ticks - b.ticks)
  .map(n => ({ ...n, beat: n.ticks / ppq }))
  .filter(n => n.beat >= startBeat);

const out = [];
const warnings = [];

for (let i = 0; i < notes.length && out.length < maxNotes; i++) {
  const n = notes[i];
  let m = n.midi + transpose;
  // Fold into C3..B5 by octave shift (preserves melody contour modulo octave).
  while (m < 48) m += 12;
  while (m > 83) m -= 12;

  const pc = ((m % 12) + 12) % 12;
  const name = NOTE_NAMES[m];
  if (!name) {
    // Chromatic — snap to nearest diatonic in the same octave.
    const oct = Math.floor(m / 12);
    const offsets = [-1, 1, -2, 2];
    let snapped = null;
    for (const o of offsets) {
      const cand = m + o;
      if (NOTE_NAMES[cand]) { snapped = cand; break; }
    }
    if (snapped === null) { warnings.push(`note ${i}: ${noteName(n.midi)} → can't snap, skipping`); continue; }
    warnings.push(`note ${i}: ${noteName(n.midi)} chromatic → snapped to ${NOTE_NAMES[snapped]}`);
    m = snapped;
  }

  // Duration: inter-onset interval to next note, else own duration. In beats.
  let durBeats;
  if (i + 1 < notes.length) {
    durBeats = notes[i+1].beat - n.beat;
  } else {
    durBeats = n.duration / (60 / bpm);
  }
  if (durBeats <= 0) continue;
  const dur = quantize(durBeats);
  out.push({ name: NOTE_NAMES[m], dur });
}

// ─── 4. Emit JS block ─────────────────────────────────────────────────────────
const songName = args.name || pathlib.basename(filepath, pathlib.extname(filepath));
const repeat = Number(args.repeat ?? 2);

console.log(`  // ${songName} — source: ${pathlib.basename(filepath)}`);
console.log(`  // Track ${trackIdx} (${track.instrument && track.instrument.name || '?'}). Transposed ${transpose >= 0 ? '+' : ''}${transpose} st. ${out.length} notes.`);
console.log(`  { name: '${songName.replace(/'/g, "\\'")}', bpm: ${Math.round(bpm)}, notes: [`);

let beatAcc = 0, bar = 1;
process.stdout.write(`    // bar ${bar++}\n    `);
let lineLen = 4;
for (const o of out) {
  const piece = `[${o.name},${o.dur}],`;
  if (lineLen + piece.length > 80) {
    process.stdout.write('\n    ');
    lineLen = 4;
  }
  process.stdout.write(piece);
  lineLen += piece.length;
  beatAcc += o.dur;
  if (beatAcc >= 4) {
    process.stdout.write(`\n    // bar ${bar++}\n    `);
    lineLen = 4;
    beatAcc -= 4;
  }
}
process.stdout.write('\n');
console.log(`  ], repeat: ${repeat} },`);

// ─── 5. Warnings → stderr ─────────────────────────────────────────────────────
if (warnings.length) {
  console.error(`\n# ${warnings.length} warnings:`);
  const summary = {};
  warnings.forEach(w => { summary[w] = (summary[w] || 0) + 1; });
  Object.entries(summary).slice(0, 20).forEach(([w, n]) => {
    console.error(`#   ${w}${n > 1 ? ` (×${n})` : ''}`);
  });
}

// Distinct durations check
const distinctDurs = new Set(out.map(o => o.dur));
console.error(`# distinct durations: ${[...distinctDurs].sort().join(', ')} (${distinctDurs.size} unique)`);
if (distinctDurs.size < 3) {
  console.error(`# ⚠ FLAT RHYTHM — only ${distinctDurs.size} distinct durations. Likely wrong source.`);
}

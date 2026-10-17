#!/usr/bin/env node
// Print a summary of a MIDI file: tracks, note counts, pitch ranges, tempo.
const { Midi } = require('@tonejs/midi');
const fs = require('fs');

const path = process.argv[2];
if (!path) { console.error('usage: probe.js <file.mid>'); process.exit(1); }

const midi = new Midi(fs.readFileSync(path));
console.log(`File: ${path}`);
console.log(`Duration: ${midi.duration.toFixed(2)}s`);
console.log(`PPQ: ${midi.header.ppq}`);
console.log(`Tempos: ${midi.header.tempos.map(t => `${t.bpm.toFixed(1)} bpm @ ${t.ticks}t`).join(', ')}`);
console.log(`Time sigs: ${midi.header.timeSignatures.map(t => t.timeSignature.join('/')).join(', ')}`);
console.log(`Tracks: ${midi.tracks.length}`);
console.log('');

const noteName = (m) => {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[m % 12] + Math.floor(m / 12 - 1);
};

midi.tracks.forEach((t, i) => {
  if (t.notes.length === 0) return;
  const pitches = t.notes.map(n => n.midi);
  const min = Math.min(...pitches), max = Math.max(...pitches);
  const avg = pitches.reduce((a,b) => a+b, 0) / pitches.length;
  const ch = t.channel;
  const inst = t.instrument && t.instrument.name ? t.instrument.name : '?';
  // first 12 notes preview
  const preview = t.notes.slice(0, 12).map(n => noteName(n.midi)).join(' ');
  console.log(`Track ${i}: "${t.name||''}" inst=${inst} ch=${ch} notes=${t.notes.length} pitch=${noteName(min)}..${noteName(max)} mean=${avg.toFixed(1)}`);
  console.log(`  preview: ${preview}`);
});

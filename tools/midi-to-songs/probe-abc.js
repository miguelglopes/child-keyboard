#!/usr/bin/env node
// Probe abcjs's parse output for one tune.
const abc = require('abcjs');
const fs = require('fs');

const tuneNum = Number(process.argv[3] || 1);
const corpus = fs.readFileSync(process.argv[2], 'utf8');

// Split tunes by blank line preceding X:
const tunes = corpus.split(/\n(?=X:\s*\d+)/).filter(t => /X:\s*\d+/.test(t));
console.log(`# Found ${tunes.length} tunes`);
console.log(`# Tune ${tuneNum} raw header:`);
console.log(tunes[tuneNum - 1].split('\n').slice(0, 12).join('\n'));
console.log('---');

const parsed = abc.parseOnly(tunes[tuneNum - 1]);
console.log(`# Parsed ${parsed.length} tune(s)`);
if (parsed[0]) {
  console.log('Title:', parsed[0].metaText.title);
  console.log('Tempo:', JSON.stringify(parsed[0].metaText.tempo || null));
  console.log('Meter:', JSON.stringify(parsed[0].getMeterFraction()));
  console.log('Key:', JSON.stringify(parsed[0].getKeySignature()));
  console.log('');
  // Find first staff/voice with notes
  let count = 0;
  const dumpEl = (el) => {
    if (el.el_type === 'note' && el.pitches) {
      const p = el.pitches.map(x => `${x.name}(midi=${x.verticalPos}, accidental=${x.accidental||''})`).join(',');
      console.log(`note: pitches=[${p}] duration=${el.duration}${el.rest ? ' REST' : ''}`);
      count++;
    } else if (el.el_type === 'note' && el.rest) {
      console.log(`rest: duration=${el.duration}`);
    } else if (el.el_type === 'bar') {
      console.log(`-- bar (${el.type}) --`);
    } else {
      // console.log(`other:`, el.el_type);
    }
  };
  for (const line of parsed[0].lines) {
    if (!line.staff) continue;
    for (const staff of line.staff) {
      for (const voice of staff.voices) {
        for (const el of voice) {
          dumpEl(el);
          if (count >= 30) return;
        }
      }
    }
  }
}

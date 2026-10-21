// Prints, as JSON, every phrase app.js can pass to say(), per language:
//   { "pt": [{ "text": "L. Leão", "spoken": "Éle. Leão", "file": "pt/l-leao.mp3" }, …], "en": […] }
// "text" is the exact string say() receives (the clip lookup key); "spoken" is what
// the TTS reads — letter names spelled out (otherwise "L." / "M." come out as Roman
// numerals) and ALL-CAPS quest words in normal case (otherwise some get spelled).
// Content tables are evaluated straight from app.js, so new words are picked up.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
const end = src.indexOf('const WORD_MAX_LEVEL');
if (end < 0) throw new Error('app.js layout changed: WORD_MAX_LEVEL not found');
const { LETTERS, THEME_CONTENT, WORDS, PHRASES, THEME_NAMES } = vm.runInNewContext(
  src.slice(0, end) + ';({ LETTERS, THEME_CONTENT, WORDS, PHRASES, THEME_NAMES })',
  { window: {}, navigator: { userAgent: '', maxTouchPoints: 0 } },
);
const testVoice = src.match(/const t = settings\.lang === 'pt' \? '([^']+)' : '((?:[^'\\]|\\.)+)'/);
if (!testVoice) throw new Error('app.js layout changed: test-voice phrase not found');

const LETTER_NAMES = {
  pt: {
    A: 'Á', B: 'Bê', C: 'Cê', D: 'Dê', E: 'É', F: 'Éfe', G: 'Guê', H: 'Agá', I: 'I',
    J: 'Jota', K: 'Capa', L: 'Éle', M: 'Éme', N: 'Éne', O: 'Ó', P: 'Pê', Q: 'Quê',
    R: 'Érre', S: 'Ésse', T: 'Tê', U: 'U', V: 'Vê', W: 'Dâblio', X: 'Xis', Y: 'Ípsilon',
    Z: 'Zê', Ç: 'Cê cedilhado',
  },
  en: {
    A: 'Ay', B: 'Bee', C: 'See', D: 'Dee', E: 'Ee', F: 'Eff', G: 'Gee', H: 'Aitch', I: 'Eye',
    J: 'Jay', K: 'Kay', L: 'Ell', M: 'Em', N: 'En', O: 'Oh', P: 'Pee', Q: 'Cue', R: 'Ar',
    S: 'Ess', T: 'Tee', U: 'You', V: 'Vee', W: 'Double you', X: 'Ex', Y: 'Why', Z: 'Zee',
  },
};

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const normalCase = (s, lang) => s.charAt(0) + s.slice(1).toLocaleLowerCase(lang);

const out = {};
for (const lang of ['pt', 'en']) {
  const seen = new Map(); // text → entry
  const files = new Set();
  const add = (text, spoken) => {
    if (seen.has(text)) return;
    let file = `${lang}/${slug(text)}.mp3`;
    for (let n = 2; files.has(file); n++) file = `${lang}/${slug(text)}-${n}.mp3`;
    files.add(file);
    seen.set(text, { text, spoken, file });
  };
  // Same fallback as themeLetters(): a theme without this language uses its pt table.
  const tables = [LETTERS[lang], ...Object.values(THEME_CONTENT).map(t => t.letters[lang] || t.letters.pt)];
  for (const table of tables) {
    for (const [letter, variants] of Object.entries(table)) {
      for (const [word] of variants) add(`${letter}. ${word}`, `${LETTER_NAMES[lang][letter] ?? letter}. ${word}`);
    }
  }
  // Completed word / bonus quests say the accented word upper-cased ("MAÇÃ").
  for (const table of tables) {
    for (const variants of Object.values(table)) {
      for (const [word] of variants) if (!word.includes(' ')) add(word.toUpperCase(), word);
    }
  }
  for (const w of Object.values(WORDS[lang]).flat()) add(w, normalCase(w, lang));
  for (let d = 0; d <= 9; d++) add(String(d), String(d)); // digit keys and math answers
  add(PHRASES[lang].level_up, PHRASES[lang].level_up);
  for (const name of Object.values(THEME_NAMES[lang])) add(name, name); // child theme picker
  const test = lang === 'pt' ? testVoice[1] : testVoice[2].replace(/\\(.)/g, '$1');
  add(test, test);
  out[lang] = [...seen.values()];
}
process.stdout.write(JSON.stringify(out));

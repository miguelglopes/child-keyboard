// ─── PLATFORM ───────────────────────────────────────────────────────────────
// Runtime detection so the same bundle works in a desktop browser and in an
// LG webOS app. webOS apps are already fullscreen and have no Esc key, so the
// kiosk/keyboard-lock code is skipped there (see KIOSK section below).

const isWebOS = !!window.PalmSystem || /web0s|webos/i.test(navigator.userAgent);

// ─── UTILS ──────────────────────────────────────────────────────────────────

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

// ─── CONTENT ────────────────────────────────────────────────────────────────

// Each letter has 1+ variants — cycled on repeat presses of the same letter
const LETTERS = {
  en: {
    A: [['Apple', '🍎'], ['Ant', '🐜'], ['Airplane', '✈️']],
    B: [['Ball', '⚽'], ['Bear', '🐻'], ['Banana', '🍌'], ['Bee', '🐝']],
    C: [['Cat', '🐈'], ['Car', '🚗'], ['Cake', '🎂']],
    D: [['Dog', '🐕'], ['Dolphin', '🐬'], ['Duck', '🦆']],
    E: [['Elephant', '🐘'], ['Egg', '🥚'], ['Eye', '👁️']],
    F: [['Fish', '🐟'], ['Fire', '🔥'], ['Flower', '🌸']],
    G: [['Giraffe', '🦒'], ['Grapes', '🍇'], ['Ghost', '👻']],
    H: [['Hat', '🎩'], ['Horse', '🐴'], ['House', '🏠']],
    I: [['Igloo', '🛖'], ['Ice cream', '🍦'], ['Insect', '🐛']],
    J: [['Jellyfish', '🪼'], ['Juice', '🧃'], ['Jaguar', '🐆']],
    K: [['Kite', '🪁'], ['Key', '🔑'], ['Kangaroo', '🦘']],
    L: [['Lion', '🦁'], ['Leaf', '🍃'], ['Lemon', '🍋']],
    M: [['Monkey', '🐒'], ['Moon', '🌙'], ['Mouse', '🐭']],
    N: [['Nest', '🪺'], ['Night', '🌃'], ['Necklace', '📿']],
    O: [['Owl', '🦉'], ['Orange', '🍊'], ['Octopus', '🐙']],
    P: [['Penguin', '🐧'], ['Pig', '🐷'], ['Pizza', '🍕']],
    Q: [['Queen', '👸'], ['Quill', '🪶']],
    R: [['Rabbit', '🐰'], ['Rainbow', '🌈'], ['Rocket', '🚀']],
    S: [['Sun', '☀️'], ['Snake', '🐍'], ['Star', '⭐']],
    T: [['Tiger', '🐯'], ['Tree', '🌳'], ['Turtle', '🐢']],
    U: [['Umbrella', '☂️'], ['Unicorn', '🦄']],
    V: [['Violin', '🎻'], ['Volcano', '🌋'], ['Van', '🚐']],
    W: [['Whale', '🐳'], ['Watermelon', '🍉'], ['Wolf', '🐺']],
    X: [['Xylophone', '🎶'], ['X-ray', '🩻']],
    Y: [['Yoyo', '🪀'], ['Yarn', '🧶']],
    Z: [['Zebra', '🦓'], ['Zipper', '🤐']],
  },
  pt: {
    A: [['Abelha', '🐝'], ['Avião', '✈️'], ['Árvore', '🌳']],
    B: [['Bola', '⚽'], ['Bicicleta', '🚲'], ['Banana', '🍌']],
    C: [['Cão', '🐕'], ['Casa', '🏠'], ['Cavalo', '🐴'], ['Comboio', '🚂']],
    Ç: [['Maçã', '🍎'], ['Coração', '❤️'], ['Rebuçado', '🍬']],
    D: [['Dinossauro', '🦖'], ['Dado', '🎲']],
    E: [['Elefante', '🐘'], ['Estrela', '⭐'], ['Escola', '🏫']],
    F: [['Foca', '🦭'], ['Flor', '🌸'], ['Fogo', '🔥']],
    G: [['Girafa', '🦒'], ['Gato', '🐈'], ['Galinha', '🐔']],
    H: [['Hipopótamo', '🦛'], ['Hambúrguer', '🍔']],
    I: [['Iguana', '🦎'], ['Ilha', '🏝️']],
    J: [['Joaninha', '🐞'], ['Janela', '🪟']],
    K: [['Koala', '🐨']],
    L: [['Leão', '🦁'], ['Lua', '🌙'], ['Limão', '🍋']],
    M: [['Macaco', '🐒'], ['Mar', '🌊'], ['Maçã', '🍎']],
    N: [['Navio', '⛵'], ['Nuvem', '☁️']],
    O: [['Ovelha', '🐑'], ['Ovo', '🥚']],
    P: [['Pato', '🦆'], ['Peixe', '🐟'], ['Pizza', '🍕']],
    Q: [['Queijo', '🧀'], ['Quadro', '🖼️']],
    R: [['Rato', '🐭'], ['Rosa', '🌹'], ['Rio', '🏞️']],
    S: [['Sapo', '🐸'], ['Sol', '☀️'], ['Serpente', '🐍']],
    T: [['Tartaruga', '🐢'], ['Tigre', '🐯'], ['Tubarão', '🦈']],
    U: [['Urso', '🐻'], ['Uva', '🍇']],
    V: [['Vaca', '🐄'], ['Violino', '🎻'], ['Vulcão', '🌋']],
    W: [['Waffle', '🧇']],
    X: [['Xilofone', '🎶']],
    Y: [['Yoyo', '🪀']],
    Z: [['Zebra', '🦓']],
  },
};

// Cycle counter per letter so repeat presses show different variants
const letterCycle = {};
function pickLetterContent(norm) {
  const variants = LETTERS[settings.lang]?.[norm];
  if (!variants || !variants.length) return null;
  const i = (letterCycle[norm] || 0) % variants.length;
  letterCycle[norm] = (letterCycle[norm] || 0) + 1;
  return variants[i];
}

const WORDS = {
  en: {
    easy:   ['SUN', 'CAT', 'DOG', 'BALL', 'TOY', 'HAT', 'BUS', 'EGG', 'PIG', 'COW', 'FUN', 'JOY', 'BIG', 'RED'],
    medium: ['APPLE', 'HOUSE', 'HAPPY', 'SMILE', 'ZEBRA', 'TIGER', 'WHALE', 'LEMON'],
    hard:   ['BUTTERFLY', 'ELEPHANT', 'RAINBOW', 'GIRAFFE', 'PENGUIN'],
  },
  pt: {
    easy:   ['SOL', 'MAR', 'GATO', 'BOLA', 'PATO', 'OVO', 'LUA', 'RIO', 'MEL', 'CASA', 'ASA', 'BOI', 'AMOR', 'FOGO'],
    medium: ['GIRAFA', 'MACACO', 'JANELA', 'ESCOLA', 'ZEBRA', 'TIGRE'],
    hard:   ['BORBOLETA', 'ELEFANTE', 'HIPOPOTAMO', 'DINOSSAURO'],
  },
};

const PHRASES = {
  en: {
    word: 'WORD', math: 'MATH',
    praise: ['Yay!', 'Awesome!', 'Wow!', 'Great!', 'Amazing!', 'Yes!'],
    tryAgain: ['Try again!', 'Almost!'],
    settings: 'Settings', language: 'Language', theme: 'Theme',
    sound: 'Sound', voice: 'Voice', show_quests: 'Show quests',
    falling_letters: 'Falling letters', reduce_motion: 'Reduce motion',
    reduce_effects: 'Reduce effects',
    word_difficulty: 'Word difficulty', math_difficulty: 'Math difficulty',
    fullscreen: 'Fullscreen', reset_counter: 'Reset counter', close: 'Close',
    parent_check: 'Parent check', parent_prompt: 'Press this key to continue',
    cancel: 'Cancel',
    exit_hint: 'To exit: hold top-left corner 3s + press the prompted key.',
    auto: 'Auto',
    level_up: 'Level up!',
    voice_pick: 'Voice', test_voice: 'Test voice',
    stats: 'Stats', today: 'Today', all_time: 'All-time',
    stats_keys: 'Keys', stats_words: 'Words', stats_math: 'Math wins', stats_levelups: 'Level-ups',
    stats_bonus: 'Bonus rounds',
    bonus_label: 'NAME IT',
    hold_hint: 'Hold 3s',
  },
  pt: {
    word: 'PALAVRA', math: 'MATEMÁTICA',
    praise: ['Boa!', 'Excelente!', 'Uau!', 'Fantástico!', 'Sim!', 'Boa!'],
    tryAgain: ['Quase!', 'Tenta!'],
    settings: 'Definições', language: 'Idioma', theme: 'Tema',
    sound: 'Som', voice: 'Voz', show_quests: 'Mostrar desafios',
    falling_letters: 'Letras que caem', reduce_motion: 'Reduzir movimento',
    reduce_effects: 'Reduzir efeitos',
    word_difficulty: 'Dificuldade palavras', math_difficulty: 'Dificuldade matemática',
    fullscreen: 'Ecrã inteiro', reset_counter: 'Reiniciar contador', close: 'Fechar',
    parent_check: 'Verificação adulto', parent_prompt: 'Carrega nesta tecla para continuar',
    cancel: 'Cancelar',
    exit_hint: 'Para sair: segura o canto superior esquerdo 3s + carrega na tecla pedida.',
    auto: 'Auto',
    level_up: 'Subiste de nível!',
    voice_pick: 'Voz', test_voice: 'Testar voz',
    stats: 'Estatísticas', today: 'Hoje', all_time: 'Total',
    stats_keys: 'Teclas', stats_words: 'Palavras', stats_math: 'Contas certas', stats_levelups: 'Subidas de nível',
    stats_bonus: 'Rondas bónus',
    bonus_label: 'ADIVINHA',
    hold_hint: 'Segura 3s',
  },
};

// ─── SETTINGS ───────────────────────────────────────────────────────────────

const DEFAULTS = {
  lang: 'pt',
  theme: 'auto',
  sound: true,
  voice: true,
  quests: true,
  fallingLetters: true,
  reduceMotion: false,
  reduceEffects: isWebOS,
  wordDiff: 'auto',
  mathDiff: 'auto',
  ptVoice: '', // manual voice key "name|lang", empty = auto
  enVoice: '',
};

// Flatten LETTERS variants into a flat (word, emoji) pool
function buildEmojiWords(lang) {
  const out = [];
  for (const variants of Object.values(LETTERS[lang])) {
    for (const [word, emoji] of variants) {
      out.push({ raw: word, word: normalize(word), emoji });
    }
  }
  return out;
}

// Levels are 0-indexed internally; displayed as Lv (N+1)
const WORD_MAX_LEVEL = 4;  // 0..4 (5 levels)
const MATH_MAX_LEVEL = 4;  // 0..4 (5 levels)
const STREAK_TO_LEVEL_UP = 3;

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('ck-settings') || '{}') };
  } catch { return { ...DEFAULTS }; }
}
function saveSettings() {
  localStorage.setItem('ck-settings', JSON.stringify(settings));
}

const settings = loadSettings();

// Tracks the visually-active theme. In 'auto' mode, mutated by maybeSwitchTheme
// as the child triggers theme letters; in fixed mode, kept in sync by applyTheme.
let currentTheme = 'rainbow';
function effectiveTheme() {
  return settings.theme === 'auto' ? currentTheme : settings.theme;
}

// ─── DOM ────────────────────────────────────────────────────────────────────

const stage = document.getElementById('stage');
const wordBody = document.getElementById('word-body');
const mathBody = document.getElementById('math-body');
const counterEl = document.getElementById('counter');
const confettiEl = document.getElementById('confetti');
const parentCorner = document.getElementById('parent-corner');
const parentGate = document.getElementById('parent-gate');
const settingsDialog = document.getElementById('settings');
const parentPromptKey = document.getElementById('parent-prompt-key');

// ─── I18N ───────────────────────────────────────────────────────────────────

function applyI18n() {
  const p = PHRASES[settings.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (p[k]) el.textContent = p[k];
  });
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const k = el.dataset.i18nOpt;
    if (p[k]) el.textContent = p[k];
  });
  document.documentElement.lang = settings.lang;
}

// ─── AUDIO ──────────────────────────────────────────────────────────────────

let audioCtx;
function audio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function beep(freq, dur = 0.18, type = 'triangle', gain = 0.18) {
  if (!settings.sound) return;
  const ctx = audio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

function sweep(fromHz, toHz, dur, type = 'sawtooth', gain = 0.14) {
  if (!settings.sound) return;
  const ctx = audio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, toHz), ctx.currentTime + dur);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function noise(dur = 0.08, gain = 0.15) {
  if (!settings.sound) return;
  const ctx = audio();
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(g).connect(ctx.destination);
  src.start();
}

// Theme-specific letter/digit voicings
function letterTone(letter) {
  const idx = letter.charCodeAt(0) - 65;
  const theme = effectiveTheme();
  if (theme === 'space')   return spaceZap(idx);
  if (theme === 'ocean')   return bubblePop(idx);
  if (theme === 'jungle')  return jungleDrum(idx);
  if (theme === 'baby')    return babyDing(idx);
  return rainbowBell(idx);
}

function digitTone(digit) {
  const theme = effectiveTheme();
  if (theme === 'space')   return spaceZap(digit + 13);
  if (theme === 'ocean')   return bubblePop(digit + 6);
  if (theme === 'jungle')  return jungleDrum(digit);
  if (theme === 'baby')    return babyDing(digit + 13);
  // rainbow default
  beep(220 + digit * 30, 0.15, 'sine', 0.16);
}

function babyDing(idx) {
  // Two-note soft sine: low gain, narrow pitch range, long-ish decay.
  // Calmer than rainbow bells and quieter than zaps/drums.
  const BASE = [261.63, 329.63, 392.00, 440.00, 523.25];
  const note = BASE[idx % BASE.length];
  beep(note, 0.32, 'sine', 0.08);
}

function rainbowBell(idx) {
  const note = PENTATONIC[idx % PENTATONIC.length] * (idx >= PENTATONIC.length ? 2 : 1);
  beep(note, 0.18, 'triangle', 0.18);
  // Harmonic chime
  setTimeout(() => beep(note * 2, 0.12, 'sine', 0.08), 30);
}

function spaceZap(idx) {
  const base = 600 + (idx % 8) * 80;
  sweep(base * 2, base * 0.8, 0.14, 'sawtooth', 0.13);
  setTimeout(() => sweep(base * 3, base * 1.2, 0.08, 'square', 0.07), 35);
}

function bubblePop(idx) {
  const base = 220 + (idx % 8) * 35;
  sweep(base * 0.7, base * 1.6, 0.09, 'sine', 0.18);
  setTimeout(() => beep(base * 2.2, 0.04, 'sine', 0.1), 50);
}

function jungleDrum(idx) {
  const base = 70 + (idx % 6) * 28;
  sweep(base * 4, base, 0.07, 'square', 0.22);
  noise(0.05, 0.08);
  if (idx % 4 === 0) setTimeout(() => beep(base * 8, 0.04, 'triangle', 0.06), 40);
}
function fanfare() {
  if (!settings.sound) return;
  // Quick ascending arpeggio
  const arp = [392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
  arp.forEach((n, i) => setTimeout(() => beep(n, 0.16, 'triangle', 0.18), i * 60));
  // Big sustained chord
  const chordStart = arp.length * 60;
  setTimeout(() => {
    beep(523.25, 0.7, 'sine', 0.14);  // C5
    beep(659.25, 0.7, 'sine', 0.14);  // E5
    beep(783.99, 0.7, 'sine', 0.14);  // G5
    beep(1046.50, 0.7, 'sine', 0.14); // C6
  }, chordStart);
  // High shimmer
  for (let i = 0; i < 3; i++) {
    setTimeout(() => beep(1568.00 + i * 100, 0.12, 'triangle', 0.1), chordStart + 200 + i * 80);
  }
  // Trumpet-like blast at the end
  setTimeout(() => beep(880, 0.4, 'square', 0.18), chordStart + 500);
}
function sadBoop() {
  beep(180, 0.25, 'sawtooth', 0.08);
}

// ─── VOICE ──────────────────────────────────────────────────────────────────

let voices = [];
function loadVoices() {
  voices = window.speechSynthesis?.getVoices?.() || [];
}
if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
function isBrazilian(v) {
  return /br|brasil|brazil/i.test(v.name) || v.lang.toLowerCase() === 'pt-br' || v.lang.toLowerCase().startsWith('pt-br');
}

function pickVoice() {
  if (!voices.length) return null;
  // If user has manually picked a voice for this language, honor it
  const manualKey = settings.lang === 'pt' ? settings.ptVoice : settings.enVoice;
  if (manualKey) {
    const m = voices.find(v => `${v.name}|${v.lang}` === manualKey);
    if (m) return m;
  }

  if (settings.lang === 'pt') {
    return voices.find(v => v.lang === 'pt-PT' || v.lang.toLowerCase() === 'pt-pt')
        || voices.find(v => /portugal|european/i.test(v.name))
        || voices.find(v => v.lang.toLowerCase().startsWith('pt-pt'))
        || voices.find(v => v.lang.toLowerCase() === 'pt' && !isBrazilian(v))
        || voices.find(v => v.lang.toLowerCase().startsWith('pt') && !isBrazilian(v))
        || voices.find(v => v.lang.toLowerCase().startsWith('pt'))
        || null;
  }
  return voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.toLowerCase().startsWith('en-us'))
      || voices.find(v => v.lang.toLowerCase().startsWith('en'))
      || null;
}

function say(text) {
  if (!settings.voice || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = settings.lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = 0.95;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

// ─── STATE ──────────────────────────────────────────────────────────────────

const state = {
  keyCount: parseInt(localStorage.getItem('ck-count') || '0', 10),
  word: null, wordIdx: 0, wordEmoji: null, wordDisplay: null,
  eq: null, eqAnswer: 0, eqAttempts: 0,
  wordLevel: Math.max(0, Math.min(WORD_MAX_LEVEL, parseInt(localStorage.getItem('ck-word-level') || '0', 10))),
  mathLevel: Math.max(0, Math.min(MATH_MAX_LEVEL, parseInt(localStorage.getItem('ck-math-level') || '0', 10))),
  wordStreak: 0,
  mathStreak: 0,
  bonus: null, bonusTimer: null,
};

function effectiveWordLevel() {
  return settings.wordDiff === 'auto' ? state.wordLevel : parseInt(settings.wordDiff, 10);
}
function effectiveMathLevel() {
  return settings.mathDiff === 'auto' ? state.mathLevel : parseInt(settings.mathDiff, 10);
}

function setCount(n) {
  state.keyCount = n;
  counterEl.textContent = n;
  localStorage.setItem('ck-count', String(n));
}

// ─── STATS ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadStats() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('ck-stats') || '{}'); } catch {}
  const today = todayStr();
  if (s.date !== today) {
    s.date = today;
    s.todayKeys = 0; s.todayWords = 0; s.todayMath = 0; s.todayLevelUps = 0;
  }
  return {
    date: s.date || today,
    todayKeys: s.todayKeys || 0,
    todayWords: s.todayWords || 0,
    todayMath: s.todayMath || 0,
    todayLevelUps: s.todayLevelUps || 0,
    todayBonus: s.todayBonus || 0,
    allTimeKeys: s.allTimeKeys || 0,
    allTimeWords: s.allTimeWords || 0,
    allTimeMath: s.allTimeMath || 0,
    allTimeLevelUps: s.allTimeLevelUps || 0,
    allTimeBonus: s.allTimeBonus || 0,
  };
}

const stats = loadStats();
function saveStats() { localStorage.setItem('ck-stats', JSON.stringify(stats)); }

function rollIfNewDay() {
  const t = todayStr();
  if (stats.date !== t) {
    stats.date = t;
    stats.todayKeys = 0; stats.todayWords = 0; stats.todayMath = 0; stats.todayLevelUps = 0; stats.todayBonus = 0;
  }
}

function record(kind) {
  rollIfNewDay();
  const today = 'today' + kind;
  const all = 'allTime' + kind;
  stats[today] = (stats[today] || 0) + 1;
  stats[all] = (stats[all] || 0) + 1;
  saveStats();
}

// ─── SPAWN ──────────────────────────────────────────────────────────────────

let spawnSeed = 0;
const SPAWN_VARIANTS = ['pop', 'drop', 'spin', 'flip'];
// If set, the next spawn() places the element at this {x,y} percentage instead
// of randomizing. Consumed once. Used by rain-bubble pops so the letter+animal
// appears where the bubble was tapped.
let spawnOriginOverride = null;
function spawn(big, small) {
  const variant = SPAWN_VARIANTS[Math.floor(Math.random() * SPAWN_VARIANTS.length)];
  const el = document.createElement('div');
  el.className = 'spawn c' + (spawnSeed++ % 7) + ' v-' + variant;
  if (variant === 'flip') {
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-back"></div>
        <div class="card-front"><span>${big}</span>${small ? `<span class="emoji">${small}</span>` : ''}</div>
      </div>`;
  } else {
    el.innerHTML = `<span>${big}</span>` + (small ? `<span class="emoji">${small}</span>` : '');
  }
  let x, y;
  if (spawnOriginOverride) {
    ({ x, y } = spawnOriginOverride);
    spawnOriginOverride = null;
  } else {
    x = 8 + Math.random() * 84;
    y = 22 + Math.random() * 56;
  }
  el.style.left = x + '%';
  el.style.top = y + '%';
  stage.appendChild(el);
  setTimeout(() => el.remove(), settings.reduceMotion ? 1500 : 3300);
}

function confetti(n = 60) {
  if (settings.reduceMotion) n = Math.min(15, n);
  else if (settings.reduceEffects) n = Math.min(60, n);
  const colors = effectiveTheme() === 'baby'
    ? ['#ffffff', '#ff1f1f']
    : ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#06d6a0'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetto';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.3) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiEl.appendChild(c);
    setTimeout(() => c.remove(), 2500);
  }
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 400);
}

// ─── TAPPABLE ───────────────────────────────────────────────────────────────

// Make any element a tap-to-dispatch-key target. Shared by letter cards, word/
// bonus quest letters, and math equation digits/operators so a click anywhere
// on a "labelled" element fires the same key path as a real keypress.
function makeTappable(el, key) {
  el.dataset.key = key;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.add('tapped');
    setTimeout(() => el.classList.remove('tapped'), 400);
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

// ─── WORD QUEST ─────────────────────────────────────────────────────────────

function newWord() {
  const pool = buildEmojiWords(settings.lang);
  let pick;
  do { pick = pool[Math.floor(Math.random() * pool.length)]; }
  while (pick.word === state.word && pool.length > 1);
  state.word = pick.word.toUpperCase();      // normalized for matching ("MACA")
  state.wordDisplay = pick.raw.toUpperCase(); // accented for display ("MAÇÃ")
  state.wordIdx = 0;
  state.wordEmoji = pick.emoji;
  renderWord();
}

function renderWord() {
  if (!state.word) return;
  const lv = effectiveWordLevel();
  wordBody.innerHTML = '';
  const norm = normalize(state.word);

  // Lv 0 — pre-keyboard: big emoji + cards for each letter of the word in order
  if (lv === 0) {
    const big = document.createElement('div');
    big.className = 'quest-bigemoji';
    big.textContent = state.wordEmoji || '?';
    wordBody.appendChild(big);

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'quest-cards';

    const display = state.wordDisplay || state.word;
    for (let i = 0; i < state.word.length; i++) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'letter-card';
      if (i < state.wordIdx) card.classList.add('done');
      else if (i === state.wordIdx) card.classList.add('next');
      card.textContent = display[i];
      makeTappable(card, state.word[i].toLowerCase());
      cardsWrap.appendChild(card);
    }
    wordBody.appendChild(cardsWrap);
    return;
  }

  // Lv 1+ — always include the emoji for visual association
  if (state.wordEmoji) {
    const em = document.createElement('span');
    em.className = 'quest-emoji';
    em.textContent = state.wordEmoji;
    wordBody.appendChild(em);
  }

  const display = state.wordDisplay || state.word;
  for (let i = 0; i < state.word.length; i++) {
    const span = document.createElement('span');
    span.className = 'q-char';

    const done = i < state.wordIdx;
    const isNext = i === state.wordIdx;

    if (lv === 1 || lv === 2) {
      span.textContent = display[i];
      if (done) span.classList.add('done');
      else if (isNext && lv === 1) span.classList.add('next');
    } else {
      if (done) {
        span.classList.add('done');
        span.textContent = display[i];
      } else {
        span.classList.add('blank');
        span.textContent = '_';
        if (isNext && lv === 3) span.classList.add('next');
      }
    }

    if (!span.classList.contains('blank')) {
      makeTappable(span, state.word[i].toLowerCase());
    }

    wordBody.appendChild(span);
  }
}

function tryWordLetter(letter) {
  if (!state.word) return false;
  const norm = normalize(state.word);
  if (letter === norm[state.wordIdx]) {
    state.wordIdx++;
    if (state.wordIdx >= state.word.length) {
      // Word completed
      confetti();
      fanfare();
      say(state.wordDisplay || state.word);
      record('Words');
      if (state.wordEmoji) renderWord();
      maybeLevelUpWord();
      // ~35% chance to trigger a bonus picture quest after a win
      if (Math.random() < 0.35) setTimeout(startBonus, 2200);
      setTimeout(newWord, 1800);
    } else {
      renderWord();
      beep(880, 0.08, 'sine', 0.1);
    }
    return true;
  }
  return false;
}

// ─── BONUS QUEST (name the picture) ────────────────────────────────────────

const BONUS_DURATION_MS = 30000;

function startBonus() {
  if (state.bonus) return;
  const pool = buildEmojiWords(settings.lang);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.bonus = {
    word: pick.word.toUpperCase(),
    display: pick.raw.toUpperCase(),
    emoji: pick.emoji,
    idx: 0,
  };
  renderBonus();
  if (state.bonusTimer) clearTimeout(state.bonusTimer);
  state.bonusTimer = setTimeout(closeBonus, BONUS_DURATION_MS);
}

function closeBonus() {
  state.bonus = null;
  if (state.bonusTimer) { clearTimeout(state.bonusTimer); state.bonusTimer = null; }
  renderBonus();
}

function renderBonus() {
  const el = document.getElementById('bonus-quest');
  if (!el) return;
  if (!state.bonus) {
    el.classList.remove('active');
    el.innerHTML = '';
    return;
  }
  el.classList.add('active');
  el.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'bonus-banner';
  banner.textContent = PHRASES[settings.lang].bonus_label || 'BONUS';
  el.appendChild(banner);

  const em = document.createElement('div');
  em.className = 'bonus-emoji';
  em.textContent = state.bonus.emoji;
  el.appendChild(em);

  const revealed = document.createElement('div');
  revealed.className = 'bonus-revealed';
  for (let i = 0; i < state.bonus.idx; i++) {
    const c = document.createElement('span');
    c.textContent = state.bonus.display[i];
    makeTappable(c, state.bonus.word[i].toLowerCase());
    revealed.appendChild(c);
  }
  el.appendChild(revealed);

  const timer = document.createElement('div');
  timer.className = 'bonus-timer';
  const bar = document.createElement('div');
  bar.className = 'bonus-timer-bar';
  bar.style.animationDuration = `${BONUS_DURATION_MS}ms`;
  timer.appendChild(bar);
  el.appendChild(timer);
}

function tryBonusLetter(letter) {
  if (!state.bonus) return false;
  if (letter === state.bonus.word[state.bonus.idx]) {
    state.bonus.idx++;
    if (state.bonus.idx >= state.bonus.word.length) {
      confetti(150);
      fanfare();
      say(state.bonus.display);
      record('Bonus');
      renderBonus();
      if (state.bonusTimer) { clearTimeout(state.bonusTimer); state.bonusTimer = null; }
      setTimeout(closeBonus, 1800);
    } else {
      renderBonus();
      beep(1320, 0.08, 'sine', 0.12);
    }
    return true;
  }
  return false;
}

function maybeLevelUpWord() {
  if (settings.wordDiff !== 'auto') return;
  state.wordStreak++;
  if (state.wordStreak >= STREAK_TO_LEVEL_UP && state.wordLevel < WORD_MAX_LEVEL) {
    state.wordLevel++;
    state.wordStreak = 0;
    localStorage.setItem('ck-word-level', String(state.wordLevel));
    setTimeout(() => levelUpCelebration('word'), 1100);
  }
  updateLevelLabels();
}

// ─── MATH QUEST ─────────────────────────────────────────────────────────────

function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

function newEquation() {
  const lvl = effectiveMathLevel();
  let a, b, op, ans;
  const ops = lvl === 0 ? ['+']
    : lvl === 1 ? ['+']
    : lvl === 2 ? ['+', '-']
    : lvl === 3 ? ['+', '-', '×']
    :             ['+', '-', '×', '÷'];
  op = ops[Math.floor(Math.random() * ops.length)];
  if (lvl === 0) { a = randInt(0, 5); b = randInt(0, 5); }
  else { a = randInt(0, 9); b = randInt(0, 9); }
  if (op === '-' && b > a) [a, b] = [b, a];
  if (op === '×') { a = randInt(1, 5); b = randInt(1, 5); }
  if (op === '÷') { b = randInt(1, 5); ans = randInt(1, 5); a = b * ans; }
  switch (op) {
    case '+': ans = a + b; break;
    case '-': ans = a - b; break;
    case '×': ans = a * b; break;
    case '÷': /* already set */ break;
  }
  if (ans > 9 || ans < 0) return newEquation();
  state.eq = { a, b, op };
  state.eqAnswer = ans;
  state.eqAttempts = 0;
  renderEquation();
}

function renderEquation() {
  if (!state.eq) return;
  const { a, b, op } = state.eq;
  mathBody.innerHTML = '';
  const opKey = op === '×' ? '*' : op === '÷' ? '/' : op;
  const parts = [
    { t: String(a), cls: 'q-char done',  key: String(a) },
    { t: op,        cls: 'q-char op',    key: opKey },
    { t: String(b), cls: 'q-char done',  key: String(b) },
    { t: '=',       cls: 'q-char op',    key: null },
    { t: '?',       cls: 'q-char qmark', key: null },
  ];
  for (const p of parts) {
    const s = document.createElement('span');
    s.className = p.cls;
    s.textContent = p.t;
    if (p.key) makeTappable(s, p.key);
    mathBody.appendChild(s);
  }
}

function tryEquationAnswer(digit) {
  if (state.eq == null) return false;
  if (parseInt(digit, 10) === state.eqAnswer) {
    confetti();
    fanfare();
    say(String(state.eqAnswer));
    record('Math');
    const firstTry = state.eqAttempts === 0;
    state.eq = null;
    mathBody.innerHTML = '';
    if (firstTry) maybeLevelUpMath();
    setTimeout(newEquation, 1800);
    return true;
  } else {
    sadBoop();
    state.eqAttempts++;
    return false;
  }
}

function maybeLevelUpMath() {
  if (settings.mathDiff !== 'auto') return;
  state.mathStreak++;
  if (state.mathStreak >= STREAK_TO_LEVEL_UP && state.mathLevel < MATH_MAX_LEVEL) {
    state.mathLevel++;
    state.mathStreak = 0;
    localStorage.setItem('ck-math-level', String(state.mathLevel));
    setTimeout(() => levelUpCelebration('math'), 1100);
  }
  updateLevelLabels();
}

function levelUpCelebration(which) {
  record('LevelUps');
  confetti(120);
  if (settings.sound) {
    const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.4, 'square', 0.14), i * 100));
  }
  say(PHRASES[settings.lang].level_up);
  const lvNum = (which === 'word' ? state.wordLevel : state.mathLevel) + 1;
  const el = document.createElement('div');
  el.className = 'spawn c' + (Math.floor(Math.random() * 7)) + ' v-pop';
  el.innerHTML = `<span>Lv ${lvNum}</span><span class="emoji">🎉</span>`;
  el.style.left = '50%';
  el.style.top = '40%';
  stage.appendChild(el);
  setTimeout(() => el.remove(), settings.reduceMotion ? 1500 : 3300);
  updateLevelLabels();
}

function updateLevelLabels() {
  const wordLv = document.getElementById('word-level');
  const mathLv = document.getElementById('math-level');
  const wIdx = settings.wordDiff === 'auto' ? state.wordLevel : parseInt(settings.wordDiff, 10);
  const mIdx = settings.mathDiff === 'auto' ? state.mathLevel : parseInt(settings.mathDiff, 10);
  if (wordLv) wordLv.textContent = `· Lv ${wIdx + 1}`;
  if (mathLv) mathLv.textContent = `· Lv ${mIdx + 1}`;
}

// ─── INPUT ──────────────────────────────────────────────────────────────────

function handleKey(rawKey) {
  if (parentGate.open || settingsDialog.open) return;

  setCount(state.keyCount + 1);
  record('Keys');

  // Letter
  if (/^[a-zA-ZÀ-ÿ]$/.test(rawKey)) {
    const up = rawKey.toUpperCase();
    const norm = normalize(up);
    // Look up by raw accented letter first (e.g. Ç has its own words), then fall back to normalized
    const data = pickLetterContent(up) || pickLetterContent(norm);
    if (data) {
      spawn(up, data[1]);
      say(`${up}. ${data[0]}`);
      letterTone(norm);
    } else {
      spawn(up);
      letterTone(norm);
    }
    const matchedQuest = tryWordLetter(norm);
    const matchedBonus = tryBonusLetter(norm);
    maybeSwitchTheme(norm, matchedQuest || matchedBonus);
    return;
  }

  // Digit
  if (/^[0-9]$/.test(rawKey)) {
    spawn(rawKey, '🔢');
    say(rawKey);
    digitTone(parseInt(rawKey, 10));
    tryEquationAnswer(rawKey);
    return;
  }

  // Operators
  if (rawKey === '+' || rawKey === '-' || rawKey === '*' || rawKey === '/') {
    spawn(rawKey === '*' ? '×' : rawKey === '/' ? '÷' : rawKey, '');
    beep(660, 0.15, 'square', 0.12);
    return;
  }

  if (rawKey === ' ' || rawKey === 'Spacebar' || rawKey === 'Enter') {
    confetti(30);
    fanfare();
    return;
  }

  // Single visible punctuation — show the char + random emoji
  if (rawKey.length === 1) {
    spawn(rawKey, randomFunEmoji());
    beep(440 + Math.random() * 440, 0.12, 'triangle', 0.14);
    return;
  }

  // Multi-char key names (Control, Shift, Alt, Meta, Tab, ArrowLeft, F1-F12, etc.)
  randomDelight();
}

const FUN_EMOJI = ['🎈','🌟','⭐','✨','🎉','🌈','🦋','🌸','🍭','🎁','🪩','🎨','🚀','🪐','🌺','🍦','🎵','🎂','🧁','🎊','💫','🦄','🌻','🐞','🍓','🍒','🌮','🍔','🍩','🦜','🐠','🌊'];
function randomFunEmoji() {
  return FUN_EMOJI[Math.floor(Math.random() * FUN_EMOJI.length)];
}
function randomDelight() {
  const e = randomFunEmoji();
  spawn(e, '');
  const notes = [392, 440, 523, 587, 659, 784, 880, 1046, 1175, 1318];
  const note = notes[Math.floor(Math.random() * notes.length)];
  const type = Math.random() < 0.5 ? 'triangle' : 'sine';
  beep(note, 0.16, type, 0.14);
  if (Math.random() < 0.12) confetti(20);
}

window.addEventListener('keydown', e => {
  // Adult settings shortcut — its own listener handles this
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') return;
  // Leave native browser keys alone
  if (e.key === 'F11' || e.key === 'F12') return;
  // Don't fire while in a dialog (parent gate / settings handle their own keys)
  if (parentGate.open || settingsDialog.open) {
    if (e.key === 'Escape') return; // let dialog close natively
    return;
  }
  e.preventDefault();
  handleKey(e.key);
});

// Cursor trail — pretty colored orbs that drift up and fade. Throttled and
// skipped under reduceEffects so the TV doesn't pay for it.
const TRAIL_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#06d6a0'];
let lastTrailAt = 0;
window.addEventListener('pointermove', (e) => {
  if (settings.reduceEffects) return;
  if (parentGate.open || settingsDialog.open) return;
  const now = performance.now();
  if (now - lastTrailAt < 25) return;
  lastTrailAt = now;
  const t = document.createElement('div');
  t.className = 'cursor-trail';
  t.style.left = e.clientX + 'px';
  t.style.top = e.clientY + 'px';
  t.style.setProperty('--trail-c', TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)]);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 750);
});

// Pointer/touch on stage = random key, spawned at the pointer's location
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, dialog, label, select, input, [data-key]')) return;
  spawnOriginOverride = {
    x: (e.clientX / window.innerWidth) * 100,
    y: (e.clientY / window.innerHeight) * 100,
  };
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  handleKey(keys[Math.floor(Math.random() * keys.length)]);
});

// ─── PARENT GATE ────────────────────────────────────────────────────────────

let holdTimer = null;
let promptedKey = null;

function startHold() {
  parentCorner.classList.add('holding');
  holdTimer = setTimeout(openParentGate, 3000);
}
function cancelHold() {
  parentCorner.classList.remove('holding');
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
}
parentCorner.addEventListener('pointerdown', startHold);
parentCorner.addEventListener('pointerup', cancelHold);
parentCorner.addEventListener('pointerleave', cancelHold);
parentCorner.addEventListener('pointercancel', cancelHold);

function openParentGate() {
  cancelHold();
  promptedKey = String(randInt(1, 9));
  parentPromptKey.textContent = promptedKey;
  parentGate.showModal();

  const unlock = () => {
    window.removeEventListener('keydown', keyHandler, true);
    parentGate.close();
    openSettings();
  };
  const keyHandler = (e) => {
    if (e.key === promptedKey) {
      e.preventDefault();
      e.stopPropagation();
      unlock();
    } else if (e.key === 'Escape') {
      window.removeEventListener('keydown', keyHandler, true);
    }
  };
  const padHandler = (e) => {
    const btn = e.target.closest('button[data-digit]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.digit === promptedKey) unlock();
  };
  const keypad = document.getElementById('parent-keypad');
  window.addEventListener('keydown', keyHandler, true);
  keypad.addEventListener('click', padHandler);
  parentGate.addEventListener('close', () => {
    window.removeEventListener('keydown', keyHandler, true);
    keypad.removeEventListener('click', padHandler);
  }, { once: true });
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────

function applyTheme() {
  if (settings.theme !== 'auto') currentTheme = settings.theme;
  document.body.className = 'theme-' + effectiveTheme() +
    (settings.quests ? '' : ' no-quests') +
    (settings.reduceMotion ? ' reduce-motion' : '');
  document.documentElement.classList.toggle('reduce-effects', settings.reduceEffects);
  document.documentElement.style.setProperty('--motion', settings.reduceMotion ? '0.4' : '1');
  renderBgParticles();
}

// Each iconic letter switches the theme to its world.
const THEME_TRIGGERS = {
  ocean:   ['F', 'W', 'J'],    // Fish, Whale, Jellyfish
  jungle:  ['L', 'M', 'T'],    // Lion, Monkey, Tiger
  space:   ['S'],              // Sun / Sol
  rainbow: ['K', 'Y'],         // Kite / Yo-yo (default-y)
};
function themeForLetter(normLetter) {
  for (const [theme, letters] of Object.entries(THEME_TRIGGERS)) {
    if (letters.includes(normLetter)) return theme;
  }
  return null;
}
// Throttle theme switching so it doesn't flip on every keypress: require the
// child to hit a theme's trigger letters several times AND wait through a
// cooldown since the last switch. Counts reset on switch.
const THEME_SWITCH_COOLDOWN_MS = 30000;
const THEME_HITS_REQUIRED = 7;
let lastThemeSwitchAt = 0;
const themeHits = {};

function maybeSwitchTheme(normLetter, wasQuestProgress) {
  if (settings.theme !== 'auto') return;
  if (wasQuestProgress) return;
  const t = themeForLetter(normLetter);
  if (!t || t === currentTheme) return;

  themeHits[t] = (themeHits[t] || 0) + 1;
  if (performance.now() - lastThemeSwitchAt < THEME_SWITCH_COOLDOWN_MS) return;
  if (themeHits[t] < THEME_HITS_REQUIRED) return;

  currentTheme = t;
  applyTheme();
  lastThemeSwitchAt = performance.now();
  for (const k of Object.keys(themeHits)) themeHits[k] = 0;
}

// ─── BACKGROUND PARTICLES ──────────────────────────────────────────────────

let shootingStarTimer = null;

function renderBgParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
  container.innerHTML = '';
  if (shootingStarTimer) { clearTimeout(shootingStarTimer); shootingStarTimer = null; }

  // Even with reduce-motion, render a few static particles (no motion via CSS rule)
  const density = settings.reduceMotion ? 0.4 : (settings.reduceEffects ? 0.5 : 1);
  const theme = effectiveTheme();

  if (theme === 'space') {
    const n = Math.floor(110 * density);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'star' + (Math.random() < 0.18 ? ' big' : '');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.setProperty('--dur', (1.8 + Math.random() * 3.5) + 's');
      s.style.setProperty('--delay', (Math.random() * 4) + 's');
      container.appendChild(s);
    }
    if (!settings.reduceMotion && !settings.reduceEffects) scheduleShootingStar(container);
  } else if (theme === 'ocean') {
    const n = Math.floor(16 * density);
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size = 10 + Math.random() * 38;
      b.style.setProperty('--size', size + 'px');
      b.style.setProperty('--dur', (10 + Math.random() * 14) + 's');
      b.style.setProperty('--delay', (-Math.random() * 16) + 's');
      b.style.setProperty('--x', (Math.random() * 100) + '%');
      b.style.setProperty('--sway', ((Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 80)) + 'px');
      container.appendChild(b);
    }
  } else if (theme === 'jungle') {
    ['b-a', 'b-b', 'b-c'].forEach((cls, i) => {
      const beam = document.createElement('div');
      beam.className = 'sun-beam ' + cls;
      beam.style.setProperty('--delay', (i * 1.7) + 's');
      container.appendChild(beam);
    });
    const leafEmoji = ['🍃', '🍂', '🌿'];
    const n = Math.floor(18 * density);
    for (let i = 0; i < n; i++) {
      const l = document.createElement('div');
      l.className = 'leaf';
      l.textContent = leafEmoji[i % leafEmoji.length];
      l.style.setProperty('--x', (Math.random() * 100) + '%');
      l.style.setProperty('--dur', (12 + Math.random() * 12) + 's');
      l.style.setProperty('--spin', (3.5 + Math.random() * 4) + 's');
      l.style.setProperty('--delay', (-Math.random() * 20) + 's');
      l.style.setProperty('--sway', (Math.random() * 60 - 30) + 'vw');
      l.style.setProperty('--size', (1.1 + Math.random() * 1) + 'rem');
      container.appendChild(l);
    }
  } else if (theme === 'baby') {
    // High-contrast newborn-vision scene: a small, deliberate composition
    // (target + sun + moon + sparse stars) rather than random scatter.
    // Inspired by Wee Gallery / Sassy infant board books — balanced, calm,
    // with generous negative space.
    const RED = '#e63946';
    const scene = [
      // Big white bullseye target — left, focal point
      { cls: 'bullseye', size: 34, left: 14, top: 18, color: '#ffffff', dur: 11, delay: 0 },
      // Red sunburst — right, mid
      { cls: 'sunburst', size: 30, left: 70, top: 28, color: RED, dur: 110, delay: 0 },
      // Solid white moon — bottom-left
      { cls: 'disc', size: 14, left: 8, top: 70, color: '#ffffff', dur: 28, dx: 2, dy: -1, delay: -6 },
      // Red checkerboard — bottom-right; different motif from the bullseye/sunburst
      { cls: 'checker', size: 22, left: 78, top: 68, color: RED, dur: 12, delay: -3 },
      // Sparse stars — small white dots, scattered but intentional
      { cls: 'dot', size: 1.6, left: 48, top: 8,  color: '#ffffff', dur: 3.5, delay: 0 },
      { cls: 'dot', size: 1.2, left: 92, top: 12, color: '#ffffff', dur: 5,   delay: -1 },
      { cls: 'dot', size: 1.4, left: 38, top: 88, color: '#ffffff', dur: 4.2, delay: -2.5 },
      { cls: 'dot', size: 1.0, left: 60, top: 92, color: '#ffffff', dur: 3.8, delay: -0.8 },
      { cls: 'dot', size: 1.3, left: 4,  top: 42, color: '#ffffff', dur: 4.6, delay: -1.5 },
    ];
    // With reduce-motion we still want the composition — just no twinkle.
    for (const s of scene) {
      const el = document.createElement('div');
      el.className = 'baby-shape ' + s.cls;
      el.style.width = s.size + 'vmin';
      el.style.height = s.size + 'vmin';
      el.style.left = s.left + 'vw';
      el.style.top = s.top + 'vh';
      el.style.setProperty('--ring-color', s.color);
      el.style.setProperty('--dur', s.dur + 's');
      el.style.setProperty('--delay', s.delay + 's');
      if (s.dx != null) el.style.setProperty('--dx', s.dx + 'vw');
      if (s.dy != null) el.style.setProperty('--dy', s.dy + 'vh');
      container.appendChild(el);
    }
  } else {
    // rainbow: floating soap bubbles
    const n = Math.floor(22 * density);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.setProperty('--size', (8 + Math.random() * 30) + 'px');
      s.style.setProperty('--x', (Math.random() * 100) + '%');
      s.style.setProperty('--y', (Math.random() * 100) + '%');
      s.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      s.style.setProperty('--dy', (-30 - Math.random() * 60) + 'px');
      s.style.setProperty('--dur', (5 + Math.random() * 7) + 's');
      s.style.setProperty('--delay', (-Math.random() * 8) + 's');
      container.appendChild(s);
    }
  }
}

function scheduleShootingStar(container) {
  shootingStarTimer = setTimeout(() => {
    if (effectiveTheme() !== 'space' || settings.reduceMotion || settings.reduceEffects) return;
    const s = document.createElement('div');
    s.className = 'shooting-star';
    s.style.top = (Math.random() * 40) + '%';
    s.style.left = (-10 - Math.random() * 20) + '%';
    container.appendChild(s);
    setTimeout(() => s.remove(), 2400);
    scheduleShootingStar(container);
  }, 5000 + Math.random() * 12000);
}

function rebuildVoicePicker() {
  const sel = document.getElementById('set-voice-pick');
  if (!sel) return;
  // Clear all but the "Auto" first option
  while (sel.options.length > 1) sel.remove(1);
  const wantPt = settings.lang === 'pt';
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(wantPt ? 'pt' : 'en'));
  // Sort: pt-PT/non-BR first, then BR
  langVoices.sort((a, b) => {
    if (wantPt) {
      const aBR = isBrazilian(a), bBR = isBrazilian(b);
      if (aBR !== bBR) return aBR ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
  for (const v of langVoices) {
    const opt = document.createElement('option');
    opt.value = `${v.name}|${v.lang}`;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  }
  const currentKey = wantPt ? settings.ptVoice : settings.enVoice;
  sel.value = currentKey || '';
}

function openSettings() {
  document.getElementById('set-lang').value = settings.lang;
  document.getElementById('set-theme').value = settings.theme;
  document.getElementById('set-sound').checked = settings.sound;
  document.getElementById('set-voice').checked = settings.voice;
  document.getElementById('set-quests').checked = settings.quests;
  document.getElementById('set-falling-letters').checked = settings.fallingLetters;
  document.getElementById('set-reduce-motion').checked = settings.reduceMotion;
  document.getElementById('set-reduce-effects').checked = settings.reduceEffects;
  document.getElementById('set-fullscreen').checked = !!document.fullscreenElement;
  document.getElementById('set-word-diff').value = settings.wordDiff;
  document.getElementById('set-math-diff').value = settings.mathDiff;
  rebuildVoicePicker();
  // Populate stats numbers
  rollIfNewDay();
  document.getElementById('st-today-keys').textContent = stats.todayKeys.toLocaleString();
  document.getElementById('st-today-words').textContent = stats.todayWords.toLocaleString();
  document.getElementById('st-today-math').textContent = stats.todayMath.toLocaleString();
  document.getElementById('st-today-levelups').textContent = stats.todayLevelUps.toLocaleString();
  document.getElementById('st-all-keys').textContent = stats.allTimeKeys.toLocaleString();
  document.getElementById('st-all-words').textContent = stats.allTimeWords.toLocaleString();
  document.getElementById('st-all-math').textContent = stats.allTimeMath.toLocaleString();
  document.getElementById('st-all-levelups').textContent = stats.allTimeLevelUps.toLocaleString();
  document.getElementById('st-today-bonus').textContent = stats.todayBonus.toLocaleString();
  document.getElementById('st-all-bonus').textContent = stats.allTimeBonus.toLocaleString();
  settingsDialog.showModal();
}

document.getElementById('settings-form').addEventListener('change', (e) => {
  // Fullscreen toggle is special: it's a runtime state, not a saved preference.
  if (e.target.id === 'set-fullscreen') {
    if (e.target.checked) enterKiosk(); else exitKiosk();
    return;
  }

  const prevLang = settings.lang;
  settings.lang = document.getElementById('set-lang').value;
  settings.theme = document.getElementById('set-theme').value;
  settings.sound = document.getElementById('set-sound').checked;
  settings.voice = document.getElementById('set-voice').checked;
  settings.quests = document.getElementById('set-quests').checked;
  settings.fallingLetters = document.getElementById('set-falling-letters').checked;
  settings.reduceMotion = document.getElementById('set-reduce-motion').checked;
  settings.reduceEffects = document.getElementById('set-reduce-effects').checked;
  settings.wordDiff = document.getElementById('set-word-diff').value;
  settings.mathDiff = document.getElementById('set-math-diff').value;
  const vp = document.getElementById('set-voice-pick').value;
  if (settings.lang === 'pt') settings.ptVoice = vp; else settings.enVoice = vp;

  saveSettings();
  applyTheme();
  applyI18n();
  newWord();
  newEquation();
  updateLevelLabels();
  if (settings.lang !== prevLang || e.target.id === 'set-lang') rebuildVoicePicker();
});

// Keep the fullscreen checkbox in sync with the actual fullscreen state
// (Esc, F11, OS-level exits all dispatch fullscreenchange).
document.addEventListener('fullscreenchange', () => {
  const cb = document.getElementById('set-fullscreen');
  if (cb && settingsDialog.open) cb.checked = !!document.fullscreenElement;
});

document.getElementById('btn-test-voice').addEventListener('click', () => {
  const t = settings.lang === 'pt' ? 'Olá! Vamos brincar com letras.' : 'Hello! Let\'s play with letters.';
  say(t);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  setCount(0);
});

// Hidden keyboard shortcut for adults to open settings (Ctrl+Alt+S)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    openSettings();
  }
});

// ─── KIOSK (fullscreen + keyboard lock) ─────────────────────────────────────
//
// On Chromium, navigator.keyboard.lock() captures keys that normally exit
// fullscreen — Esc, F11, F12, Alt+Tab, Win/Cmd, etc. The kid can press them
// but they don't fire the OS-level "exit fullscreen" / "switch window"
// action; the keydown still reaches our handler so spawns still happen.
// Firefox/Safari don't support lock — we still request fullscreen, and on
// the next user gesture we re-enter if it dropped.

let wantsFullscreen = false;
let kioskRequestInFlight = false;

function ensureKiosk() {
  if (!wantsFullscreen || document.fullscreenElement || kioskRequestInFlight) return;
  kioskRequestInFlight = true;
  document.documentElement.requestFullscreen?.()
    .then(() => navigator.keyboard?.lock?.())
    .catch(() => {})
    .finally(() => { kioskRequestInFlight = false; });
}

function enterKiosk() {
  wantsFullscreen = true;
  ensureKiosk();
}

async function exitKiosk() {
  wantsFullscreen = false;
  try { navigator.keyboard?.unlock?.(); } catch {}
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
}

// First user gesture sets wants=true; the regular listener re-enters if it drops.
// webOS apps are already fullscreen — no need to request it or listen for Esc.
if (!isWebOS) {
  window.addEventListener('pointerdown', enterKiosk, { once: true });
  window.addEventListener('keydown', enterKiosk, { once: true });
  window.addEventListener('pointerdown', ensureKiosk);
  window.addEventListener('keydown', ensureKiosk);

  // Hold Esc for 1.5s to exit kiosk — browser native hold-Esc isn't reliable
  // once keyboard.lock() has captured the key, so we DIY it.
  const ESC_HOLD_MS = 1500;
  let escHoldTimer = null;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.repeat || escHoldTimer) return;
    escHoldTimer = setTimeout(() => {
      escHoldTimer = null;
      exitKiosk();
    }, ESC_HOLD_MS);
  }, true);
  window.addEventListener('keyup', (e) => {
    if (e.key !== 'Escape') return;
    if (escHoldTimer) { clearTimeout(escHoldTimer); escHoldTimer = null; }
  }, true);
}

// ─── RAIN (falling letter/digit bubbles) ───────────────────────────────────

const RAIN_INTERVAL_MS = 1700;
const RAIN_MAX_ON_SCREEN = 9;
const rainCap = () => settings.reduceEffects ? 5 : RAIN_MAX_ON_SCREEN;
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let rainTimer = null;
let rainCycle = 0;
const rainContainer = document.getElementById('rain');

function rainActive() {
  if (!settings.fallingLetters) return false;
  if (!settings.quests) return false;
  if (parentGate.open || settingsDialog.open) return false;
  return !!(state.word || state.eq || state.bonus);
}

function nextLetterKey() {
  if (state.bonus) return state.bonus.word[state.bonus.idx]?.toLowerCase();
  if (!state.word) return null;
  const norm = normalize(state.word);
  return norm[state.wordIdx]?.toLowerCase();
}

function randomDecoyLetter(avoid) {
  let c;
  do { c = ALPHA[Math.floor(Math.random() * 26)].toLowerCase(); }
  while (c === avoid);
  return c;
}

function randomDecoyDigit(avoid) {
  let d;
  do { d = Math.floor(Math.random() * 10); } while (d === avoid);
  return String(d);
}

function pickRainKey() {
  const needLetter = !!(state.word || state.bonus);
  const needDigit = !!state.eq;
  const correctLetter = needLetter ? nextLetterKey() : null;
  const correctDigit = needDigit ? String(state.eqAnswer) : null;

  const slot = rainCycle++ % 4;
  if (slot === 0 && correctLetter) return correctLetter;
  if (slot === 1 && correctDigit) return correctDigit;
  if (slot === 2 && needLetter) return randomDecoyLetter(correctLetter);
  if (slot === 3 && needDigit) return randomDecoyDigit(state.eqAnswer);
  // fallbacks
  if (correctLetter) return correctLetter;
  if (correctDigit) return correctDigit;
  if (needLetter) return randomDecoyLetter(null);
  if (needDigit) return randomDecoyDigit(-1);
  return null;
}

function spawnRainBubble() {
  if (!rainActive()) return;
  if (rainContainer.childElementCount >= rainCap()) return;
  const key = pickRainKey();
  if (!key) return;

  const b = document.createElement('button');
  b.type = 'button';
  const colorIdx = Math.floor(Math.random() * 7);
  b.className = 'rain-bubble c' + colorIdx;
  b.textContent = key.toUpperCase();

  const xvw = 4 + Math.random() * 88;
  const sx1 = (Math.random() * 80 - 40);
  const sx2 = (Math.random() * 80 - 40);
  const dur = 11 + Math.random() * 5;
  b.style.setProperty('--x', xvw + 'vw');
  b.style.setProperty('--sx1', sx1 + 'px');
  b.style.setProperty('--sx2', sx2 + 'px');
  b.style.setProperty('--dur', dur + 's');

  // Pop on first pointer crossing — mouse hover, touch drag-through, and
  // Magic Remote cursor sweep all use the same gesture. 250ms settling
  // window so a bubble spawning under a stationary cursor doesn't insta-pop.
  b.dataset.bornAt = String(Date.now());
  b.dataset.key = key;
  // On touch, the browser captures the pointer to the initial target which
  // prevents pointerenter on subsequent bubbles during a swipe. Release it.
  b.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      try { b.releasePointerCapture(e.pointerId); } catch {}
    }
  });
  b.addEventListener('pointerenter', () => {
    if (Date.now() - Number(b.dataset.bornAt) < 250) return;
    onRainTap(b, key);
  });
  // Click stays as a fallback for any pointer input that bypasses enter.
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onRainTap(b, key);
  });
  b.addEventListener('animationend', () => b.remove());
  rainContainer.appendChild(b);
}

// Global swipe-through pop: even if pointer capture holds the touch to the
// initial element, pointermove still fires on the window. elementFromPoint
// finds whichever bubble is currently under the finger.
window.addEventListener('pointermove', (e) => {
  if (parentGate.open || settingsDialog.open) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.classList || !el.classList.contains('rain-bubble')) return;
  if (el.classList.contains('pop')) return;
  if (Date.now() - Number(el.dataset.bornAt || 0) < 250) return;
  onRainTap(el, el.dataset.key);
});

function onRainTap(bubble, key) {
  if (bubble.classList.contains('pop')) return;
  // Freeze the bubble at its current rendered position so the pop animation
  // doesn't jump back to the rain-fall starting transform.
  const rect = bubble.getBoundingClientRect();
  const parentRect = rainContainer.getBoundingClientRect();
  // Hand the spawn its origin in viewport-% so the letter pops up at the bubble.
  spawnOriginOverride = {
    x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
    y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
  };
  bubble.style.animation = 'none';
  bubble.style.transform = 'none';
  bubble.style.left = (rect.left - parentRect.left) + 'px';
  bubble.style.top = (rect.top - parentRect.top) + 'px';
  void bubble.offsetWidth; // force reflow before swapping to pop animation
  bubble.classList.add('pop');
  setTimeout(() => bubble.remove(), 500);
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function rainTick() {
  if (!rainActive()) return;
  spawnRainBubble();
}

function startRain() {
  if (rainTimer) return;
  rainTimer = setInterval(rainTick, RAIN_INTERVAL_MS);
  // immediate first spawn so the user sees something quickly
  setTimeout(rainTick, 400);
}

// ─── INIT ───────────────────────────────────────────────────────────────────

applyTheme();
applyI18n();
setCount(state.keyCount);
newWord();
newEquation();
updateLevelLabels();
startRain();

// Try to prime audio on first user interaction
window.addEventListener('pointerdown', () => audio(), { once: true });
window.addEventListener('keydown', () => audio(), { once: true });

// Service worker — skip on localhost / file:// so dev iteration isn't cached
const isLocalDev = location.hostname === 'localhost'
  || location.hostname === '127.0.0.1'
  || location.protocol === 'file:';
if ('serviceWorker' in navigator && !isLocalDev && !settings.reduceEffects) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

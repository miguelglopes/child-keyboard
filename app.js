// ─── PLATFORM ───────────────────────────────────────────────────────────────
// Runtime detection so the same bundle works in a desktop browser and in an
// LG webOS app. webOS apps are already fullscreen and have no Esc key, so the
// kiosk/keyboard-lock code is skipped there (see KIOSK section below).

const isWebOS = !!window.PalmSystem || /web0s|webos/i.test(navigator.userAgent);
const isTouchCapable = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
// Rain bubbles are only useful where the kid can swipe through them — touch
// screens and TVs (Magic Remote cursor). On a desktop browser they're just
// noise during keyboard play, so suppress them there.
const rainAllowed = isTouchCapable || isWebOS;

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

// Per-theme letters. Each theme replaces the base LETTERS for the keys it
// covers; uncovered keys fall back to LETTERS. A missing `en` map falls back
// to `pt` (names that are the same in both). PT character names must match
// the Portuguese (PT-PT) dub (e.g. Chickaletta → Galinheta, Wildstar →
// Estrela); never guess one — leave the character out until it's confirmed.
// Icons are either emoji or a character image (see ch()). Character themes
// (kids' shows) mix their characters with things from the show and carry
// their own background particles; in auto mode their characters' initials
// switch to them (THEME_TRIGGERS).

// Character art is copyrighted, so assets/chars/ is gitignored and fetched by
// tools/fetch-art.sh (160px WebP, a few KB each). Every character has an
// emoji shown when its image is missing; it rides in the URL fragment so an
// icon stays a single string everywhere it's passed around.
const CHAR_FALLBACK = {
  paw: {
    ryder: '🛵', chase: '🚓', marshall: '🚒', skye: '🚁', rubble: '🚧', rocky: '♻️',
    zuma: '🚤', everest: '❄️', tracker: '🌴', liberty: '🛴', chickaletta: '🐔',
  },
  masha: {
    masha: '👧', urso: '🐻', panda: '🐼', pinguim: '🐧', lobo: '🐺', coelho: '🐰',
    cabra: '🐐', tigre: '🐯', esquilo: '🐿️', porquinha: '🐷',
  },
  unicorn: {
    sophia: '🌈', wildstar: '🦄', ava: '🌸', leaf: '🌿', layla: '📖', glacier: '❄️',
    isabel: '🏅', river: '💧', valentina: '👑', cinder: '🔥', rory: '⚡', storm: '⛈️',
  },
  panda: { panda: '🐼', pipa: '💛', pedro: '🛹', clarinha: '👑', matias: '📚' },
  mickey: {
    mickey: '🐭', minnie: '🎀', donald: '🦆', margarida: '🌼', pateta: '🧢', pluto: '🐕',
    patinhas: '💰', clarabela: '🐄', horacio: '🐴', tico: '🐿️', teco: '🌰',
  },
};
const ch = (theme, id) => `assets/chars/${theme}/${id}.webp#${CHAR_FALLBACK[theme][id]}`;
const isImageIcon = (icon) => icon.startsWith('assets/');

const THEME_CONTENT = {
  rainbow: {
    letters: {
      pt: {
        B: [['Balão', '🎈'], ['Borboleta', '🦋'], ['Bolo', '🎂']],
        C: [['Coração', '❤️'], ['Coroa', '👑']],
        D: [['Doce', '🍬'], ['Diamante', '💎']],
        E: [['Estrela', '⭐']],
        F: [['Fada', '🧚'], ['Flor', '🌸']],
        G: [['Gelado', '🍦']],
        L: [['Laço', '🎀']],
        M: [['Morango', '🍓']],
        P: [['Presente', '🎁'], ['Princesa', '👸'], ['Papagaio', '🪁']],
        S: [['Sereia', '🧜‍♀️']],
        U: [['Unicórnio', '🦄']],
      },
      en: {
        B: [['Balloon', '🎈'], ['Butterfly', '🦋']],
        C: [['Cupcake', '🧁'], ['Crown', '👑']],
        D: [['Diamond', '💎']],
        F: [['Fairy', '🧚'], ['Flower', '🌸']],
        G: [['Gift', '🎁']],
        H: [['Heart', '❤️']],
        K: [['Kite', '🪁']],
        L: [['Lollipop', '🍭']],
        M: [['Mermaid', '🧜‍♀️']],
        R: [['Rainbow', '🌈'], ['Ribbon', '🎀']],
        S: [['Star', '⭐'], ['Strawberry', '🍓']],
        U: [['Unicorn', '🦄']],
      },
    },
  },
  space: {
    letters: {
      pt: {
        A: [['Astronauta', '🧑‍🚀'], ['Asteroide', '🪨']],
        C: [['Cometa', '☄️']],
        E: [['Estrela', '⭐'], ['Extraterrestre', '👽']],
        F: [['Foguetão', '🚀']],
        G: [['Galáxia', '🌌']],
        L: [['Lua', '🌙']],
        M: [['Marte', '🔴']],
        N: [['Nave', '🛸']],
        P: [['Planeta', '🪐']],
        S: [['Sol', '☀️'], ['Satélite', '🛰️']],
        T: [['Terra', '🌍'], ['Telescópio', '🔭']],
      },
      en: {
        A: [['Astronaut', '🧑‍🚀'], ['Alien', '👽']],
        C: [['Comet', '☄️']],
        E: [['Earth', '🌍']],
        G: [['Galaxy', '🌌']],
        M: [['Moon', '🌙'], ['Mars', '🔴']],
        P: [['Planet', '🪐']],
        R: [['Rocket', '🚀']],
        S: [['Sun', '☀️'], ['Star', '⭐'], ['Satellite', '🛰️']],
        T: [['Telescope', '🔭']],
        U: [['UFO', '🛸']],
      },
    },
  },
  ocean: {
    letters: {
      pt: {
        A: [['Alforreca', '🪼'], ['Âncora', '⚓']],
        B: [['Baleia', '🐋'], ['Barco', '⛵']],
        C: [['Caranguejo', '🦀'], ['Concha', '🐚'], ['Coral', '🪸']],
        F: [['Foca', '🦭']],
        G: [['Golfinho', '🐬']],
        L: [['Lula', '🦑'], ['Lagosta', '🦞']],
        M: [['Mergulhador', '🤿'], ['Mar', '🌊']],
        O: [['Onda', '🌊'], ['Ostra', '🦪']],
        P: [['Peixe', '🐟'], ['Polvo', '🐙'], ['Pinguim', '🐧']],
        S: [['Sereia', '🧜‍♀️']],
        T: [['Tubarão', '🦈'], ['Tartaruga', '🐢']],
      },
      en: {
        A: [['Anchor', '⚓']],
        B: [['Boat', '⛵']],
        C: [['Crab', '🦀'], ['Coral', '🪸']],
        D: [['Dolphin', '🐬']],
        F: [['Fish', '🐟']],
        J: [['Jellyfish', '🪼']],
        L: [['Lobster', '🦞']],
        M: [['Mermaid', '🧜‍♀️']],
        O: [['Octopus', '🐙'], ['Oyster', '🦪']],
        P: [['Penguin', '🐧']],
        S: [['Shark', '🦈'], ['Seal', '🦭'], ['Shell', '🐚'], ['Squid', '🦑']],
        T: [['Turtle', '🐢']],
        W: [['Whale', '🐋'], ['Wave', '🌊']],
      },
    },
  },
  jungle: {
    letters: {
      pt: {
        A: [['Árvore', '🌳']],
        B: [['Borboleta', '🦋']],
        C: [['Cogumelo', '🍄'], ['Coruja', '🦉'], ['Crocodilo', '🐊']],
        E: [['Elefante', '🐘'], ['Esquilo', '🐿️']],
        F: [['Folha', '🍃'], ['Flor', '🌺']],
        G: [['Gorila', '🦍'], ['Girafa', '🦒']],
        H: [['Hipopótamo', '🦛']],
        I: [['Iguana', '🦎']],
        J: [['Javali', '🐗']],
        L: [['Leão', '🦁'], ['Lobo', '🐺']],
        M: [['Macaco', '🐒']],
        O: [['Ouriço', '🦔']],
        P: [['Papagaio', '🦜'], ['Pinheiro', '🌲']],
        R: [['Raposa', '🦊']],
        S: [['Serpente', '🐍'], ['Sapo', '🐸']],
        T: [['Tigre', '🐯']],
        U: [['Urso', '🐻']],
        V: [['Veado', '🦌']],
        Z: [['Zebra', '🦓']],
      },
      en: {
        B: [['Bear', '🐻'], ['Butterfly', '🦋']],
        C: [['Crocodile', '🐊']],
        D: [['Deer', '🦌']],
        E: [['Elephant', '🐘']],
        F: [['Fox', '🦊'], ['Frog', '🐸']],
        G: [['Gorilla', '🦍'], ['Giraffe', '🦒']],
        H: [['Hedgehog', '🦔']],
        L: [['Lion', '🦁'], ['Leaf', '🍃']],
        M: [['Monkey', '🐒'], ['Mushroom', '🍄']],
        O: [['Owl', '🦉']],
        P: [['Parrot', '🦜'], ['Pine', '🌲']],
        S: [['Snake', '🐍'], ['Squirrel', '🐿️']],
        T: [['Tiger', '🐯'], ['Tree', '🌳']],
        W: [['Wolf', '🐺']],
        Z: [['Zebra', '🦓']],
      },
    },
  },
  baby: {
    letters: {
      pt: {
        B: [['Bebé', '👶'], ['Biberão', '🍼'], ['Balão', '🎈']],
        C: [['Coração', '❤️']],
        E: [['Estrela', '⭐']],
        L: [['Lua', '🌙']],
        M: [['Mamã', '👩']],
        N: [['Nuvem', '☁️']],
        P: [['Papá', '👨'], ['Patinho', '🐤']],
        S: [['Sol', '☀️']],
        U: [['Ursinho', '🧸']],
      },
      en: {
        B: [['Baby', '👶'], ['Bottle', '🍼'], ['Balloon', '🎈']],
        C: [['Cloud', '☁️']],
        D: [['Duck', '🐤'], ['Daddy', '👨']],
        H: [['Heart', '❤️']],
        M: [['Mommy', '👩'], ['Moon', '🌙']],
        S: [['Star', '⭐'], ['Sun', '☀️']],
        T: [['Teddy', '🧸']],
      },
    },
  },
  paw: {
    particles: ['🐾', '🦴', '⭐'],
    letters: {
      pt: {
        A: [['Ambulância', '🚑']],
        B: [['Bombeiro', '🧑‍🚒'], ['Barco', '🚤']],
        C: [['Chase', ch('paw', 'chase')], ['Camião', '🚚']],
        E: [['Everest', ch('paw', 'everest')]],
        G: [['Grua', '🏗️'], ['Galinheta', ch('paw', 'chickaletta')]],
        H: [['Helicóptero', '🚁']],
        L: [['Liberty', ch('paw', 'liberty')]],
        M: [['Marshall', ch('paw', 'marshall')], ['Mar', '🌊']],
        N: [['Neve', '❄️']],
        O: [['Osso', '🦴']],
        P: [['Polícia', '👮'], ['Pata', '🐾']],
        R: [['Ryder', ch('paw', 'ryder')], ['Reciclagem', '♻️'], ['Rubble', ch('paw', 'rubble')], ['Rocky', ch('paw', 'rocky')]],
        S: [['Skye', ch('paw', 'skye')], ['Sirene', '🚨']],
        T: [['Tracker', ch('paw', 'tracker')], ['Torre', '🗼']],
        Z: [['Zuma', ch('paw', 'zuma')]],
      },
      en: {
        A: [['Ambulance', '🚑']],
        B: [['Boat', '🚤'], ['Bone', '🦴']],
        C: [['Chase', ch('paw', 'chase')], ['Crane', '🏗️'], ['Chickaletta', ch('paw', 'chickaletta')]],
        E: [['Everest', ch('paw', 'everest')]],
        F: [['Firefighter', '🧑‍🚒']],
        H: [['Helicopter', '🚁']],
        L: [['Liberty', ch('paw', 'liberty')]],
        M: [['Marshall', ch('paw', 'marshall')]],
        P: [['Police', '👮'], ['Paw', '🐾']],
        R: [['Ryder', ch('paw', 'ryder')], ['Recycling', '♻️'], ['Rubble', ch('paw', 'rubble')], ['Rocky', ch('paw', 'rocky')]],
        S: [['Skye', ch('paw', 'skye')], ['Siren', '🚨'], ['Snow', '❄️']],
        T: [['Tracker', ch('paw', 'tracker')], ['Tower', '🗼'], ['Truck', '🚚']],
        Z: [['Zuma', ch('paw', 'zuma')]],
      },
    },
  },
  masha: {
    particles: ['🐝', '🌼', '🍓'],
    letters: {
      pt: {
        A: [['Abelha', '🐝'], ['Árvore', '🌳']],
        C: [['Cogumelo', '🍄'], ['Cabra', ch('masha', 'cabra')], ['Cenoura', '🥕'], ['Casa', '🏠']],
        E: [['Esquilo', ch('masha', 'esquilo')]],
        F: [['Floresta', '🌲']],
        L: [['Lobo', ch('masha', 'lobo')], ['Lebre', ch('masha', 'coelho')]],
        M: [['Masha', ch('masha', 'masha')], ['Mel', '🍯'], ['Morango', '🍓']],
        N: [['Neve', '❄️']],
        P: [['Panda', ch('masha', 'panda')], ['Peixe', '🐟'], ['Pinguim', ch('masha', 'pinguim')], ['Porquinha', ch('masha', 'porquinha')]],
        T: [['Tigre', ch('masha', 'tigre')], ['Trenó', '🛷']],
        U: [['Urso', ch('masha', 'urso')]],
      },
      en: {
        B: [['Bear', ch('masha', 'urso')], ['Bee', '🐝']],
        C: [['Carrot', '🥕']],
        F: [['Forest', '🌲'], ['Fish', '🐟']],
        G: [['Goat', ch('masha', 'cabra')]],
        H: [['Hare', ch('masha', 'coelho')], ['Honey', '🍯'], ['House', '🏠']],
        M: [['Masha', ch('masha', 'masha')], ['Mushroom', '🍄']],
        P: [['Panda', ch('masha', 'panda')], ['Penguin', ch('masha', 'pinguim')], ['Pig', ch('masha', 'porquinha')]],
        S: [['Squirrel', ch('masha', 'esquilo')], ['Snow', '❄️'], ['Sled', '🛷'], ['Strawberry', '🍓']],
        T: [['Tiger', ch('masha', 'tigre')], ['Tree', '🌳']],
        W: [['Wolf', ch('masha', 'lobo')]],
      },
    },
  },
  unicorn: {
    particles: ['✨', '🦄', '🌈'],
    letters: {
      pt: {
        A: [['Ava', ch('unicorn', 'ava')], ['Água', '💧'], ['Academia', '🏰']],
        C: [['Cinza', ch('unicorn', 'cinder')], ['Castelo', '🏰'], ['Cristal', '💎']],
        E: [['Estrela', ch('unicorn', 'wildstar')]],
        F: [['Folha', ch('unicorn', 'leaf')], ['Fogo', '🔥'], ['Flor', '🌸']],
        G: [['Glaciar', ch('unicorn', 'glacier')], ['Gelo', '🧊']],
        I: [['Isabel', ch('unicorn', 'isabel')], ['Ilha', '🏝️']],
        L: [['Layla', ch('unicorn', 'layla')], ['Livro', '📖']],
        M: [['Magia', '✨']],
        P: [['Planta', '🌱']],
        R: [['Rory', ch('unicorn', 'rory')], ['Rio', ch('unicorn', 'river')], ['Raio', '⚡']],
        S: [['Sophia', ch('unicorn', 'sophia')]],
        T: [['Tempestade', ch('unicorn', 'storm')]],
        U: [['Unicórnio', '🦄']],
        V: [['Valentina', ch('unicorn', 'valentina')], ['Varinha', '🪄']],
      },
      en: {
        A: [['Ava', ch('unicorn', 'ava')]],
        B: [['Book', '📖']],
        C: [['Cinder', ch('unicorn', 'cinder')], ['Castle', '🏰'], ['Crystal', '💎']],
        F: [['Fire', '🔥'], ['Flower', '🌸']],
        G: [['Glacier', ch('unicorn', 'glacier')]],
        I: [['Isabel', ch('unicorn', 'isabel')], ['Ice', '🧊'], ['Island', '🏝️']],
        L: [['Layla', ch('unicorn', 'layla')], ['Leaf', ch('unicorn', 'leaf')]],
        M: [['Magic', '✨']],
        P: [['Plant', '🌱']],
        R: [['Rory', ch('unicorn', 'rory')], ['Rainbow', '🌈'], ['River', ch('unicorn', 'river')]],
        S: [['Sophia', ch('unicorn', 'sophia')], ['Star', '⭐'], ['Storm', ch('unicorn', 'storm')]],
        U: [['Unicorn', '🦄']],
        V: [['Valentina', ch('unicorn', 'valentina')]],
        W: [['Wildstar', ch('unicorn', 'wildstar')], ['Water', '💧'], ['Wand', '🪄']],
      },
    },
  },
  panda: {
    particles: ['🐼', '🎵', '🎈'],
    letters: {
      pt: {
        B: [['Bateria', '🥁']],
        C: [['Clarinha', ch('panda', 'clarinha')], ['Coroa', '👑'], ['Caricas', '🎶'], ['Chaleira', '🫖'], ['Colher', '🥄']],
        D: [['Dança', '💃']],
        E: [['Estrela', '⭐']],
        F: [['Festa', '🎉'], ['Fruta', '🍎']],
        G: [['Guitarra', '🎸']],
        L: [['Livro', '📚']],
        M: [['Matias', ch('panda', 'matias')], ['Microfone', '🎤'], ['Música', '🎵']],
        O: [['Óculos', '👓']],
        P: [['Panda', ch('panda', 'panda')], ['Pinguim', '🐧'], ['Pipa', ch('panda', 'pipa')], ['Piano', '🎹'], ['Pedro', ch('panda', 'pedro')]],
        S: [['Sopa', '🥣'], ['Skate', '🛹'], ['Sabão', '🧼']],
        T: [['Taça', '🍵']],
      },
    },
  },
  mickey: {
    particles: ['🎀', '⭐', '🎈'],
    letters: {
      pt: {
        B: [['Balão', '🎈'], ['Barco', '⛵'], ['Bolota', '🌰']],
        C: [['Clarabela', ch('mickey', 'clarabela')], ['Carro', '🚗'], ['Chapéu', '🎩'], ['Casa', '🏠']],
        D: [['Donald', ch('mickey', 'donald')], ['Dinheiro', '💰']],
        E: [['Estrela', '⭐']],
        F: [['Ferramentas', '🧰'], ['Flor', '🌼']],
        H: [['Horácio', ch('mickey', 'horacio')]],
        L: [['Laço', '🎀'], ['Luvas', '🧤']],
        M: [['Mickey', ch('mickey', 'mickey')], ['Minnie', ch('mickey', 'minnie')], ['Margarida', ch('mickey', 'margarida')]],
        O: [['Osso', '🦴']],
        P: [['Pateta', ch('mickey', 'pateta')], ['Pluto', ch('mickey', 'pluto')]],
        Q: [['Queijo', '🧀']],
        S: [['Sapatos', '👞']],
        T: [['Tico', ch('mickey', 'tico')], ['Teco', ch('mickey', 'teco')], ['Tio Patinhas', ch('mickey', 'patinhas')]],
      },
      en: {
        A: [['Acorn', '🌰']],
        B: [['Balloon', '🎈'], ['Boat', '⛵'], ['Bow', '🎀'], ['Bone', '🦴']],
        C: [['Clarabelle', ch('mickey', 'clarabela')], ['Car', '🚗'], ['Chip', ch('mickey', 'tico')], ['Cheese', '🧀']],
        D: [['Donald', ch('mickey', 'donald')], ['Daisy', ch('mickey', 'margarida')], ['Dale', ch('mickey', 'teco')]],
        F: [['Flower', '🌼']],
        G: [['Goofy', ch('mickey', 'pateta')], ['Gloves', '🧤']],
        H: [['Horace', ch('mickey', 'horacio')], ['Hat', '🎩'], ['House', '🏠']],
        M: [['Mickey', ch('mickey', 'mickey')], ['Minnie', ch('mickey', 'minnie')], ['Money', '💰']],
        P: [['Pluto', ch('mickey', 'pluto')]],
        S: [['Scrooge', ch('mickey', 'patinhas')], ['Star', '⭐'], ['Shoes', '👞']],
        T: [['Tools', '🧰']],
      },
    },
  },
};

function themeLetters(lang) {
  const t = THEME_CONTENT[effectiveTheme()];
  return t ? (t.letters[lang] || t.letters.pt) : null;
}

// Icons come from our own tables, so innerHTML is safe here.
function iconHtml(icon) {
  if (!isImageIcon(icon)) return icon;
  const [src, fallback] = icon.split('#');
  return `<img class="icon-img" src="${src}" data-fallback="${fallback}" alt="" draggable="false"` +
    ` onerror="this.replaceWith(this.dataset.fallback)">`;
}

// Warm the image cache for the active theme so the first press of each
// character letter doesn't flash an empty box (matters on the TV). decode()
// also pre-decodes off the main thread, so the first spawn doesn't stall on a
// WebP decode (noticeable on a Pi); the array keeps the decoded images alive.
let preloadedIcons = [];
function preloadThemeIcons() {
  const letters = THEME_CONTENT[effectiveTheme()]?.letters || {};
  const imgs = [];
  for (const map of Object.values(letters)) {
    for (const variants of Object.values(map)) {
      for (const [, icon] of variants) {
        if (!isImageIcon(icon)) continue;
        const img = new Image();
        img.src = icon.split('#')[0];
        img.decode?.().catch(() => {});
        imgs.push(img);
      }
    }
  }
  preloadedIcons = imgs;
}

// Cycle counter per letter so repeat presses show different variants
const letterCycle = {};
function pickLetterContent(norm) {
  const variants = themeLetters(settings.lang)?.[norm] || LETTERS[settings.lang]?.[norm];
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
    fullscreen: 'Fullscreen', reset_counter: 'Reset counter', reset_levels: 'Reset levels', close: 'Close',
    exit_hint: 'To open settings: hold the top-left corner for 3 seconds.',
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
    fullscreen: 'Ecrã inteiro', reset_counter: 'Reiniciar contador', reset_levels: 'Reiniciar níveis', close: 'Fechar',
    exit_hint: 'Para abrir as definições: segura o canto superior esquerdo 3 segundos.',
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
  for (const variants of Object.values(themeLetters(lang) || LETTERS[lang])) {
    for (const [word, emoji] of variants) {
      if (word.includes(' ')) continue; // quests can't type a space ("Tio Patinhas")
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
const settingsDialog = document.getElementById('settings');

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
// `delay` (seconds) schedules on the audio clock — sample-accurate and no
// main-thread timer, unlike setTimeout.
function beep(freq, dur = 0.18, type = 'triangle', gain = 0.18, delay = 0) {
  if (!settings.sound) return;
  const ctx = audio();
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}
// C-major DIATONIC: 7 notes (C D E F G A B) per octave. Extended from the
// original pentatonic so we can play traditional PT-PT folk songs that lean
// on F and B (Sol-Fá-Mi descents and Si-Lá-Sol cadences). Trade-off: random
// keypresses can now produce semitones (E-F, B-C) — Western-music normal but
// loses the "any two keys sound good together" pentatonic guarantee. Layout:
//   Bottom row : Z X C V B N M , . /  →  C3..E4    (1.5 octaves)
//   ASDF row   : A S D F G H J K L ;  →  F4..A5    (1.5 octaves)
//   QWERTY row : Q W E R T Y U I O P  →  B5..D7    (1.5 octaves)
//   Digits row : 1 2 3 4 5 6 7 8 9 0  →  C5..E6    (overlaps ASDF — kids' alt row)
const KEY_TO_FREQ = {
  'Z': 130.81, 'X': 146.83, 'C': 164.81, 'V': 174.61, 'B': 196.00,
  'N': 220.00, 'M': 246.94, ',': 261.63, '.': 293.66, '/': 329.63,
  'A': 349.23, 'S': 392.00, 'D': 440.00, 'F': 493.88, 'G': 523.25,
  'H': 587.33, 'J': 659.25, 'K': 698.46, 'L': 783.99, ';': 880.00,
  'Q': 987.77, 'W': 1046.50, 'E': 1174.66, 'R': 1318.51, 'T': 1396.91,
  'Y': 1567.98, 'U': 1760.00, 'I': 1975.53, 'O': 2093.00, 'P': 2349.32,
  '1': 523.25, '2': 587.33, '3': 659.25, '4': 698.46, '5': 783.99,
  '6': 880.00, '7': 987.77, '8': 1046.50, '9': 1174.66, '0': 1318.51,
};
const ALL_DIATONIC_FREQS = Object.values(KEY_TO_FREQ);

// Reverse index: each frequency → letters/digits that play it. Used by the
// rain spawner to pick a bubble whose letter pitch matches the song's note.
// Punctuation keys excluded — bubbles only show alphanumerics.
const FREQ_TO_KEYS = (() => {
  const map = new Map();
  for (const [key, freq] of Object.entries(KEY_TO_FREQ)) {
    if (!/[A-Z0-9]/.test(key)) continue;
    if (!map.has(freq)) map.set(freq, []);
    map.get(freq).push(key);
  }
  return map;
})();

// C-major diatonic scale positions (semitones from C). scaleIdx returns
// 0..6 for an in-scale freq (C=0, D=1, E=2, F=3, G=4, A=5, B=6), else -1.
const SCALE_CLASS_SEMIS = [0, 2, 4, 5, 7, 9, 11];
function scaleIdx(freq) {
  if (!freq) return -1;
  const semis = Math.round(12 * Math.log2(freq / 261.63));
  const cls = ((semis % 12) + 12) % 12;
  return SCALE_CLASS_SEMIS.indexOf(cls);
}
// Scale-step distance mod octave: 0 = same pitch class (any octave),
// 1 = adjacent step (whole or half), ≥2 = farther. Used to decide whether
// the quest letter's fixed pitch is close enough to the song's next note to
// be injected without breaking the melody.
function scaleDist(freqA, freqB) {
  const a = scaleIdx(freqA), b = scaleIdx(freqB);
  if (a < 0 || b < 0) return Infinity;
  const d = Math.abs(a - b);
  return Math.min(d, 7 - d);
}

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

// One shared 1s white-noise buffer; each hit plays a random slice of it
// instead of allocating and filling a fresh buffer per note.
let noiseBuf = null;
function noise(dur = 0.08, gain = 0.15) {
  if (!settings.sound) return;
  const ctx = audio();
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(g).connect(ctx.destination);
  src.start(0, Math.random() * Math.max(0, 1 - dur), dur);
}

// Per-theme instruments: each takes a frequency (Hz) and plays a single note.
// reduceEffects skips secondary partials/decorations so webOS TVs stay smooth.
function bellSynth(freq) {
  beep(freq, 0.55, 'sine', 0.16);
  beep(freq * 2, 0.45, 'triangle', 0.05);
  if (!settings.reduceEffects) {
    beep(freq * 2.76, 0.4, 'sine', 0.03, 0.006);
  }
}

function musicBoxSynth(freq) {
  beep(freq, 0.45, 'triangle', 0.10);
  beep(freq * 2, 0.4, 'sine', 0.05);
  if (!settings.reduceEffects) {
    beep(freq * 4, 0.18, 'sine', 0.02, 0.025);
  }
}

function padSynth(freq) {
  if (!settings.sound) return;
  const ctx = audio();
  const t = ctx.currentTime;
  const ratio = Math.pow(2, 6 / 1200); // ±6 cents detune for chorus
  for (const f of [freq / ratio, freq * ratio]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.9);
  }
}

function marimbaSynth(freq) {
  beep(freq, 0.25, 'sine', 0.16);
  if (!settings.reduceEffects) {
    beep(freq * 4, 0.13, 'sine', 0.05);
    noise(0.005, 0.04);
  }
}

function chipSynth(freq) {
  if (!settings.sound) return;
  const ctx = audio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.10, t + 0.005);
  g.gain.setValueAtTime(0.10, t + 0.065);
  g.gain.linearRampToValueAtTime(0.05, t + 0.075);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
  if (!settings.reduceEffects) {
    beep(freq * 2, 0.08, 'square', 0.05, 0.08);
  }
}

const THEME_INSTRUMENTS = {
  rainbow: bellSynth,
  baby:    musicBoxSynth,
  ocean:   padSynth,
  jungle:  marimbaSynth,
  space:   chipSynth,
  paw:     chipSynth,
  masha:   musicBoxSynth,
  unicorn: bellSynth,
  panda:   marimbaSynth,
  mickey:  musicBoxSynth,
};

function themeSynth() {
  return THEME_INSTRUMENTS[effectiveTheme()] || bellSynth;
}

function playNote(key) {
  const freq = KEY_TO_FREQ[key.toUpperCase()]
    ?? ALL_DIATONIC_FREQS[Math.floor(Math.random() * ALL_DIATONIC_FREQS.length)];
  themeSynth()(freq);
}

// Two-note pentatonic flick — used for routine quest completions. Sits inside
// the rain melody instead of steamrolling it. Voiced in the active theme's
// instrument so the timbre blends with everything else.
function questDing() {
  if (!settings.sound) return;
  const synth = themeSynth();
  synth(783.99);                          // G5
  setTimeout(() => synth(1046.50), 90);   // C6
}

// Theme-aware level-up motif. All notes are C-major pentatonic so the fanfare
// stays in-key with whichever song the rain is currently playing. Each theme
// gets a distinct phrase shape so the moment *feels* like its world.
const FANFARE_MOTIFS = {
  rainbow: { notes: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1046.50], step: 90 },
  baby:    { notes: [523.25, 783.99, 1046.50, 1318.51, 1046.50, 1318.51], step: 110 },
  ocean:   { notes: [392.00, 523.25, 659.25, 783.99, 1046.50],            step: 180 },
  jungle:  { notes: [392.00, 523.25, 392.00, 659.25, 523.25, 783.99, 1046.50], step: 80 },
  space:   { notes: [523.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00], step: 70 },
};
function fanfare() {
  if (!settings.sound) return;
  const synth = themeSynth();
  const { notes, step } = FANFARE_MOTIFS[effectiveTheme()] || FANFARE_MOTIFS.rainbow;
  notes.forEach((f, i) => setTimeout(() => synth(f), i * step));
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

// Pre-generated neural-voice clips (tools/fetch-voice.sh) for everything the app
// says: device TTS is poor on some platforms (Linux Chrome's only Portuguese
// voice is Brazilian; espeak reads "L." as fifty). say() plays the clip for the
// exact text when there is one, else falls back to speechSynthesis — also when
// the clips aren't deployed (they're gitignored, like the show art).
let voiceClips = {};
fetch('assets/voice/index.json')
  .then(r => (r.ok ? r.json() : {}))
  .then(j => { voiceClips = j; })
  .catch(() => {});
const clipAudio = new Map(); // file → <audio>, reused so repeated phrases start instantly
let playingClip = null;

function stopClip() {
  if (!playingClip) return;
  playingClip.pause();
  playingClip = null;
}

function playClip(text) {
  const file = voiceClips[settings.lang]?.[text];
  if (!file) return false;
  let a = clipAudio.get(file);
  if (!a) {
    a = new Audio(`assets/voice/${file}`);
    clipAudio.set(file, a);
  }
  playingClip = a;
  a.currentTime = 0;
  // AbortError = interrupted by the next say(); anything else (missing file…) → TTS
  a.play().catch(e => { if (e.name !== 'AbortError' && playingClip === a) speakTTS(text); });
  return true;
}

function say(text, { force = false } = {}) {
  if (!force && !settings.voice) return;
  stopClip();
  window.speechSynthesis?.cancel();
  if (!playClip(text)) speakTTS(text);
}

function speakTTS(text) {
  if (!window.speechSynthesis) return;
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
  persistSoon();
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
  persistSoon();
}

// Every keypress bumps the counter and stats; coalesce those writes into one
// per second instead of two JSON+localStorage writes per key. Flushed when the
// page is hidden or closed so nothing is lost.
let persistTimer = null;
function persistSoon() {
  if (!persistTimer) persistTimer = setTimeout(persistNow, 1000);
}
function persistNow() {
  clearTimeout(persistTimer);
  persistTimer = null;
  localStorage.setItem('ck-count', String(state.keyCount));
  saveStats();
}
window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });

// ─── PACE ───────────────────────────────────────────────────────────────────
// Exponentially-decayed completion rate. Each win adds 1 to `paceScore`; the
// score decays continuously with time constant PACE_TAU. Displayed rate is
// score/τ × 60 (challenges/min). Recent wins dominate; idle time fades the
// meter. No storage — resets on reload. Adults can race themselves; kids see
// a neutral number that goes up and gently down.

const PACE_TAU = 90; // seconds
const paceEl = document.getElementById('pace');
let paceScore = 0;
let paceLastT = performance.now();

function paceDecayedScore(now) {
  return paceScore * Math.exp(-((now - paceLastT) / 1000) / PACE_TAU);
}
function paceBump() {
  const now = performance.now();
  paceScore = paceDecayedScore(now) + 1;
  paceLastT = now;
  renderPace();
}
function renderPace() {
  if (!paceEl) return;
  const rate = paceDecayedScore(performance.now()) / PACE_TAU * 60;
  const text = rate < 0.5 ? '' : `${Math.round(rate)}/min`;
  // Polled every 500ms; skip the DOM write (and repaint) when unchanged.
  if (paceEl.textContent !== text) paceEl.textContent = text;
}
setInterval(renderPace, 500);

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
        <div class="card-front"><span>${big}</span>${small ? `<span class="emoji">${iconHtml(small)}</span>` : ''}</div>
      </div>`;
  } else {
    el.innerHTML = `<span>${big}</span>` + (small ? `<span class="emoji">${iconHtml(small)}</span>` : '');
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
  // One fragment insert and one cleanup timer instead of n of each.
  const frag = document.createDocumentFragment();
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetto';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.3) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    frag.appendChild(c);
    pieces.push(c);
  }
  confettiEl.appendChild(frag);
  setTimeout(() => { for (const c of pieces) c.remove(); }, 2500);
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
  wordBody.classList.remove('one-line');
  const norm = normalize(state.word);

  // Lv 0 — pre-keyboard: big emoji + cards for each letter of the word in order
  if (lv === 0) {
    const big = document.createElement('div');
    big.className = 'quest-bigemoji';
    big.innerHTML = state.wordEmoji ? iconHtml(state.wordEmoji) : '?';
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

  wordBody.classList.add('one-line');

  // Lv 1+ — always include the emoji for visual association
  if (state.wordEmoji) {
    const em = document.createElement('span');
    em.className = 'quest-emoji';
    em.innerHTML = iconHtml(state.wordEmoji);
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
  fitQuest(document.getElementById('word-quest'), wordBody);
}

// Scale .quest down when the rendered body would overflow horizontally, so
// long Portuguese words like TARTARUGA stay on a single line. Multi-line
// wrapping has been disabled in CSS via .quest-body.one-line.
function fitQuest(questEl, bodyEl) {
  if (!questEl || !bodyEl) return;
  questEl.style.fontSize = '';
  requestAnimationFrame(() => {
    const maxWidth = window.innerWidth * 0.94;
    if (bodyEl.scrollWidth <= maxWidth) return;
    const cur = parseFloat(getComputedStyle(questEl).fontSize);
    let next = Math.max(16, Math.floor(cur * (maxWidth / bodyEl.scrollWidth)));
    questEl.style.fontSize = next + 'px';
    let safety = 12;
    while (bodyEl.scrollWidth > maxWidth && next > 16 && safety-- > 0) {
      next = Math.max(16, next - 2);
      questEl.style.fontSize = next + 'px';
    }
  });
}

function tryWordLetter(letter) {
  if (!state.word) return false;
  const norm = normalize(state.word);
  if (letter === norm[state.wordIdx]) {
    state.wordIdx++;
    if (state.wordIdx >= state.word.length) {
      // Word completed
      questDing();
      say(state.wordDisplay || state.word);
      record('Words');
      paceBump();
      if (state.wordEmoji) renderWord();
      maybeLevelUpWord();
      // ~35% chance to trigger a bonus picture quest after a win
      if (Math.random() < 0.35) setTimeout(startBonus, 2200);
      setTimeout(newWord, 1800);
    } else {
      renderWord();
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
  em.innerHTML = iconHtml(state.bonus.emoji);
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
      questDing();
      say(state.bonus.display);
      record('Bonus');
      paceBump();
      renderBonus();
      if (state.bonusTimer) { clearTimeout(state.bonusTimer); state.bonusTimer = null; }
      setTimeout(closeBonus, 1800);
    } else {
      renderBonus();
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
  mathBody.classList.add('one-line');
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
  fitQuest(document.getElementById('math-quest'), mathBody);
}

function tryEquationAnswer(digit) {
  if (state.eq == null) return false;
  if (parseInt(digit, 10) === state.eqAnswer) {
    questDing();
    say(String(state.eqAnswer));
    record('Math');
    paceBump();
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
  fanfare();
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
  if (settingsDialog.open) return;

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
      playNote(norm);
    } else {
      spawn(up);
      playNote(norm);
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
    playNote(rawKey);
    maybeSwitchTheme(rawKey, tryEquationAnswer(rawKey));
    return;
  }

  // Operators — fixed pentatonic motif through current theme instrument
  if (rawKey === '+' || rawKey === '-' || rawKey === '*' || rawKey === '/') {
    spawn(rawKey === '*' ? '×' : rawKey === '/' ? '÷' : rawKey, '');
    const opFreq = { '+': 523.25, '-': 587.33, '*': 783.99, '/': 880.00 };
    themeSynth()(opFreq[rawKey]);
    return;
  }

  if (rawKey === ' ' || rawKey === 'Spacebar') {
    themeSynth()(130.81); // low C3 bass beat
    return;
  }
  if (rawKey === 'Enter') {
    const synth = themeSynth();
    synth(523.25); synth(659.25); synth(783.99); // C-major triad
    return;
  }

  // Single visible punctuation — show the char + random emoji, play a pentatonic note
  if (rawKey.length === 1) {
    spawn(rawKey, randomFunEmoji());
    playNote(rawKey);
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
  const note = ALL_DIATONIC_FREQS[Math.floor(Math.random() * ALL_DIATONIC_FREQS.length)];
  themeSynth()(note);
}

window.addEventListener('keydown', e => {
  // Adult settings shortcut — its own listener handles this
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') return;
  // Leave native browser keys alone
  if (e.key === 'F11' || e.key === 'F12') return;
  // Don't fire while in the settings dialog — it handles its own keys.
  if (settingsDialog.open) {
    if (e.key === 'Escape') return; // let dialog close natively
    return;
  }
  e.preventDefault();
  // Mirror a real keypress onto the falling rain: oldest matching bubble pops,
  // and the spawn that follows lands at the bubble's position. Synthetic
  // keydowns dispatched from onRainTap have isTrusted=false — skip them so
  // popping one bubble doesn't chain-pop another.
  if (e.isTrusted) popMatchingBubble(e.key);
  handleKey(e.key);
});

// Cursor trail — pretty colored orbs that drift up and fade. Throttled and
// skipped under reduceEffects so the TV doesn't pay for it.
const TRAIL_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#06d6a0'];
let lastTrailAt = 0;
window.addEventListener('pointermove', (e) => {
  if (settings.reduceEffects) return;
  if (settingsDialog.open) return;
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
// 3-second hold of the top-left corner opens settings. That's the whole gate —
// a kid mashing keys won't trigger a 3-second deliberate hold by accident.

let holdTimer = null;

function startHold() {
  parentCorner.classList.add('holding');
  holdTimer = setTimeout(() => { cancelHold(); openSettings(); }, 3000);
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

// ─── SETTINGS ───────────────────────────────────────────────────────────────

function applyTheme() {
  if (settings.theme !== 'auto') currentTheme = settings.theme;
  document.body.className = 'theme-' + effectiveTheme() +
    (settings.quests ? '' : ' no-quests') +
    (settings.reduceMotion ? ' reduce-motion' : '');
  document.documentElement.classList.toggle('reduce-effects', settings.reduceEffects);
  document.documentElement.style.setProperty('--motion', settings.reduceMotion ? '0.4' : '1');
  renderBgParticles();
  preloadThemeIcons();
}

// Every key on the keyboard (26 letters + 10 digits) nudges auto mode toward
// one theme, four keys each, so all 9 auto themes are equally likely. Letters
// lean on the theme's words where they can. Baby is settings-only.
const THEME_TRIGGERS = {
  ocean:   ['F', 'W', 'J', '1'],    // Fish, Whale, Jellyfish
  jungle:  ['L', 'T', 'Z', '2'],    // Leão/Lion, Tigre/Tiger, Zebra
  space:   ['S', 'E', 'N', '3'],    // Sol/Sun, Estrela/Earth, Nave
  rainbow: ['K', 'Y', 'B', '4'],    // Kite, Yo-yo, Balão/Balloon
  paw:     ['C', 'R', 'X', '5'],    // Chase, Ryder/Rubble/Rocky
  masha:   ['M', 'U', '6', '7'],    // Masha, Urso
  unicorn: ['V', 'I', 'A', '8'],    // Valentina, Isabel, Ava
  panda:   ['P', 'G', 'O', '9'],    // Panda/Pipa/Pedro, Guitarra, Óculos
  mickey:  ['D', 'H', 'Q', '0'],    // Donald, Horácio, Queijo
};
function themeForKey(key) {
  for (const [theme, keys] of Object.entries(THEME_TRIGGERS)) {
    if (keys.includes(key)) return theme;
  }
  return null;
}
// Throttle theme switching so it doesn't flip on every keypress: require the
// child to hit a theme's trigger keys several times AND wait through a
// cooldown since the last switch. Counts reset on switch.
const THEME_SWITCH_COOLDOWN_MS = 120000; // 2 min
const THEME_HITS_REQUIRED = 7;
let lastThemeSwitchAt = 0;
const themeHits = {};

function maybeSwitchTheme(key, wasQuestProgress) {
  if (settings.theme !== 'auto') return;
  if (wasQuestProgress) return;
  const t = themeForKey(key);
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
  } else if (THEME_CONTENT[theme]?.particles) {
    // Character themes: the show's emoji drift down like the jungle leaves.
    const emoji = THEME_CONTENT[theme].particles;
    const n = Math.floor(14 * density);
    for (let i = 0; i < n; i++) {
      const l = document.createElement('div');
      l.className = 'leaf';
      l.textContent = emoji[i % emoji.length];
      l.style.setProperty('--x', (Math.random() * 100) + '%');
      l.style.setProperty('--dur', (14 + Math.random() * 12) + 's');
      l.style.setProperty('--spin', (3.5 + Math.random() * 4) + 's');
      l.style.setProperty('--delay', (-Math.random() * 20) + 's');
      l.style.setProperty('--sway', (Math.random() * 60 - 30) + 'vw');
      l.style.setProperty('--size', (1.2 + Math.random() * 1.2) + 'rem');
      container.appendChild(l);
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

function renderStatsTable() {
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
  renderStatsTable();
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
  say(t, { force: true });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  setCount(0);
  // Wipe stats too so the dialog actually shows the reset — otherwise the only
  // visual change is the tiny counter behind the modal.
  stats.date = todayStr();
  stats.todayKeys = 0; stats.todayWords = 0; stats.todayMath = 0;
  stats.todayLevelUps = 0; stats.todayBonus = 0;
  stats.allTimeKeys = 0; stats.allTimeWords = 0; stats.allTimeMath = 0;
  stats.allTimeLevelUps = 0; stats.allTimeBonus = 0;
  saveStats();
  renderStatsTable();
});

document.getElementById('btn-reset-levels').addEventListener('click', () => {
  state.wordLevel = 0;
  state.mathLevel = 0;
  state.wordStreak = 0;
  state.mathStreak = 0;
  localStorage.setItem('ck-word-level', '0');
  localStorage.setItem('ck-math-level', '0');
  updateLevelLabels();
  newWord();
  newEquation();
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
//
// Rain is song-driven: bubbles spawn on the beat of a melody, and each bubble's
// letter is chosen so its keyboard pitch (KEY_TO_FREQ) matches the song's next
// note — when the kid pops bubbles in order, the song plays. The quest's
// "correct next letter/digit" is injected when its pitch fits (exact match or
// one pentatonic step away), and force-injected every QUEST_INJECT_BUDGET
// beats so quest progress never stalls.

const BEAT_MS = 500; // quarter-note duration ≈ 120 BPM (lively kid-song range)
const QUEST_INJECT_BUDGET = 8; // beats without inject before force-injecting
const RAIN_MAX_ON_SCREEN = 9;
const rainCap = () => settings.reduceEffects ? 5 : RAIN_MAX_ON_SCREEN;
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let rainTimer = null;
let letterInjectBudget = 0;
let digitInjectBudget = 0;
const rainContainer = document.getElementById('rain');

// Songs are arrays of [freq, beats] where freq is a value present in
// KEY_TO_FREQ — that way the bubble whose pitch equals the freq is always
// available. Originals with F or B (non-pentatonic) are nudged to the
// nearest pentatonic neighbour (F→E, B→A or C). Recognisable; never
// dissonant against the rest of the keyboard.
//
// Many PT-PT entries are from memory and worth verifying by ear — if any
// sounds wrong, fix the note array; the engine doesn't care which notes.
const C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, B3=246.94;
const C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88;
const C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00, B5=987.77;

// Each song carries its own bpm (quarter-note tempo) so the rain scheduler
// uses each song's canonical pace instead of one fixed value. All melodies
// here are transcribed from verified sources (sheet music / ABC notation /
// text-based cifras). Keyboard is C-major diatonic so F and B are available
// — most PT-PT folk songs lean on F and B and would be unrecognisable
// without them, so the previous pentatonic-only filter has been lifted.
const SONGS = [
  // Source: abcnotation.com mirror + raw ABC file at U. Minho music corpus
  // (https://natura.di.uminho.pt/~jj/musica/abc/infantil-cuco.abc). Full melody
  // is A-A-B-A' structure — the B section is the contrasting refrain
  // ("e o cuco não quis comer as couves"). All pure C-major pentatonic.
  // Half-rest before B's pickup is dropped (scheduler doesn't model rests).
  { name: 'Era Uma Vez um Cuco', bpm: 110, notes: [
    // A — verse
    [C4,0.5],[C4,0.5],[C4,0.5],[G3,0.5],
    [C4,0.5],[D4,0.5],[E4,0.5],[E4,0.5],
    [E4,0.5],[E4,0.5],[D4,0.5],[C4,0.5],
    [D4,0.5],[E4,0.5],[C4,0.5],[C4,0.5],
    // A — repeat
    [C4,0.5],[C4,0.5],[C4,0.5],[G3,0.5],
    [C4,0.5],[D4,0.5],[E4,0.5],[E4,0.5],
    [E4,0.5],[E4,0.5],[D4,0.5],[C4,0.5],
    [D4,0.5],[E4,0.5],[C4,0.5],[C4,0.5],
    // B — refrain (pickup C, then snappy two-bar phrase repeated)
    [C4,0.5],
    [G4,0.25],[G4,0.25],[G4,0.5],[E4,0.5],[C4,0.5],
    [G4,0.5],[G4,0.5],[E4,0.5],[C4,0.5],
    [G4,0.25],[G4,0.25],[G4,0.5],[E4,0.5],[C4,0.5],
    [G4,0.5],[G4,0.5],[E4,0.5],[C4,0.5],
    // A' — closing tag with held cadence notes
    [C4,0.5],[C4,0.5],[C4,0.5],[G3,0.5],
    [C4,0.5],[D4,0.5],[E4,1],
    [E4,0.5],[E4,0.5],[D4,0.5],[C4,0.5],
    [D4,0.5],[E4,0.5],[C4,1],
  ]},


  // Source: https://imslp.org/wiki/A_Saia_de_Carolina_(Viro,_Angel) (Angel Viro
  // wind-ensemble arr.; same melody as PT-PT vira). Track 2 (soprano flute).
  // Auto-transposed +5 st; 158/174 = 90.8% diatonic, residual snapped.
  // 5 distinct durations.
  { name: 'A saia da Carolina (PT)', bpm: 85, notes: [
    [F5,0.25],[G5,0.25],[G5,0.25],[F5,0.25],[G5,0.5],[D5,0.25],[D5,0.25],
    [F5,0.5],[D5,0.25],[D5,0.25],[C5,1],
    [G4,4],
    [B4,0.25],[C5,0.25],[D5,0.25],[D5,0.25],[C5,4],
    [F5,0.25],[G5,0.25],[G5,0.25],[F5,0.25],[G5,0.5],[D5,0.25],[D5,0.25],
    [F5,0.5],[D5,0.25],[D5,0.25],
    [C5,1],[G4,4],
    [B4,0.25],[C5,0.25],[D5,0.25],[D5,0.25],[C5,3],
    [E5,0.25],[E5,0.25],[E5,0.5],[C5,0.5],[E5,0.25],[E5,0.25],[E5,0.5],[C5,0.5],
    [E5,0.25],[E5,0.25],[E5,0.5],[D5,0.5],[C5,0.5],[D5,1],[D5,0.5],[D5,0.5],
    [B4,0.5],[D5,0.5],[D5,0.5],[B4,0.5],[D5,0.5],[D5,0.5],
  ], repeat: 2 },

  // Source: http://teixeiras.no.sapo.pt/musicas/o_mar1.mid (Wayback:
  // https://web.archive.org/web/20160214/http://teixeiras.no.sapo.pt/musicas/o_mar1.mid).
  // Track 9 (accordion) = vocal melody. 100% diatonic. BPM 100 (overrode MIDI 159
  // — too fast for kids). 6 distinct durations.
  { name: 'O mar enrola na areia (PT)', bpm: 100, notes: [
    [G4,1],[E4,2],[G4,1],
    [E4,1],[G4,1.5],[E4,0.5],[F4,1],
    [G4,4],
    [D4,1],[E4,1],[F4,1],[G4,1],
    [A4,1],[B4,1],[C5,1],[B4,1],
    [A4,0.25],[B4,0.25],[A4,0.5],[G4,2],[G4,1],
    [E4,2],[G4,1],[E4,1],
    [G4,1.5],[E4,0.5],[F4,1],[G4,4],
    [D4,1],
    [E4,1],[F4,1],[G4,1],[A4,1],
    [B4,1],[C5,4],
    [C5,1],[C5,1],[C5,1],
    [D5,1],[D5,1],[D5,1],[D5,2],
    [B4,1],[C5,2],
    [C5,1],[C5,2],[A4,1],
    [A4,0.25],[B4,1],[B4,1],[B4,1],[G4,1],
    [F4,4],
    [B4,1],[B4,1],[B4,1],[B4,1],
    [C5,1],[C5,1],[C5,2],
    [A4,1],[B4,2],[B4,1],
    [B4,2],
  ], repeat: 2 },

  // Source: https://musescore.com/user/2548271/scores/13204321 (Tiroliro -
  // Solidó de Traz-os-Montes, arr. Henrique Matos; Piano-Voice). Track 0 RH.
  // 100% diatonic after +5 st. 4 distinct durations.
  { name: 'Tiroliro (PT)', bpm: 120, notes: [
    [G4,0.5],[G4,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],
    [E5,0.5],[D5,0.5],[F5,1.5],[D5,0.5],[F5,1.5],
    [E5,0.5],[D5,0.5],[D5,0.5],[D5,0.5],[B4,0.5],[D5,0.5],[D5,0.5],
    [D5,0.5],[B4,0.5],[A4,1],[G4,2],
    [G4,0.5],[G4,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],[E5,0.5],
    [E5,0.5],[D5,0.5],[F5,1.5],[D5,0.5],[F5,1.5],
    [E5,0.5],[D5,0.5],[D5,0.5],[D5,0.5],[B4,0.5],[D5,0.5],[D5,0.5],
    [D5,0.5],[B4,0.5],[A4,1],[G4,2],
    [G4,1],[C5,1],[C5,0.5],[C5,0.5],[E5,1],
    [E5,0.5],[E5,0.5],[G4,1],[G4,0.5],[B4,0.5],[D5,0.5],[D5,0.5],
    [D5,0.5],[D5,0.5],[G4,0.5],[G4,0.5],
  ], repeat: 2 },

  // Source: https://musescore.com/joao_galindro_santos/scores/5526252 (Piano
  // solo easy, arr. João Galindro Santos). 100% diatonic, no transpose.
  // 4 distinct durations.
  { name: 'Fui ao jardim da Celeste (PT)', bpm: 100, notes: [
    [E4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[G4,0.5],[G4,0.5],
    [D4,0.5],[E4,0.5],[F4,1],[E4,0.5],[D4,0.5],[E4,0.5],[C4,0.5],
    [E4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[G4,0.5],[G4,0.5],
    [D4,0.5],[E4,0.5],[F4,1],[G4,1],[C4,1],
    [E4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[G4,0.5],[G4,0.5],
    [D4,0.5],[E4,0.5],[F4,1],[E4,0.5],[D4,0.5],[E4,0.5],[C4,0.5],
    [E4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[C4,0.5],[E4,0.5],[G4,0.5],[G4,0.5],
    [D4,0.5],[E4,0.5],[F4,1],[G4,1],[C4,2],
    [D4,1],[E4,1],[F4,4],
    [G4,1],
    [C4,1],[B3,1],[A3,1],[B3,4],
  ], repeat: 2 },

  // Source: https://imslp.org/wiki/Ó_Rama,_Ó_Que_Linda_Rama_(Rebelo,_José_Eduardo)
  // (Zerebelo arr., CC-BY-SA). Top voice extracted from SATB MIDI (octave 4+).
  // 100% diatonic after +2 st transpose. 5 distinct durations.
  { name: 'Oh rama, oh que linda rama (PT)', bpm: 120, notes: [
    [E4,1.5],[E4,1],[D4,0.5],[E4,1],
    [F4,0.5],[G4,1],[F4,0.5],[E4,2],
    [G4,0.5],[A4,1.5],[A4,1],[G4,0.5],[F4,1],
    [G4,0.5],[A4,1.5],[G4,2],
    [F4,0.5],[E4,1],[E4,0.5],[E4,1],[E4,0.5],
    [D4,1],[E4,0.5],[F4,1],[E4,0.5],[D4,2],
    [G4,0.5],[B4,1.5],[B4,1],
    [A4,0.5],[G4,1],[F4,0.5],[E4,4],
    [G4,0.5],[C5,1.5],
    [C5,1],[B4,0.5],[C5,1],[D5,0.5],[E5,1],
    [D5,0.5],[C5,2],[E5,0.5],[F5,1.5],
    [F5,1],[E5,0.5],[D5,1],[E5,0.5],[F5,1.5],
    [E5,2],[D5,0.5],[C5,1.5],
    [C5,1],[C5,0.5],[G4,1],[C5,0.5],
    [D5,1],[C5,0.5],[B4,2],[D5,0.5],
    [G5,1.5],[G5,1],[F5,0.5],[E5,1],
  ], repeat: 2 },

  // Source: U.Minho Cancioneiro #216 (Domingos Morais, 1998) via Wayback —
  // https://web.archive.org/web/20040531173829im_/http://alfarrabio.di.uminho.pt/cancioneiro/kar/216.kar
  // 2-voice arr.; top-voice extracted (350/660 notes). 100% diatonic, -5 st.
  // 6 distinct durations.
  { name: 'Trai trai (PT)', bpm: 100, notes: [
    [E4,0.5],[E4,0.75],[D4,0.25],[D4,0.5],[F4,0.25],[E4,0.25],[C4,1.5],
    [G4,0.5],[G4,0.75],[F4,0.25],[F4,0.5],[A4,0.25],[G4,0.25],[E4,1.5],
    [G3,0.5],[E4,0.75],[E4,0.25],[E4,0.5],[F4,0.25],[G4,0.25],[B4,1.5],
    [A4,0.25],[G4,0.25],[B4,0.5],[A4,0.25],[G4,0.25],[B4,0.5],[A4,0.25],
    [G4,0.25],[E4,1.5],
    [G4,0.5],[G4,0.5],[F4,0.25],[G4,0.25],[A4,0.5],[F4,0.5],[E4,1.5],
    [G4,0.5],[G4,0.5],[F4,0.25],[G4,0.25],[A4,0.5],[F4,0.5],[E4,1],[E4,0.5],
    [E4,0.5],[A4,0.75],[A4,0.25],[F4,0.5],[F4,0.5],[G4,1],[E4,0.5],
    [E4,0.5],[A4,0.75],[A4,0.25],[F4,0.5],[F4,0.5],[G4,1],[E4,0.5],
    [E4,0.5],[A4,1],[F4,0.5],[F4,0.5],[G4,1],[E4,0.5],
    [E4,0.5],[F4,1],[D4,0.5],[D4,0.5],[E4,2],
    [E4,0.5],[E4,0.75],[D4,0.25],[D4,0.5],[F4,0.25],[E4,0.25],[C4,1.5],
  ], repeat: 2 },

  // Source: https://musescore.com/user/11858902/scores/4589102 (HealthFizz,
  // "Traditional music - Malhão", beginner piano). 100% diatonic, no transpose.
  // 3 distinct durations. IOI dominance 0.25@53% + 0.125@38% — real rhythm.
  { name: 'Ó malhão, malhão (PT)', bpm: 120, notes: [
    [C5,0.25],[C5,0.25],[C5,0.5],[B4,0.25],[A4,0.25],[G4,0.5],[G4,0.5],[G4,1.5],
    [B4,0.5],[B4,0.5],[A4,0.25],[G4,0.25],[C5,0.5],[C5,0.5],[C5,1.5],
    [C5,0.25],[C5,0.25],[C5,0.5],[B4,0.25],[A4,0.25],[G4,0.5],[G4,0.5],[G4,1.5],
    [B4,0.5],[B4,0.5],[A4,0.25],[G4,0.25],[C5,0.5],[C5,0.5],[C5,1.5],
    [G4,0.25],[G4,0.25],[G4,0.5],[A4,0.5],[G4,0.5],[B4,0.25],[B4,0.25],[B4,0.5],
    [A4,0.5],[G4,0.5],
    [G4,0.25],[F4,0.25],[E4,0.5],[D4,0.5],[C4,0.5],[C4,0.5],[C4,1.5],
    [C5,0.25],[C5,0.25],[C5,0.5],[B4,0.25],[A4,0.25],[G4,0.5],[G4,0.5],[G4,1.5],
    [B4,0.5],[B4,0.5],[A4,0.25],[G4,0.25],[C5,0.5],[C5,0.5],[C5,1.5],
  ], repeat: 2 },

  // Source: https://musescore.com/user/2548271/scores/23898547 (Henrique Matos,
  // "Vira do Minho – Popular ca.1910", flute+piano arr.). Track 0 flute = melody.
  // 98.2% diatonic after -3 st. 4 distinct durations.
  { name: 'Vira do Minho (PT)', bpm: 120, notes: [
    [E4,0.5],[A4,1],[C5,0.5],[B4,0.5],[A4,0.5],[G4,0.5],[A4,1],
    [E4,0.5],[A4,1],[E4,0.5],[D4,1],[D4,0.5],
    [D4,0.5],[C4,0.5],[B3,0.5],[C4,2],[E4,0.5],
    [A4,1],[C5,0.5],[B4,0.5],[A4,0.5],[G4,0.5],[A4,1],
    [E4,0.5],[A4,1],[E4,0.5],[D4,1],[D4,0.5],[D4,0.5],
    [C4,0.5],[B3,0.5],[A3,2],[E4,0.5],[F4,1],
    [G4,0.5],[A4,0.5],[G4,0.5],[F4,0.5],[A4,1],[E4,0.5],
    [A4,1],[E4,0.5],[D4,1],[D4,0.5],[D4,0.5],[C4,0.5],
    [B3,0.5],[C4,1.5],[A3,1],[E4,0.5],[F4,1],
    [G4,0.5],[A4,0.5],[G4,0.5],[F4,0.5],[A4,1],[E4,0.5],
    [A4,1],[E4,0.5],[D4,1],[D4,0.5],[D4,0.5],[C4,0.5],
  ], repeat: 2 },

  // Source: https://musescore.com/joao_galindro_santos/scores/5526246 (Galindro
  // Santos arr.). MuseScore title "Havia um pastorzinho" — canonical PT melody;
  // user's lyric variant ("leva as ovelhas") is sung to the same tune.
  // 100% diatonic after -5 st. Monophonic. 3 distinct durations.
  { name: 'O pastorzinho (PT)', bpm: 100, notes: [
    [G3,0.5],[C4,0.5],[B3,0.5],[A3,0.5],[G3,0.5],[A3,1],[G3,0.5],
    [G3,0.5],[A3,0.5],[G3,0.5],[A3,0.5],[B3,0.5],[C4,1.5],
    [G3,0.5],[C4,0.5],[B3,0.5],[A3,0.5],[G3,0.5],[A3,1],[G3,0.5],
    [G3,0.5],[A3,0.5],[G3,0.5],[A3,0.5],[B3,0.5],[C4,0.5],[G3,0.5],[A3,0.5],
    [B3,0.5],[C4,1],[C4,1],[C4,0.5],[G3,0.5],[A3,0.5],
    [G3,0.5],[A3,1],[A3,1],[A3,0.5],[G3,0.5],[D4,0.5],
    [C4,0.5],[B3,1],[B3,1],[B3,0.5],[G3,0.5],[A3,0.5],
    [B3,0.5],[C4,1],[C4,1],[C4,1.5],
    [G3,0.5],[C4,0.5],[B3,0.5],[A3,0.5],[G3,0.5],[A3,1],[G3,0.5],
    [G3,0.5],[A3,0.5],[G3,0.5],[A3,0.5],[B3,0.5],[C4,1.5],
  ], repeat: 2 },

  // Source: https://www.mamalisa.com/midi/a_saia_da_rosa.mid (Mamá Lisa's World,
  // page p=1133). 100% diatonic, no transpose, monophonic. 5 distinct durations.
  // IOI dominance 64% — real rhythm (Mama Lisa MIDIs are usually karaoke-flat
  // but this one is hand-arranged).
  { name: 'Ó Rosa, arredonda a saia (PT)', bpm: 100, notes: [
    [G3,0.5],[E4,0.5],[E4,0.25],[D4,0.25],[E4,0.5],[F4,0.5],[E4,0.5],[C4,1],
    [G3,0.5],[E4,0.5],[E4,0.25],[D4,0.25],[E4,0.5],[F4,0.5],[D4,1.5],
    [G3,0.5],[F4,0.5],[F4,0.25],[F4,0.25],[F4,0.5],[E4,0.5],[G4,0.75],[D4,0.25],
    [E4,0.5],
    [F4,0.5],[E4,0.5],[D4,0.5],[C4,0.5],[B3,0.5],[C4,1.5],
    [G3,0.5],[E4,0.5],[E4,0.25],[D4,0.25],[E4,0.5],[F4,0.5],[E4,0.5],[C4,1],
    [G3,0.5],[E4,0.5],[E4,0.25],[D4,0.25],[E4,0.5],[F4,0.5],[D4,1.5],
    [G3,0.5],[F4,0.5],[F4,0.25],[F4,0.25],[F4,0.5],[E4,0.5],[G4,0.75],[D4,0.25],
    [E4,0.5],
    [F4,0.5],[E4,0.5],[D4,0.5],[C4,0.5],[B3,0.5],
  ], repeat: 2 },

  // Source: https://www.mamalisa.com/midi/barata.mid (Mamá Lisa's World, p=872).
  // 100% diatonic. 3 distinct durations. IOI 88% borderline but quarter notes
  // at line endings give clear melodic structure (not karaoke).
  { name: 'A barata diz que tem (PT)', bpm: 80, notes: [
    [G4,0.5],[F4,0.5],[E4,0.5],[D4,0.5],[E4,0.5],[F4,0.5],[G4,1],
    [G4,0.5],[A4,0.5],[F4,0.5],[E4,0.5],[F4,0.5],[G4,0.5],[E4,1],
    [C4,0.5],[C4,0.5],[A4,0.5],[A4,0.5],[A4,0.5],[A4,0.5],[A4,0.5],[A4,0.5],
    [B4,0.5],[C5,0.5],[D5,0.5],[C5,0.5],[B4,0.5],[A4,0.5],[G4,1],
    [G4,0.5],[G4,0.5],[C5,1],[E4,0.5],[E4,0.5],[G4,1],
    [D4,0.5],[E4,0.5],[G4,0.5],[F4,0.5],[E4,0.5],[D4,0.5],
  ], repeat: 2 },

  // Source: U.Minho Cancioneiro #212 (Domingos Morais, 1998) via Wayback —
  // https://web.archive.org/web/20040118025336im_/http://alfarrabio.di.uminho.pt/cancioneiro/kar/212.kar
  // 2-voice arr.; top-voice extracted. Fá M / Lento / 4/4. 100% diatonic, -5 st.
  // 4 distinct durations.
  { name: 'Os olhos da Marianita (PT)', bpm: 100, notes: [
    [G3,1],[C4,1],[C4,0.5],[G3,0.5],[C4,1],
    [D4,1],[E4,1],[G4,2],
    [G4,1],[B4,1],[B4,0.5],[A4,0.5],[G4,1],
    [F4,1],[E4,3],
    [G3,1],[C4,1],[C4,0.5],[G3,0.5],[C4,1],
    [D4,1],[E4,1],[G4,2],
    [G4,1],[B4,1],[B4,0.5],[A4,0.5],[G4,1],
    [F4,1],[E4,3],
    [E4,1],[A4,1],[A4,0.5],[G4,0.5],[F4,1],
    [E4,1],[D4,3],
    [F4,1],[B4,1],[B4,0.5],[A4,0.5],[G4,1],
    [F4,1],[E4,3],
    [E4,1],[A4,1],[A4,0.5],[G4,0.5],[F4,1],
    [E4,1],[D4,3],
    [F4,1],[B4,1],[B4,0.5],[A4,0.5],[G4,1],
    [F4,1],[E4,3],
  ], repeat: 2 },

  // Source: https://www.mamalisa.com/midi/o_meu_chapeu.mid (Mama Lisa BR-PT
  // p=2528). PT/BR uses same melody as international "Mon chapeau / Mein Hut",
  // adapted from Paganini's Carnevale di Venezia (1829). 100% diatonic, -5 st.
  // 4 distinct durations. IOI 73% — passes strict test.
  { name: 'O meu chapéu tem três bicos (PT)', bpm: 180, notes: [
    [D4,1],[G4,2],[D4,1],
    [D4,1],[C4,1],[B3,1],[C4,1],
    [A3,3],[A3,1],
    [B3,1],[C4,1],[C4,1],[D4,1],
    [E4,2],[D4,1],[B3,4],
    [D4,1],
    [G4,2],[D4,1],[D4,1],
    [C4,1],[B3,1],[C4,1],[A3,3],
    [A3,1],[B3,1],
    [C4,2],[D4,1],[E4,2],
    [D4,1],
  ], repeat: 2 },

];

// Song scheduler state: songIdx points into a reshuffled queue so adjacent
// plays don't repeat. songNoteIdx walks the current song's notes. Each song
// is sung N times in a row before advancing — kids' songs are repetitive by
// nature, and looping fills the rain longer than a single pass of a short
// melody. Per-song `repeat` overrides the default.
const SONG_REPEAT_DEFAULT = 3;
let songQueue = [];
let songIdx = -1;
let songNoteIdx = 0;
let songRepIdx = 0;

function songRepeatCount(idx) {
  return SONGS[idx]?.repeat ?? SONG_REPEAT_DEFAULT;
}
function reshuffleSongs() {
  songQueue = SONGS.map((_, i) => i);
  for (let i = songQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songQueue[i], songQueue[j]] = [songQueue[j], songQueue[i]];
  }
}
function pickNextSong() {
  if (songQueue.length === 0) reshuffleSongs();
  songIdx = songQueue.shift();
  songNoteIdx = 0;
  songRepIdx = 0;
}
function currentSongNote() {
  if (songIdx < 0) pickNextSong();
  const song = SONGS[songIdx];
  if (songNoteIdx >= song.notes.length) {
    pickNextSong();
    return SONGS[songIdx].notes[0];
  }
  return song.notes[songNoteIdx];
}
function advanceSong() {
  songNoteIdx++;
  if (songIdx >= 0 && songNoteIdx >= SONGS[songIdx].notes.length) {
    songRepIdx++;
    if (songRepIdx < songRepeatCount(songIdx)) {
      songNoteIdx = 0; // sing the same melody again
      return;
    }
    pickNextSong();
  }
}

function rainActive() {
  if (!rainAllowed) return false;
  if (!settings.fallingLetters) return false;
  if (!settings.quests) return false;
  if (settingsDialog.open) return false;
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

// Pick a key whose pitch matches the song's next note. Quest letter/digit is
// injected when its pitch fits (exact pentatonic class or one step away), or
// force-injected once the budget is exhausted so quest progress never stalls.
function pickRainKey() {
  const [targetFreq] = currentSongNote();

  const needLetter = !!(state.word || state.bonus);
  const needDigit = !!state.eq;
  const correctLetter = needLetter ? nextLetterKey() : null;
  const correctDigit = needDigit ? String(state.eqAnswer) : null;
  const letterFreq = correctLetter ? KEY_TO_FREQ[correctLetter.toUpperCase()] : null;
  const digitFreq = correctDigit ? KEY_TO_FREQ[correctDigit] : null;
  const letterDist = scaleDist(letterFreq, targetFreq);
  const digitDist = scaleDist(digitFreq, targetFreq);

  // 1) Patience exhausted → force-inject (melody hiccups for one beat).
  if (correctLetter && letterInjectBudget >= QUEST_INJECT_BUDGET) {
    letterInjectBudget = 0;
    if (needDigit) digitInjectBudget++;
    return correctLetter;
  }
  if (correctDigit && digitInjectBudget >= QUEST_INJECT_BUDGET) {
    digitInjectBudget = 0;
    if (needLetter) letterInjectBudget++;
    return correctDigit;
  }

  // 2) Close-enough inject. When both fit, pick the closer; tie → letter.
  const letterFits = letterDist <= 1;
  const digitFits = digitDist <= 1;
  if (letterFits && (!digitFits || letterDist <= digitDist)) {
    letterInjectBudget = 0;
    if (needDigit) digitInjectBudget++;
    return correctLetter;
  }
  if (digitFits) {
    digitInjectBudget = 0;
    if (needLetter) letterInjectBudget++;
    return correctDigit;
  }

  // 3) No quest inject → spawn a melody-correct decoy at exactly the song's
  // freq. Prefer letters for letter-quests, digits for math-only.
  if (needLetter) letterInjectBudget++;
  if (needDigit) digitInjectBudget++;
  let pool = FREQ_TO_KEYS.get(targetFreq) || [];
  if (pool.length > 1) {
    const wantDigit = needDigit && !needLetter;
    const filtered = pool.filter(k => wantDigit ? /[0-9]/.test(k) : /[A-Z]/.test(k));
    if (filtered.length) pool = filtered;
  }
  if (pool.length === 0) {
    // Song note isn't in FREQ_TO_KEYS (shouldn't happen with curated SONGS,
    // but be defensive) — fall back to a random alphabet letter.
    return ALPHA[Math.floor(Math.random() * 26)].toLowerCase();
  }
  return pool[Math.floor(Math.random() * pool.length)].toLowerCase();
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
  // Fixed fall duration so spawn order = arrival order — popping in order
  // plays the song's melody in order. Horizontal sway stays random for visual
  // variety; only the vertical timing is locked.
  const dur = 13;
  b.style.setProperty('--x', xvw + 'vw');
  b.style.setProperty('--sx1', sx1 + 'px');
  b.style.setProperty('--sx2', sx2 + 'px');
  b.style.setProperty('--dur', dur + 's');

  // Pop on first pointer crossing — mouse hover, touch drag-through, and
  // Magic Remote cursor sweep all use the same gesture. 250ms settling
  // window so a bubble spawning under a stationary cursor doesn't insta-pop.
  // Safe for quest letters: those are click-only (see makeTappable), so a
  // hovering mouse won't accidentally type them.
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
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onRainTap(b, key);
  });
  b.addEventListener('animationend', () => { b.remove(); updateNextRainMarker(); });
  rainContainer.appendChild(b);
  updateNextRainMarker();
}

// Mark the oldest unpopped bubble as `.next` — that's the song's next note.
// Bubbles are appended in spawn order and all fall at the same speed, so the
// first non-popped child is also the lowest on screen and the next to ground.
function updateNextRainMarker() {
  const next = rainContainer.querySelector('.rain-bubble:not(.pop)');
  for (const b of rainContainer.querySelectorAll('.rain-bubble.next')) {
    if (b !== next) b.classList.remove('next');
  }
  if (next) next.classList.add('next');
}

// Global swipe-through pop: even if pointer capture holds the touch to the
// initial element, pointermove still fires on the window. elementFromPoint
// finds whichever bubble is currently under the finger or cursor.
window.addEventListener('pointermove', (e) => {
  // No bubbles (rain off, e.g. plain desktop) → skip the hit-test, which can
  // force a layout on every mouse move.
  if (!rainContainer.firstChild) return;
  if (settingsDialog.open) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.classList || !el.classList.contains('rain-bubble')) return;
  if (el.classList.contains('pop')) return;
  if (Date.now() - Number(el.dataset.bornAt || 0) < 250) return;
  onRainTap(el, el.dataset.key);
});

function popBubble(bubble) {
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
  updateNextRainMarker();
}

function onRainTap(bubble, key) {
  if (bubble.classList.contains('pop')) return;
  popBubble(bubble);
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

// Pop the oldest in-flight rain bubble whose letter/digit matches `key`.
// Lets a real keypress visually pop the corresponding falling bubble.
function popMatchingBubble(key) {
  if (!key || key.length !== 1) return;
  const norm = normalize(key).toLowerCase();
  let oldest = null;
  let oldestTime = Infinity;
  for (const b of rainContainer.querySelectorAll('.rain-bubble:not(.pop)')) {
    if (b.dataset.key !== norm) continue;
    const t = Number(b.dataset.bornAt) || 0;
    if (t < oldestTime) { oldestTime = t; oldest = b; }
  }
  if (oldest) popBubble(oldest);
}

// Beat-driven scheduler: every tick spawns a bubble (if active) and waits
// the current song note's duration before the next. Inactive periods (settings
// open, no quest) idle on a steady BEAT_MS pulse without advancing the song —
// so when activity resumes, the melody picks up where it left off.
// Quarter-note duration for the currently-playing song, derived from its
// canonical bpm. Falls back to BEAT_MS when no song is selected.
function currentBeatMs() {
  if (songIdx < 0) return BEAT_MS;
  const bpm = SONGS[songIdx].bpm;
  return bpm > 0 ? 60000 / bpm : BEAT_MS;
}

function rainTick() {
  if (!rainActive()) {
    rainTimer = setTimeout(rainTick, BEAT_MS);
    return;
  }
  const [, beats] = currentSongNote();
  spawnRainBubble();
  advanceSong();
  rainTimer = setTimeout(rainTick, beats * currentBeatMs());
}

function startRain() {
  if (rainTimer) return;
  rainTimer = setTimeout(rainTick, 400);
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

// app.js — Kanji Memory Game

/* ════════════════════════════════
   STEP 10 — App State
   ════════════════════════════════ */
const state = {
  selectedSets: ['grade1'],
  boardSize: 4,
  cards: [],
  flipped: [],       // indices of currently face-up unmatched
  matched: [],       // indices of matched pairs
  showAll: false,
  favourites: new Set(JSON.parse(localStorage.getItem('favs') || '[]'))
};

/* ── DOM refs ── */
const $board      = document.getElementById('board');
const $btnRestart = document.getElementById('btn-restart');
const $btnSelect  = document.getElementById('btn-select');
const $btnShow    = document.getElementById('btn-show');
const $btnBack    = document.getElementById('btn-back');
const $screenGame = document.getElementById('screen-game');
const $screenSel  = document.getElementById('screen-select');

/* ════════════════════════════════
   STEP 11 — buildDeck
   ════════════════════════════════ */
function buildDeck() {
  const size = state.boardSize;
  const totalSlots = size * size;
  const centerIdx = (size % 2 === 1) ? Math.floor(totalSlots / 2) : -1;
  const pairCount = (totalSlots - (centerIdx >= 0 ? 1 : 0)) / 2;

  // Filter pool by selected sets
  let pool = [];
  for (const k of state.selectedSets) {
    if (k === 'favourites') {
      pool = pool.concat(KANJI_DATA.filter(d => state.favourites.has(d.kanji)));
    } else if (k.startsWith('grade')) {
      const g = parseInt(k.replace('grade', ''));
      pool = pool.concat(KANJI_DATA.filter(d => d.grade === g));
    } else {
      // theme key
      pool = pool.concat(KANJI_DATA.filter(d => d.themes.includes(k)));
    }
  }

  // Deduplicate
  const seen = new Set();
  pool = pool.filter(d => {
    if (seen.has(d.kanji)) return false;
    seen.add(d.kanji);
    return true;
  });

  // Fill up with grade 1 kanji if pool is too small
  if (pool.length < pairCount) {
    const filler = KANJI_DATA.filter(d => d.grade === 1 && !seen.has(d.kanji));
    shuffle(filler);
    for (const d of filler) {
      if (pool.length >= pairCount) break;
      pool.push(d);
      seen.add(d.kanji);
    }
  }

  // Shuffle pool, pick pairCount
  shuffle(pool);
  const picked = pool.slice(0, pairCount);

  // Duplicate and shuffle
  let cards = [];
  picked.forEach((d, i) => {
    cards.push({ ...d, pairId: i });
    cards.push({ ...d, pairId: i });
  });
  shuffle(cards);

  // Insert blank at center for odd boards
  if (centerIdx >= 0) {
    cards.splice(centerIdx, 0, null); // null = blank
  }

  state.cards = cards;
  state.flipped = [];
  state.matched = [];
  state.showAll = false;
}

/* ════════════════════════════════
   STEP 12 — renderBoard
   ════════════════════════════════ */
function renderBoard() {
  $board.style.setProperty('--cols', state.boardSize);
  $board.style.setProperty('--rows', state.boardSize);
  $board.innerHTML = '';

  state.cards.forEach((card, idx) => {
    if (card === null) {
      const blank = document.createElement('div');
      blank.className = 'card-blank';
      $board.appendChild(blank);
      return;
    }

    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.index = idx;

    const isFav = state.favourites.has(card.kanji);

    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front"></div>
        <div class="card-face card-back">
          <button class="card-btn fav ${isFav ? 'is-fav' : ''}" data-action="fav" data-kanji="${card.kanji}">❤️</button>
          <button class="card-btn stroke" data-action="stroke" data-kanji="${card.kanji}">✍️</button>
          <div class="kanji">${card.kanji}</div>
          <div class="romaji">${card.romaji}</div>
          <div class="meaning">${card.meaning}</div>
        </div>
      </div>`;

    $board.appendChild(el);
  });
}

/* ════════════════════════════════
   STEP 13 — Card Click / Flip
   ════════════════════════════════ */
$board.addEventListener('click', e => {
  // Handle corner buttons
  const btn = e.target.closest('.card-btn');
  if (btn) {
    e.stopPropagation();
    const action = btn.dataset.action;
    const kanji = btn.dataset.kanji;

    if (action === 'fav') {
      toggleFavourite(kanji, btn);
    } else if (action === 'stroke') {
      window.open('https://jisho.org/search/' + encodeURIComponent(kanji) + '%20%23kanji', '_blank', 'noopener,noreferrer');
    }
    return;
  }

  // Handle card flip
  if (state.showAll) return;

  const cardEl = e.target.closest('.card');
  if (!cardEl) return;

  const idx = parseInt(cardEl.dataset.index);

  // Clicking an already-flipped card when two are open (mismatch) — close both
  if (state.flipped.includes(idx)) {
    if (state.flipped.length === 2) {
      state.flipped.forEach(i => {
        const el = $board.querySelector(`[data-index="${i}"]`);
        if (el) el.classList.remove('flipped');
      });
      state.flipped = [];
    }
    return;
  }

  if (state.matched.includes(idx)) return;

  // Flip
  cardEl.classList.add('flipped');
  state.flipped.push(idx);

  // Two flipped — check match
  if (state.flipped.length === 2) {
    const [a, b] = state.flipped;
    const cardA = state.cards[a];
    const cardB = state.cards[b];

    if (cardA.pairId === cardB.pairId) {
      // Match!
      state.matched.push(a, b);
      const elA = $board.querySelector(`[data-index="${a}"]`);
      const elB = $board.querySelector(`[data-index="${b}"]`);
      elA.classList.add('matched');
      elB.classList.add('matched');
      state.flipped = [];
    }
    // Mismatch: keep both flipped, wait for next click
  }

  // Third card clicked while two mismatched cards are open — close the old two
  if (state.flipped.length === 3) {
    const [a, b] = state.flipped;
    const elA = $board.querySelector(`[data-index="${a}"]`);
    const elB = $board.querySelector(`[data-index="${b}"]`);
    if (elA) elA.classList.remove('flipped');
    if (elB) elB.classList.remove('flipped');
    state.flipped = [state.flipped[2]]; // keep only the newly clicked card
  }
});

/* ════════════════════════════════
   STEP 14 — Show / Hide All
   ════════════════════════════════ */
$btnShow.addEventListener('click', () => {
  state.showAll = !state.showAll;

  const allCards = $board.querySelectorAll('.card');
  allCards.forEach(el => {
    const idx = parseInt(el.dataset.index);
    if (state.matched.includes(idx)) return; // leave matched as-is
    if (state.showAll) {
      el.classList.add('flipped');
    } else {
      el.classList.remove('flipped');
    }
  });
});

/* ════════════════════════════════
   STEP 15 — Restart
   ════════════════════════════════ */
function restart() {
  buildDeck();
  renderBoard();
}

$btnRestart.addEventListener('click', restart);

/* ════════════════════════════════
   STEP 16 — Screen Navigation
   ════════════════════════════════ */
let prevSets = [...state.selectedSets];
let prevSize = state.boardSize;

$btnSelect.addEventListener('click', () => {
  prevSets = [...state.selectedSets];
  prevSize = state.boardSize;
  $screenGame.classList.remove('active');
  $screenSel.classList.add('active');
});

$btnBack.addEventListener('click', () => {
  $screenSel.classList.remove('active');
  $screenGame.classList.add('active');

  // Restart if selection changed
  const sortedCur = [...state.selectedSets].sort();
  const sortedPrev = [...prevSets].sort();
  const setsChanged = sortedCur.length !== sortedPrev.length ||
    sortedCur.some((s, i) => s !== sortedPrev[i]);
  const sizeChanged = state.boardSize !== prevSize;

  if (setsChanged || sizeChanged) {
    restart();
  }
});

/* ════════════════════════════════
   STEP 17 — Select Screen Buttons
   ════════════════════════════════ */
function initSelectScreen() {
  // Set buttons
  const setBtns = document.querySelectorAll('.set-btn');
  setBtns.forEach(btn => {
    const key = btn.dataset.set;

    // Sync initial active state
    if (state.selectedSets.includes(key)) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      if (key === 'favourites') {
        // Toggle favourites
        if (state.selectedSets.includes('favourites')) {
          state.selectedSets = state.selectedSets.filter(s => s !== 'favourites');
          btn.classList.remove('active');
        } else {
          state.selectedSets.push('favourites');
          btn.classList.add('active');
        }
      } else {
        if (state.selectedSets.includes(key)) {
          // Prevent deselecting last set (unless favourites is also selected)
          const hasFav = state.selectedSets.includes('favourites');
          const nonFav = state.selectedSets.filter(s => s !== 'favourites');
          if (nonFav.length <= 1 && !hasFav) return;
          state.selectedSets = state.selectedSets.filter(s => s !== key);
          btn.classList.remove('active');
        } else {
          state.selectedSets.push(key);
          btn.classList.add('active');
        }
      }
      updateFavButton();
    });
  });

  // Size buttons
  const sizeBtns = document.querySelectorAll('.size-btn');
  sizeBtns.forEach(btn => {
    const size = parseInt(btn.dataset.size);
    btn.addEventListener('click', () => {
      state.boardSize = size;
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  updateFavButton();
}

function updateFavButton() {
  const favBtn = document.querySelector('.fav-btn');
  if (!favBtn) return;
  if (state.favourites.size === 0) {
    favBtn.classList.add('disabled');
  } else {
    favBtn.classList.remove('disabled');
  }
}

/* ════════════════════════════════
   STEP 18 — Favourites Persistence
   ════════════════════════════════ */
function toggleFavourite(kanji, btnEl) {
  if (state.favourites.has(kanji)) {
    state.favourites.delete(kanji);
    btnEl.classList.remove('is-fav');
  } else {
    state.favourites.add(kanji);
    btnEl.classList.add('is-fav');
  }
  localStorage.setItem('favs', JSON.stringify([...state.favourites]));
  updateFavButton();
}

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ════════════════════════════════
   INIT
   ════════════════════════════════ */
initSelectScreen();
restart();

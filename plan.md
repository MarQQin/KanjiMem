# Plan: Kanji Memory Game PWA

## Overview
Vanilla JS/CSS/HTML PWA memory card game with Japanese kanji. Deploys to GitHub Pages, mobile-optimized for S10/Pixel 10 Pro. No frameworks. Cards show large kanji + romaji + German meaning. Selectable card sets (grades 1–4 + themes), board sizes (3×3/4×4/5×5), favourites via localStorage.

---

## File Structure
```
d:\PROGR\HTML\Memory\
  index.html          ← shell, two screens, no scripts inlined
  manifest.json       ← PWA manifest
  sw.js               ← service worker (cache-first)
  style.css           ← all styling incl. card flip, grid, screens
  app.js              ← game state, rendering, UI events
  data.js             ← kanji array with grade/theme/romaji/meaning
  icons/
    icon-192.png      ← generated via canvas or SVG→PNG
    icon-512.png
```

---

## Steps

### Phase 1 – Scaffolding (steps 1–3)
**Step 1** – Create `index.html`
- Two `<section>` divs: `#screen-game` and `#screen-select`
- `#screen-game`: `<div id="board">`, `<footer>` with three icon buttons: restart (🔄), select (⚙️), show (👁)
- `#screen-select`: grid of icon buttons for grade (🐤🐔🦅🦉) + theme (🐾🐦🌳🌸🌍👤) + ❤️ favourites; back button
- Link `style.css`, `data.js`, `app.js`; add `<link rel="manifest">`; viewport meta; theme-color meta

**Step 2** – Create `manifest.json`
- name, short_name, start_url, display: standalone, background_color, theme_color
- icons array pointing to `icons/icon-192.png` and `icons/icon-512.png`

**Step 3** – Create `sw.js`
- Cache-first strategy; precache: `index.html`, `style.css`, `app.js`, `data.js`, `manifest.json`, both icons
- `install` event caches all; `fetch` event returns cache then network

**Step 3b** – Create placeholder PNG icons
- Simple canvas script or use a pre-built SVG/PNG with 漢 character on colored background
- Two sizes: 192×192 and 512×512

---

### Phase 2 – Kanji Data (steps 4–8)
Data model per entry:
```js
{ kanji:'山', romaji:'yama', meaning:'Berg', grade:1, themes:['nature','earth'] }
```

**Step 4** – Create `data.js` – Grade 1 (80 kanji)
Full list with romaji + German meaning; minimal theme tags

**Step 5** – Append Grade 2 kanji (160 kanji) to `data.js`

**Step 6** – Append Grade 3 kanji (200 kanji) to `data.js`

**Step 7** – Append Grade 4 kanji (202 kanji) to `data.js`

**Step 8** – Add theme tags across all grades
Theme keys: `animals`, `birds`, `nature`, `poetic`, `earth`, `man`, `spirit`, `music`, `zeit`
Examples:
- animals: 犬馬牛魚虫羊象etc.
- birds: 鳥鶴鷹etc.
- nature: 山川木花草竹林森etc.
- poetic: 月星風雲雪夢etc.
- earth: 土石岩山川海etc.
- man: 人男女子父母兄弟etc.

---

### Phase 3 – CSS (step 9)
**Step 9** – Create `style.css`
- CSS custom properties: colors, card size, gap
- Mobile-first, 100dvh layout, safe-area insets
- `.screen` visibility toggle (`display:none` / `display:flex`)
- Board: CSS grid, `grid-template-columns: repeat(var(--cols), 1fr)`; aspect-ratio square cells
- Card: `perspective`, `.card` with `.card-inner` for 3D flip transform; front = back of card (pattern), back = kanji face
- Card face: large kanji (`font-size: clamp`), smaller romaji, small meaning; two corner icon buttons (❤️ top-left, ✍️ top-right)
- `.matched` state: subtle glow or color
- Footer buttons: large touch targets (min 48px)
- Select screen: 2-column grid of big icon buttons, toggle `.active` highlight

---

### Phase 4 – App Logic (steps 10–16)
**Step 10** – App state object in `app.js`
```js
const state = {
  selectedSets: ['grade1'],   // array of active filter keys
  boardSize: 4,               // 3|4|5
  cards: [],                  // current board card objects
  flipped: [],                // indices of currently face-up unmatched
  matched: [],                // indices of matched pairs
  showAll: false,
  favourites: new Set(JSON.parse(localStorage.getItem('favs')||'[]'))
}
```

**Step 11** – `buildDeck(state)` function
- Filter `KANJI_DATA` by `state.selectedSets` (grade keys + theme keys + 'favourites')
- Compute pair count: 3×3→4 pairs, 4×4→8 pairs, 5×5→12 pairs
- Randomly pick N unique kanji; duplicate each → shuffle → array of card objects `{kanji, romaji, meaning, id, pairId}`
- Assign board positions; for odd boards insert blank placeholder at center index ((size²-1)/2)

**Step 12** – `renderBoard(state)` function
- Set CSS `--cols` var on `#board`
- For each position: if blank → render empty `.card-blank`; else render `.card` element with front/back HTML
- Card back HTML: `<div class="kanji">漢</div><div class="romaji">...</div><div class="meaning">...</div>` + two corner buttons
- Cards start face-down (showing front/pattern side)

**Step 13** – Card click / flip logic
- Click on `.card`: if `showAll` active → ignore; if already flipped or matched → ignore
- Push to `state.flipped`; add `.flipped` class
- If 2 flipped: check pairId match
  - Match: add `.matched` to both; clear `state.flipped`
  - No match: after 1000ms remove `.flipped` from both; clear `state.flipped`

**Step 14** – Show / hide all
- Toolbar "show" button toggles `state.showAll`
- When true: add `.flipped` to all unmatched cards
- When false: remove `.flipped` from all unmatched; restore matched state unchanged; do NOT reshuffle

**Step 15** – Restart
- Call `buildDeck` → `renderBoard`; resets `state.flipped`, `state.matched`, `state.showAll`

**Step 16** – Screen navigation
- "Select" button in toolbar → hide `#screen-game`, show `#screen-select`
- "Back" button on select screen → show `#screen-game`, hide `#screen-select`; call `restart` if selection changed

---

### Phase 5 – Select Screen (steps 17–18)
**Step 17** – Render select screen buttons
- Grade buttons: icons 🐤🐔🦅🦉 mapped to keys `grade1`–`grade4`; toggle `.active`
- Theme buttons: 🐾🐦🌳🌸🌍👤 → keys `animals birds nature poetic earth man`; toggle `.active`
- Favourites button: ❤️ → key `favourites`
- Board size buttons: `3×3` `4×4` `5×5` (text or grid icon)
- At least one set must always remain selected (prevent deselecting all)
- On any toggle → update `state.selectedSets`/`state.boardSize`

**Step 18** – Favourites persistence
- On favourite button click on a card: toggle kanji in `state.favourites` Set
- `localStorage.setItem('favs', JSON.stringify([...state.favourites]))`
- Visual: filled ❤️ if favourite
- If `favourites` set is empty, grey-out the favourites selection button

---

### Phase 6 – Stroke Order (step 19)
**Step 19** – Stroke order button
- On click: `window.open('https://www.kanjialive.com/kanji/' + encodeURIComponent(card.kanji), '_blank')`
- Alternative URL to configure later: jisho.org, or stroke order diagrams site
- Button uses ✍️ icon; placed top-right corner of card face

---

### Phase 7 – Polish & Deploy (steps 20–21)
**Step 20** – Mobile polish pass
- Test viewport on 360px width (S10) and 412px (Pixel 10 Pro)
- Card sizing: 3×3 board cards ≈ 100px, 4×4 ≈ 75px, 5×5 ≈ 60px – adjust with clamp()
- Touch: ensure `pointer-events` correct on buttons inside cards vs. card flip
- Prevent double-tap zoom on buttons (`touch-action: manipulation`)
- PWA install prompt: `beforeinstallprompt` listener for custom install button (optional)

**Step 21** – GitHub Pages setup
- Add `.nojekyll` file to root
- README.md with description
- Confirm all asset paths are relative
- Service worker scope must be `/` (or repo subfolder if using project page)

---

## Verification
1. Open in Chrome DevTools mobile emulation (360×800 Galaxy S10)
2. Flip cards, check animation smoothness
3. Match two pairs, verify matched state persists through show/hide
4. Show button: all cards reveal; press again → all hide (no reshuffle)
5. Restart: new card set drawn, board resets
6. Select screen: toggle grades/themes, confirm deck filters correctly
7. Favourite a kanji → reload page → confirm ❤️ still filled
8. Select "Favourites" set with ≥1 saved → game uses those cards
9. Stroke order button opens external page in new tab
10. Lighthouse PWA audit: score ≥ 90
11. Install as PWA on Android, confirm standalone launch

---

## Decisions
- No framework; pure vanilla JS for portability and zero build step
- Single `data.js` file (not split by grade) — simpler for incremental editing
- Blank center tile is a CSS-only placeholder (no card object), skipped in game logic
- Stroke order URL = kanjialive.com for now; easy to change in one place
- Icons: generate via inline `<canvas>` script → `toDataURL()` → save as PNG, OR supply hand-crafted SVG; plan step 3b handles this
- Grade 1–4 only (kyoiku kanji, ~642 total); grades 5–6 excluded per request

# Mobile Device Viewport Sizes (for VS Code Browser Preview)

Use these values for the Simple Browser / Live Preview dimensions and DPR settings.

| Model                  | Viewport Size | Screen Resolution | DPR   | Year |
| ---------------------- | ------------- | ----------------- | ----- | ---- |
| Google Pixel 10 Pro    | 410 × 914     | 1280 × 2856       | 3.125 | 2025 |
| Samsung Galaxy S10     | 360 × 760     | 1440 × 3040       | 4.0   | 2019 |
| Google Pixel 10a       | 360 × 780     | 1080 × 2400       | 3.0   | 2024 |

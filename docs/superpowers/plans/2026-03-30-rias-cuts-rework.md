# rias cuts UI Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 2-column poster grid + tab bar UI with a 6-screen Aiby/Ahead/Apple Invites-inspired architecture: Home hub with 5 tiles, reusable poster grid, detail modal, nano genre picker, mood questions, and shuffle.

**Architecture:** Vanilla JS + CSS, no framework. All screens are `<div class="view">` elements toggled via a `switchView()` function. State is a global `state` object. Components are builder functions that return DOM fragments. One `index.html`, one `styles.css`, one `app.js`, one `components.js`, one `data.js` (unchanged). A new `filters.js` file holds all data filtering/scoring functions.

**Tech Stack:** Vanilla JS (ES5-ish with async/await), CSS custom properties, TMDB API, Google Fonts (Outfit)

**Spec:** `docs/superpowers/specs/2026-03-30-rias-cuts-rework-design.md`

**Build approach:** Git branch per screen (use `superpowers:using-git-worktrees` for isolation). Build order: Home, Grid, Detail Modal, Genre Picker, Mood Questions, Shuffle. Operator approves each before moving to next.

**APPROVAL GATES:** After completing each task (including its 7-step pipeline), STOP and send the result to the operator (Ria) on Telegram for review. Include a screenshot or live link. DO NOT proceed to the next task until Ria explicitly approves. If Ria requests changes, iterate until approved before moving on. This is a hard gate — no exceptions.

**Per-Screen Pipeline:** Every screen follows this sequence before being marked complete:

1. **Research** -- invoke `refero-design` skill + `mcp__refero` (search_screens/search_flows) to find real product reference screens matching the screen type (e.g., search "home grid tiles" for Home, search "card grid actions" for Grid, search "shuffle swipe card" for Shuffle)
2. **Design decisions** -- invoke `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design` skills to validate layout, spacing, typography, color, and block cheap AI defaults
3. **Build** -- invoke `frontend-design` skill for production-grade code generation, then implement per this plan
4. **Animate** -- invoke `animate` skill to review the screen and enhance with purposeful animations. Use `mcp__gsap-mcp` (understand_and_create_animation, create_production_pattern) for GSAP transitions/timelines/scroll effects. Use Motion MCP for spring physics, gestures, card flips, layout transitions. Check `mcp__reactbits` (search_components) for reusable pre-built animated component patterns.
5. **Responsive** -- invoke `adapt` skill to verify cross-device behavior, breakpoints, touch targets
6. **Critique** -- invoke `critique` skill for UX evaluation with quantitative scoring, persona testing, actionable feedback
7. **Verify** -- invoke `superpowers:verification-before-completion` before marking any screen done
8. **Debug** -- if any bugs or unexpected behavior, invoke `superpowers:systematic-debugging` before proposing fixes

**Hard rules:**
- No emojis anywhere in UI
- "rias cuts" all lowercase, no apostrophe, no period
- No particles/PrismDots
- Real streaming logos (TMDB logo_path), never text
- No localStorage persistence (deferred)
- No DNF blocklist integration with content engine (deferred)
- No refresh/new batch logic (deferred)

---

## File Structure

### New file
- `filters.js` -- all data filtering and scoring functions (getLatestReleases, getMoviesByGenre, filterByMood, getShufflePool, getSavedMovies, isDNF)

### Modified files
- `index.html` -- new view sections, remove old views/tab bar, add filters.js script tag
- `styles.css` -- remove old styles (tab bar, collections, categories, showcase, tiles, star rating), add new styles for all 6 screens
- `components.js` -- remove old builders, add new builders for each screen
- `app.js` -- new state shape, new switchView, new navigation handlers, new init

### Unchanged
- `data.js` -- TMDB API layer, loadMovieData(), no changes
- `live_recommendations.json` -- data source, no changes

---

## Task 1: Scaffolding -- State, Filters, HTML Shell, and View Switching

**Branch:** `screen/home` (create with `superpowers:using-git-worktrees`)

**Files:**
- Create: `filters.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

**Pipeline:** This is infrastructure -- skip the design pipeline (no visible UI yet). Just build and verify.

This task strips out the old UI skeleton and lays the foundation for all 6 screens. After this task, the app loads, shows a blank home view, and `switchView()` works across all new views.

- [ ] **Step 1: Create `filters.js` with all filtering functions**

Create `/tmp/movie-rec-v1-web/filters.js`:

```javascript
/* ═══════════════════════════════════════════
   filters.js — Data filtering & scoring
   ═══════════════════════════════════════════ */

/* ─── DNF Check ─── */
function isDNF(tmdbId) {
  return !!(state.actionStates[tmdbId] && state.actionStates[tmdbId].dnf);
}

/* ─── Exclude DNF'd movies from any list ─── */
function excludeDNF(movies) {
  return movies.filter(function(m) { return !isDNF(m.tmdb_id); });
}

/* ─── Latest Releases: year >= 2024 ─── */
function getLatestReleases() {
  return excludeDNF(state.movies.filter(function(m) {
    return m.year && Number(m.year) >= 2024;
  }));
}

/* ─── Movies by nano genre ─── */
function getMoviesByGenre(genreName) {
  var ranks = state.categories[genreName] || [];
  var movies = ranks.map(function(r) {
    return state.movies.find(function(m) { return m.rank === r; });
  }).filter(Boolean);
  return excludeDNF(movies);
}

/* ─── Shuffle pool: all movies minus DNF ─── */
function getShufflePool() {
  return excludeDNF(state.movies.slice());
}

/* ─── Saved movies ─── */
function getSavedMovies() {
  return excludeDNF(state.movies.filter(function(m) {
    return state.actionStates[m.tmdb_id] && state.actionStates[m.tmdb_id].saved;
  }));
}

/* ─── Mood-based filtering/sorting ─── */
/* moodAnswers shape: { intensity: 0|1|2, gore: 0|1|2, grounding: 0|1|2 }
   0 = low/mild/real, 1 = medium/moderate/mixed, 2 = high/extreme/supernatural
   Scoring: movies with higher taste_match_score float up.
   Intensity preference boosts movies whose nano_genres suggest intensity.
   Gore preference is approximated by category keywords.
   Grounding preference checks for "supernatural" in nano_genres. */

var INTENSE_GENRES = ['torture horror', 'death game', 'cannibalism', 'serial killer'];
var GORY_GENRES = ['torture horror', 'cannibalism', 'revenge horror', 'serial killer'];
var SUPERNATURAL_GENRES = ['supernatural horror', 'possession horror', 'creature horror'];

function filterByMood(movies, moodAnswers) {
  if (!moodAnswers) return movies;

  return movies.slice().sort(function(a, b) {
    var scoreA = moodScore(a, moodAnswers);
    var scoreB = moodScore(b, moodAnswers);
    return scoreB - scoreA;
  });
}

function moodScore(movie, mood) {
  var score = movie.taste_match_score || 0;
  var genres = (movie.nano_genres || []).concat(movie.category || '');

  // Intensity boost
  var isIntense = genres.some(function(g) { return INTENSE_GENRES.indexOf(g) !== -1; });
  if (mood.intensity === 2 && isIntense) score += 0.3;
  else if (mood.intensity === 0 && !isIntense) score += 0.2;
  else if (mood.intensity === 1) score += 0.1;

  // Gore boost
  var isGory = genres.some(function(g) { return GORY_GENRES.indexOf(g) !== -1; });
  if (mood.gore === 2 && isGory) score += 0.3;
  else if (mood.gore === 0 && !isGory) score += 0.2;
  else if (mood.gore === 1) score += 0.1;

  // Grounding boost
  var isSupernatural = genres.some(function(g) { return SUPERNATURAL_GENRES.indexOf(g) !== -1; });
  if (mood.grounding === 2 && isSupernatural) score += 0.3;
  else if (mood.grounding === 0 && !isSupernatural) score += 0.3;
  else if (mood.grounding === 1) score += 0.1;

  return score;
}
```

- [ ] **Step 2: Rewrite `index.html` with new view structure**

Replace the entire contents of `/tmp/movie-rec-v1-web/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>rias cuts</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230a0a0a'/><text x='50' y='62' text-anchor='middle' font-size='40' fill='%23f5f5f5' font-family='sans-serif'>rc</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<!-- Loading Screen -->
<div id="loading-screen">
  <div class="spinner"></div>
  <p>Loading recommendations...</p>
</div>

<!-- Fullscreen Image Viewer -->
<div class="fullscreen-viewer" id="fullscreen-viewer">
  <img id="fullscreen-img" src="" alt="">
</div>

<!-- App -->
<div id="app">

  <!-- HOME VIEW -->
  <div class="view active" id="home-view">
    <div class="bg-photo"></div>
    <div class="home-content">
      <div class="showcase-header">
        <div class="sh-brand">rias</div>
        <div class="sh-sub">cuts</div>
      </div>
      <div class="home-explore">Explore</div>
      <div class="home-tiles" id="home-tiles"></div>
    </div>
  </div>

  <!-- GRID VIEW -->
  <div class="view" id="grid-view">
    <div class="grid-header">
      <div class="grid-back" id="grid-back">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div class="grid-title" id="grid-title"></div>
    </div>
    <div class="grid-scroll">
      <div class="grid-cards" id="grid-cards"></div>
    </div>
  </div>

  <!-- GENRE PICKER VIEW -->
  <div class="view" id="genre-picker-view">
    <div class="genre-header">
      <div class="genre-back" id="genre-back">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div class="genre-heading">Nano Genres</div>
    </div>
    <div class="genre-scroll">
      <div class="genre-tiles" id="genre-tiles"></div>
    </div>
  </div>

  <!-- MOOD QUESTIONS VIEW -->
  <div class="view" id="mood-view">
    <div class="mood-header">
      <div class="mood-back" id="mood-back">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div class="mood-heading" id="mood-heading"></div>
    </div>
    <div class="mood-scroll">
      <div class="mood-questions" id="mood-questions"></div>
    </div>
  </div>

  <!-- SHUFFLE VIEW -->
  <div class="view" id="shuffle-view">
    <div class="shuffle-exit" id="shuffle-exit">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <div class="shuffle-card-area" id="shuffle-card-area"></div>
  </div>

  <!-- DETAIL MODAL OVERLAY -->
  <div class="detail-overlay" id="detail-overlay">
    <div class="detail-modal" id="detail-modal">
      <div class="detail-close" id="detail-close">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <div class="detail-modal-content" id="detail-modal-content"></div>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast" id="toast"></div>

</div>

<!-- Scripts: data first, then filters, then components, then app -->
<script src="data.js"></script>
<script src="filters.js"></script>
<script src="components.js"></script>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Rewrite the global state and switchView in `app.js`**

Replace the entire `app.js` Global State section (lines 1-48 of current file) plus the ALL_VIEWS and switchView function with this new content. This replaces the **entire file** since all old logic is being removed. Write the full new `app.js`:

```javascript
/* ═══════════════════════════════════════════
   app.js — Main app logic, routing, state
   ═══════════════════════════════════════════ */

/* ─── Global State ─── */
var state = {
  movies: [],
  categories: {},
  currentView: 'home',
  previousView: 'home',
  actionStates: {},   // { [tmdb_id]: { saved: bool, dnf: bool } }
  watchStatus: {},    // { [tmdb_id]: 0|1|2 } (want/watching/watched)
  ratings: {},        // { [tmdb_id]: 'loved' | 'ok' | 'not_for_me' }
  currentGenre: '',
  moodAnswers: null,  // { intensity: 0|1|2, gore: 0|1|2, grounding: 0|1|2 }
  gridContext: '',     // 'latest' | 'all' | 'saved' | 'genre'
  shufflePool: [],
  shuffleIndex: 0,
  detailMovie: null,
  detailFrom: '',     // 'grid' | 'shuffle'
};

/* ─── View Switching ─── */
var ALL_VIEWS = {
  home: 'home-view',
  grid: 'grid-view',
  'genre-picker': 'genre-picker-view',
  mood: 'mood-view',
  shuffle: 'shuffle-view',
};

function switchView(viewName) {
  Object.entries(ALL_VIEWS).forEach(function(entry) {
    document.getElementById(entry[1]).classList.toggle('active', entry[0] === viewName);
  });
  state.previousView = state.currentView;
  state.currentView = viewName;
}

/* ─── Detail Modal ─── */
function openDetailModal(movie, from) {
  state.detailMovie = movie;
  state.detailFrom = from || 'grid';

  var content = document.getElementById('detail-modal-content');
  content.textContent = '';

  buildDetailModalContent(movie).then(function(fragment) {
    content.appendChild(fragment);
    var overlay = document.getElementById('detail-overlay');
    overlay.classList.add('active');
    if (from === 'shuffle') {
      overlay.classList.add('from-shuffle');
    } else {
      overlay.classList.remove('from-shuffle');
    }
  });
}

function closeDetailModal() {
  var overlay = document.getElementById('detail-overlay');
  overlay.classList.remove('active');
  overlay.classList.remove('from-shuffle');
}

/* ─── Navigation Handlers ─── */
function goHome() {
  switchView('home');
}

function openGrid(context, title, movies) {
  state.gridContext = context;
  var gridTitle = document.getElementById('grid-title');
  gridTitle.textContent = title;

  var container = document.getElementById('grid-cards');
  container.textContent = '';

  movies.forEach(function(movie) {
    container.appendChild(buildGridCard(movie));
  });

  switchView('grid');
}

function openGenrePicker() {
  var container = document.getElementById('genre-tiles');
  container.textContent = '';

  Object.entries(state.categories).forEach(function(entry) {
    var name = entry[0];
    var ranks = entry[1];
    container.appendChild(buildGenreTile(name, ranks.length));
  });

  switchView('genre-picker');
}

function openMoodQuestions(genreName) {
  state.currentGenre = genreName;
  state.moodAnswers = { intensity: 1, gore: 1, grounding: 1 };

  document.getElementById('mood-heading').textContent = genreName;

  var container = document.getElementById('mood-questions');
  container.textContent = '';
  container.appendChild(buildMoodQuestionsContent());

  switchView('mood');
}

function submitMood() {
  var movies = getMoviesByGenre(state.currentGenre);
  var filtered = filterByMood(movies, state.moodAnswers);
  openGrid('genre', state.currentGenre, filtered);
}

function openShuffle() {
  state.shufflePool = getShufflePool();
  if (state.shufflePool.length === 0) {
    showToast('No movies available');
    return;
  }
  // Shuffle the array
  for (var i = state.shufflePool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = state.shufflePool[i];
    state.shufflePool[i] = state.shufflePool[j];
    state.shufflePool[j] = temp;
  }
  state.shuffleIndex = 0;
  renderShuffleCard();
  switchView('shuffle');
}

function reshuffleNext() {
  state.shuffleIndex++;
  // If we've gone through all, reshuffle
  if (state.shuffleIndex >= state.shufflePool.length) {
    state.shufflePool = getShufflePool();
    if (state.shufflePool.length === 0) {
      showToast('No more movies');
      goHome();
      return;
    }
    for (var i = state.shufflePool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = state.shufflePool[i];
      state.shufflePool[i] = state.shufflePool[j];
      state.shufflePool[j] = temp;
    }
    state.shuffleIndex = 0;
  }
  renderShuffleCard();
}

function renderShuffleCard() {
  var movie = state.shufflePool[state.shuffleIndex];
  if (!movie) return;
  var area = document.getElementById('shuffle-card-area');
  area.textContent = '';
  area.appendChild(buildShuffleCard(movie));
}

/* ─── Actions ─── */
function toggleSaved(tmdbId) {
  if (!state.actionStates[tmdbId]) state.actionStates[tmdbId] = {};
  var wasSaved = state.actionStates[tmdbId].saved;
  state.actionStates[tmdbId].saved = !wasSaved;
  showToast(wasSaved ? 'Removed from Saved' : 'Added to Saved');
  return !wasSaved;
}

function doDNF(tmdbId) {
  if (!state.actionStates[tmdbId]) state.actionStates[tmdbId] = {};
  state.actionStates[tmdbId].dnf = true;
  showToast('Removed forever');
}

function setRating(tmdbId, rating) {
  state.ratings[tmdbId] = rating;
  var labels = { loved: 'Loved it', ok: 'It was ok', not_for_me: 'Not for me' };
  showToast(labels[rating] || rating);
}

/* ─── Filter ad-tier & duplicate streaming providers ─── */
function filterProviders(list) {
  var AD_PATTERNS = /with ads|standard with|premium plus with|free with/i;
  var seen = {};
  return list.filter(function(p) {
    var name = p.provider_name || p.name || '';
    if (!name) return false;
    if (AD_PATTERNS.test(name)) return false;
    var base = name.toLowerCase().replace(/\s*(basic|standard|premium|plus|free)\s*/gi, '').trim();
    if (seen[base]) return false;
    seen[base] = true;
    return true;
  });
}

/* ─── Toast ─── */
var toastTimeout = null;
function showToast(message) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() { toast.classList.remove('show'); }, 1800);
}

/* ─── Fullscreen Viewer ─── */
function openFullscreen(url) {
  var viewer = document.getElementById('fullscreen-viewer');
  document.getElementById('fullscreen-img').src = url;
  viewer.classList.add('active');
}

function closeFullscreen() {
  document.getElementById('fullscreen-viewer').classList.remove('active');
}

/* ─── Similar Movie (from detail) ─── */
async function openSimilarMovie(tmdbId) {
  var details = await getMovieDetails(tmdbId);
  if (!details) return;
  var movie = {
    tmdb_id: tmdbId,
    title: details.title,
    year: (details.release_date || '').substring(0, 4),
    overview: details.overview,
    poster_url: details.poster_path ? TMDB_IMG + '/w500' + details.poster_path : '',
    backdrop_path: details.backdrop_path,
    director: '',
    cast: [],
    runtime: details.runtime,
    tagline: details.tagline,
    tmdb_rating: details.vote_average,
    tmdb_votes: details.vote_count,
    streaming: [],
    nano_genres: (details.genres || []).map(function(g) { return g.name; }),
    category: details.genres && details.genres[0] ? details.genres[0].name : '',
    review_1star: '', review_5star: '',
    taste_match_score: 0,
    validations: [],
  };
  openDetailModal(movie, state.detailFrom);
}

/* ─── Keyboard Navigation ─── */
document.addEventListener('keydown', function(e) {
  if (document.getElementById('fullscreen-viewer').classList.contains('active')) {
    if (e.key === 'Escape') closeFullscreen();
    return;
  }
  if (document.getElementById('detail-overlay').classList.contains('active')) {
    if (e.key === 'Escape') closeDetailModal();
    return;
  }
  if (state.currentView === 'grid' || state.currentView === 'genre-picker' || state.currentView === 'mood') {
    if (e.key === 'Escape') goHome();
  }
  if (state.currentView === 'shuffle') {
    if (e.key === 'Escape') goHome();
  }
});

/* ─── Event Listeners ─── */
document.getElementById('grid-back').addEventListener('click', goHome);
document.getElementById('genre-back').addEventListener('click', goHome);
document.getElementById('mood-back').addEventListener('click', function() { switchView('genre-picker'); });
document.getElementById('shuffle-exit').addEventListener('click', goHome);
document.getElementById('fullscreen-viewer').addEventListener('click', closeFullscreen);

// Detail modal: close on X button
document.getElementById('detail-close').addEventListener('click', closeDetailModal);
// Detail modal: close on overlay click (outside modal)
document.getElementById('detail-overlay').addEventListener('click', function(e) {
  if (e.target === document.getElementById('detail-overlay')) {
    closeDetailModal();
  }
});

/* ─── Home Tile Handlers ─── */
function setupHomeTiles() {
  var container = document.getElementById('home-tiles');
  container.textContent = '';

  var tiles = [
    { id: 'latest', title: 'Latest Releases', subtitle: 'New and recent', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'genres', title: 'Nano Genres', subtitle: 'Browse by genre', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 'shuffle', title: 'Shuffle', subtitle: 'Random pick', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { id: 'all', title: 'All', subtitle: state.movies.length + ' movies', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'saved', title: 'Saved', subtitle: 'Your watchlist', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
  ];

  tiles.forEach(function(t) {
    container.appendChild(buildHomeTile(t));
  });
}

function handleHomeTile(id) {
  if (id === 'latest') {
    openGrid('latest', 'Latest Releases', getLatestReleases());
  } else if (id === 'genres') {
    openGenrePicker();
  } else if (id === 'shuffle') {
    openShuffle();
  } else if (id === 'all') {
    openGrid('all', 'All', excludeDNF(state.movies));
  } else if (id === 'saved') {
    openGrid('saved', 'Saved', getSavedMovies());
  }
}

/* ─── Initialize ─── */
async function init() {
  var data = await loadMovieData();
  state.movies = data.movies;
  state.categories = data.categories;

  setupHomeTiles();

  var ls = document.getElementById('loading-screen');
  ls.classList.add('fade-out');
  setTimeout(function() { ls.remove(); }, 600);
}

init();
```

- [ ] **Step 4: Verify the app loads without errors**

Open `/tmp/movie-rec-v1-web/index.html` in a browser (or use a dev server). The app should show the loading spinner, then a blank home view with the "rias cuts" header and "Explore" text. Console should have no errors (the builder functions don't exist yet, but they're only called from event handlers that won't fire until we build them).

Check the console for errors. If `buildHomeTile` is not defined, that's expected -- it will be built in the next task.

- [ ] **Step 5: Commit scaffolding**

```bash
cd /tmp/movie-rec-v1-web
git add filters.js index.html app.js
git commit -m "feat: scaffold new 6-screen architecture with state, filters, and HTML shell"
```

---

> **APPROVAL GATE 1:** Send scaffolding result to Ria on Telegram. Confirm routing works, views switch correctly. Wait for explicit approval before proceeding.

---

## Task 2: Home Screen -- Tiles and Styles

**Branch:** `screen/home` (continue)

**Files:**
- Modify: `components.js`
- Modify: `styles.css`

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "home screen grid tiles navigation" and "Aiby app home" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate tile sizing, padding, icon treatment, typography hierarchy
3. `frontend-design`: generate production-grade tile component code
4. `animate` + `mcp__gsap-mcp`: add staggered tile entrance animation (gsap.from with stagger), subtle hover/active scale
5. `adapt`: verify tiles at 375px, 580px, 768px, 900px breakpoints
6. `critique`: score home screen UX -- visual hierarchy, scannability, touch target sizing
7. `superpowers:verification-before-completion`: verify before marking done

After this task, the home screen shows 5 styled tiles in a 2-column grid. Tapping each tile calls `handleHomeTile()` which routes to the correct destination (destinations are stubs until later tasks).

- [ ] **Step 1: Rewrite `components.js` with the SVG icon factory and home tile builder**

Replace the **entire** contents of `/tmp/movie-rec-v1-web/components.js`. This file will be built up across tasks. Start with only what's needed for home:

```javascript
/* ═══════════════════════════════════════════
   components.js — UI components (DOM API only)
   ═══════════════════════════════════════════ */

/* ─── SVG icon factory ─── */
function svgIcon(paths, opts) {
  opts = opts || {};
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  if (opts.fill) svg.setAttribute('fill', opts.fill);
  if (opts.stroke !== undefined) svg.setAttribute('stroke', opts.stroke);
  if (opts.className) svg.setAttribute('class', opts.className);
  paths.forEach(function(p) {
    if (p.type === 'polyline') {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      el.setAttribute('points', p.points);
      svg.appendChild(el);
    } else if (p.type === 'path') {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', p.d);
      if (p.fill) el.setAttribute('fill', p.fill);
      svg.appendChild(el);
    } else if (p.type === 'circle') {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', p.cx); el.setAttribute('cy', p.cy); el.setAttribute('r', p.r);
      svg.appendChild(el);
    } else if (p.type === 'line') {
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', p.x1); el.setAttribute('y1', p.y1);
      el.setAttribute('x2', p.x2); el.setAttribute('y2', p.y2);
      svg.appendChild(el);
    }
  });
  return svg;
}

var ICONS = {
  chevronLeft: function() { return svgIcon([{type:'polyline', points:'15 18 9 12 15 6'}]); },
  chevronRight: function() { return svgIcon([{type:'polyline', points:'9 6 15 12 9 18'}]); },
  close: function() { return svgIcon([{type:'line', x1:'18', y1:'6', x2:'6', y2:'18'}, {type:'line', x1:'6', y1:'6', x2:'18', y2:'18'}]); },
  star: function() { return svgIcon([{type:'path', d:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'}], {fill:'#ff9f0a', stroke:'none'}); },
  check: function() { return svgIcon([{type:'circle', cx:'12', cy:'12', r:'10'}, {type:'path', d:'M8 12l3 3 5-5'}], {fill:'none', stroke:'#01d277'}); },
};

/* ═══ HOME TILE ═══ */
function buildHomeTile(tileData) {
  var card = document.createElement('div');
  card.className = 'home-tile';
  card.dataset.tileId = tileData.id;
  card.addEventListener('click', function() {
    handleHomeTile(tileData.id);
  });

  var iconWrap = document.createElement('div');
  iconWrap.className = 'home-tile-icon';
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', tileData.icon);
  svg.appendChild(path);
  iconWrap.appendChild(svg);
  card.appendChild(iconWrap);

  var title = document.createElement('div');
  title.className = 'home-tile-title';
  title.textContent = tileData.title;
  card.appendChild(title);

  var sub = document.createElement('div');
  sub.className = 'home-tile-subtitle';
  sub.textContent = tileData.subtitle;
  card.appendChild(sub);

  return card;
}
```

- [ ] **Step 2: Rewrite `styles.css` with base styles and home screen styles**

Replace the **entire** contents of `/tmp/movie-rec-v1-web/styles.css`. This is the full CSS for the app -- it will be extended in later tasks. For now it includes: reset, variables, loading, app/views, home, and toast.

```css
/* ═══════════════════════════════════════════
   styles.css — rias cuts (rework)
   ═══════════════════════════════════════════ */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #141414;
  --bg-card: rgba(255,255,255,0.06);
  --bg-glass: rgba(255,255,255,0.08);
  --border-glass: rgba(255,255,255,0.1);
  --text-primary: #f5f5f5;
  --text-secondary: #a1a1aa;
  --text-tertiary: #52525b;
  --accent-blue: #3b82f6;
  --accent-green: #22c55e;
  --accent-amber: #f59e0b;
  --accent-red: rgba(239,68,68,0.7);
  --radius-card: 20px;
  --radius-pill: 100px;
  --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

html, body {
  height: 100%;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif;
  background: var(--bg); color: var(--text-primary);
  overflow: hidden; overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  user-select: none; -webkit-user-select: none;
}

/* ─── Loading ─── */
#loading-screen {
  position: fixed; inset: 0; z-index: 9999; background: var(--bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transition: opacity 0.6s var(--ease-out);
}
#loading-screen.fade-out { opacity: 0; pointer-events: none; }
.spinner {
  width: 36px; height: 36px;
  border: 2px solid rgba(255,255,255,0.1); border-top-color: #f5f5f5;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
#loading-screen p { margin-top: 14px; font-size: 14px; color: var(--text-secondary); font-weight: 400; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── App & Views ─── */
#app { position: fixed; inset: 0; overflow: hidden; }
.view {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  opacity: 0; pointer-events: none;
  transition: opacity 0.4s var(--ease-out);
}
.view.active { opacity: 1; pointer-events: auto; }

/* ═══ HOME VIEW ═══ */
#home-view {
  background: #0a0a0a;
  overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  display: block !important;
}
.bg-photo {
  position: fixed; inset: -4px;
  background: url('https://images.unsplash.com/photo-1630669251343-99759c4b3351?w=1920&q=80&auto=format&fit=crop') center/cover no-repeat;
  filter: blur(3px);
  z-index: 0; pointer-events: none;
}
.bg-photo::after {
  content: ''; position: absolute; inset: 0;
  background: rgba(0,0,0,0.72);
}
.home-content { position: relative; z-index: 1; }
.showcase-header {
  padding: calc(clamp(32px, 8vw, 56px) + var(--safe-top)) clamp(20px, 5vw, 32px) clamp(8px, 2vw, 12px);
}
.sh-brand {
  font-size: clamp(42px, 12vw, 72px);
  font-weight: 700; letter-spacing: -0.04em; line-height: 0.9; color: #f5f5f5;
}
.sh-sub {
  font-size: clamp(42px, 12vw, 72px);
  font-weight: 300; letter-spacing: -0.04em; line-height: 0.9; color: #3f3f46;
}
.home-explore {
  padding: clamp(12px, 3vw, 20px) clamp(20px, 5vw, 32px) clamp(16px, 4vw, 24px);
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 500; color: var(--text-secondary);
}

/* Home Tiles Grid */
.home-tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 3vw, 18px);
  padding: 0 clamp(20px, 5vw, 32px) calc(40px + var(--safe-bottom));
}
.home-tile {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-card);
  padding: clamp(18px, 4.5vw, 26px) clamp(16px, 4vw, 22px);
  cursor: pointer;
  transition: transform 0.3s var(--spring), background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.home-tile:active { transform: scale(0.96); }
.home-tile:nth-child(5) {
  grid-column: 1 / -1;
}
.home-tile-icon {
  width: clamp(32px, 8vw, 40px); height: clamp(32px, 8vw, 40px);
  margin-bottom: clamp(10px, 2.5vw, 14px);
}
.home-tile-icon svg {
  width: 100%; height: 100%;
  stroke: var(--text-secondary); stroke-width: 1.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}
.home-tile-title {
  font-size: clamp(15px, 4vw, 18px);
  font-weight: 600; color: var(--text-primary);
  margin-bottom: 4px;
}
.home-tile-subtitle {
  font-size: clamp(12px, 3.2vw, 14px);
  font-weight: 400; color: var(--text-tertiary);
}

/* ═══ TOAST ═══ */
.toast {
  position: fixed; top: calc(20px + var(--safe-top)); left: 50%;
  transform: translateX(-50%) translateY(-80px);
  padding: 10px 20px;
  background: rgba(245,245,245,0.9);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  color: #18181b; font-size: 13px; font-weight: 600;
  border-radius: var(--radius-pill); z-index: 600;
  pointer-events: none; opacity: 0;
  transition: transform 0.4s var(--spring), opacity 0.4s;
  white-space: nowrap;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

/* ═══ FULLSCREEN VIEWER ═══ */
.fullscreen-viewer {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.95);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.3s; cursor: pointer;
}
.fullscreen-viewer.active { opacity: 1; pointer-events: auto; }
.fullscreen-viewer img { max-width: 95vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }

/* ═══ PLACEHOLDER: Grid, Genre Picker, Mood, Shuffle, Detail styles added in later tasks ═══ */
```

- [ ] **Step 3: Open in browser and verify the home screen**

Open `/tmp/movie-rec-v1-web/index.html`. You should see:
- "rias cuts" title at top
- "Explore" heading below
- 5 tiles in a 2-column grid (the 5th tile "Saved" spans the full width)
- Each tile has an SVG icon, title, and subtitle
- Dark background with sunset photo
- No emojis, no tab bar

Tapping tiles should call `handleHomeTile()` -- grid/genre/shuffle views won't render yet but there should be no JS errors.

- [ ] **Step 4: Commit home screen**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: home screen with 5 Aiby-style navigation tiles"
```

---

> **APPROVAL GATE 2:** Deploy home screen to live preview. Send screenshot + link to Ria on Telegram. Show the 5 tiles with icons. Wait for explicit approval before proceeding.

---

## Task 3: Grid View -- Ahead-Style Poster Cards

**Branch:** `screen/grid` (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `components.js` (add `buildGridCard`)
- Modify: `styles.css` (add grid view styles)

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "poster card grid actions" and "Ahead app card grid" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate card proportions, button placement, color separation for Add vs DNF
3. `frontend-design`: generate production-grade grid card code
4. `animate` + `mcp__gsap-mcp` + `mcp__reactbits`: card entrance stagger animation, DNF card removal animation (scale+fade), Add button toggle animation. Check reactbits for card grid components.
5. `adapt`: verify grid at 375px (2-col), 580px (3-col), 900px (4-col)
6. `critique`: score grid UX -- poster visibility, button discoverability, action clarity
7. `superpowers:verification-before-completion`: verify before marking done

After this task, tapping "Latest Releases", "All", or "Saved" on the home screen navigates to a 2-column poster grid with Add/DNF buttons on each card. Tapping a card body does nothing yet (detail modal is next task). Back button returns to home.

- [ ] **Step 1: Add `buildGridCard` function to `components.js`**

Append to the end of `/tmp/movie-rec-v1-web/components.js`:

```javascript

/* ═══ GRID CARD ═══ */
function buildGridCard(movie) {
  var card = document.createElement('div');
  card.className = 'grid-card';
  card.dataset.tmdbId = movie.tmdb_id;

  // Poster image
  var img = document.createElement('img');
  img.src = movie.poster_url;
  img.alt = movie.title;
  img.loading = 'lazy';
  img.onerror = function() {
    if (!img.dataset.retried && movie.tmdb_id) {
      img.dataset.retried = '1';
      getMovieDetails(movie.tmdb_id).then(function(d) {
        if (d && d.poster_path) img.src = 'https://image.tmdb.org/t/p/w500' + d.poster_path;
      });
    }
  };
  card.appendChild(img);

  // Card body tap -> detail modal
  card.addEventListener('click', function(e) {
    if (e.target.closest('.grid-card-btn')) return;
    openDetailModal(movie, 'grid');
  });

  // Action buttons overlay
  var actions = document.createElement('div');
  actions.className = 'grid-card-actions';

  // Add button
  var addBtn = document.createElement('button');
  addBtn.className = 'grid-card-btn grid-card-add';
  if (state.actionStates[movie.tmdb_id] && state.actionStates[movie.tmdb_id].saved) {
    addBtn.classList.add('active');
  }
  addBtn.textContent = 'Add';
  addBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isSaved = toggleSaved(movie.tmdb_id);
    addBtn.classList.toggle('active', isSaved);
    addBtn.textContent = isSaved ? 'Added' : 'Add';
  });
  actions.appendChild(addBtn);

  // DNF button
  var dnfBtn = document.createElement('button');
  dnfBtn.className = 'grid-card-btn grid-card-dnf';
  dnfBtn.textContent = 'DNF';
  dnfBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    doDNF(movie.tmdb_id);
    // Animate card out
    card.style.transition = 'transform 0.3s var(--ease-out), opacity 0.3s';
    card.style.transform = 'scale(0.9)';
    card.style.opacity = '0';
    setTimeout(function() { card.remove(); }, 300);
  });
  actions.appendChild(dnfBtn);

  card.appendChild(actions);
  return card;
}
```

- [ ] **Step 2: Add grid view styles to `styles.css`**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ GRID VIEW ═══ */
#grid-view {
  background: var(--bg);
  display: flex !important; flex-direction: column;
}
.grid-header {
  display: flex; align-items: center; gap: 12px;
  padding: calc(12px + var(--safe-top)) 16px 12px;
  flex-shrink: 0;
}
.grid-back {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass); border-radius: 50%;
  cursor: pointer; flex-shrink: 0;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.grid-back:active { transform: scale(0.85); }
.grid-back svg {
  width: 18px; height: 18px; stroke: #f5f5f5; stroke-width: 2.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}
.grid-title {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary);
}
.grid-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.grid-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 3vw, 18px);
  padding: 8px clamp(16px, 4vw, 24px) calc(40px + var(--safe-bottom));
}

/* Grid Card */
.grid-card {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: #1c1c1e;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.3s var(--spring);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.15);
}
.grid-card:active { transform: scale(0.98); }
.grid-card > img {
  width: 100%; aspect-ratio: 2/3;
  object-fit: cover; display: block;
  background: linear-gradient(135deg, #27272a, #18181b);
}
.grid-card::after {
  content: ''; position: absolute; inset: 0;
  border-radius: var(--radius-card);
  border: 1px solid rgba(255,255,255,0.06);
  pointer-events: none;
}

/* Card action buttons */
.grid-card-actions {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; gap: 6px;
  padding: 10px;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
}
.grid-card-btn {
  flex: 1; padding: 7px 0;
  border: none; border-radius: 10px;
  font-family: inherit; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: transform 0.2s var(--spring), background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.grid-card-btn:active { transform: scale(0.92); }

.grid-card-add {
  background: var(--accent-blue);
  color: #fff;
}
.grid-card-add.active {
  background: rgba(59,130,246,0.3);
  color: var(--accent-blue);
}
.grid-card-dnf {
  background: var(--accent-red);
  color: #fff;
}

/* ═══ RESPONSIVE: Grid ═══ */
@media (min-width: 580px) {
  .grid-cards { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 900px) {
  .grid-cards { grid-template-columns: repeat(4, 1fr); }
}
```

- [ ] **Step 3: Verify grid view**

Open in browser. Tap "Latest Releases" tile on home -- should navigate to a grid view showing poster cards for movies from 2024+. Each card has blue "Add" and red "DNF" buttons at the bottom. Tap "Add" -- it toggles to "Added" with reduced opacity. Tap "DNF" -- card animates out and disappears. Back button returns to home. Tap "All" -- shows all 50 movies. Tap "Saved" -- shows empty grid (nothing saved yet).

- [ ] **Step 4: Commit grid view**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: ahead-style grid view with poster cards, Add/DNF buttons"
```

---

> **APPROVAL GATE 3:** Deploy grid view. Send screenshot + link to Ria. Show poster cards with Add/DNF buttons, test tapping Add and DNF. Wait for explicit approval before proceeding.

---

## Task 4: Detail Modal -- Existing Content + 3-Option Rating

**Branch:** `screen/detail-modal` (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `components.js` (add `buildDetailModalContent`, `buildRatingWidget`, and all detail sub-builders)
- Modify: `styles.css` (add detail modal overlay and content styles)

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "modal detail overlay blur" and "movie detail card" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate modal sizing, blur intensity, rating widget design, content density inside modal
3. `frontend-design`: generate production-grade modal + rating widget code
4. `animate` + `mcp__gsap-mcp` + Motion MCP: modal entrance (scale+translate spring), backdrop blur fade, rating option selection animation. Use Motion for spring-based modal pop. Use GSAP for backdrop blur timeline.
5. `adapt`: verify modal at mobile (92vw) and tablet (max-width 500px), ensure scrollable
6. `critique`: score modal UX -- dismiss affordance clarity, content scannability, rating widget intuitiveness
7. `superpowers:verification-before-completion`: verify before marking done

After this task, tapping a grid card opens a centered modal with blur behind it. The modal shows all existing detail content (hero, action card, overview, watch status, streaming, cast, ratings, reviews, stills, expandables, similar) plus a new 3-option rating widget. X button or clicking outside dismisses it.

- [ ] **Step 1: Add detail component builders to `components.js`**

Append to the end of `/tmp/movie-rec-v1-web/components.js`:

```javascript

/* ═══ DETAIL MODAL CONTENT ═══ */
async function buildDetailModalContent(movie) {
  var frag = document.createDocumentFragment();

  // Fetch TMDB data in parallel
  var results = await Promise.all([
    getMovieDetails(movie.tmdb_id),
    getCredits(movie.tmdb_id),
    getWatchProviders(movie.tmdb_id),
    getImages(movie.tmdb_id),
    getSimilar(movie.tmdb_id),
  ]);
  var details = results[0], credits = results[1], providers = results[2];
  var images = results[3], similar = results[4];

  var backdropUrl = movie.backdrop_path
    ? (tmdbImg('w1280', movie.backdrop_path) || movie.poster_url)
    : movie.poster_url;

  // Hero
  var hero = document.createElement('div');
  hero.className = 'detail-hero';
  var heroImg = document.createElement('img');
  heroImg.className = 'detail-hero-img';
  heroImg.src = backdropUrl;
  hero.appendChild(heroImg);
  var grad = document.createElement('div');
  grad.className = 'detail-hero-gradient';
  hero.appendChild(grad);
  frag.appendChild(hero);

  // Floating Action Card
  var fac = document.createElement('div');
  fac.className = 'floating-action-card';

  var title = document.createElement('div');
  title.className = movie.title.length > 20 ? 'fac-title long' : 'fac-title';
  title.textContent = movie.title;
  fac.appendChild(title);

  var meta = document.createElement('div');
  meta.className = 'fac-meta';

  var catPill = document.createElement('span');
  catPill.className = 'fac-pill fac-category';
  catPill.textContent = movie.category || (movie.nano_genres && movie.nano_genres[0]) || 'Horror';
  meta.appendChild(catPill);

  var yearSpan = document.createElement('span');
  yearSpan.className = 'fac-year';
  yearSpan.textContent = movie.year;
  meta.appendChild(yearSpan);

  var scoreSpan = document.createElement('span');
  scoreSpan.className = 'fac-score';
  scoreSpan.appendChild(ICONS.star());
  var scoreVal = document.createElement('span');
  var tmdbScore = (details && details.vote_average) ? details.vote_average.toFixed(1) : (movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : '');
  scoreVal.textContent = tmdbScore;
  scoreSpan.appendChild(scoreVal);
  meta.appendChild(scoreSpan);

  fac.appendChild(meta);

  if (movie.tagline) {
    var tagline = document.createElement('div');
    tagline.className = 'fac-tagline';
    tagline.textContent = '\u201C' + movie.tagline + '\u201D';
    fac.appendChild(tagline);
  }
  frag.appendChild(fac);

  // Content wrapper
  var content = document.createElement('div');
  content.className = 'detail-content';

  // Overview
  if (movie.overview) {
    var overview = document.createElement('p');
    overview.className = 'detail-overview';
    overview.textContent = movie.overview;
    content.appendChild(overview);
  }

  // 3-Option Rating (NEW)
  content.appendChild(buildRatingWidget(movie));

  // Watch Status
  content.appendChild(buildWatchStatus(movie));

  // Where to Watch
  var usProviders = providers && providers.results && providers.results.US;
  var streamList = filterProviders((usProviders && (usProviders.flatrate || usProviders.ads)) || movie.streaming || []);
  content.appendChild(buildWhereToWatch(streamList));

  // Cast
  var castMembers = (credits && credits.cast) ? credits.cast.slice(0, 8) : [];
  content.appendChild(buildCastSection(castMembers, movie.cast || []));

  // Ratings row
  content.appendChild(buildRatingsSection(tmdbScore));

  // Reviews
  content.appendChild(buildReviews(movie));

  // Stills
  var stills = (images && images.backdrops) ? images.backdrops.slice(0, 6) : [];
  if (stills.length > 0) content.appendChild(buildStillsGrid(stills));

  // Expandable cells
  var director = '', writers = '', producers = '';
  if (credits && credits.crew) {
    var dirObj = credits.crew.find(function(c) { return c.job === 'Director'; });
    director = dirObj ? dirObj.name : (movie.director || '');
    writers = credits.crew.filter(function(c) { return c.department === 'Writing'; }).slice(0,3).map(function(c) { return c.name; }).join(', ') || '';
    producers = credits.crew.filter(function(c) { return c.job === 'Producer'; }).slice(0,3).map(function(c) { return c.name; }).join(', ') || '';
  } else {
    director = movie.director || '';
  }

  var castNames = castMembers.length > 0
    ? castMembers.map(function(c) { return c.name + (c.character ? ' as ' + c.character : ''); }).join(', ')
    : (movie.cast || []).join(', ');

  var budget = (details && details.budget) ? '$' + (details.budget / 1e6).toFixed(1) + 'M' : '';
  var revenue = (details && details.revenue) ? '$' + (details.revenue / 1e6).toFixed(1) + 'M' : '';
  var runtime = movie.runtime || (details && details.runtime) || '';
  var genres = (details && details.genres) ? details.genres.map(function(g) { return g.name; }).join(', ') : (movie.nano_genres || []).join(', ') || '';

  content.appendChild(buildExpandables([
    ['Full Cast & Crew', 'Director: ' + director + '\nWriters: ' + writers + '\nCast: ' + castNames],
    ['Box Office', 'Budget: ' + budget + '\nRevenue: ' + revenue],
    ['Production', 'Producers: ' + producers + '\nRuntime: ' + runtime + ' min\nGenres: ' + genres],
    ['Trivia', 'Taste Match: ' + ((movie.taste_match_score || 0) * 100).toFixed(0) + '%\nNano-genres: ' + (movie.nano_genres || []).join(', ')],
  ]));

  // Similar Movies
  var similarMovies = (similar && similar.results) ? similar.results.slice(0, 10) : [];
  if (similarMovies.length > 0) content.appendChild(buildSimilarShelf(similarMovies));

  var spacer = document.createElement('div');
  spacer.style.height = '40px';
  content.appendChild(spacer);

  frag.appendChild(content);
  return frag;
}

/* ═══ 3-OPTION RATING WIDGET ═══ */
function buildRatingWidget(movie) {
  var section = document.createElement('div');
  section.className = 'rating-widget';

  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Your Rating';
  section.appendChild(title);

  var row = document.createElement('div');
  row.className = 'rating-options';

  var currentRating = state.ratings[movie.tmdb_id] || null;

  var options = [
    { value: 'loved', label: 'Loved it' },
    { value: 'ok', label: 'It was ok' },
    { value: 'not_for_me', label: 'Not for me' },
  ];

  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'rating-option';
    if (currentRating === opt.value) btn.classList.add('active');
    btn.textContent = opt.label;
    btn.addEventListener('click', function() {
      setRating(movie.tmdb_id, opt.value);
      // Update all buttons in this widget
      row.querySelectorAll('.rating-option').forEach(function(b) {
        b.classList.toggle('active', b.textContent === opt.label);
      });
    });
    row.appendChild(btn);
  });

  section.appendChild(row);
  return section;
}

/* ═══ WATCH STATUS ═══ */
function buildWatchStatus(movie) {
  var ws = state.watchStatus ? (state.watchStatus[movie.tmdb_id] || 0) : 0;
  var wsColors = ['var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-green)'];
  var wsLabels = ['Want to Watch', 'Watching', 'Watched'];

  var div = document.createElement('div');
  div.className = 'watch-status';

  wsLabels.forEach(function(label, i) {
    var btn = document.createElement('button');
    btn.className = 'watch-status-btn' + (ws === i ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', function() {
      if (!state.watchStatus) state.watchStatus = {};
      state.watchStatus[movie.tmdb_id] = i;
      div.querySelectorAll('.watch-status-btn').forEach(function(b, idx) {
        b.classList.toggle('active', idx === i);
      });
      var slider = div.querySelector('.watch-status-slider');
      slider.style.left = 'calc(' + (i * 33.33) + '% + 3px)';
      slider.style.background = wsColors[i];
    });
    div.appendChild(btn);
  });

  var slider = document.createElement('div');
  slider.className = 'watch-status-slider';
  slider.style.left = 'calc(' + (ws * 33.33) + '% + 3px)';
  slider.style.width = 'calc(33.33% - 6px)';
  slider.style.background = wsColors[ws];
  div.appendChild(slider);

  return div;
}

/* ═══ WHERE TO WATCH ═══ */
function buildWhereToWatch(streamList) {
  var div = document.createElement('div');
  div.className = 'where-to-watch';

  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Where to Watch';
  div.appendChild(title);

  var list = document.createElement('div');
  list.className = 'streaming-list';

  if (streamList.length > 0) {
    streamList.slice(0, 6).forEach(function(p) {
      var chip = document.createElement('div');
      chip.className = 'streaming-chip';
      if (p.logo_path) {
        var logo = document.createElement('img');
        logo.src = 'https://image.tmdb.org/t/p/original' + p.logo_path;
        logo.alt = p.provider_name || p.name || '';
        logo.className = 'stream-logo';
        chip.appendChild(logo);
      }
      chip.appendChild(document.createTextNode(p.provider_name || p.name || ''));
      list.appendChild(chip);
    });
  } else {
    var empty = document.createElement('span');
    empty.style.cssText = 'color:var(--text-tertiary);font-size:14px';
    empty.textContent = 'No streaming info available';
    list.appendChild(empty);
  }
  div.appendChild(list);
  return div;
}

/* ═══ CAST SECTION ═══ */
function buildCastSection(castMembers, fallbackCast) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Cast';
  section.appendChild(title);

  var stack = document.createElement('div');
  stack.className = 'cast-stack';

  var names = [];
  if (castMembers.length > 0) {
    castMembers.forEach(function(c) {
      var avatar = document.createElement('div');
      avatar.className = 'cast-avatar';
      avatar.title = c.name;
      if (c.profile_path) {
        var img = document.createElement('img');
        img.src = tmdbImg('w92', c.profile_path) || '';
        img.alt = c.name;
        avatar.appendChild(img);
      } else {
        avatar.textContent = c.name.charAt(0);
      }
      stack.appendChild(avatar);
    });
    names = castMembers.slice(0, 5).map(function(c) { return c.name; });
  } else {
    fallbackCast.forEach(function(name) {
      var avatar = document.createElement('div');
      avatar.className = 'cast-avatar';
      avatar.title = name;
      avatar.textContent = name.charAt(0);
      stack.appendChild(avatar);
    });
    names = fallbackCast;
  }

  section.appendChild(stack);

  var nameList = document.createElement('div');
  nameList.className = 'cast-name-list';
  nameList.textContent = names.join(', ');
  section.appendChild(nameList);

  return section;
}

/* ═══ RATINGS ROW ═══ */
function buildRatingsSection(tmdbScore) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Ratings';
  section.appendChild(title);

  var row = document.createElement('div');
  row.className = 'ratings-row';

  var tmdbItem = document.createElement('div');
  tmdbItem.className = 'rating-item';
  var checkIcon = ICONS.check();
  checkIcon.setAttribute('class', 'rating-icon');
  checkIcon.setAttribute('stroke-width', '2');
  tmdbItem.appendChild(checkIcon);
  var tmdbVal = document.createElement('span');
  tmdbVal.textContent = tmdbScore;
  tmdbItem.appendChild(tmdbVal);
  var tmdbLabel = document.createElement('span');
  tmdbLabel.className = 'label';
  tmdbLabel.textContent = 'TMDB';
  tmdbItem.appendChild(tmdbLabel);
  row.appendChild(tmdbItem);

  section.appendChild(row);
  return section;
}

/* ═══ REVIEWS ═══ */
function buildReviews(movie) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Letterboxd Reviews';
  section.appendChild(title);

  var container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;gap:12px';

  var review5 = movie.review_5star || 'An absolute masterpiece of tension and atmosphere. Every frame is meticulously crafted.';
  var review1 = movie.review_1star || 'Overhyped and predictable. I saw every twist coming from a mile away.';

  [[review5, 'Positive'], [review1, 'Critical']].forEach(function(pair) {
    var panel = document.createElement('div');
    panel.className = 'review-panel';

    var header = document.createElement('div');
    header.className = 'review-header';
    var label = document.createElement('span');
    label.className = 'review-label';
    label.textContent = pair[1];
    header.appendChild(label);
    var source = document.createElement('span');
    source.className = 'review-source';
    source.textContent = 'Letterboxd';
    header.appendChild(source);
    panel.appendChild(header);

    var text = document.createElement('p');
    text.className = 'review-text';
    text.textContent = pair[0];
    panel.appendChild(text);

    container.appendChild(panel);
  });

  section.appendChild(container);
  return section;
}

/* ═══ STILLS GALLERY ═══ */
function buildStillsGrid(stills) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Stills';
  section.appendChild(title);

  var grid = document.createElement('div');
  grid.className = 'stills-grid';

  stills.forEach(function(s) {
    var img = document.createElement('img');
    img.src = tmdbImg('w500', s.file_path) || '';
    img.alt = 'Still';
    img.loading = 'lazy';
    img.addEventListener('click', function() { openFullscreen(tmdbImg('original', s.file_path)); });
    grid.appendChild(img);
  });

  section.appendChild(grid);
  return section;
}

/* ═══ EXPANDABLE CELLS ═══ */
function buildExpandables(items) {
  var container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;gap:8px';

  items.forEach(function(item) {
    var cell = document.createElement('div');
    cell.className = 'expandable-cell';

    var header = document.createElement('div');
    header.className = 'expandable-header';
    var span = document.createElement('span');
    span.textContent = item[0];
    header.appendChild(span);
    header.appendChild(ICONS.chevronRight());
    header.addEventListener('click', function() {
      var isOpen = header.classList.toggle('open');
      var body = header.nextElementSibling;
      body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0';
    });
    cell.appendChild(header);

    var body = document.createElement('div');
    body.className = 'expandable-body';
    var inner = document.createElement('div');
    inner.className = 'expandable-body-inner';
    inner.textContent = item[1];
    body.appendChild(inner);
    cell.appendChild(body);

    container.appendChild(cell);
  });

  return container;
}

/* ═══ SIMILAR MOVIES SHELF ═══ */
function buildSimilarShelf(movies) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Similar Movies';
  section.appendChild(title);

  var shelf = document.createElement('div');
  shelf.className = 'similar-shelf';

  movies.forEach(function(m) {
    if (!m.poster_path) return;
    var card = document.createElement('div');
    card.className = 'similar-card';
    card.addEventListener('click', function() { openSimilarMovie(m.id); });

    var img = document.createElement('img');
    img.src = tmdbImg('w300', m.poster_path) || '';
    img.alt = m.title;
    img.loading = 'lazy';
    card.appendChild(img);

    var cardTitle = document.createElement('div');
    cardTitle.className = 'title';
    cardTitle.textContent = m.title;
    card.appendChild(cardTitle);

    shelf.appendChild(card);
  });

  section.appendChild(shelf);
  return section;
}
```

- [ ] **Step 2: Add detail modal and all detail content styles to `styles.css`**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ DETAIL MODAL OVERLAY ═══ */
.detail-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.35s var(--ease-out);
}
.detail-overlay.active { opacity: 1; pointer-events: auto; }

.detail-modal {
  position: relative;
  width: 92vw; max-width: 500px;
  max-height: 88vh;
  background: var(--bg);
  border-radius: var(--radius-card);
  border: 1px solid var(--border-glass);
  overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  transform: scale(0.95) translateY(20px);
  transition: transform 0.35s var(--ease-out);
}
.detail-overlay.active .detail-modal {
  transform: scale(1) translateY(0);
}
/* Slide-up variant for shuffle entry */
.detail-overlay.from-shuffle .detail-modal {
  transform: scale(1) translateY(100vh);
}
.detail-overlay.from-shuffle.active .detail-modal {
  transform: scale(1) translateY(0);
}

.detail-close {
  position: sticky; top: 12px; float: right; margin-right: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass); border-radius: 50%;
  cursor: pointer; z-index: 200;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.detail-close:active { transform: scale(0.85); }
.detail-close svg {
  width: 16px; height: 16px; stroke: #f5f5f5; stroke-width: 2.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}

.detail-modal-content { clear: both; }

/* Detail Hero (inside modal) */
.detail-hero { position: relative; width: 100%; aspect-ratio: 16/10; overflow: hidden; border-radius: var(--radius-card) var(--radius-card) 0 0; }
.detail-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.detail-hero-gradient {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 20%, rgba(20,20,20,0.5) 55%, var(--bg) 100%);
}

/* Floating Action Card */
.floating-action-card {
  position: relative; margin: -40px 16px 0; padding: 16px 14px;
  background: var(--bg-glass);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-glass);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  border-radius: var(--radius-card); z-index: 10;
}
.fac-title { font-size: clamp(20px, 5.5vw, 26px); font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; color: #f5f5f5; }
.fac-title.long { font-size: clamp(16px, 4.5vw, 22px); }
.fac-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.fac-pill { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 500; }
.fac-category { background: rgba(59,130,246,0.15); color: var(--accent-blue); }
.fac-year { color: #71717a; font-size: 14px; font-weight: 400; }
.fac-score { display: inline-flex; align-items: center; gap: 4px; color: #a1a1aa; font-size: 14px; font-weight: 500; }
.fac-score svg { width: 14px; height: 14px; }
.fac-tagline { margin-top: 8px; font-size: 14px; font-style: italic; color: #71717a; }

/* Detail Content */
.detail-content {
  padding: 16px 16px 24px;
  display: flex; flex-direction: column; gap: 20px;
  overflow-x: hidden;
}
.detail-overview { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
.section-title {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: #52525b; margin-bottom: 10px;
}

/* 3-Option Rating */
.rating-widget { }
.rating-options { display: flex; gap: 8px; }
.rating-option {
  flex: 1; padding: 10px 0;
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.rating-option:active { transform: scale(0.95); }
.rating-option.active {
  background: rgba(59,130,246,0.15);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

/* Watch Status */
.watch-status {
  display: flex; background: var(--bg-glass); border: 1px solid var(--border-glass);
  border-radius: var(--radius-pill); padding: 3px; position: relative;
}
.watch-status-btn {
  flex: 1; padding: 8px 0; text-align: center;
  font-size: 12px; font-weight: 600; color: #71717a;
  background: none; border: none; border-radius: var(--radius-pill);
  cursor: pointer; transition: color 0.3s; z-index: 1;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.watch-status-btn.active { color: #fff; }
.watch-status-slider {
  position: absolute; top: 3px; bottom: 3px; border-radius: var(--radius-pill);
  transition: left 0.4s var(--spring), width 0.4s var(--spring), background 0.4s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

/* Streaming */
.where-to-watch { background: var(--bg-card); border-radius: var(--radius-card); padding: 14px; border: 1px solid var(--border-glass); overflow: hidden; }
.streaming-list { display: flex; flex-wrap: wrap; gap: 8px; }
.streaming-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-pill); font-size: 12px; font-weight: 500; color: #d4d4d8; }
.streaming-chip .stream-logo { width: 22px; height: 22px; border-radius: 5px; object-fit: contain; background: #fff; flex-shrink: 0; }

/* Cast */
.cast-stack { display: flex; padding: 4px 0; overflow-x: auto; scrollbar-width: none; }
.cast-stack::-webkit-scrollbar { display: none; }
.cast-avatar { width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--bg); background: #27272a; flex-shrink: 0; margin-left: -8px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #71717a; }
.cast-avatar:first-child { margin-left: 0; }
.cast-avatar img { width: 100%; height: 100%; object-fit: cover; }
.cast-name-list { margin-top: 6px; font-size: 12px; color: #71717a; line-height: 1.5; }

/* Ratings */
.ratings-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.rating-item { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: #d4d4d8; }
.rating-item .label { font-size: 12px; font-weight: 500; color: #52525b; }
.rating-icon { width: 20px; height: 20px; }

/* Reviews */
.review-panel { background: var(--bg-card); border-radius: var(--radius-card); padding: 14px; border: 1px solid var(--border-glass); }
.review-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.review-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.review-source { font-size: 11px; font-weight: 500; color: #52525b; }
.review-text { font-size: 13px; line-height: 1.5; color: #a1a1aa; }

/* Stills */
.stills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; border-radius: var(--radius-card); overflow: hidden; max-width: 100%; }
.stills-grid img { width: 100%; max-width: 100%; aspect-ratio: 16/9; object-fit: cover; cursor: pointer; transition: opacity 0.2s; }
.stills-grid img:hover { opacity: 0.8; }

/* Expandable */
.expandable-cell { background: var(--bg-card); border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--border-glass); }
.expandable-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.expandable-header span { font-size: 14px; font-weight: 500; color: #d4d4d8; }
.expandable-header svg { width: 16px; height: 16px; stroke: #52525b; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.3s var(--spring); }
.expandable-header.open svg { transform: rotate(90deg); }
.expandable-body { max-height: 0; overflow: hidden; transition: max-height 0.4s var(--ease-out); }
.expandable-body-inner { padding: 0 14px 12px; font-size: 13px; line-height: 1.6; color: #71717a; white-space: pre-line; }

/* Similar Movies */
.similar-shelf { display: flex; gap: 10px; overflow-x: auto; padding: 4px 0; scrollbar-width: none; }
.similar-shelf::-webkit-scrollbar { display: none; }
.similar-card { flex-shrink: 0; width: 90px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.similar-card img { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: transform 0.3s var(--spring); background: linear-gradient(135deg, #27272a, #18181b); }
.similar-card:active img { transform: scale(0.95); }
.similar-card .title { margin-top: 4px; font-size: 10px; font-weight: 400; color: #71717a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 3: Verify detail modal**

Open in browser. Navigate to "All" grid. Tap a movie poster -- a centered modal should appear with backdrop blur. Content: hero image, floating action card with title/genre/year/score, overview, 3-option rating ("Loved it" / "It was ok" / "Not for me"), watch status slider, streaming chips with logos, cast avatars, ratings, reviews, stills, expandables, similar shelf. X button closes. Clicking the blurred area outside the modal closes it. Tap a rating option -- it highlights and shows a toast.

- [ ] **Step 4: Commit detail modal**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: detail modal with existing content, 3-option rating, blur overlay"
```

---

> **APPROVAL GATE 4:** Deploy detail modal. Send screenshot + link to Ria. Show modal popping up with blur, 3-option rating widget, dismiss behavior. Wait for explicit approval before proceeding.

---

## Task 5: Nano Genre Picker

**Branch:** `screen/genre-picker` (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `components.js` (add `buildGenreTile`)
- Modify: `styles.css` (add genre picker styles)

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "category grid picker tiles" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate tile consistency with home tiles, text hierarchy
3. `frontend-design`: generate production-grade genre tile code
4. `animate` + `mcp__gsap-mcp`: staggered tile entrance, tap feedback animation
5. `adapt`: verify grid responsive breakpoints (2-col, 3-col, 4-col)
6. `critique`: score genre picker UX -- scannability, genre name readability
7. `superpowers:verification-before-completion`: verify before marking done

After this task, tapping "Nano Genres" on the home screen shows a 2-column grid of genre tiles. Each tile shows the genre name and movie count. Tapping a genre navigates to mood questions (which is the next task -- for now it just calls `openMoodQuestions()` which switches to the mood view with a heading but no questions yet).

- [ ] **Step 1: Add `buildGenreTile` to `components.js`**

Append to the end of `/tmp/movie-rec-v1-web/components.js`:

```javascript

/* ═══ GENRE TILE ═══ */
function buildGenreTile(genreName, movieCount) {
  var card = document.createElement('div');
  card.className = 'genre-tile';
  card.addEventListener('click', function() {
    openMoodQuestions(genreName);
  });

  var name = document.createElement('div');
  name.className = 'genre-tile-name';
  name.textContent = genreName;
  card.appendChild(name);

  var count = document.createElement('div');
  count.className = 'genre-tile-count';
  count.textContent = movieCount + ' movie' + (movieCount !== 1 ? 's' : '');
  card.appendChild(count);

  return card;
}
```

- [ ] **Step 2: Add genre picker styles to `styles.css`**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ GENRE PICKER VIEW ═══ */
#genre-picker-view {
  background: var(--bg);
  display: flex !important; flex-direction: column;
}
.genre-header {
  display: flex; align-items: center; gap: 12px;
  padding: calc(12px + var(--safe-top)) 16px 12px;
  flex-shrink: 0;
}
.genre-back {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass); border-radius: 50%;
  cursor: pointer; flex-shrink: 0;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.genre-back:active { transform: scale(0.85); }
.genre-back svg {
  width: 18px; height: 18px; stroke: #f5f5f5; stroke-width: 2.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}
.genre-heading {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary);
}
.genre-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.genre-tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 3vw, 18px);
  padding: 8px clamp(16px, 4vw, 24px) calc(40px + var(--safe-bottom));
}
.genre-tile {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-card);
  padding: clamp(18px, 4.5vw, 26px) clamp(16px, 4vw, 22px);
  cursor: pointer;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.genre-tile:active { transform: scale(0.96); }
.genre-tile-name {
  font-size: clamp(14px, 3.8vw, 17px);
  font-weight: 600; text-transform: capitalize; color: #d4d4d8;
}
.genre-tile-count {
  font-size: 13px; font-weight: 400; color: #52525b; margin-top: 4px;
}
```

- [ ] **Step 3: Verify genre picker**

Open in browser. Tap "Nano Genres" on home. Should see a 2-column grid of genre tiles (trap horror, human hunting, captivity thriller, etc.) with movie counts. Tapping a genre switches to the mood view (which currently shows just the genre name heading and a back button). Back button on genre picker returns to home.

- [ ] **Step 4: Commit genre picker**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: nano genre picker with Aiby-style tiles"
```

---

> **APPROVAL GATE 5:** Deploy genre picker. Send screenshot + link to Ria. Show genre tile grid, test tapping a genre navigates to mood questions. Wait for explicit approval before proceeding.

---

## Task 6: Mood Questions

**Branch:** `screen/mood-questions` (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `components.js` (add `buildMoodQuestionsContent`)
- Modify: `styles.css` (add mood question styles)

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "quiz questions selection" and "onboarding preference picker" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate question typography weight, option pill sizing, submit button prominence
3. `frontend-design`: generate production-grade mood question code
4. `animate` + `mcp__gsap-mcp` + Motion MCP: option selection animation (spring scale), submit button loading state animation, staggered question entrance. Use Motion for selection springs.
5. `adapt`: verify on mobile and tablet -- questions should not require horizontal scroll
6. `critique`: score mood questions UX -- question clarity, selection feedback, flow efficiency
7. `superpowers:verification-before-completion`: verify before marking done

After this task, tapping a genre tile opens a mood questions screen with 3 personality-driven questions, each with 3 pill-button options. Submitting navigates to the grid view filtered by genre + mood answers.

- [ ] **Step 1: Add `buildMoodQuestionsContent` to `components.js`**

Append to the end of `/tmp/movie-rec-v1-web/components.js`:

```javascript

/* ═══ MOOD QUESTIONS ═══ */
function buildMoodQuestionsContent() {
  var frag = document.createDocumentFragment();

  var questions = [
    {
      key: 'intensity',
      label: 'How demented?',
      options: [
        { value: 0, text: 'Keep it chill' },
        { value: 1, text: 'Twisted is fine' },
        { value: 2, text: 'Fully unhinged' },
      ],
    },
    {
      key: 'gore',
      label: 'Gore level?',
      options: [
        { value: 0, text: 'Suggest, don\'t show' },
        { value: 1, text: 'Some blood is fine' },
        { value: 2, text: 'Paint the walls' },
      ],
    },
    {
      key: 'grounding',
      label: 'Real or supernatural?',
      options: [
        { value: 0, text: 'Grounded in reality' },
        { value: 1, text: 'Either works' },
        { value: 2, text: 'Give me ghosts' },
      ],
    },
  ];

  questions.forEach(function(q) {
    var block = document.createElement('div');
    block.className = 'mood-question';

    var label = document.createElement('div');
    label.className = 'mood-question-label';
    label.textContent = q.label;
    block.appendChild(label);

    var optionsRow = document.createElement('div');
    optionsRow.className = 'mood-options';

    q.options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'mood-option';
      // Default selection is value 1 (middle option)
      if (opt.value === 1) btn.classList.add('active');
      btn.textContent = opt.text;
      btn.addEventListener('click', function() {
        state.moodAnswers[q.key] = opt.value;
        optionsRow.querySelectorAll('.mood-option').forEach(function(b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });
      optionsRow.appendChild(btn);
    });

    block.appendChild(optionsRow);
    frag.appendChild(block);
  });

  // Submit button
  var submitWrap = document.createElement('div');
  submitWrap.className = 'mood-submit-wrap';
  var submitBtn = document.createElement('button');
  submitBtn.className = 'mood-submit';
  submitBtn.textContent = 'Show me movies';
  submitBtn.addEventListener('click', function() {
    submitMood();
  });
  submitWrap.appendChild(submitBtn);
  frag.appendChild(submitWrap);

  return frag;
}
```

- [ ] **Step 2: Add mood question styles to `styles.css`**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ MOOD QUESTIONS VIEW ═══ */
#mood-view {
  background: var(--bg);
  display: flex !important; flex-direction: column;
}
.mood-header {
  display: flex; align-items: center; gap: 12px;
  padding: calc(12px + var(--safe-top)) 16px 12px;
  flex-shrink: 0;
}
.mood-back {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass); border-radius: 50%;
  cursor: pointer; flex-shrink: 0;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.mood-back:active { transform: scale(0.85); }
.mood-back svg {
  width: 18px; height: 18px; stroke: #f5f5f5; stroke-width: 2.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}
.mood-heading {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 600; letter-spacing: -0.02em;
  color: var(--text-primary); text-transform: capitalize;
}
.mood-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.mood-questions {
  padding: 16px clamp(16px, 4vw, 24px) calc(40px + var(--safe-bottom));
  display: flex; flex-direction: column; gap: 28px;
}
.mood-question { }
.mood-question-label {
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 600; color: var(--text-primary);
  margin-bottom: 12px;
}
.mood-options { display: flex; flex-direction: column; gap: 8px; }
.mood-option {
  width: 100%; padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  font-family: inherit; font-size: 14px; font-weight: 500;
  color: var(--text-secondary); text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.mood-option:active { transform: scale(0.97); }
.mood-option.active {
  background: rgba(59,130,246,0.12);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.mood-submit-wrap { padding-top: 8px; }
.mood-submit {
  width: 100%; padding: 14px 0;
  background: var(--accent-blue);
  border: none; border-radius: 14px;
  font-family: inherit; font-size: 16px; font-weight: 600;
  color: #fff; cursor: pointer;
  transition: transform 0.2s var(--spring), opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.mood-submit:active { transform: scale(0.97); opacity: 0.85; }
```

- [ ] **Step 3: Verify mood questions flow**

Open in browser. Home -> Nano Genres -> tap "trap horror". Should see:
- Back button + "trap horror" heading
- 3 questions: "How demented?", "Gore level?", "Real or supernatural?"
- Each with 3 options, middle option pre-selected (blue highlight)
- Tap different options -- selection changes
- "Show me movies" button at bottom
- Tap submit -- navigates to grid view showing filtered movies for that genre
- Back button from mood returns to genre picker

- [ ] **Step 4: Commit mood questions**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: mood questions screen with personality-driven filtering"
```

---

> **APPROVAL GATE 6:** Deploy mood questions. Send screenshot + link to Ria. Show 3 personality questions, test submit flow → loading → filtered grid. Wait for explicit approval before proceeding.

---

## Task 7: Shuffle Screen

**Branch:** `screen/shuffle` (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `components.js` (add `buildShuffleCard`)
- Modify: `styles.css` (add shuffle styles)

**Pipeline -- run the full per-screen sequence:**
1. `refero-design` + `mcp__refero`: search "full bleed card immersive" and "Apple Invites style card" and "shuffle swipe single card" for reference
2. `ui-ux-pro-max` + `design-taste-frontend` + `high-end-visual-design`: validate card immersiveness, frosted glass treatment, button layout below card, overall cinematic feel
3. `frontend-design`: generate production-grade shuffle card code
4. `animate` + `mcp__gsap-mcp` + Motion MCP + `mcp__reactbits`: reshuffle card transition (exit scale+fade, enter scale+fade), poster tap -> detail slide-up (Motion spring). Check reactbits for card stack/swipe components. Use GSAP timeline for reshuffle sequence.
5. `adapt`: verify card sizing on small (375px) and large (768px+) screens
6. `critique`: score shuffle UX -- immersiveness, action discoverability, transition smoothness
7. `superpowers:verification-before-completion`: verify before marking done

After this task, tapping "Shuffle" on home opens an immersive single-card view. The card fills most of the screen with a poster image, frosted glass info bar at the bottom (title, year, genre), and Add/DNF buttons. Reshuffle animates to the next random movie. Exit returns to home. Tapping the poster opens the detail modal from the bottom (slide-up variant).

- [ ] **Step 1: Add `buildShuffleCard` to `components.js`**

Append to the end of `/tmp/movie-rec-v1-web/components.js`:

```javascript

/* ═══ SHUFFLE CARD ═══ */
function buildShuffleCard(movie) {
  var card = document.createElement('div');
  card.className = 'shuffle-card';

  // Poster image (full-bleed)
  var img = document.createElement('img');
  img.className = 'shuffle-poster';
  img.src = movie.poster_url;
  img.alt = movie.title;
  img.onerror = function() {
    if (!img.dataset.retried && movie.tmdb_id) {
      img.dataset.retried = '1';
      getMovieDetails(movie.tmdb_id).then(function(d) {
        if (d && d.poster_path) img.src = 'https://image.tmdb.org/t/p/w500' + d.poster_path;
      });
    }
  };
  card.appendChild(img);

  // Tap poster to open detail
  img.addEventListener('click', function() {
    openDetailModal(movie, 'shuffle');
  });

  // Frosted glass info bar
  var info = document.createElement('div');
  info.className = 'shuffle-info';

  var titleEl = document.createElement('div');
  titleEl.className = 'shuffle-title';
  titleEl.textContent = movie.title;
  info.appendChild(titleEl);

  var metaEl = document.createElement('div');
  metaEl.className = 'shuffle-meta';
  var yearText = movie.year || '';
  var genreText = movie.category || (movie.nano_genres && movie.nano_genres[0]) || '';
  metaEl.textContent = [yearText, genreText].filter(Boolean).join(' / ');
  info.appendChild(metaEl);

  card.appendChild(info);

  // Action buttons bar
  var actions = document.createElement('div');
  actions.className = 'shuffle-actions';

  // Add button
  var addBtn = document.createElement('button');
  addBtn.className = 'shuffle-btn shuffle-add';
  if (state.actionStates[movie.tmdb_id] && state.actionStates[movie.tmdb_id].saved) {
    addBtn.classList.add('active');
    addBtn.textContent = 'Added';
  } else {
    addBtn.textContent = 'Add';
  }
  addBtn.addEventListener('click', function() {
    var isSaved = toggleSaved(movie.tmdb_id);
    addBtn.classList.toggle('active', isSaved);
    addBtn.textContent = isSaved ? 'Added' : 'Add';
  });
  actions.appendChild(addBtn);

  // DNF button
  var dnfBtn = document.createElement('button');
  dnfBtn.className = 'shuffle-btn shuffle-dnf';
  dnfBtn.textContent = 'DNF';
  dnfBtn.addEventListener('click', function() {
    doDNF(movie.tmdb_id);
    // Remove from shuffle pool and advance
    state.shufflePool.splice(state.shuffleIndex, 1);
    if (state.shufflePool.length === 0) {
      showToast('No more movies');
      goHome();
      return;
    }
    if (state.shuffleIndex >= state.shufflePool.length) {
      state.shuffleIndex = 0;
    }
    animateShuffleOut(function() {
      renderShuffleCard();
    });
  });
  actions.appendChild(dnfBtn);

  // Reshuffle button
  var reshuffleBtn = document.createElement('button');
  reshuffleBtn.className = 'shuffle-btn shuffle-reshuffle';
  reshuffleBtn.textContent = 'Reshuffle';
  reshuffleBtn.addEventListener('click', function() {
    animateShuffleOut(function() {
      reshuffleNext();
    });
  });
  actions.appendChild(reshuffleBtn);

  card.appendChild(actions);
  return card;
}

/* Shuffle card exit animation */
function animateShuffleOut(callback) {
  var area = document.getElementById('shuffle-card-area');
  var card = area.querySelector('.shuffle-card');
  if (!card) { callback(); return; }
  card.style.transition = 'transform 0.35s var(--ease-out), opacity 0.3s';
  card.style.transform = 'scale(0.92) translateY(30px)';
  card.style.opacity = '0';
  setTimeout(callback, 350);
}
```

- [ ] **Step 2: Add shuffle styles to `styles.css`**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ SHUFFLE VIEW ═══ */
#shuffle-view {
  background: #0a0a0a;
  display: flex !important; flex-direction: column;
  align-items: center; justify-content: center;
}
.shuffle-exit {
  position: absolute; top: calc(12px + var(--safe-top)); right: 16px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass); border-radius: 50%;
  cursor: pointer; z-index: 10;
  transition: transform 0.3s var(--spring);
  -webkit-tap-highlight-color: transparent;
}
.shuffle-exit:active { transform: scale(0.85); }
.shuffle-exit svg {
  width: 18px; height: 18px; stroke: #f5f5f5; stroke-width: 2.5;
  fill: none; stroke-linecap: round; stroke-linejoin: round;
}

.shuffle-card-area {
  width: 100%; max-width: 380px;
  padding: 0 20px;
  position: relative; z-index: 1;
}
.shuffle-card {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.3);
  transition: transform 0.4s var(--ease-out), opacity 0.3s;
}
.shuffle-poster {
  width: 100%; aspect-ratio: 2/3;
  object-fit: cover; display: block;
  cursor: pointer;
  background: linear-gradient(135deg, #27272a, #18181b);
}
.shuffle-card::after {
  content: ''; position: absolute; inset: 0;
  border-radius: var(--radius-card);
  border: 1px solid rgba(255,255,255,0.08);
  pointer-events: none;
}

/* Frosted glass info overlay */
.shuffle-info {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 16px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  pointer-events: none;
}
.shuffle-title {
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 600; color: #f5f5f5;
  line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.shuffle-meta {
  font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.55);
  margin-top: 4px; text-transform: capitalize;
}

/* Shuffle action buttons */
.shuffle-actions {
  display: flex; gap: 8px;
  padding: 16px 0 0;
}
.shuffle-btn {
  flex: 1; padding: 12px 0;
  border: none; border-radius: 14px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s var(--spring), background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.shuffle-btn:active { transform: scale(0.95); }

.shuffle-add {
  background: var(--accent-blue); color: #fff;
}
.shuffle-add.active {
  background: rgba(59,130,246,0.3); color: var(--accent-blue);
}
.shuffle-dnf {
  background: var(--accent-red); color: #fff;
}
.shuffle-reshuffle {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
}
```

- [ ] **Step 3: Verify shuffle screen**

Open in browser. Tap "Shuffle" on home. Should see:
- Dark background with a large poster card centered on screen
- Movie title and year/genre in a frosted glass bar at the bottom of the poster
- Below the card: three buttons -- "Add" (blue), "DNF" (red), "Reshuffle" (glass)
- X button top-right to exit
- Tap "Reshuffle" -- card animates out, new random movie appears
- Tap "Add" -- toggles to "Added", shows toast
- Tap "DNF" -- card animates out, movie removed from pool, next movie appears
- Tap poster -- detail modal slides up from bottom
- X button returns to home

- [ ] **Step 4: Commit shuffle**

```bash
cd /tmp/movie-rec-v1-web
git add components.js styles.css
git commit -m "feat: shuffle screen with immersive Apple Invites-style card"
```

---

> **APPROVAL GATE 7:** Deploy shuffle screen. Send screenshot + link to Ria. Show immersive poster card, test Add/DNF/Reshuffle/Exit and detail slide-up. Wait for explicit approval before proceeding.

---

## Task 8: Final Wiring, Polish, and Verification

**Branch:** new `polish` branch (create with `superpowers:using-git-worktrees`)

**Files:**
- Modify: `styles.css` (responsive breakpoints)
- Modify: `app.js` (any remaining wiring)

**Pipeline -- final pass across all screens:**
1. `adapt`: run across all 6 screens at 375px, 580px, 768px, 900px, 1200px
2. `critique`: full app UX evaluation -- navigation flow coherence, visual consistency, interaction patterns
3. `animate`: review all transitions for consistency and purpose -- no animation without a UX reason
4. `superpowers:verification-before-completion`: full end-to-end verification before claiming complete
5. If any bugs found: `superpowers:systematic-debugging` before fixing

This task verifies end-to-end functionality across all screens and fixes any remaining issues.

- [ ] **Step 1: Add responsive breakpoints for genre picker**

Append to the end of `/tmp/movie-rec-v1-web/styles.css`:

```css

/* ═══ RESPONSIVE ADDITIONS ═══ */
@media (min-width: 580px) {
  .genre-tiles { grid-template-columns: repeat(3, 1fr); }
  .home-tiles { grid-template-columns: repeat(3, 1fr); }
  .home-tile:nth-child(5) { grid-column: auto; }
}
@media (min-width: 768px) {
  .detail-modal { max-width: 540px; }
  .shuffle-card-area { max-width: 420px; }
}
@media (min-width: 900px) {
  .genre-tiles { grid-template-columns: repeat(4, 1fr); }
}
```

- [ ] **Step 2: Full end-to-end verification**

Test every flow in the browser:

1. **Home**: 5 tiles visible, correct labels, no emojis, dark theme
2. **Latest Releases**: Tap tile -> grid shows movies from 2024+. Add button works. DNF removes card.
3. **All**: Tap tile -> grid shows all movies. Cards have poster + Add/DNF.
4. **Saved**: Tap tile -> initially empty. Add a movie from All grid, go back to home, tap Saved -> movie appears.
5. **Nano Genres**: Tap tile -> genre picker with all genres. Tap a genre -> mood questions.
6. **Mood Questions**: 3 questions displayed, middle option pre-selected. Change selections. Submit -> grid with filtered results.
7. **Shuffle**: Tap tile -> immersive card. Reshuffle works. Add works. DNF removes and advances. Tap poster -> detail slides up.
8. **Detail Modal (from grid)**: Tap any card -> modal pops up centered, background blurs. Content loads (hero, title, overview, rating widget, streaming logos, cast, reviews, stills, expandables, similar). X closes. Tap outside closes.
9. **Detail Modal (from shuffle)**: Tap poster -> modal slides up from bottom. Content same as above. X closes.
10. **3-Option Rating**: All three buttons selectable. Only one active at a time. Toast confirms.
11. **DNF nuclear**: DNF a movie from grid -> it disappears. Navigate to All -> movie gone. Navigate to Shuffle -> movie never appears.
12. **Back navigation**: Every screen's back button returns to the correct parent.
13. **No emojis**: Scan all visible text -- no emojis anywhere.
14. **Branding**: "rias cuts" lowercase everywhere.
15. **Streaming logos**: In detail modal, Where to Watch section shows real logo images, not text.
16. **Keyboard**: Escape closes detail modal, exits shuffle, returns from grid/genre/mood to home.

- [ ] **Step 3: Commit final polish**

```bash
cd /tmp/movie-rec-v1-web
git add -A
git commit -m "feat: complete 6-screen rias cuts rework, all flows wired"
```

---

## Summary

| Task | Screen | Key Deliverable |
|------|--------|----------------|
| 1 | Scaffolding | New state, filters.js, HTML shell, view switching |
| 2 | Home | 5 Aiby-style tiles, dark cinematic background |
| 3 | Grid | Ahead-style 2-col poster cards with Add/DNF |
| 4 | Detail Modal | Centered modal, blur overlay, 3-option rating |
| 5 | Genre Picker | 2-col genre tiles, navigates to mood questions |
| 6 | Mood Questions | 3 personality questions, submit filters to grid |
| 7 | Shuffle | Immersive Apple Invites card with reshuffle |
| 8 | Polish | Responsive, full e2e verification |

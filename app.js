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

function animateHomeTiles() {
  var tiles = document.querySelectorAll('.home-tile');
  tiles.forEach(function(tile, i) {
    setTimeout(function() {
      tile.classList.add('visible');
    }, 80 + i * 90);
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
  animateHomeTiles();

  var ls = document.getElementById('loading-screen');
  ls.classList.add('fade-out');
  setTimeout(function() { ls.remove(); }, 600);
}

init();

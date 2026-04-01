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
  var movies;
  var title;
  if (state.currentGenre) {
    movies = getMoviesByGenre(state.currentGenre);
    title = state.currentGenre;
  } else {
    movies = excludeDNF(state.movies);
    title = 'mood picks';
  }
  var filtered = filterByMood(movies, state.moodAnswers);
  openGrid(state.currentGenre ? 'genre' : 'mood', title, filtered);
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
  setupDiscoverGestures();
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

function setupDiscoverGestures() {
  var area = document.getElementById('shuffle-card-area');
  var isDragging = false;
  var startX = 0, startY = 0, currentDX = 0, currentDY = 0, totalMove = 0;
  var THRESHOLD_H = 80, THRESHOLD_V = 60;
  var card = null;

  function handleSwipeEnd() {
    if (!isDragging || !card) return;
    isDragging = false;

    // Reset overlays
    var redOv = card.querySelector('.discover-overlay-red');
    var greenOv = card.querySelector('.discover-overlay-green');

    var movie = state.shufflePool[state.shuffleIndex];

    // Check thresholds — horizontal wins over vertical
    if (currentDX < -THRESHOLD_H) {
      // SWIPE LEFT = DNF
      if (redOv) redOv.style.opacity = '0.5';
      card.style.transition = 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s';
      card.style.transform = 'translateX(-500px) rotate(-15deg) scale(0.8)';
      card.style.opacity = '0';
      if (movie) doDNF(movie.tmdb_id);
      setTimeout(function() { advanceDiscover(); }, 300);

    } else if (currentDX > THRESHOLD_H) {
      // SWIPE RIGHT = Add to watchlist
      if (greenOv) greenOv.style.opacity = '0.3';
      card.style.transition = 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s';
      card.style.transform = 'translateX(500px) rotate(8deg) scale(1)';
      card.style.opacity = '0';
      card.style.boxShadow = '0 0 30px rgba(34,197,94,0.4)';
      if (movie) toggleSaved(movie.tmdb_id);
      setTimeout(function() { advanceDiscover(); }, 300);

    } else if (currentDY < -THRESHOLD_V) {
      // SWIPE UP = Skip
      card.style.transition = 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s ease-out';
      card.style.transform = 'translateY(-400px) scale(0.95)';
      card.style.opacity = '0';
      setTimeout(function() { advanceDiscover(); }, 300);

    } else if (totalMove < 5 && movie) {
      // TAP = detail modal
      card.style.transition = 'transform 0.1s ease';
      card.style.transform = 'scale(0.97)';
      setTimeout(function() {
        card.style.transition = 'transform 0.2s ease';
        card.style.transform = 'scale(1)';
        openDetailModal(movie, 'shuffle');
      }, 100);

    } else {
      // Spring back
      if (redOv) redOv.style.opacity = '0';
      if (greenOv) greenOv.style.opacity = '0';
      card.style.transition = 'transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s';
      card.style.transform = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
      card.style.opacity = '1';
    }
  }

  function handleDragMove(clientX, clientY) {
    if (!isDragging || !card) return;
    currentDX = clientX - startX;
    currentDY = clientY - startY;
    totalMove = Math.sqrt(currentDX * currentDX + currentDY * currentDY);

    var rotate = currentDX * 0.08;
    var scale = Math.max(1 - totalMove * 0.0002, 0.92);
    var opacity = Math.max(1 - totalMove * 0.002, 0.5);
    card.style.transform = 'translateX(' + currentDX + 'px) translateY(' + currentDY + 'px) rotate(' + rotate + 'deg) scale(' + scale + ')';
    card.style.opacity = String(opacity);

    // Color overlays
    var redOv = card.querySelector('.discover-overlay-red');
    var greenOv = card.querySelector('.discover-overlay-green');
    if (redOv) redOv.style.opacity = currentDX < 0 ? String(Math.min(Math.abs(currentDX) / 160, 1) * 0.3) : '0';
    if (greenOv) greenOv.style.opacity = currentDX > 0 ? String(Math.min(currentDX / 160, 1) * 0.3) : '0';
  }

  area.addEventListener('touchstart', function(e) {
    card = area.querySelector('.discover-card');
    if (!card) return;
    isDragging = true;
    var pt = e.touches[0];
    startX = pt.clientX; startY = pt.clientY;
    currentDX = 0; currentDY = 0; totalMove = 0;
    card.style.transition = 'none';
  }, { passive: true });

  area.addEventListener('touchmove', function(e) {
    if (!isDragging || !card) return;
    var pt = e.touches[0];
    handleDragMove(pt.clientX, pt.clientY);
  }, { passive: true });

  area.addEventListener('touchend', function() {
    handleSwipeEnd();
  }, { passive: true });

  // Mouse support
  area.addEventListener('mousedown', function(e) {
    card = area.querySelector('.discover-card');
    if (!card) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    currentDX = 0; currentDY = 0; totalMove = 0;
    card.style.transition = 'none';
  });
  window.addEventListener('mousemove', function(e) {
    if (!isDragging || !card) return;
    handleDragMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', function() {
    handleSwipeEnd();
  });
}

function advanceDiscover() {
  state.shuffleIndex++;
  if (state.shuffleIndex >= state.shufflePool.length) {
    // End state
    var area = document.getElementById('shuffle-card-area');
    area.textContent = '';
    var end = document.createElement('div');
    end.className = 'discover-end';
    var msg = document.createElement('div');
    msg.className = 'discover-end-msg';
    msg.textContent = "you've seen them all";
    end.appendChild(msg);
    var sub = document.createElement('div');
    sub.className = 'discover-end-sub';
    sub.textContent = 'check back for new recs';
    end.appendChild(sub);
    area.appendChild(end);
    return;
  }
  renderShuffleCard();
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
document.getElementById('mood-back').addEventListener('click', goHome);
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
    { id: 'latest', title: 'latest releases', subtitle: 'new and recent', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'genres', title: 'nano genres', subtitle: 'browse by genre', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 'shuffle', title: 'discover', subtitle: 'swipe to explore', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z' },
    { id: 'all', title: 'all', subtitle: state.movies.length + ' movies', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'saved', title: 'saved', subtitle: 'your watchlist', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { id: 'mood', title: 'mood', subtitle: 'filter by vibe', icon: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-3m0-4V3M2 14h4M10 8h4M18 16h4' },
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

function openMoodStandalone() {
  state.currentGenre = '';
  state.moodAnswers = { intensity: 1, gore: 1, grounding: 1 };
  document.getElementById('mood-heading').textContent = 'mood';
  var container = document.getElementById('mood-questions');
  container.textContent = '';
  container.appendChild(buildMoodQuestionsContent());
  switchView('mood');
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
  } else if (id === 'mood') {
    openMoodStandalone();
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

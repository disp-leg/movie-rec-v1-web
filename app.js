/* ═══════════════════════════════════════════
   app.js — Main app logic, routing, state
   ═══════════════════════════════════════════ */

/* ─── Global State ─── */
var state = {
  movies: [],
  categories: {},
  currentIndex: 0,
  currentView: 'home',
  previousView: 'home',
  categoryStack: { name: '', movies: [], index: 0 },
  watchStatus: {},
  starRatings: {},
  actionStates: {},
  navigating: false,
  detailMovie: null,
};

/* ─── View Switching ─── */
function switchView(viewName) {
  var views = {
    home: 'home-view',
    categories: 'categories-view',
    'category-stack': 'category-stack-view',
    detail: 'detail-view',
  };
  Object.entries(views).forEach(function(entry) {
    document.getElementById(entry[1]).classList.toggle('active', entry[0] === viewName);
  });
  state.currentView = viewName;
  if (viewName === 'detail') {
    document.getElementById('detail-view').scrollTop = 0;
  }
}

/* ─── Home Tile Display ─── */
function showCurrentTile() {
  var movie = state.movies[state.currentIndex];
  if (!movie) return;
  updateTilePoster(document.getElementById('tile-container'), movie);
  document.getElementById('movie-counter').textContent =
    (state.currentIndex + 1) + ' of ' + state.movies.length;
}

/* ─── Sink & Rise Navigation ─── */
function navigateTile(direction) {
  if (state.navigating) return;
  var ni = state.currentIndex + direction;
  if (ni < 0 || ni >= state.movies.length) return;

  state.navigating = true;
  var tile = document.querySelector('#tile-container .tile-3d');
  tile.classList.add('sinking');

  // Wait for sink to fully finish (450ms), then swap content while invisible
  setTimeout(function() {
    state.currentIndex = ni;
    showCurrentTile();

    // Force a reflow between removing sink and adding rise
    // so the browser treats them as separate animations
    tile.classList.remove('sinking');
    void tile.offsetWidth;
    tile.classList.add('rising');

    setTimeout(function() {
      tile.classList.remove('rising');
      state.navigating = false;
    }, 520);
  }, 460);
}

function navigateCategoryTile(direction) {
  if (state.navigating) return;
  var stack = state.categoryStack;
  var ni = stack.index + direction;
  if (ni < 0 || ni >= stack.movies.length) return;

  state.navigating = true;
  var tile = document.querySelector('#category-stack-view .tile-3d');
  tile.classList.add('sinking');

  setTimeout(function() {
    stack.index = ni;
    var movie = stack.movies[ni];
    var container = document.querySelector('#category-stack-view .tile-container');
    updateTilePoster(container, movie);
    var counter = document.querySelector('#category-stack-view .category-stack-count');
    if (counter) counter.textContent = (stack.index + 1) + ' of ' + stack.movies.length;
    tile.classList.remove('sinking');
    void tile.offsetWidth;
    tile.classList.add('rising');
    setTimeout(function() {
      tile.classList.remove('rising');
      state.navigating = false;
    }, 520);
  }, 460);
}

/* ─── 3D Tilt Interaction ─── */
function setupTiltInteraction(container) {
  var pressTimer = null;
  var isTilting = false;

  function startTilt() {
    pressTimer = setTimeout(function() {
      isTilting = true;
      container.querySelector('.tile-3d').classList.add('tilting');
    }, 300);
  }

  function moveTilt(e) {
    if (!isTilting) return;
    var rect = container.getBoundingClientRect();
    var cx = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
    var cy = e.clientY !== undefined ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
    var x = (cx - rect.left) / rect.width - 0.5;
    var y = (cy - rect.top) / rect.height - 0.5;
    container.querySelector('.tile-3d').style.transform =
      'rotateY(' + (x * 20) + 'deg) rotateX(' + (-y * 15) + 'deg)';
  }

  function endTilt() {
    clearTimeout(pressTimer);
    if (isTilting) {
      isTilting = false;
      var tile = container.querySelector('.tile-3d');
      tile.classList.remove('tilting');
      tile.style.transform = '';
      var movie = getCurrentTileMovie(container);
      if (movie) openDetail(movie);
    }
  }

  function handleClick() {
    if (!isTilting) {
      var m = getCurrentTileMovie(container);
      if (m) openDetail(m);
    }
  }

  container.addEventListener('mousedown', startTilt);
  container.addEventListener('mousemove', moveTilt);
  container.addEventListener('mouseup', endTilt);
  container.addEventListener('mouseleave', function() {
    clearTimeout(pressTimer);
    if (isTilting) endTilt();
  });
  container.addEventListener('click', handleClick);
  container.addEventListener('touchstart', function() { startTilt(); }, { passive: true });
  container.addEventListener('touchmove', function(e) { moveTilt(e); }, { passive: true });
  container.addEventListener('touchend', endTilt);
}

function getCurrentTileMovie(container) {
  if (container.closest('#home-view') || container.id === 'tile-container') {
    return state.movies[state.currentIndex];
  }
  return state.categoryStack.movies[state.categoryStack.index];
}

/* ─── Touch Swipe ─── */
function setupSwipe(el, onLeft, onRight) {
  var sx = 0, sy = 0;
  el.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - sx;
    var dy = Math.abs(e.changedTouches[0].clientY - sy);
    if (Math.abs(dx) > 50 && dy < 100) {
      dx < 0 ? onLeft() : onRight();
    }
  }, { passive: true });
}

/* ─── Detail View ─── */
async function openDetail(movie) {
  state.detailMovie = movie;
  state.previousView = state.currentView;

  var dv = document.getElementById('detail-view');
  dv.textContent = '';

  var fragment = await buildDetailView(movie);
  dv.appendChild(fragment);

  switchView('detail');
  dv.addEventListener('scroll', handleDetailScroll);
}

function handleDetailScroll() {
  var blur = document.getElementById('detail-blur');
  if (!blur) return;
  var dv = document.getElementById('detail-view');
  blur.classList.toggle('blurred', dv.scrollTop > 100);
}

function closeDetail() {
  document.getElementById('detail-view').removeEventListener('scroll', handleDetailScroll);
  switchView(state.previousView);
}

/* ─── Interactive Controls ─── */
function setWatchStatus(movieId, status) {
  state.watchStatus[movieId] = status;
  var slider = document.getElementById('ws-slider');
  var colors = ['var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-green)'];
  slider.style.left = 'calc(' + (status * 33.33) + '% + 3px)';
  slider.style.background = colors[status];

  document.querySelectorAll('.watch-status-btn').forEach(function(btn, i) {
    btn.classList.toggle('active', i === status);
  });

  var label = document.querySelector('.star-rating-label');
  if (label) {
    var rating = state.starRatings[movieId] || 0;
    label.textContent = status === 2
      ? (rating ? rating + '/5' : 'Tap to rate')
      : 'Mark as Watched to rate';
  }
}

function setStarRating(movieId, rating) {
  if (state.watchStatus[movieId] !== 2) return;
  state.starRatings[movieId] = rating;

  document.querySelectorAll('#star-rating .star').forEach(function(star, i) {
    star.classList.toggle('filled', i < rating);
    star.style.transform = 'scale(1.3)';
    setTimeout(function() { star.style.transform = ''; }, 200);
  });

  var label = document.querySelector('.star-rating-label');
  if (label) label.textContent = rating + '/5';
}

function toggleAction(movieId, action, btn) {
  if (!state.actionStates[movieId]) state.actionStates[movieId] = {};
  state.actionStates[movieId][action] = !state.actionStates[movieId][action];

  var circle = btn.querySelector('.icon-circle');
  circle.classList.toggle('active');
  circle.style.transform = 'scale(0.8)';
  setTimeout(function() { circle.style.transform = 'scale(1.1)'; }, 100);
  setTimeout(function() { circle.style.transform = ''; }, 250);
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

/* ─── Similar Movie ─── */
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
  document.getElementById('detail-view').scrollTop = 0;
  openDetail(movie);
}

/* ─── Categories Navigation ─── */
function toggleCategories() {
  if (state.currentView === 'home') {
    document.getElementById('chevron-btn').classList.add('flipped');
    switchView('categories');
  } else if (state.currentView === 'categories') {
    document.getElementById('chevron-btn').classList.remove('flipped');
    switchView('home');
  }
}

function openCategoryStack(categoryName) {
  var ranks = state.categories[categoryName] || [];
  var movies = ranks.map(function(r) {
    return state.movies.find(function(m) { return m.rank === r; });
  }).filter(Boolean);
  if (movies.length === 0) return;

  state.categoryStack = { name: categoryName, movies: movies, index: 0 };
  buildCategoryStackView(categoryName, movies);
  switchView('category-stack');
}

function closeCategoryStack() {
  switchView('categories');
}

/* ─── Keyboard Navigation ─── */
document.addEventListener('keydown', function(e) {
  // Fullscreen viewer
  if (document.getElementById('fullscreen-viewer').classList.contains('active')) {
    if (e.key === 'Escape') closeFullscreen();
    return;
  }

  if (state.currentView === 'home') {
    if (e.key === 'ArrowLeft') navigateTile(-1);
    else if (e.key === 'ArrowRight') navigateTile(1);
    else if (e.key === 'Enter') {
      var m = state.movies[state.currentIndex];
      if (m) openDetail(m);
    }
    else if (e.key === 'ArrowDown') toggleCategories();
  } else if (state.currentView === 'detail') {
    if (e.key === 'Escape' || e.key === 'Backspace') closeDetail();
  } else if (state.currentView === 'categories') {
    if (e.key === 'Escape' || e.key === 'ArrowUp') toggleCategories();
  } else if (state.currentView === 'category-stack') {
    if (e.key === 'ArrowLeft') navigateCategoryTile(-1);
    else if (e.key === 'ArrowRight') navigateCategoryTile(1);
    else if (e.key === 'Escape') closeCategoryStack();
    else if (e.key === 'Enter') {
      var m = state.categoryStack.movies[state.categoryStack.index];
      if (m) openDetail(m);
    }
  }
});

/* ─── Event Listeners ─── */
document.getElementById('nav-left').addEventListener('click', function() { navigateTile(-1); });
document.getElementById('nav-right').addEventListener('click', function() { navigateTile(1); });
document.getElementById('chevron-btn').addEventListener('click', toggleCategories);
document.getElementById('cat-chevron-btn').addEventListener('click', toggleCategories);
document.getElementById('fullscreen-viewer').addEventListener('click', closeFullscreen);

/* ─── Initialize ─── */
async function init() {
  var data = await loadMovieData();
  state.movies = data.movies;
  state.categories = data.categories;

  showCurrentTile();
  renderCategories();

  setupTiltInteraction(document.getElementById('tile-container'));
  setupSwipe(
    document.getElementById('home-view'),
    function() { navigateTile(1); },
    function() { navigateTile(-1); }
  );

  var ls = document.getElementById('loading-screen');
  ls.classList.add('fade-out');
  setTimeout(function() { ls.remove(); }, 600);
}

init();

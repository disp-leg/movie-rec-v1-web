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
var ALL_VIEWS = {
  home: 'home-view',
  categories: 'categories-view',
  'category-stack': 'category-stack-view',
  detail: 'detail-view',
  liked: 'liked-view',
  saved: 'saved-view',
};
var TAB_VIEWS = ['home', 'liked', 'saved', 'categories', 'category-stack'];

function switchView(viewName) {
  Object.entries(ALL_VIEWS).forEach(function(entry) {
    document.getElementById(entry[1]).classList.toggle('active', entry[0] === viewName);
  });
  state.currentView = viewName;
  if (viewName === 'detail') {
    document.getElementById('detail-view').scrollTop = 0;
  }

  // Tab bar: show on tab views, hide on detail
  var tabBar = document.getElementById('tab-bar');
  tabBar.classList.toggle('visible', TAB_VIEWS.indexOf(viewName) !== -1);

  // Update active tab
  var tabMap = { home: 'tab-home', liked: 'tab-liked', saved: 'tab-saved' };
  Object.entries(tabMap).forEach(function(entry) {
    var el = document.getElementById(entry[1]);
    if (el) el.classList.toggle('active', entry[0] === viewName);
  });
}

/* ═══ SHOWCASE FEED ═══ */
function makeSvg(pathD) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  pathD.forEach(function(d) {
    if (d.type === 'path') {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d.d);
      svg.appendChild(p);
    } else if (d.type === 'polyline') {
      var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      pl.setAttribute('points', d.points);
      svg.appendChild(pl);
    }
  });
  return svg;
}

function buildShowcase() {
  var feed = document.getElementById('showcase-feed');
  if (!feed) return;
  feed.textContent = '';

  state.movies.forEach(function(movie, i) {
    var card = document.createElement('div');
    card.className = 'sc-card';
    card.dataset.index = i;
    card.addEventListener('click', function(e) {
      if (e.target.closest('.sc-icon')) return;
      openDetail(movie);
    });

    var img = document.createElement('img');
    img.src = movie.poster_url;
    img.alt = movie.title;
    img.loading = i < 3 ? 'eager' : 'lazy';
    img.onerror = function() {
      if (!img.dataset.retried && movie.tmdb_id) {
        img.dataset.retried = '1';
        getMovieDetails(movie.tmdb_id).then(function(d) {
          if (d && d.poster_path) img.src = 'https://image.tmdb.org/t/p/w500' + d.poster_path;
        });
      }
    };
    card.appendChild(img);

    var grad = document.createElement('div');
    grad.className = 'sc-grad';
    card.appendChild(grad);

    var info = document.createElement('div');
    info.className = 'sc-info';
    var title = document.createElement('div');
    title.className = 'sc-title';
    title.textContent = movie.title;
    info.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'sc-meta';
    var year = document.createElement('span');
    year.className = 'sc-year';
    year.textContent = movie.year || '';
    meta.appendChild(year);
    var cat = movie.category || (movie.nano_genres && movie.nano_genres[0]) || '';
    if (cat) {
      var genre = document.createElement('span');
      genre.className = 'sc-genre';
      genre.textContent = cat;
      meta.appendChild(genre);
    }
    if (movie.tmdb_rating) {
      var score = document.createElement('span');
      score.className = 'sc-score';
      score.textContent = '\u2605 ' + movie.tmdb_rating.toFixed(1);
      meta.appendChild(score);
    }
    info.appendChild(meta);
    card.appendChild(info);

    // Action icons
    var actions = document.createElement('div');
    actions.className = 'sc-actions';
    actions.appendChild(createCardIcon(movie, 'liked', [{type:'path', d:'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'}]));
    actions.appendChild(createCardIcon(movie, 'saved', [{type:'path', d:'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'}]));
    actions.appendChild(createWatchedIcon(movie));
    card.appendChild(actions);

    feed.appendChild(card);
  });
}

function createCardIcon(movie, action, paths) {
  var btn = document.createElement('div');
  btn.className = 'sc-icon';
  if (state.actionStates[movie.tmdb_id] && state.actionStates[movie.tmdb_id][action]) btn.classList.add('active');
  btn.appendChild(makeSvg(paths));
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!state.actionStates[movie.tmdb_id]) state.actionStates[movie.tmdb_id] = {};
    var was = state.actionStates[movie.tmdb_id][action];
    state.actionStates[movie.tmdb_id][action] = !was;
    btn.classList.toggle('active');
    showToast(was ? 'Removed' : (action === 'liked' ? 'Liked' : 'Saved'));
    btn.style.transform = 'scale(0.75)';
    setTimeout(function() { btn.style.transform = ''; }, 200);
  });
  return btn;
}

function createWatchedIcon(movie) {
  var btn = document.createElement('div');
  btn.className = 'sc-icon';
  if (state.watchStatus[movie.tmdb_id] === 2) btn.classList.add('active-green');
  btn.appendChild(makeSvg([{type:'polyline', points:'20 6 9 17 4 12'}]));
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var was = state.watchStatus[movie.tmdb_id] === 2;
    state.watchStatus[movie.tmdb_id] = was ? 0 : 2;
    btn.classList.toggle('active-green');
    showToast(was ? 'Unmarked' : 'Watched');
    btn.style.transform = 'scale(0.75)';
    setTimeout(function() { btn.style.transform = ''; }, 200);
  });
  return btn;
}

function showCurrentTile() {}
function navigateTile() {}

/* ─── Filter ad-tier & duplicate streaming providers ─── */
function filterProviders(list) {
  var AD_PATTERNS = /with ads|standard with|premium plus with|free with/i;
  var seen = {};
  return list.filter(function(p) {
    var name = p.provider_name || p.name || '';
    if (!name) return false;
    if (AD_PATTERNS.test(name)) return false;
    // Deduplicate by base service name (e.g. "Netflix basic" -> "netflix")
    var base = name.toLowerCase().replace(/\s*(basic|standard|premium|plus|free)\s*/gi, '').trim();
    if (seen[base]) return false;
    seen[base] = true;
    return true;
  });
}

/* ─── Home Tile Display ─── */
function showCurrentTile() {
  var movie = state.movies[state.currentIndex];
  if (!movie) return;
  updateTilePoster(document.getElementById('tile-container'), movie);

  // Counter + TMDB score
  document.getElementById('movie-counter').textContent =
    (state.currentIndex + 1) + ' / ' + state.movies.length;
  var tmdbEl = document.getElementById('card-tmdb');
  if (tmdbEl) tmdbEl.textContent = movie.tmdb_rating ? '\u2605 ' + movie.tmdb_rating.toFixed(1) + ' TMDB' : '';

  // Tile info overlay
  var titleEl = document.getElementById('tile-title');
  var catEl = document.getElementById('tile-category');
  var yearEl = document.getElementById('tile-year');
  var scoreEl = document.getElementById('tile-score');
  if (titleEl) titleEl.textContent = movie.title;
  if (catEl) catEl.textContent = movie.category || (movie.nano_genres && movie.nano_genres[0]) || '';
  if (yearEl) yearEl.textContent = movie.year;
  if (scoreEl) scoreEl.textContent = '';

  // Streaming logos are in detail view only — not on home tile
}

/* ─── Physical Drag: card follows finger ─── */
function setupCardDrag() {
  var dock = document.getElementById('tile-dock');
  if (!dock) return;
  var card = dock;
  var isDragging = false;
  var startX = 0, startY = 0, currentX = 0, startTime = 0;
  var THRESHOLD = 80;

  // Prevent tap/click from firing after a swipe
  var totalMove = 0;
  dock.addEventListener('click', function(e) {
    if (totalMove > 10) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  function onStart(e) {
    if (state.navigating) return;
    var pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    currentX = 0; totalMove = 0; startTime = Date.now();
    isDragging = true;
    card.style.transition = 'none';
  }
  function onMove(e) {
    if (!isDragging) return;
    var pt = e.touches ? e.touches[0] : e;
    currentX = pt.clientX - startX;
    var dy = Math.abs(pt.clientY - startY);
    totalMove = Math.abs(currentX) + dy;
    if (dy > Math.abs(currentX) + 20 && Math.abs(currentX) < 20) return;
    var rotate = currentX * 0.05;
    var scale = 1 - Math.abs(currentX) * 0.0003;
    var opacity = 1 - Math.abs(currentX) * 0.003;
    card.style.transform = 'translateX(' + currentX + 'px) rotate(' + rotate + 'deg) scale(' + Math.max(scale, 0.93) + ')';
    card.style.opacity = String(Math.max(opacity, 0.4));
  }
  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    var elapsed = Date.now() - startTime;
    var velocity = Math.abs(currentX) / Math.max(elapsed, 1) * 1000;

    if (Math.abs(currentX) > THRESHOLD || velocity > 600) {
      var dir = currentX > 0 ? 1 : -1;
      card.style.transition = 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s';
      card.style.transform = 'translateX(' + (dir * 400) + 'px) rotate(' + (dir * 12) + 'deg) scale(0.9)';
      card.style.opacity = '0';

      var movie = state.movies[state.currentIndex];
      if (dir > 0 && movie) {
        state.watchStatus[movie.tmdb_id] = 2;
        showToast('Marked as Watched');
      } else {
        showToast('Skipped');
      }

      setTimeout(function() {
        if (state.currentIndex < state.movies.length - 1) state.currentIndex++;
        showCurrentTile();
        card.style.transition = 'none';
        card.style.transform = 'translateY(20px) scale(0.95)';
        card.style.opacity = '0';
        void card.offsetWidth;
        card.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s';
        card.style.transform = 'translateY(0) scale(1)';
        card.style.opacity = '1';
        setTimeout(function() { card.style.transition = ''; card.style.transform = ''; }, 480);
      }, 300);
    } else {
      card.style.transition = 'transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s';
      card.style.transform = 'translateX(0) rotate(0deg) scale(1)';
      card.style.opacity = '1';
      setTimeout(function() { card.style.transition = ''; card.style.transform = ''; }, 520);
    }
  }

  dock.addEventListener('mousedown', onStart);
  dock.addEventListener('touchstart', function(e) { onStart(e); }, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', function(e) { onMove(e); }, { passive: true });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

/* ─── Sink & Rise Navigation ─── */
function navigateTile(direction) {
  if (state.navigating) return;
  var ni = state.currentIndex + direction;
  if (ni < 0 || ni >= state.movies.length) return;

  state.navigating = true;
  var tile = document.querySelector('#tile-container .tile-3d');

  // Listen for sink animation end instead of setTimeout
  tile.classList.add('sinking');

  function onSinkEnd() {
    tile.removeEventListener('animationend', onSinkEnd);

    // Swap content while fully invisible
    state.currentIndex = ni;
    showCurrentTile();

    // Force reflow, then rise
    tile.classList.remove('sinking');
    void tile.offsetWidth;
    tile.classList.add('rising');

    function onRiseEnd() {
      tile.removeEventListener('animationend', onRiseEnd);
      tile.classList.remove('rising');
      state.navigating = false;
    }
    tile.addEventListener('animationend', onRiseEnd);
  }
  tile.addEventListener('animationend', onSinkEnd);
}

function navigateCategoryTile(direction) {
  if (state.navigating) return;
  var stack = state.categoryStack;
  var ni = stack.index + direction;
  if (ni < 0 || ni >= stack.movies.length) return;

  state.navigating = true;
  var tile = document.querySelector('#category-stack-view .tile-3d');
  tile.classList.add('sinking');

  function onSinkEnd() {
    tile.removeEventListener('animationend', onSinkEnd);
    stack.index = ni;
    var movie = stack.movies[ni];
    var container = document.querySelector('#category-stack-view .tile-container');
    updateTilePoster(container, movie);
    var counter = document.querySelector('#category-stack-view .category-stack-count');
    if (counter) counter.textContent = (stack.index + 1) + ' of ' + stack.movies.length;
    tile.classList.remove('sinking');
    void tile.offsetWidth;
    tile.classList.add('rising');

    function onRiseEnd() {
      tile.removeEventListener('animationend', onRiseEnd);
      tile.classList.remove('rising');
      state.navigating = false;
    }
    tile.addEventListener('animationend', onRiseEnd);
  }
  tile.addEventListener('animationend', onSinkEnd);
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

/* ─── Touch Swipe (basic, for non-tile views) ─── */
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

/* ─── Tile Gesture System ─── */
/* Swipe right = Watched, Swipe left = DNF (remove), Long press = Save */
function setupTileGestures(view, getMovie, onRemove) {
  var sx = 0, sy = 0, st = 0;
  var longPressTimer = null;
  var longPressFired = false;
  var LONG_PRESS_MS = 500;
  var SWIPE_THRESHOLD = 70;

  view.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
    longPressFired = false;

    longPressTimer = setTimeout(function() {
      longPressFired = true;
      var movie = getMovie();
      if (!movie) return;
      // Save for later
      if (!state.actionStates[movie.tmdb_id]) state.actionStates[movie.tmdb_id] = {};
      var wasSaved = state.actionStates[movie.tmdb_id].saved;
      state.actionStates[movie.tmdb_id].saved = !wasSaved;
      showToast(wasSaved ? 'Removed from Saved' : 'Saved for Later');
      // Haptic-like feedback via brief scale
      var tile = view.querySelector('.tile-3d');
      if (tile) {
        tile.style.transition = 'transform 0.15s ease';
        tile.style.transform = 'scale(0.95)';
        setTimeout(function() {
          tile.style.transform = 'scale(1)';
          setTimeout(function() { tile.style.transition = 'none'; }, 200);
        }, 150);
      }
    }, LONG_PRESS_MS);
  }, { passive: true });

  view.addEventListener('touchmove', function(e) {
    // Cancel long press if finger moves
    var dx = Math.abs(e.touches[0].clientX - sx);
    var dy = Math.abs(e.touches[0].clientY - sy);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer);
    }
  }, { passive: true });

  view.addEventListener('touchend', function(e) {
    clearTimeout(longPressTimer);
    if (longPressFired) return; // Long press already handled

    var dx = e.changedTouches[0].clientX - sx;
    var dy = Math.abs(e.changedTouches[0].clientY - sy);
    var elapsed = Date.now() - st;

    // Only process swipes (not taps, not long press)
    if (Math.abs(dx) < SWIPE_THRESHOLD || dy > 120 || elapsed > 800) return;

    var movie = getMovie();
    if (!movie) return;

    // Hide gesture hint after first swipe
    var hint = document.getElementById('gesture-hint');
    if (hint) hint.classList.add('hidden');

    if (dx > 0) {
      // Swipe RIGHT → Mark as Watched
      state.watchStatus[movie.tmdb_id] = 2;
      showToast('Marked as Watched');
      navigateTile(1);
    } else {
      // Swipe LEFT → DNF / Remove
      if (onRemove) {
        onRemove(movie);
        showToast('Removed');
      } else {
        navigateTile(1);
        showToast('Skipped');
      }
    }
  }, { passive: true });
}

/* ─── DNF: remove movie from current list ─── */
function dnfMovie(movie) {
  var idx = state.movies.indexOf(movie);
  if (idx === -1) return;
  state.movies.splice(idx, 1);
  if (state.currentIndex >= state.movies.length) {
    state.currentIndex = Math.max(0, state.movies.length - 1);
  }
  if (state.movies.length > 0) {
    showCurrentTile();
  }
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
  var wasActive = state.actionStates[movieId][action];
  state.actionStates[movieId][action] = !wasActive;

  var circle = btn.querySelector('.icon-circle');
  circle.classList.toggle('active');
  circle.style.transform = 'scale(0.8)';
  setTimeout(function() { circle.style.transform = 'scale(1.1)'; }, 100);
  setTimeout(function() { circle.style.transform = ''; }, 250);

  // Toast confirmation
  var movie = state.detailMovie;
  var title = movie ? movie.title : '';
  if (action === 'liked') {
    showToast(wasActive ? 'Removed from Liked' : 'Added to Liked');
  } else if (action === 'saved') {
    showToast(wasActive ? 'Removed from Saved' : 'Added to Saved');
  }
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

/* ─── Collection Views ─── */
function renderCollection(type) {
  var gridId = type + '-grid';
  var emptyId = type + '-empty';
  var grid = document.getElementById(gridId);
  var empty = document.getElementById(emptyId);
  grid.textContent = '';

  var movieIds = [];
  Object.entries(state.actionStates).forEach(function(entry) {
    if (entry[1][type]) movieIds.push(Number(entry[0]));
  });

  var movies = movieIds.map(function(id) {
    return state.movies.find(function(m) { return m.tmdb_id === id; });
  }).filter(Boolean);

  if (movies.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  movies.forEach(function(movie) {
    var card = document.createElement('div');
    card.className = 'collection-card';
    card.addEventListener('click', function() { openDetail(movie); });

    var img = document.createElement('img');
    img.src = movie.poster_url;
    img.alt = movie.title;
    img.loading = 'lazy';
    card.appendChild(img);

    var title = document.createElement('div');
    title.className = 'collection-card-title';
    title.textContent = movie.title;
    card.appendChild(title);

    grid.appendChild(card);
  });
}

/* ─── Tab Navigation ─── */
function switchTab(tab) {
  if (tab === 'home') {
    document.getElementById('chevron-btn').classList.remove('flipped');
    switchView('home');
  } else if (tab === 'liked') {
    renderCollection('liked');
    switchView('liked');
  } else if (tab === 'saved') {
    renderCollection('saved');
    switchView('saved');
  }
}

/* ─── Event Listeners ─── */
document.getElementById('surprise-fab').addEventListener('click', function() {
  var idx = Math.floor(Math.random() * state.movies.length);
  var cards = document.querySelectorAll('.sc-card');
  if (cards[idx]) {
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Surprise pick');
  }
});
document.getElementById('chevron-btn').addEventListener('click', toggleCategories);
document.getElementById('cat-chevron-btn').addEventListener('click', toggleCategories);
document.getElementById('fullscreen-viewer').addEventListener('click', closeFullscreen);

// Tab bar
document.getElementById('tab-home').addEventListener('click', function() { switchTab('home'); });
document.getElementById('tab-liked').addEventListener('click', function() { switchTab('liked'); });
document.getElementById('tab-saved').addEventListener('click', function() { switchTab('saved'); });

/* ─── Initialize ─── */
async function init() {
  var data = await loadMovieData();
  state.movies = data.movies;
  state.categories = data.categories;

  buildShowcase();
  renderCategories();

  // Show tab bar on home
  document.getElementById('tab-bar').classList.add('visible');

  var ls = document.getElementById('loading-screen');
  ls.classList.add('fade-out');
  setTimeout(function() { ls.remove(); }, 600);
}

init();

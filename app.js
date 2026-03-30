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

/* ═══════════════════════════════════════════
   3D CYLINDER CAROUSEL
   ═══════════════════════════════════════════ */
var cyl = {
  currentAngle: 0,
  targetAngle: 0,
  velocity: 0,
  isDragging: false,
  isAutoRotating: true,
  hoverPaused: false,
  dragStartY: 0,
  dragStartAngle: 0,
  lastDragY: 0,
  lastDragTime: 0,
  idleTimer: null,
  slice: 0,
  radius: 0,
  cardW: 0,
  cardH: 0,
  animId: null,
};
var AUTO_SPEED = 0.15;
var LERP = 0.12;
var FRICTION = 0.95;
var IDLE_MS = 3000;

function buildCarousel() {
  var cylinder = document.getElementById('carousel-cylinder');
  cylinder.textContent = '';

  var count = state.movies.length;
  if (count === 0) return;

  // Card dimensions — fluid based on viewport
  var vw = window.innerWidth;
  cyl.cardW = Math.min(vw * 0.72, 340);
  cyl.cardH = cyl.cardW * 1.5; // 2:3 aspect
  var gap = 24;
  cyl.slice = 360 / count;
  cyl.radius = (count * (cyl.cardH + gap)) / (2 * Math.PI);

  state.movies.forEach(function(movie, i) {
    var card = document.createElement('div');
    card.className = 'cyl-card';
    card.style.width = cyl.cardW + 'px';
    card.style.height = cyl.cardH + 'px';
    card.style.marginLeft = (-cyl.cardW / 2) + 'px';
    card.style.marginTop = (-cyl.cardH / 2) + 'px';
    card.style.transform = 'rotateX(' + (i * cyl.slice) + 'deg) translateZ(' + (-cyl.radius) + 'px)';
    card.dataset.index = i;

    var img = document.createElement('img');
    img.alt = movie.title;
    img.loading = i < 6 ? 'eager' : 'lazy';
    img.onerror = function() {
      if (!img.dataset.retried && movie.tmdb_id) {
        img.dataset.retried = '1';
        getMovieDetails(movie.tmdb_id).then(function(d) {
          if (d && d.poster_path) img.src = 'https://image.tmdb.org/t/p/w500' + d.poster_path;
        });
      }
    };
    img.src = movie.poster_url;
    card.appendChild(img);

    var gradient = document.createElement('div');
    gradient.className = 'cyl-gradient';
    card.appendChild(gradient);

    var info = document.createElement('div');
    info.className = 'cyl-info';
    var title = document.createElement('div');
    title.className = 'cyl-title';
    title.textContent = movie.title;
    info.appendChild(title);
    var meta = document.createElement('div');
    meta.className = 'cyl-meta';
    var cat = movie.category || (movie.nano_genres && movie.nano_genres[0]) || '';
    if (cat) {
      var catEl = document.createElement('span');
      catEl.className = 'cyl-category';
      catEl.textContent = cat;
      meta.appendChild(catEl);
    }
    var yearEl = document.createElement('span');
    yearEl.className = 'cyl-year';
    yearEl.textContent = movie.year || '';
    meta.appendChild(yearEl);
    if (movie.tmdb_rating) {
      var scoreEl = document.createElement('span');
      scoreEl.className = 'cyl-score';
      scoreEl.textContent = '\u2605 ' + movie.tmdb_rating.toFixed(1);
      meta.appendChild(scoreEl);
    }
    info.appendChild(meta);
    card.appendChild(info);

    card.addEventListener('click', function() {
      var fi = getFrontCardIndex();
      if (i === fi) {
        openDetail(movie);
      } else {
        snapToCard(i);
      }
    });

    cylinder.appendChild(card);
  });

  updateCounter();
}

function snapToCard(index) {
  var cardAngle = index * cyl.slice;
  var diff = cardAngle - (cyl.targetAngle % 360);
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  cyl.targetAngle += diff;
  cyl.isAutoRotating = false;
  cyl.velocity = 0;
  resetCarouselIdle();
}

function getFrontCardIndex() {
  var n = ((cyl.currentAngle % 360) + 360) % 360;
  return Math.round(n / cyl.slice) % state.movies.length;
}

function updateCardVisibility() {
  var cylinder = document.getElementById('carousel-cylinder');
  var cards = cylinder.children;
  for (var i = 0; i < cards.length; i++) {
    var cardAngle = i * cyl.slice;
    var diff = ((cyl.currentAngle % 360) - cardAngle + 360) % 360;
    if (diff > 180) diff -= 360;
    var absDiff = Math.abs(diff);
    if (absDiff < 40) {
      cards[i].style.opacity = '1';
      cards[i].style.filter = 'blur(0px)';
    } else if (absDiff < 70) {
      var t = (absDiff - 40) / 30;
      cards[i].style.opacity = String(1 - t * 0.8);
      cards[i].style.filter = 'blur(' + (t * 3) + 'px)';
    } else {
      cards[i].style.opacity = '0.1';
      cards[i].style.filter = 'blur(4px)';
    }
  }
}

function updateCounter() {
  var fi = getFrontCardIndex();
  var el = document.getElementById('movie-counter');
  if (el) el.textContent = (fi + 1) + ' of ' + state.movies.length;
  state.currentIndex = fi;
}

function carouselAnimate() {
  if (cyl.isAutoRotating && !cyl.hoverPaused && !cyl.isDragging) {
    cyl.targetAngle += AUTO_SPEED;
  }
  if (!cyl.isDragging && Math.abs(cyl.velocity) > 0.01) {
    cyl.targetAngle += cyl.velocity;
    cyl.velocity *= FRICTION;
  } else if (!cyl.isDragging) {
    cyl.velocity = 0;
  }
  cyl.currentAngle += (cyl.targetAngle - cyl.currentAngle) * LERP;
  var cylinder = document.getElementById('carousel-cylinder');
  if (cylinder) cylinder.style.transform = 'rotateX(' + cyl.currentAngle + 'deg)';
  updateCardVisibility();
  updateCounter();
  cyl.animId = requestAnimationFrame(carouselAnimate);
}

function navigateCarousel(dir) {
  cyl.isAutoRotating = false;
  cyl.velocity = 0;
  var fi = getFrontCardIndex();
  var next = (fi + dir + state.movies.length) % state.movies.length;
  snapToCard(next);
}

/* Keep navigateTile as alias for gesture system */
function navigateTile(dir) { navigateCarousel(dir); }

function showCurrentTile() { /* no-op for carousel — tiles are always visible */ }

function resetCarouselIdle() {
  clearTimeout(cyl.idleTimer);
  cyl.idleTimer = setTimeout(function() {
    cyl.isAutoRotating = true;
    cyl.velocity = 0;
  }, IDLE_MS);
}

function setupCarouselDrag() {
  var scene = document.getElementById('carousel-scene');

  function startDrag(e) {
    cyl.isDragging = true;
    cyl.isAutoRotating = false;
    cyl.velocity = 0;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    cyl.dragStartY = y;
    cyl.lastDragY = y;
    cyl.lastDragTime = Date.now();
    cyl.dragStartAngle = cyl.targetAngle;
    var cylinder = document.getElementById('carousel-cylinder');
    cylinder.style.transition = 'none';
  }

  function onDrag(e) {
    if (!cyl.isDragging) return;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    var delta = y - cyl.dragStartY;
    cyl.targetAngle = cyl.dragStartAngle - delta * 0.4;
    var now = Date.now();
    var dt = now - cyl.lastDragTime;
    if (dt > 0) {
      cyl.velocity = -(y - cyl.lastDragY) * 0.4 * (16 / dt);
    }
    cyl.lastDragY = y;
    cyl.lastDragTime = now;
  }

  function endDrag() {
    if (!cyl.isDragging) return;
    cyl.isDragging = false;
    var cylinder = document.getElementById('carousel-cylinder');
    cylinder.style.transition = '';
    resetCarouselIdle();
  }

  scene.addEventListener('mousedown', startDrag);
  scene.addEventListener('touchstart', function(e) { startDrag(e); }, { passive: true });
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('touchmove', function(e) { onDrag(e); }, { passive: true });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  scene.addEventListener('wheel', function(e) {
    e.preventDefault();
    cyl.isAutoRotating = false;
    cyl.targetAngle -= e.deltaY * 0.15;
    resetCarouselIdle();
  }, { passive: false });

  scene.addEventListener('mouseenter', function() { cyl.hoverPaused = true; });
  scene.addEventListener('mouseleave', function() {
    cyl.hoverPaused = false;
    if (!cyl.isDragging) resetCarouselIdle();
  });
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
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateCarousel(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); navigateCarousel(1); }
    else if (e.key === 'ArrowLeft') navigateCarousel(-1);
    else if (e.key === 'ArrowRight') navigateCarousel(1);
    else if (e.key === 'Enter') {
      var m = state.movies[getFrontCardIndex()];
      if (m) openDetail(m);
    }
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
document.getElementById('nav-up').addEventListener('click', function() { navigateCarousel(-1); });
document.getElementById('nav-down').addEventListener('click', function() { navigateCarousel(1); });
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

  buildCarousel();
  setupCarouselDrag();
  carouselAnimate();
  renderCategories();

  // Gesture system: swipe right=watched, swipe left=DNF, long press=save
  setupTileGestures(
    document.getElementById('home-view'),
    function() { return state.movies[getFrontCardIndex()]; },
    dnfMovie
  );

  // Show tab bar on home
  document.getElementById('tab-bar').classList.add('visible');

  var ls = document.getElementById('loading-screen');
  ls.classList.add('fade-out');
  setTimeout(function() { ls.remove(); }, 600);
}

init();

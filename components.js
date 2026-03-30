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
    }
  });
  return svg;
}

var ICONS = {
  chevronLeft: function() { return svgIcon([{type:'polyline', points:'15 18 9 12 15 6'}]); },
  chevronRight: function() { return svgIcon([{type:'polyline', points:'9 6 15 12 9 18'}]); },
  chevronDown: function() { return svgIcon([{type:'polyline', points:'6 9 12 15 18 9'}]); },
  star: function() { return svgIcon([{type:'path', d:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'}], {fill:'#ff9f0a', stroke:'none'}); },
  starEmpty: function() { return svgIcon([{type:'path', d:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'}]); },
  thumbUp: function() { return svgIcon([{type:'path', d:'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3'}]); },
  thumbDown: function() { return svgIcon([{type:'path', d:'M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17'}]); },
  bookmark: function() { return svgIcon([{type:'path', d:'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'}]); },
  check: function() { return svgIcon([{type:'circle', cx:'12', cy:'12', r:'10'}, {type:'path', d:'M8 12l3 3 5-5'}], {fill:'none', stroke:'#01d277'}); },
};

var CATEGORY_EMOJIS = {
  'human hunting':'🏹', 'trap horror':'🪤', 'captivity thriller':'🔒',
  'revenge horror':'🔪', 'serial killer':'🩸', 'cannibalism':'🦴',
  'torture horror':'⛓️', 'death game':'🎲', 'possession horror':'👹',
  'kidnapping horror':'🚨', 'supernatural horror':'👻', 'creature horror':'🐛',
};

/* ─── Create a 3D tile DOM structure ─── */
function createTile() {
  var container = document.createElement('div');
  container.className = 'tile-container';

  var tile3d = document.createElement('div');
  tile3d.className = 'tile-3d';

  var shadow = document.createElement('div');
  shadow.className = 'tile-ambient-shadow';
  tile3d.appendChild(shadow);

  var front = document.createElement('div');
  front.className = 'tile-front';
  var img = document.createElement('img');
  img.alt = '';
  front.appendChild(img);

  var gradient = document.createElement('div');
  gradient.className = 'tile-gradient';
  front.appendChild(gradient);

  var info = document.createElement('div');
  info.className = 'tile-info';
  var infoTitle = document.createElement('div');
  infoTitle.className = 'tile-info-title';
  info.appendChild(infoTitle);
  var infoMeta = document.createElement('div');
  infoMeta.className = 'tile-info-meta';
  var infoCat = document.createElement('span');
  infoCat.className = 'tile-info-category';
  infoMeta.appendChild(infoCat);
  var infoYear = document.createElement('span');
  infoYear.className = 'tile-info-year';
  infoMeta.appendChild(infoYear);
  var infoScore = document.createElement('span');
  infoScore.className = 'tile-info-score';
  infoMeta.appendChild(infoScore);
  info.appendChild(infoMeta);
  front.appendChild(info);

  tile3d.appendChild(front);

  container.appendChild(tile3d);
  return container;
}

/* ─── Update a tile's poster and info ─── */
function updateTilePoster(container, movie) {
  var img = container.querySelector('.tile-front img');
  var shadow = container.querySelector('.tile-ambient-shadow');
  img.src = movie.poster_url;
  img.alt = movie.title;
  img.crossOrigin = 'anonymous';
  img.onload = function() { shadow.style.background = extractColor(img); };

  // Update info overlay if present
  var titleEl = container.querySelector('.tile-info-title');
  var catEl = container.querySelector('.tile-info-category');
  var yearEl = container.querySelector('.tile-info-year');
  var scoreEl = container.querySelector('.tile-info-score');
  if (titleEl) titleEl.textContent = movie.title;
  if (catEl) catEl.textContent = movie.category || (movie.nano_genres && movie.nano_genres[0]) || '';
  if (yearEl) yearEl.textContent = movie.year || '';
  if (scoreEl) scoreEl.textContent = movie.tmdb_rating ? '\u2605 ' + movie.tmdb_rating.toFixed(1) : '';
}

/* ─── Build the full detail view ─── */
async function buildDetailView(movie) {
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

  // Back button
  var backBtn = document.createElement('div');
  backBtn.className = 'detail-back';
  backBtn.appendChild(ICONS.chevronLeft());
  backBtn.addEventListener('click', function() { closeDetail(); });
  frag.appendChild(backBtn);

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
  var blur = document.createElement('div');
  blur.className = 'detail-hero-blur';
  blur.id = 'detail-blur';
  hero.appendChild(blur);
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
  var tmdbScore = (details && details.vote_average) ? details.vote_average.toFixed(1) : (movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : '—');
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

  // Content
  var content = document.createElement('div');
  content.className = 'detail-content';

  // Overview
  var overview = document.createElement('p');
  overview.className = 'detail-overview';
  overview.textContent = movie.overview;
  content.appendChild(overview);

  // Watch Status
  content.appendChild(buildWatchStatus(movie));

  // Where to Watch
  var usProviders = providers && providers.results && providers.results.US;
  var streamList = (usProviders && (usProviders.flatrate || usProviders.ads)) || movie.streaming || [];
  content.appendChild(buildWhereToWatch(streamList));

  // Cast
  var castMembers = (credits && credits.cast) ? credits.cast.slice(0, 8) : [];
  content.appendChild(buildCastSection(castMembers, movie.cast || []));

  // Ratings
  content.appendChild(buildRatingsSection(tmdbScore));

  // Star Rating
  content.appendChild(buildStarRating(movie));

  // Reviews
  content.appendChild(buildReviews(movie));

  // Stills
  var stills = (images && images.backdrops) ? images.backdrops.slice(0, 6) : [];
  if (stills.length > 0) content.appendChild(buildStillsGrid(stills));

  // Expandable cells
  var director = '—', writers = '—', producers = '—';
  if (credits && credits.crew) {
    var dirObj = credits.crew.find(function(c) { return c.job === 'Director'; });
    director = dirObj ? dirObj.name : (movie.director || '—');
    writers = credits.crew.filter(function(c) { return c.department === 'Writing'; }).slice(0,3).map(function(c) { return c.name; }).join(', ') || '—';
    producers = credits.crew.filter(function(c) { return c.job === 'Producer'; }).slice(0,3).map(function(c) { return c.name; }).join(', ') || '—';
  } else {
    director = movie.director || '—';
  }

  var castNames = castMembers.length > 0
    ? castMembers.map(function(c) { return c.name + (c.character ? ' as ' + c.character : ''); }).join(', ')
    : (movie.cast || []).join(', ');

  var budget = (details && details.budget) ? '$' + (details.budget / 1e6).toFixed(1) + 'M' : '—';
  var revenue = (details && details.revenue) ? '$' + (details.revenue / 1e6).toFixed(1) + 'M' : '—';
  var runtime = movie.runtime || (details && details.runtime) || '—';
  var genres = (details && details.genres) ? details.genres.map(function(g) { return g.name; }).join(', ') : (movie.nano_genres || []).join(', ') || '—';

  content.appendChild(buildExpandables([
    ['Full Cast & Crew', 'Director: ' + director + '\nWriters: ' + writers + '\nCast: ' + castNames],
    ['Box Office', 'Budget: ' + budget + '\nRevenue: ' + revenue],
    ['Production', 'Producers: ' + producers + '\nRuntime: ' + runtime + ' min\nGenres: ' + genres],
    ['Trivia', 'Taste Match: ' + ((movie.taste_match_score || 0) * 100).toFixed(0) + '%\nNano-genres: ' + (movie.nano_genres || []).join(', ')],
  ]));

  // Similar Movies
  var similarMovies = (similar && similar.results) ? similar.results.slice(0, 10) : [];
  if (similarMovies.length > 0) content.appendChild(buildSimilarShelf(similarMovies));

  // Action Buttons
  content.appendChild(buildActionButtons(movie));

  var spacer = document.createElement('div');
  spacer.style.height = '20px';
  content.appendChild(spacer);

  frag.appendChild(content);
  return frag;
}

/* ─── Watch Status Control ─── */
function buildWatchStatus(movie) {
  var ws = state.watchStatus[movie.tmdb_id] || 0;
  var wsColors = ['var(--accent-blue)', 'var(--accent-amber)', 'var(--accent-green)'];
  var wsLabels = ['Want to Watch', 'Watching', 'Watched'];

  var div = document.createElement('div');
  div.className = 'watch-status';
  div.id = 'watch-status';

  wsLabels.forEach(function(label, i) {
    var btn = document.createElement('button');
    btn.className = 'watch-status-btn' + (ws === i ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', function() { setWatchStatus(movie.tmdb_id, i); });
    div.appendChild(btn);
  });

  var slider = document.createElement('div');
  slider.className = 'watch-status-slider';
  slider.id = 'ws-slider';
  slider.style.left = 'calc(' + (ws * 33.33) + '% + 3px)';
  slider.style.width = 'calc(33.33% - 6px)';
  slider.style.background = wsColors[ws];
  div.appendChild(slider);

  return div;
}

/* ─── Where to Watch ─── */
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
      var dot = document.createElement('span');
      dot.className = 'dot';
      chip.appendChild(dot);
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

/* ─── Cast Section ─── */
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

/* ─── Ratings ─── */
function buildRatingsSection(tmdbScore) {
  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Ratings';
  section.appendChild(title);

  var row = document.createElement('div');
  row.className = 'ratings-row';

  // TMDB
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

  // RT placeholder
  var rtItem = document.createElement('div');
  rtItem.className = 'rating-item';
  var rtEmoji = document.createElement('span');
  rtEmoji.style.fontSize = '18px';
  rtEmoji.textContent = '🍅';
  rtItem.appendChild(rtEmoji);
  var rtVal = document.createElement('span');
  rtVal.textContent = '—';
  rtItem.appendChild(rtVal);
  var rtLabel = document.createElement('span');
  rtLabel.className = 'label';
  rtLabel.textContent = 'RT';
  rtItem.appendChild(rtLabel);
  row.appendChild(rtItem);

  // Letterboxd placeholder
  var lbItem = document.createElement('div');
  lbItem.className = 'rating-item';
  var lbEmoji = document.createElement('span');
  lbEmoji.style.fontSize = '18px';
  lbEmoji.textContent = '📝';
  lbItem.appendChild(lbEmoji);
  var lbVal = document.createElement('span');
  lbVal.textContent = '—';
  lbItem.appendChild(lbVal);
  var lbLabel = document.createElement('span');
  lbLabel.className = 'label';
  lbLabel.textContent = 'Letterboxd';
  lbItem.appendChild(lbLabel);
  row.appendChild(lbItem);

  section.appendChild(row);
  return section;
}

/* ─── Star Rating Widget ─── */
function buildStarRating(movie) {
  var ws = state.watchStatus[movie.tmdb_id] || 0;
  var currentRating = state.starRatings[movie.tmdb_id] || 0;
  var isWatched = ws === 2;

  var section = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Your Rating';
  section.appendChild(title);

  var row = document.createElement('div');
  row.className = 'star-rating';
  row.id = 'star-rating';

  for (var i = 1; i <= 5; i++) {
    (function(idx) {
      var star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      star.setAttribute('class', 'star' + (currentRating >= idx ? ' filled' : ''));
      star.setAttribute('viewBox', '0 0 24 24');
      star.setAttribute('fill', 'currentColor');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
      star.appendChild(path);
      star.addEventListener('click', function() { setStarRating(movie.tmdb_id, idx); });
      row.appendChild(star);
    })(i);
  }

  var label = document.createElement('span');
  label.className = 'star-rating-label';
  label.textContent = isWatched ? (currentRating ? currentRating + '/5' : 'Tap to rate') : 'Mark as Watched to rate';
  row.appendChild(label);

  section.appendChild(row);
  return section;
}

/* ─── Reviews ─── */
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

  [[review5, '★★★★★'], [review1, '★']].forEach(function(pair) {
    var panel = document.createElement('div');
    panel.className = 'review-panel';

    var header = document.createElement('div');
    header.className = 'review-header';
    var stars = document.createElement('span');
    stars.className = 'review-stars';
    stars.textContent = pair[1];
    header.appendChild(stars);
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

/* ─── Stills Gallery ─── */
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

/* ─── Expandable Detail Cells ─── */
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

/* ─── Similar Movies Shelf ─── */
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

/* ─── Action Buttons ─── */
function buildActionButtons(movie) {
  var actions = state.actionStates[movie.tmdb_id] || {};
  var div = document.createElement('div');
  div.className = 'action-buttons';

  [
    ['liked', 'Like', ICONS.thumbUp],
    ['disliked', 'Dislike', ICONS.thumbDown],
    ['saved', 'Save', ICONS.bookmark],
  ].forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'action-btn';

    var circle = document.createElement('div');
    circle.className = 'icon-circle' + (actions[item[0]] ? ' active' : '');
    circle.appendChild(item[2]());
    btn.appendChild(circle);

    btn.addEventListener('click', function() { toggleAction(movie.tmdb_id, item[0], btn); });

    var label = document.createElement('span');
    label.textContent = item[1];
    btn.appendChild(label);

    div.appendChild(btn);
  });

  return div;
}

/* ─── Categories Grid ─── */
function renderCategories() {
  var grid = document.getElementById('categories-grid');
  grid.textContent = '';

  Object.entries(state.categories).forEach(function(entry) {
    var name = entry[0], ranks = entry[1];
    var emoji = CATEGORY_EMOJIS[name] || '🎬';

    var card = document.createElement('div');
    card.className = 'category-card';
    card.addEventListener('click', function() { openCategoryStack(name); });

    var emojiDiv = document.createElement('div');
    emojiDiv.className = 'cat-emoji';
    emojiDiv.textContent = emoji;
    card.appendChild(emojiDiv);

    var nameDiv = document.createElement('div');
    nameDiv.className = 'cat-name';
    nameDiv.textContent = name;
    card.appendChild(nameDiv);

    var countDiv = document.createElement('div');
    countDiv.className = 'cat-count';
    countDiv.textContent = ranks.length + ' movie' + (ranks.length !== 1 ? 's' : '');
    card.appendChild(countDiv);

    grid.appendChild(card);
  });
}

/* ─── Category Stack View ─── */
function buildCategoryStackView(categoryName, movies) {
  var view = document.getElementById('category-stack-view');
  var emoji = CATEGORY_EMOJIS[categoryName] || '🎬';
  view.textContent = '';

  // Back button
  var backBtn = document.createElement('div');
  backBtn.className = 'category-back-btn';
  backBtn.appendChild(ICONS.chevronLeft());
  backBtn.addEventListener('click', closeCategoryStack);
  view.appendChild(backBtn);

  // Header
  var header = document.createElement('div');
  header.className = 'category-stack-header';
  var title = document.createElement('div');
  title.className = 'category-stack-title';
  title.textContent = emoji + ' ' + categoryName;
  header.appendChild(title);
  var count = document.createElement('div');
  count.className = 'category-stack-count';
  count.textContent = '1 of ' + movies.length;
  header.appendChild(count);
  view.appendChild(header);

  // Nav arrows
  var leftArr = document.createElement('div');
  leftArr.className = 'nav-arrow left';
  leftArr.appendChild(ICONS.chevronLeft());
  leftArr.addEventListener('click', function() { navigateCategoryTile(-1); });
  view.appendChild(leftArr);

  // Tile
  var tileContainer = createTile();
  updateTilePoster(tileContainer, movies[0]);
  view.appendChild(tileContainer);

  // Right arrow
  var rightArr = document.createElement('div');
  rightArr.className = 'nav-arrow right';
  rightArr.appendChild(ICONS.chevronRight());
  rightArr.addEventListener('click', function() { navigateCategoryTile(1); });
  view.appendChild(rightArr);

  // Chevron
  var chevron = document.createElement('div');
  chevron.className = 'chevron-btn flipped';
  chevron.appendChild(ICONS.chevronDown());
  chevron.addEventListener('click', closeCategoryStack);
  view.appendChild(chevron);

  // Setup interactions
  setupTiltInteraction(tileContainer);
  setupSwipe(view, function() { navigateCategoryTile(1); }, function() { navigateCategoryTile(-1); });
}

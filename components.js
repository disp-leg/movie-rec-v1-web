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

/* ═══ STUBS — filled in by later tasks ═══ */
function buildGridCard(movie) {
  var card = document.createElement('div');
  card.className = 'grid-card';
  card.dataset.tmdbId = movie.tmdb_id;

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

  card.addEventListener('click', function(e) {
    if (e.target.closest('.grid-card-btn')) return;
    openDetailModal(movie, 'grid');
  });

  var actions = document.createElement('div');
  actions.className = 'grid-card-actions';

  var addBtn = document.createElement('button');
  addBtn.className = 'grid-card-btn grid-card-add';
  if (state.actionStates[movie.tmdb_id] && state.actionStates[movie.tmdb_id].saved) {
    addBtn.classList.add('active');
    addBtn.textContent = 'added';
  } else {
    addBtn.textContent = 'add';
  }
  addBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isSaved = toggleSaved(movie.tmdb_id);
    addBtn.classList.toggle('active', isSaved);
    addBtn.textContent = isSaved ? 'added' : 'add';
  });
  actions.appendChild(addBtn);

  var dnfBtn = document.createElement('button');
  dnfBtn.className = 'grid-card-btn grid-card-dnf';
  dnfBtn.textContent = 'dnf';
  dnfBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    doDNF(movie.tmdb_id);
    card.style.transition = 'transform 0.3s var(--ease-out), opacity 0.3s';
    card.style.transform = 'scale(0.9)';
    card.style.opacity = '0';
    setTimeout(function() { card.remove(); }, 300);
  });
  actions.appendChild(dnfBtn);

  card.appendChild(actions);
  return card;
}
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
function buildMoodQuestionsContent() { return document.createElement('div'); }
function buildShuffleCard(movie) { return document.createElement('div'); }
/* ═══ DETAIL MODAL CONTENT ═══ */
async function buildDetailModalContent(movie) {
  var frag = document.createDocumentFragment();

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
  catPill.textContent = movie.category || (movie.nano_genres && movie.nano_genres[0]) || 'horror';
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

  // 3-Option Rating
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
    ['full cast & crew', 'Director: ' + director + '\nWriters: ' + writers + '\nCast: ' + castNames],
    ['box office', 'Budget: ' + budget + '\nRevenue: ' + revenue],
    ['production', 'Producers: ' + producers + '\nRuntime: ' + runtime + ' min\nGenres: ' + genres],
    ['trivia', 'Taste Match: ' + ((movie.taste_match_score || 0) * 100).toFixed(0) + '%\nNano-genres: ' + (movie.nano_genres || []).join(', ')],
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
  title.textContent = 'your rating';
  section.appendChild(title);

  var row = document.createElement('div');
  row.className = 'rating-options';

  var currentRating = state.ratings[movie.tmdb_id] || null;

  var options = [
    { value: 'loved', label: 'loved it' },
    { value: 'ok', label: 'it was ok' },
    { value: 'not_for_me', label: 'not for me' },
  ];

  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'rating-option';
    if (currentRating === opt.value) btn.classList.add('active');
    btn.textContent = opt.label;
    btn.addEventListener('click', function() {
      setRating(movie.tmdb_id, opt.value);
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
  var wsLabels = ['want to watch', 'watching', 'watched'];

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
  title.textContent = 'where to watch';
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
    empty.textContent = 'no streaming info available';
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
  title.textContent = 'cast';
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
  title.textContent = 'ratings';
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
  title.textContent = 'letterboxd reviews';
  section.appendChild(title);

  var container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;gap:12px';

  var review5 = movie.review_5star || 'An absolute masterpiece of tension and atmosphere. Every frame is meticulously crafted.';
  var review1 = movie.review_1star || 'Overhyped and predictable. I saw every twist coming from a mile away.';

  [[review5, 'positive'], [review1, 'critical']].forEach(function(pair) {
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
    source.textContent = 'letterboxd';
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
  title.textContent = 'stills';
  section.appendChild(title);

  var grid = document.createElement('div');
  grid.className = 'stills-grid';

  stills.forEach(function(s) {
    var img = document.createElement('img');
    img.src = tmdbImg('w500', s.file_path) || '';
    img.alt = 'still';
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
  title.textContent = 'similar movies';
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

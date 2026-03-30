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
function buildGridCard(movie) { return document.createElement('div'); }
function buildGenreTile(name, count) { return document.createElement('div'); }
function buildMoodQuestionsContent() { return document.createElement('div'); }
function buildShuffleCard(movie) { return document.createElement('div'); }
function buildDetailModalContent(movie) { return Promise.resolve(document.createDocumentFragment()); }

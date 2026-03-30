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

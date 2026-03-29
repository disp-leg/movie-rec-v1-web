/* ═══════════════════════════════════════════
   data.js — TMDB service layer & data loading
   ═══════════════════════════════════════════ */

const TMDB_KEY = 'ca0f4ed18e303329a7aed8994fa5aef5';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const tmdbCache = {};

/* ─── TMDB API ─── */
async function tmdbFetch(endpoint) {
  if (tmdbCache[endpoint]) return tmdbCache[endpoint];
  try {
    const resp = await fetch(TMDB_BASE + endpoint + '?api_key=' + TMDB_KEY);
    if (!resp.ok) return null;
    const data = await resp.json();
    tmdbCache[endpoint] = data;
    return data;
  } catch { return null; }
}

function getMovieDetails(id) { return tmdbFetch('/movie/' + id); }
function getCredits(id) { return tmdbFetch('/movie/' + id + '/credits'); }
function getWatchProviders(id) { return tmdbFetch('/movie/' + id + '/watch/providers'); }
function getImages(id) { return tmdbFetch('/movie/' + id + '/images'); }
function getSimilar(id) { return tmdbFetch('/movie/' + id + '/similar'); }

/* ─── Safe TMDB image URL builder ─── */
function tmdbImg(size, path) {
  if (!path || typeof path !== 'string') return '';
  if (!/^\/[a-zA-Z0-9_\-/.]+\.(jpg|jpeg|png|webp)$/i.test(path)) return '';
  return TMDB_IMG + '/' + size + path;
}

/* ─── HTML escape for text content fallback ─── */
function esc(str) {
  if (str == null) return '';
  return String(str);
}

/* ─── Color extraction from poster ─── */
function extractColor(img) {
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 8; c.height = 12;
    ctx.drawImage(img, 0, 0, 8, 12);
    const d = ctx.getImageData(0, 0, 8, 12).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
    return 'rgba(' + Math.round(r/n) + ',' + Math.round(g/n) + ',' + Math.round(b/n) + ',0.5)';
  } catch { return 'rgba(0,0,0,0.3)'; }
}

/* ─── Mock fallback data ─── */
const MOCK_MOVIES = [
  { rank:1, taste_match_score:0.85, tmdb_id:756999, title:"The Black Phone", year:2022, overview:"A kidnapped boy starts receiving calls on a disconnected phone from the killer's previous victims.", poster_url:"https://image.tmdb.org/t/p/w500/p9ZUzCyy9wRTDuuQexkQ78R2BgF.jpg", backdrop_path:"/AfvIjhDu9p64jKcmohS4hsPG95Q.jpg", director:"Scott Derrickson", cast:["Mason Thames","Ethan Hawke","Madeleine McGraw"], runtime:103, tagline:"Never talk to strangers.", tmdb_rating:7.5, tmdb_votes:5728, streaming:[{name:"Netflix"},{name:"YouTube TV"}], nano_genres:["trap horror","captivity thriller"], category:"trap horror", review_1star:"", review_5star:"", validations:[], validated:true },
  { rank:2, taste_match_score:0.78, tmdb_id:270303, title:"It Follows", year:2015, overview:"After a strange sexual encounter, a teenager finds herself haunted by nightmarish visions and the inescapable sense that something is following her.", poster_url:"https://image.tmdb.org/t/p/w500/4MrT9IiFj0t0ynrr1KIRuHFpWG4.jpg", backdrop_path:"/r7Cv4bE4sEQ13gNFrdNtMGOPQh4.jpg", director:"David Robert Mitchell", cast:["Maika Monroe","Keir Gilchrist","Daniel Zovatto"], runtime:100, tagline:"It doesn't think. It doesn't feel. It doesn't give up.", tmdb_rating:6.6, tmdb_votes:7000, streaming:[{name:"Amazon Prime"}], nano_genres:["supernatural horror"], category:"supernatural horror", review_1star:"", review_5star:"", validations:[], validated:true },
  { rank:3, taste_match_score:0.72, tmdb_id:49018, title:"Insidious", year:2011, overview:"A family discovers dark spirits have invaded their home after their son inexplicably falls into a coma.", poster_url:"https://image.tmdb.org/t/p/w500/o37TMAsFt1WHiGMdkwakETbfRTA.jpg", backdrop_path:"/cKl1B8FTpJqeG5GDkJwnkY0YVHV.jpg", director:"James Wan", cast:["Patrick Wilson","Rose Byrne","Ty Simpkins"], runtime:103, tagline:"It's not the house that is haunted.", tmdb_rating:7.0, tmdb_votes:9000, streaming:[{name:"Netflix"}], nano_genres:["supernatural horror","possession horror"], category:"possession horror", review_1star:"", review_5star:"", validations:[], validated:true },
  { rank:4, taste_match_score:0.70, tmdb_id:520763, title:"A Quiet Place Part II", year:2021, overview:"Following the deadly events at home, the Abbott family faces the terrors of the outside world.", poster_url:"https://image.tmdb.org/t/p/w500/4q2hz2m8hubgvijz8Ez0T2Os2Yv.jpg", backdrop_path:"/dK12GIdhGP6NfGVPNuiHn3IOTsX.jpg", director:"John Krasinski", cast:["Emily Blunt","Cillian Murphy","Millicent Simmonds"], runtime:97, tagline:"Silence is not enough.", tmdb_rating:7.3, tmdb_votes:6200, streaming:[{name:"Paramount+"}], nano_genres:["creature horror","survival horror"], category:"human hunting", review_1star:"", review_5star:"", validations:[], validated:true },
  { rank:5, taste_match_score:0.68, tmdb_id:238636, title:"The Purge: Anarchy", year:2014, overview:"A couple, a mother and daughter, and a lone sergeant navigate the streets during the annual Purge.", poster_url:"https://image.tmdb.org/t/p/w500/qwqHHZLZSUvMkAMQ47ymtfjEifY.jpg", backdrop_path:"/blfZnm6StMPnTY35kaooPBCsSVp.jpg", director:"James DeMonaco", cast:["Frank Grillo","Carmen Ejogo","Zach Gilford"], runtime:103, tagline:"", tmdb_rating:6.6, tmdb_votes:6655, streaming:[{name:"USA Network"}], nano_genres:["revenge horror"], category:"revenge horror", review_1star:"", review_5star:"", validations:[], validated:true },
];

const MOCK_CATEGORIES = {
  "trap horror": [1],
  "captivity thriller": [1],
  "supernatural horror": [2],
  "possession horror": [3],
  "human hunting": [4],
  "revenge horror": [5],
};

/* ─── Load content engine JSON or fall back to mocks ─── */
async function loadMovieData() {
  try {
    const resp = await fetch('./live_recommendations.json');
    if (!resp.ok) throw new Error('not found');
    const data = await resp.json();
    return { movies: data.recommendations, categories: data.categories };
  } catch {
    console.log('Content engine JSON not found, using mock data');
    return { movies: MOCK_MOVIES, categories: MOCK_CATEGORIES };
  }
}

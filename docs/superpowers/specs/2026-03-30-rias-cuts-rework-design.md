# rias cuts -- UI Rework Design Spec

**Date:** 2026-03-30
**Project:** movie-rec-v1-web
**Location:** /tmp/movie-rec-v1-web
**Stack:** Vanilla JS + CSS (no framework), single index.html + styles.css + app.js + components.js + data.js
**Data source:** live_recommendations.json (50 movies from content engine with TMDB data)
**Font:** Outfit (Google Fonts) with system SF Pro Display fallback

---

## 1. Overview

Complete UI rework of the rias cuts web app. The current app has a 2-column poster grid home screen, a full-page detail view, category tiles, a "Liked" tab, a "Saved" tab, and a bottom tab bar (Home/Liked/Saved). The rework replaces all of this with a 6-screen architecture inspired by five reference apps: Apple TV+, Apple Invites, W1D1, Aiby, and Ahead.

### What Changes

- Home screen becomes an Aiby-style hub with 5 navigation tiles
- Grid view replaces the current 2-column showcase feed (Ahead-style with action buttons on cards)
- Detail view becomes a centered modal with background blur (keeps existing content) plus a new 3-option rating
- New nano genre picker screen (Aiby-style grid)
- New mood questions screen (personality-driven filtering)
- New shuffle screen (Apple Invites-style immersive single card)
- "Liked" concept removed entirely -- replaced by 3-option rating on detail view
- Bottom tab bar removed
- No emojis anywhere

### What Stays

- Branding: "rias cuts" all lowercase, no apostrophe, no period
- Dark cinematic theme (#0a0a0a background, sunset photo behind)
- Font: Outfit + SF Pro Display fallback
- Data layer: data.js, TMDB API integration, live_recommendations.json loading
- Existing detail view content sections (overview, cast, streaming, ratings, reviews, stills, similar, expandables)
- Vanilla JS + CSS stack (no framework migration)
- Real streaming logos (TMDB logo_path), never text

---

## 2. Screen Definitions

### Screen 1 -- HOME (Aiby style)

**Purpose:** Central hub. Everything connects back here.

**Layout:**
- "rias cuts" title at top (existing showcase-header brand treatment)
- "Explore" heading below the title
- 5 navigation tiles in a grid, same card shape, different icons and labels:
  1. **Latest Releases** -- filtered from engine data by recent release years
  2. **Nano Genres** -- opens the nano genre picker (Screen 3)
  3. **Shuffle** -- opens the shuffle screen (Screen 5)
  4. **All** -- shows all 50 movies in the Ahead-style grid (Screen 2)
  5. **Saved** -- shows watchlist (movies the user has "Added")

**Design:**
- Clean 2-column grid for tiles (Aiby reference)
- Soft rounded corners (20px, matching existing --radius-card)
- Each tile: icon + title + subtitle
- Dark background with existing sunset photo treatment
- No emojis -- use simple SVG icons for each tile
- No bottom tab bar

**Replaces:** Current home-view (showcase-feed grid), tab-bar, liked-view, categories-view

### Screen 2 -- AHEAD-STYLE GRID

**Purpose:** Display a collection of movie poster cards. Used by Latest Releases, All, and nano genre results after mood filtering.

**Layout:**
- Back button (top left) returning to previous screen
- Title header showing context (e.g., "Latest Releases", "All", or "[genre name]")
- 2-column poster card grid
- Each card shows: poster image, Add button, DNF button (visible on card)
- Tap a card body (not the buttons) opens detail modal (Screen 6)

**Design:**
- Poster-dominant cards, generous rounded corners (20px)
- Bold CTAs on cards (Ahead reference -- color separation for Add vs DNF)
- Add button: accent color, adds to watchlist
- DNF button: muted/destructive color, nuclear delete from everything
- Minimal text on cards -- let poster visuals speak
- Scrollable grid

**Data filtering:**
- "Latest Releases": filter movies where year >= current_year - 2 (2024+)
- "All": all movies from the dataset, no filter
- Nano genre results: movies matching selected genre, further filtered by mood answers

**Replaces:** Current showcase-feed (home grid), collection-grid views

### Screen 3 -- NANO GENRE PICKER (Aiby style)

**Purpose:** Let the user browse and select a nano genre before mood filtering.

**Layout:**
- Back button returning to Home
- "Nano Genres" heading
- Grid of nano genre tiles (same card shape as home tiles)
- Each tile shows the genre name and movie count
- Tap a genre tile opens the mood questions screen (Screen 4), passing the selected genre

**Design:**
- Same 2-column grid layout and card shape as the home tiles
- Consistent rounded corners and dark card backgrounds
- No emojis (current CATEGORY_EMOJIS map is removed)

**Data:** Genres come from the categories object in the loaded movie data. Each key is a nano genre name, each value is an array of movie ranks in that genre.

### Screen 4 -- MOOD QUESTIONS

**Purpose:** Personality-driven filtering within a selected nano genre. Creates a more curated result set.

**Layout:**
- Back button returning to Nano Genre Picker
- Genre name as heading
- All questions displayed on one screen (not multi-step)
- 3 questions with personality-driven labels:
  - "How demented?" (intensity level)
  - "Gore level?" (violence tolerance)
  - "Real or supernatural?" (grounding preference)
- Each question has 3 tap-to-select options
- Submit button at bottom
- After submit: brief loading animation, then navigate to Ahead-style grid (Screen 2) filtered by genre + mood

**Design:**
- Question text in larger font weight (600+)
- Options as pill-shaped buttons, tap to select (one per question)
- Selected option gets accent highlight
- Loading state: short animation (spinner or skeleton) before showing results
- Dark background consistent with rest of app

**Filtering logic:** The mood answers are used to sort/filter the genre's movies. Exact scoring algorithm is implementation-level (node PM decides), but the questions map to metadata in the movie data (intensity indicators from nano_genres, overview text analysis, or taste_match_score weighting).

### Screen 5 -- SHUFFLE (Apple Invites style)

**Purpose:** Random discovery. Single immersive card showing one movie at a time.

**Layout:**
- Single poster card filling most of the screen (full-bleed imagery, Apple Invites reference)
- Add button on the card (save to watchlist)
- DNF button on the card (nuclear delete, never show again)
- Reshuffle button (shows a new random film from the pool)
- Exit button (back to Home)
- Tap the poster area opens detail view (flip animation or slide-up from bottom)

**Design:**
- Immersive, poster-dominant (Apple Invites reference)
- Frosted glass info section at bottom of card (title, year, genre) over the poster
- Card depth and layering (W1D1 reference)
- Dark background, card centered
- Reshuffle animates the card out and brings a new one in

**Data:** Random selection from all movies. DNF'd movies are excluded from the shuffle pool for the session.

### Screen 6 -- DETAIL VIEW (Modal)

**Purpose:** Full movie details. Reuses existing detail content with new presentation.

**Presentation depends on entry point:**
- From grid (Screen 2): pops up as a centered modal, background blurs behind it
- From shuffle (Screen 5): flips or slides up from bottom

**Content (keep existing, no changes):**
- Hero image (backdrop)
- Floating action card (title, category, year, TMDB score, tagline)
- Overview text
- Watch status control
- Where to Watch (streaming logos)
- Cast section
- Ratings row
- Reviews (Letterboxd)
- Stills gallery
- Expandable detail cells (cast/crew, box office, production, trivia)
- Similar movies shelf

**New additions:**
- 3-option rating replaces the current star rating and like/dislike buttons:
  - "Loved it"
  - "It was ok"
  - "Not for me"
- Rating feeds algorithm (stored in state, used for future sorting/filtering)
- Easy dismiss: X button in top-right corner, or tap outside the modal area (grid entry), or swipe down (shuffle entry)

**Removed from detail:**
- Star rating widget (1-5 stars) -- replaced by 3-option rating
- Like/Dislike action buttons -- replaced by 3-option rating
- Save action button on detail -- Add/Save happens on the card in grid/shuffle, not in detail

---

## 3. Actions Model

### Add (Save to watchlist)
- Available on: grid cards (Screen 2), shuffle card (Screen 5)
- Behavior: saves movie to the "Saved" collection, accessible from Home tile #5
- Visual: button state toggles to show saved status
- Stored in: state.actionStates[tmdb_id].saved

### DNF (Did Not Finish / Nuclear Delete)
- Available on: grid cards (Screen 2), shuffle card (Screen 5)
- Behavior: removes movie from ALL views. Feeds algo as "never show again."
- The movie is filtered out of every grid, shuffle pool, and genre result for the session.
- Stored in: state.actionStates[tmdb_id].dnf (new property)

### 3-Option Rating
- Available on: detail view only (Screen 6)
- Options: "Loved it" / "It was ok" / "Not for me"
- Behavior: stores user sentiment. Feeds algorithm for future recommendations.
- Stored in: state.ratings[tmdb_id] with values: 'loved' | 'ok' | 'not_for_me'

### Removed Actions
- "Liked" concept is removed entirely. No more liked collection, liked tab, or heart icon.
- Star ratings (1-5) removed. Replaced by the 3-option rating.
- Like/Dislike buttons on detail view removed. Replaced by 3-option rating.

---

## 4. Navigation Model

```
HOME
  |-- Latest Releases --> GRID (filtered)
  |       |-- tap card --> DETAIL MODAL
  |
  |-- Nano Genres --> GENRE PICKER
  |       |-- tap genre --> MOOD QUESTIONS
  |               |-- submit --> GRID (filtered by genre + mood)
  |                       |-- tap card --> DETAIL MODAL
  |
  |-- Shuffle --> SHUFFLE SCREEN
  |       |-- tap poster --> DETAIL (flip/slide)
  |
  |-- All --> GRID (all movies)
  |       |-- tap card --> DETAIL MODAL
  |
  |-- Saved --> GRID (saved movies only)
          |-- tap card --> DETAIL MODAL
```

- Every screen has a back button returning to its parent
- Detail modal dismisses back to whatever opened it
- No bottom tab bar -- Home is the only hub
- No horizontal swipe navigation between top-level screens

---

## 5. Design System

### Colors
- Background: #0a0a0a (existing)
- Card background: rgba(255,255,255,0.06) (existing --bg-card)
- Glass effect: rgba(255,255,255,0.08) (existing --bg-glass)
- Glass border: rgba(255,255,255,0.1) (existing --border-glass)
- Primary text: #f5f5f5 (existing)
- Secondary text: #a1a1aa (existing)
- Tertiary text: #52525b (existing)
- Accent blue: #3b82f6 (existing, for Add buttons)
- Accent green: #22c55e (existing)
- Accent amber: #f59e0b (existing)
- DNF/destructive: muted red (new, suggest #ef4444 at 60% opacity or similar)

### Typography
- Font: Outfit (400, 500, 600, 700) with SF Pro Display fallback
- Title sizes: follow existing hierarchy
- No emojis anywhere in the UI

### Card Treatment
- Border radius: 20px (existing --radius-card)
- Poster-dominant: minimal text overlay
- Frosted glass info sections where needed (backdrop-filter: blur)
- Card depth via subtle shadows on dark backgrounds
- Real streaming service logos from TMDB logo_path

### Animations (implementation tools)
- GSAP (via mcp__gsap-mcp): screen transitions, card reveals, loading animations, scroll-driven effects
- Motion.dev (via Motion MCP): spring physics, layout transitions, gestures (card flips, modal pop-ups, swipe)
- Reactbits (via mcp__reactbits): check for reusable animated component patterns

### Patterns from Refero Research
- Poster-dominant / full-bleed imagery
- Frosted glass info sections over dark backgrounds
- Card depth and layering
- Generous rounded corners (20px)
- Minimal text on cards
- Dark cinematic theme

---

## 6. Data Architecture

### Existing (no changes)
- data.js: TMDB API layer, cache, image URL builder, color extraction, loadMovieData()
- live_recommendations.json: 50 movies with full TMDB metadata, nano_genres, categories
- Movie object shape: { rank, taste_match_score, tmdb_id, title, year, overview, poster_url, backdrop_path, director, cast, runtime, tagline, tmdb_rating, tmdb_votes, streaming, nano_genres, category, review_1star, review_5star, validations }

### State Changes
- Remove: state.starRatings (replaced by state.ratings)
- Remove: state.actionStates[id].liked (liked concept removed)
- Add: state.actionStates[id].dnf (boolean, nuclear delete)
- Add: state.ratings[id] ('loved' | 'ok' | 'not_for_me')
- Remove: state.currentIndex (no more single-tile home navigation)
- Remove: state.categoryStack (replaced by genre picker + mood flow)
- Add: state.currentGenre (selected nano genre name)
- Add: state.moodAnswers (object with mood question responses)
- Modify: state.currentView to match new screen set

### Filtering Functions (new)
- getLatestReleases(): filter movies by year >= 2024
- getMoviesByGenre(genreName): filter by category/nano_genres matching
- filterByMood(movies, moodAnswers): sort/score movies based on mood responses
- getShufflePool(): all movies minus DNF'd ones
- getSavedMovies(): movies where state.actionStates[id].saved === true
- isDNF(tmdbId): check if movie is DNF'd

---

## 7. Files to Modify

### index.html
- Remove: liked-view, saved-view sections, categories-view, category-stack-view
- Remove: tab-bar (entire bottom nav)
- Add: grid-view section, genre-picker-view, mood-questions-view, shuffle-view
- Modify: home-view structure (replace showcase-feed with tile grid)
- Modify: detail-view to support modal presentation

### styles.css
- Remove: tab-bar styles, liked/saved collection styles, category styles, showcase-feed card styles, star-rating styles, tile-3d/tilt styles
- Add: home tile grid styles, grid-view card styles, genre picker styles, mood question styles, shuffle screen styles, modal overlay + blur styles, 3-option rating styles
- Modify: detail-view for modal presentation (centered, max-width, border-radius, backdrop blur)

### components.js
- Remove: createTile(), updateTilePoster(), buildCategoryStackView(), renderCategories(), buildStarRating(), buildActionButtons() (like/dislike/save), CATEGORY_EMOJIS
- Add: buildHomeTiles(), buildGridView(movies, title), buildGenrePicker(), buildMoodQuestions(genre), buildShuffleView(), buildDetailModal(movie), buildRatingWidget(movie), buildGridCard(movie)
- Modify: buildDetailView() to use modal wrapper and 3-option rating instead of stars/actions

### app.js
- Remove: tab navigation (switchTab, tab event listeners), showcase feed logic (buildShowcase, createCardIcon, createWatchedIcon), tile navigation (navigateTile, navigateCategoryTile, setupTiltInteraction, setupCardDrag, setupTileGestures), category stack logic, collection rendering (renderCollection)
- Add: home tile tap handlers, grid view navigation, genre picker navigation, mood question logic + submit handler, shuffle logic (random pick, reshuffle, DNF exclusion), modal open/close with blur, 3-option rating handler, DNF handler
- Modify: switchView() for new view set, state initialization, init() function, keyboard navigation

### data.js
- No structural changes. Filtering functions can live in app.js or a new filters.js.

---

## 8. Deferred to Finalization (Do Not Implement)

These items are noted for future work but are explicitly out of scope for this build:

1. **localStorage persistence** -- saves, DNF list, and ratings do not persist across browser sessions. All state is in-memory only.
2. **DNF blocklist integration with content engine** -- DNF'd movies are only filtered client-side for the current session. No server-side or engine-level blocklist.
3. **Refresh/new batch logic** -- when the user runs low on movies (e.g., DNF'd most of them), a prompt should appear asking if they want to load a fresh batch. This is deferred. For now, the pool is fixed at whatever live_recommendations.json provides.

---

## 9. Build Approach

- Git branch per screen
- Build one screen at a time
- Operator (Ria) approves each screen before moving to next
- No emojis ever
- "rias cuts" all lowercase, no apostrophe, no period
- No particles/PrismDots in backgrounds
- Real streaming logos (TMDB logo_path), never text placeholders
- Use refero-design skill to research reference screens before building each screen
- Use mcp__gsap-mcp for GSAP animations
- Use Motion MCP for spring/gesture animations
- Use mcp__reactbits to check for reusable component patterns
- Use mcp__refero to search for reference screens

---

## 10. Build Order

1. **Home screen** -- the hub everything connects to. Foundation for all navigation.
2. **Ahead-style grid** -- most reused component (Latest Releases, All, genre results, Saved all use it).
3. **Detail modal** -- existing content with new modal treatment + 3-option rating. Wired to grid.
4. **Nano genre picker** -- grid of genre tiles, navigates to mood questions.
5. **Mood questions** -- filtering UI, submits to grid with filtered results.
6. **Shuffle** -- immersive single-card experience, last because it's the most standalone.

---

## 11. Acceptance Criteria

- [ ] Home screen shows 5 tiles, tapping each navigates to the correct destination
- [ ] Grid view displays poster cards with visible Add/DNF buttons
- [ ] Tapping a grid card opens a centered detail modal with background blur
- [ ] Detail modal shows existing content plus 3-option rating (no stars, no like/dislike)
- [ ] Modal dismisses via X button or tapping outside
- [ ] Nano genre picker shows all genres from the data as tiles
- [ ] Tapping a genre opens mood questions, submitting shows filtered grid results
- [ ] Shuffle shows one random movie immersively with Add/DNF/Reshuffle/Exit
- [ ] Tapping shuffle poster opens detail (flip or slide-up)
- [ ] DNF removes a movie from all views for the session
- [ ] Add saves to watchlist, viewable from Home "Saved" tile
- [ ] No emojis anywhere in the UI
- [ ] No particles or PrismDots
- [ ] Real streaming logos on all provider displays
- [ ] "rias cuts" branding correct everywhere
- [ ] All screens have back navigation to their parent
- [ ] Dark cinematic theme maintained throughout

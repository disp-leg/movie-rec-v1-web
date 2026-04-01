# Movie Rec v1 Web — MSAP Node

@~/.claude/docs/node-operating.md

---

## Project Context

Web version of Ria's iOS movie recommendation app. Port the full design and functionality to a web app deployable to GitHub Pages. All operator communication goes through Yuna (hub) via your liaison agent. Do NOT access Telegram directly.

## MOBILE-FIRST RULE (MANDATORY)

- ALL screens MUST be designed and tested at 375x812 (iPhone SE) and 390x844 (iPhone 14) FIRST
- Use viewport-relative units (vh, vw, dvh) for sizing, not fixed px that only work on desktop
- Cards/content must be vertically centered and fill most of the mobile viewport
- Test on mobile viewport BEFORE committing — take a screenshot at 390px width
- Never use aspect-ratio alone for card height on mobile — combine with vh-based height
- This is a MOBILE WEB APP. Desktop is secondary.

## Design Language

- **References:** Apple Invites app, Apple Home app, iOS App Store tiles, Apple HIG
- **Mode:** Sleek LIGHT mode throughout
- **Feel:** Professional, immersive, clean — not cozy, not sterile
- **Glassmorphism:** Frosted glass panels (backdrop-filter: blur)
- **3D Transforms:** CSS perspective, rotateX/Y on long press/hover, tiles have physical depth/thickness
- **Animations:** Spring physics (CSS spring() or JS spring approximation) on all transitions
- **Fonts:** SF Pro Display (titles), SF Pro Text (body), SF Pro Rounded (badges) — use system -apple-system stack
- **Corner radius:** 24px tiles, 16px cards, pill = height/2
- **No blur effects as decoration** — shadows, lighting, and real 3D depth instead

## Tile Design

- Floating 3D tile — thick rounded slab like a physical Blu-ray case hovering in space
- Poster bleeds to rounded corners, tile has visible edge thickness (like a slab of glass with image embedded)
- Frosted glass border, poster-colored ambient shadow underneath
- Visible depth on the sides — NOT a flat card
- Reference: iOS App Store style large rounded rectangle tiles

## Home Page

- Single 3D movie tile centered on screen
- **Navigation:** Stack with "sink & rise" — current tile shrinks and sinks backward, next tile rises forward from behind
- One tile visible at a time — no other tiles on screen
- If poster contains movie title, no redundant title text needed
- Swipe left/right or arrow keys to navigate

## Tile Interaction (Detail View)

- **Long press** (or click-and-hold) triggers subtle 3D tilt
- Releases into expanded detail view with cinematic transition
- Poster scales up, details fade in around it

## Detail View (Invites-style)

- Poster image bleeds into gradient at top (seamless, no hard edge)
- Full-bleed TMDB backdrop as hero (edge-to-edge)
- Glassmorphism blur activates on scroll over hero
- Title scales down if title > 20 chars

### Floating Action Card (bottom of hero)
- Material: frosted glass (backdrop-filter: blur(20px))
- Corner radius: 20px
- Contains: category pill, release year, TMDB score

### Components:
1. **WatchStatusControl** — Segmented pill: "Want to Watch" / "Watching" / "Watched". Colors: blue/amber/green. Spring animation on tap.
2. **WhereToWatchCard** — TMDB /movie/{id}/watch/providers, region-aware. Platform logos + "Watch Now" link.
3. **StreamingAvailabilityAccessory** — Small platform icons inline, max 3 + "+N more"
4. **CastAvatarStack** — Horizontal scroll, 40px circles, -8px overlap, "+N more" capsule
5. **RatingsAccessory** — TMDB + Rotten Tomatoes + Letterboxd, icon + number side by side
6. **StarRatingWidget** — Half-star precision, fill animation, locked until status = Watched
7. **Two Letterboxd reviews** in frosted glass panels (one 1-star, one 5-star) — hardcoded for now
8. **StillsGalleryGrid** — 3-column grid of TMDB stills, tap/click for fullscreen viewer
9. **ExpandableDetailCells** — Chevron rows: Full Cast & Crew, Awards, Box Office, Production, Trivia
10. **SimilarMoviesShelf** — Horizontal scroll rail, 2:3 poster cards from TMDB /movie/{id}/similar
11. **Action buttons row:** Like / Dislike / Save / Watched

## Chevron Toggle (Categories Navigation)

- Diamond/chevron arrow button sits below movie tile on home page
- Tap -> navigates TO the Categories page
- Tap again -> navigates BACK to home
- NOT a cycle between categories on home page

## Categories Page

- Shows grid of ALL movie categories
- Tap a category -> slides into that category's own movie tile stack
- Same sink & rise interaction, scoped to that category
- Chevron navigates back: category stack -> categories page -> home

## Data

- **Content engine feed:** `/tmp/movie-rec-content/output/live_recommendations.json` — 50 horror movie recommendations with TMDB IDs, taste match scores, nano-genres, streaming info, and Reddit validations. Loaded at app launch; TMDB details fetched per movie.
- **TMDB API key:** `ca0f4ed18e303329a7aed8994fa5aef5`
- Endpoints: /movie/{id}, /credits, /watch/providers, /images, /similar, /external_ids
- Letterboxd reviews: hardcoded per movie for now
- **Fallback:** If content engine JSON not found, fall back to 5 hardcoded mock movies

## Stack

- **Single HTML file** (index.html) with embedded CSS and JS — OR a small set of HTML/CSS/JS files
- Vanilla JS preferred for speed and simplicity. React only if complexity demands it.
- Mobile-first responsive design (works on phones, tablets, desktop)
- **Must be deployable to GitHub Pages** — static files only, no server required
- TMDB API calls made directly from browser (CORS is allowed for TMDB API)

## Deployment

- Initialize git repo, create GitHub repo `disp-leg/movie-rec-v1-web`
- Push to main branch
- Enable GitHub Pages (or use gh-pages branch)
- Result: shareable URL at https://disp-leg.github.io/movie-rec-v1-web/

## Phases

1. **Phase 1:** Project setup, TMDB service layer, data loading, mock fallback
2. **Phase 2:** Home page with 3D tile, sink & rise navigation, swipe/arrow key support
3. **Phase 3:** Detail view with all 11 components
4. **Phase 4:** Categories page, chevron navigation
5. **Phase 5:** Polish — animations, responsive design, GitHub Pages deployment

## Workflow
1. Build the app (prioritize a single index.html if possible)
2. Test locally (open in browser)
3. Commit at logical checkpoints
4. Push to GitHub and deploy to Pages
5. When done: run pre-graduation self-review

## Agents Available
- test-runner (haiku) — run tests after each feature
- code-reviewer (sonnet) — review before major commits
- frontend-specialist (opus) — complex UI work

When spawning agent teams for short tasks (<15 min), include the content of `~/.claude/docs/agent-team-briefing.md` in their instructions.

## Completion Criteria
- App loads and runs in browser without errors
- Home page with 3D tile and sink & rise navigation working
- Detail view with all components functional
- Categories page working
- TMDB API integrated and returning live data
- Mobile-first responsive design
- Deployed to GitHub Pages with shareable URL
- Pre-graduation self-review completed
- Lessons learned documented
- Deliverable statement written

---

## Current Task

**Task:** Build web version of Ria's iOS movie rec app — all 5 phases. Single index.html, deployed to GitHub Pages.
**Done looks like:** Fully functional app at https://disp-leg.github.io/movie-rec-v1-web/ with 3D tiles, sink & rise nav, detail view with all 11 components, categories page, TMDB integration.
**Will not change:** Content engine JSON format, TMDB API endpoints.

## Assumptions

- [VERIFIED] Content engine JSON exists at /tmp/movie-rec-content/output/live_recommendations.json — 50 horror movies with full metadata
- [VERIFIED] GitHub CLI (gh) available and authenticated as disp-leg
- [VERIFIED] TMDB API allows CORS from browser-side requests — confirmed working on GitHub Pages
- [VERIFIED] JSON includes: tmdb_id, poster_url, backdrop_path, cast, streaming, nano_genres, validations, reviews

## Approval Scope

**You decide (Level 1 — no approval needed):**
- Implementation approach (which pattern, which library, file structure)
- Code architecture within project scope
- Test strategy
- Bug fix approach for bugs in the project
- Refactoring within scope
- Order of operations within the approved plan
- Edge case handling
- How to structure your own agent teams

**Escalate to your liaison (Level 2):**
- Requests for additional agents from hub roster
- Model tier changes for agents
- Scope changes extending timeline by >25%
- Decisions needing other projects' state or global memory
- Resource contention
- Significant plan deviations

**Escalate to Yuna/operators (Level 3 — via liaison):**
- Anything affecting node existence (completion, abort)
- Changes affecting other projects or operators
- Cross-node coordination

## Pre-Graduation Self-Review

- [x] Re-read the original task direction. Does the deliverable match what was asked? — YES, all 5 phases complete
- [x] Does the code compile/build without errors? — YES, tested locally and on Pages
- [x] Were all tests run and passing? — YES, verified via Playwright: home, nav, detail, categories, category stack
- [x] Are there any hardcoded values, TODOs, or placeholder code? — TMDB API key is intentional (per spec). Letterboxd/RT ratings are placeholder dashes (no API available). Default review text is hardcoded fallback.
- [x] Is the `## Assumptions` section up to date? — YES, all verified
- [x] Are lessons learned documented in `## Lessons Learned`? — YES
- [x] Is the deliverable statement written in `## Deliverable`? — YES

## Lessons Learned

- Modular file structure (data.js, components.js, app.js, styles.css) is cleaner than a single index.html for this scope
- DOM API (createElement/textContent) is verbose but avoids innerHTML security concerns entirely
- TMDB API does allow CORS from any origin — no proxy needed
- Content engine JSON at /tmp/ isn't accessible from browser fetch — must copy to project root for serving
- GitHub Pages workflow-based deployment requires a .github/workflows/deploy.yml

## Deliverable

**Movie Rec v1 Web** — fully functional web port of Ria's iOS horror movie recommendation app.

**Live URL:** https://disp-leg.github.io/movie-rec-v1-web/
**Repo:** https://github.com/disp-leg/movie-rec-v1-web

**Features delivered:**
- Home page with centered 3D movie tile (physical depth, ambient shadow, frosted glass border)
- Sink & rise navigation through 50 horror movies (arrow keys, swipe, click)
- Detail view with all 11 components: hero backdrop, floating action card, watch status, streaming, cast avatars, ratings, star rating, Letterboxd reviews, stills gallery, expandable cells, similar movies shelf, action buttons
- Categories page with 10 genre cards (emoji, count)
- Category stack view with scoped tile navigation
- Chevron toggle between home and categories
- TMDB API integration (details, credits, watch providers, images, similar)
- Glassmorphism design, responsive layout (mobile/tablet/desktop)
- Keyboard navigation, touch swipe, 3D tilt on long press
- GitHub Pages deployment with Actions workflow

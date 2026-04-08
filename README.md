# Rias Cuts

Ria's movie recommendation web app — a port of the iOS concept. 50 curated horror films with immersive 3D tile navigation, full TMDB integration, and glassmorphism UI. Deployed to GitHub Pages.

**Live:** https://disp-leg.github.io/movie-rec-v1-web/

## Structure

```
riascut-app/
├── index.html                     # App shell — views, loading screen, fullscreen viewer
├── app.js                         # Routing, state management, view switching
├── components.js                  # UI components — SVG icons, DOM-based widgets
├── data.js                        # TMDB service layer, API calls, data loading
├── styles.css                     # Full stylesheet — glassmorphism, 3D, spring animations
├── live_recommendations.json      # 50 horror movies from content engine pipeline
└── CLAUDE.md                      # Agent build instructions
```

## Features

- **3D movie tiles** — thick rounded slabs with poster bleed, frosted glass border, ambient shadow, visible edge depth
- **Sink and rise navigation** — current tile shrinks and sinks backward, next tile rises forward. Swipe, arrow keys, or click.
- **Detail view** — full-bleed TMDB backdrop, glassmorphism blur on scroll, 11 components:
  - Floating action card (category pill, year, TMDB score)
  - Watch status control (Want to Watch / Watching / Watched)
  - Where to watch (TMDB providers, region-aware)
  - Cast avatar stack (horizontal scroll, overlap)
  - Ratings accessory (TMDB + Rotten Tomatoes + Letterboxd)
  - Star rating widget (half-star precision, locked until Watched)
  - Letterboxd review panels (1-star and 5-star, frosted glass)
  - Stills gallery grid (3-column, fullscreen viewer on tap)
  - Expandable detail cells (cast, awards, box office, trivia)
  - Similar movies shelf (horizontal scroll, TMDB similar)
  - Action buttons (like, dislike, save, watched)
- **Categories page** — 10 genre cards with emoji and count, tap into scoped tile stack
- **Chevron toggle** — home to categories and back
- **3D tilt** — long press triggers perspective rotation

## Design

- **Aesthetic:** Apple Invites / Apple Home / iOS App Store
- **Mode:** Dark (#141414)
- **Typography:** SF Pro system stack + Outfit (Google Fonts)
- **Palette:** #f5f5f5 primary, #3b82f6 accent blue, #22c55e green, #f59e0b amber
- **Glassmorphism:** backdrop-filter blur, rgba surfaces, frosted borders
- **Animation:** Spring physics (cubic-bezier), 3D transforms with perspective
- **Radii:** 24px tiles, 20px cards, pill = height/2

## Tech

- Vanilla JS — no frameworks, DOM API only
- TMDB API (details, credits, watch/providers, images, similar)
- CSS 3D transforms + spring-based transitions
- Mobile-first responsive (phone, tablet, desktop)
- Static deploy — GitHub Pages via Actions workflow

## Data

Movies sourced from a content engine pipeline — 50 horror recommendations with TMDB IDs, taste match scores, nano-genres, streaming info, and Reddit validations. Stored in live_recommendations.json.

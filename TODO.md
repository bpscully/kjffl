# Project Plan & Todo List

## Phase 1: Foundation & Quality Assurance
- [x] Install and configure **Vitest** (Unit Tests)
- [x] Install and configure **Playwright** (E2E Tests)
- [x] Set up directory structure for components (`src/components/ui`, `src/components/features`)

## Phase 2: The Data Layer (Solving the "Search" Problem)
- [x] Refine `espn-api.ts` to fetch *only* essential identity data for the index
- [x] Create a script/route to generate `players-index.json`
- [x] Implement the **Player Search Component** with look-ahead (autocomplete)
- [x] **Refinement:** Added intelligent position filtering (QB/RB/WR/TE/K/DST) and storage abstraction.

## Phase 3: Roster Management (Frontend Core)
- [x] Create the **Player Card** component (Visual design)
- [x] Implement `useRoster` hook (State management with `localStorage`)
- [x] Build the "Starting Lineup" vs "Bench" UI

## Phase 4: The Scoring Engine (Backend Core)
- [x] Implement `lib/scoring_engine.ts`: A pure function that takes `ESPNBoxscore` -> `FantasyPoints`
- [x] Write robust unit tests for `scoring_rules.ts` (Edge cases are critical)
- [x] Create the `/api/scores` endpoint to serve calculated scores for a list of Player IDs

## Phase 5: Integration & Live View
- [x] Wire up the Roster view to fetch scores from `/api/scores`
- [x] Implement Season/Week selectors
- [x] Add "Live" indicators (Game Clock, Opponent)
- [x] **New:** Added roster point totals and expandable breakdown.

## Phase 6: Deployment & Handover (Next)
- [x] **Refinement:** Switched to Next.js ISR for Player Index (No DB, Auto-Updates).
- [ ] Push code to a new GitHub repository
- [ ] Deploy to Vercel
- [x] Configure automatic player index refreshes (Handled via ISR)

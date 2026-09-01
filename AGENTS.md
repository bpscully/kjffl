# KJ's FFL Scores

## Project overview

KJ's FFL Scores is a responsive, single-user fantasy football scoring dashboard. A user selects an NFL season and week, maintains a starting lineup and bench, and sees custom KJFFL points calculated from ESPN data. The application is deployed on Vercel and does not use a database.

The active application lives in `app/` and uses Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui components.

## Current product behavior

- The roster is split into Starting Lineup and Bench and persists in browser `localStorage`.
- Player search uses a server-cached ESPN player index and includes individual players, kickers, and D/ST entries.
- Player cards show custom scores, opponent, Pacific game date/time or status, scoring details, and recent player updates.
- Player updates come from ESPN's league injuries/status feed. A true injury designation changes the card icon; other recent notes remain useful updates. Status-only comments are filtered, and stale notes older than one month are excluded.
- Upset Special picks persist per season, season type, and week in `localStorage`. A valid pick scores automatically on load, after a team/spread change, and on the main refresh action. Points are awarded only after the game is final.
- The weekly total includes Starting Lineup, Upset Special, and Over/Under points, excludes Bench points, and expands to a concise copyable audit.
- Over/Under picks persist per season, season type, and week in `localStorage`. A user can make either a game-total Over/Under call or a one-team scoring pick, with a manually entered line. Points score automatically only after the game is final and contribute to the weekly total.

## Architecture and data flow

- `app/src/app/page.tsx` owns the selected season/week, player score results, and weekly score aggregation.
- `app/src/components/features/` contains the player search/cards, Upset Special editor, and weekly score summary.
- `app/src/hooks/` contains browser-persisted roster/pick state and client-side score/update fetching.
- `app/src/app/api/` is the backend-for-frontend layer over ESPN. Routes cover player search, player scores, player updates, weekly events, Upset Special scoring, and Over/Under scoring.
- `app/src/lib/espn-api.ts` centralizes ESPN requests and uses `fetchWithRetry`.
- `app/src/lib/player-service.ts` caches the player index for 24 hours with Next.js `unstable_cache`.
- `app/src/lib/player-updates-service.ts` normalizes and caches the ESPN status feed for five minutes.
- `app/src/lib/scoring-engine.ts` converts ESPN game summaries into itemized score results.
- `app/lib/scoring_rules.ts` is the executable authority for KJFFL point values. Preserve its distinction from conventional fantasy scoring.

Player, Upset Special, and Over/Under scores use separate API endpoints because their formulas and inputs differ, but all are page-level weekly scoring entries. The weekly summary accepts generic scoring sections so future score categories can be added without redesigning it.

## Development commands

Run commands from `app/`:

```bash
npm run dev
npm test -- --run
npm run lint
npm run build
```

Vitest covers units, hooks, API routes, and components. Playwright is configured for end-to-end tests. Add or update focused tests when behavior changes, then run tests and lint; run a production build for meaningful integration changes.

## Working conventions

- Preserve user work in a dirty worktree and do not commit unless explicitly asked.
- Keep mobile behavior first-class; prefer inline expansions over overlays that can exceed a phone viewport.
- Keep score ownership at the weekly/page layer and presentation in feature components.
- Do not award outcome-based points before the applicable game is final.
- Display user-facing NFL dates and times in Pacific time unless the user requests otherwise.
- Reuse existing scoring result/detail types and shadcn/ui primitives where practical.
- Treat `espn_api_notes.md` as general ESPN implementation background, not as KJFFL scoring authority.

## Research workflow

Draft research, historical scoring analysis, and draft-day handoff materials live under `research/`. Read `research/RESEARCH_CONTEXT.md` before doing research or player analysis. The research directory is intentionally separate from application work and may be untracked; do not modify or add it to Git unless the user places it in scope.

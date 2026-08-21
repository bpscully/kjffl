# ESPN NFL Data APIs: Practical Retrieval Guide

Last updated August 21, 2026.

## Purpose and scope

This document explains how to retrieve useful NFL data from ESPN's public-facing APIs. 

ESPN does not officially document or guarantee these endpoints. Treat every response as an observed shape rather than a permanent contract. Use the APIs read-only, tolerate missing fields, limit concurrency, retry transient failures, and cache where appropriate.


## Endpoint families

ESPN exposes two useful but structurally different API families:

```text
Core API
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl

Site API
https://site.api.espn.com/apis/site/v2/sports/football/nfl
```

- The Core API is reference-oriented. Collection responses often contain `items` whose useful value is a `$ref` URL that must be fetched separately.
- The Site API is presentation-oriented. Its roster, scoreboard, summary, and injury responses tend to embed the objects needed by ESPN's site.
- Do not apply a schema observed on one family to the other.
- Follow `$ref` links when the collection only returns references; do not resolve references that are unnecessary for the desired result.

### Verification status

| Data | Endpoint family | Status in this project |
| --- | --- | --- |
| Teams | Core | Production verified |
| Current team rosters | Site | Production and research verified |
| Weekly event discovery | Core | Production verified |
| Game summary and boxscore | Site | Production and research verified |
| League injuries and player notes | Site | Production verified |
| Historical scoreboards | Site | Research verified for 2023-2025 |
| Core athlete enumeration | Core | Known pattern; not the current indexing path |
| Standalone Core boxscore | Core | Known pattern; not used by current workflows |
| Season statistics | Core | Not recently verified |
| Depth charts | Core/Site | Not recently verified |
| Event odds | Core | Not recently verified |

## 1. Get NFL teams

### List teams

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams?limit=100
```

The collection is typically reference-based:

```json
{
  "items": [
    { "$ref": "https://sports.core.api.espn.com/.../teams/12?..." }
  ],
  "next": { "$ref": "..." }
}
```

Follow each required `items[*].$ref`. If `next.$ref` exists, continue until there is no next page.

Useful resolved fields include:

```json
{
  "id": "12",
  "name": "Kansas City Chiefs",
  "abbreviation": "KC",
  "logos": [
    { "href": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" }
  ]
}
```

Normalize all IDs to strings. Team IDs are useful for joining rosters, weekly events, summaries, and injury groups.

## 2. Get current players and build a search index

### Recommended current-roster flow

First list and resolve teams, then request each team's Site API roster:

```http
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/roster
```

The response embeds athletes in groups such as offense, defense, and special teams:

```json
{
  "athletes": [
    {
      "items": [
        {
          "id": "3139477",
          "fullName": "Patrick Mahomes",
          "position": { "abbreviation": "QB" },
          "headshot": { "href": "https://a.espncdn.com/..." },
          "status": { "type": "active", "name": "Active" }
        }
      ]
    }
  ]
}
```

Attach the requested team ID and resolved team abbreviation to every athlete. Do not assume `headshot` is a string; it is commonly an object containing `href`.

This strategy avoids resolving a separate Core API reference for every athlete. It is effective for a current fantasy-player index, but it may omit free agents because they are not on a team roster.

### Core athlete enumeration

The Core API also exposes an athlete collection:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?active=true&limit=500
```

This collection is paginated and commonly returns athlete `$ref` pointers. Follow `next.$ref` and resolve the athlete references needed by the consumer. This route can provide broader league coverage, but it creates substantially more requests than the team-roster flow and has not been the current project's production indexing path.

### Player search

No true ESPN player-name search endpoint has been established by this project. Build a local index keyed by athlete ID and normalized name, then apply prefix, substring, or fuzzy matching locally.

Current team data is not historical truth. A roster fetched today may show a player's new team even when analyzing a prior season.

## 3. Get one week's games and opponents

### Weekly event collection

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{season}/types/{seasonType}/weeks/{week}/events?limit=50
```

Verified season types:

- `2`: regular season
- `3`: postseason

The collection contains event `$ref` pointers. Resolve those references before expecting competition details.

For each resolved event:

```json
{
  "id": "401671345",
  "competitions": [
    {
      "competitors": [
        {
          "id": "12",
          "team": { "$ref": ".../teams/12?..." },
          "homeAway": "home"
        },
        {
          "id": "24",
          "team": { "$ref": ".../teams/24?..." },
          "homeAway": "away"
        }
      ]
    }
  ]
}
```

Observed competitor responses are not perfectly consistent. Prefer `competitor.id` when present; otherwise extract the final path segment from `competitor.team.$ref` and remove its query string.

Build a map from both competitor team IDs to the event ID. To find an opponent, locate the event containing the desired team and select the other competitor. No matching event normally means a bye, an invalid week/season combination, or incomplete upstream data.

Do not infer the available week range from scheduling conventions. If a consumer needs dynamic selectors, obtain season/week metadata or validate event availability for the selected season type.

## 4. Get game status, results, scoring plays, and boxscores

### Bundled Site API summary

```http
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}
```

This is the most useful verified single-game payload in this project. It can include:

- `header.competitions[0]`: date, competitors, scores, winners, and status
- `boxscore.players`: team-grouped player statistics
- `scoringPlays`: scoring type, text, team, and running score
- `header.week`: the NFL week associated with the event

Useful status fields include:

```json
{
  "date": "2026-09-11T00:20Z",
  "status": {
    "type": {
      "name": "STATUS_FINAL",
      "description": "Final",
      "detail": "Final",
      "completed": true
    }
  }
}
```

Use `status.type.completed === true` as the strongest completion signal, with `status.type.name === "STATUS_FINAL"` as a practical fallback. Do not infer finality from a score, a `winner` flag alone, or a scheduled `0-0`.

Scheduled events may have no player boxscore rows. Live responses can be partial and can change between requests. Final data is usually stable but ESPN can still make stat corrections, so “final” should not be treated as mathematically immutable.

### Standalone Core endpoints

Core event and boxscore resources are also known patterns:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eventId}
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eventId}/competitions/{competitionId}/boxscore
```

These have not been the current project's active scoring path. Do not assume the standalone Core boxscore has the same nesting as the Site API summary, and discover the competition ID from the event instead of relying on it always matching the event ID.

## 5. Normalize player boxscore statistics

Within a Site API summary, player statistics are organized by team and statistic group:

```text
boxscore.players[*]
  .team
  .statistics[*]
    .name
    .labels[]
    .athletes[*]
      .athlete.id
      .athlete.displayName
      .stats[]
```

The meaning of `stats[n]` comes from `labels[n]`. Never rely on a fixed array position.

```json
{
  "name": "passing",
  "labels": ["C/ATT", "YDS", "AVG", "TD", "INT"],
  "athletes": [
    {
      "athlete": { "id": "3139477", "displayName": "Patrick Mahomes" },
      "stats": ["28/42", "315", "7.5", "3", "1"]
    }
  ]
}
```

Normalize by zipping labels and stats:

```js
const statMap = Object.fromEntries(
  group.labels.map((label, index) => [label, athlete.stats[index]])
);
```

The extracted record can then be scoring-system neutral:

```json
{
  "athleteId": "3139477",
  "passingYards": 315,
  "passingTouchdowns": 3,
  "interceptions": 1
}
```

Common group names observed in NFL summaries include `passing`, `rushing`, `receiving`, and `kicking`. Common labels include `YDS`, `TD`, `CAR`, `REC`, `TGTS`, and `XP`, but consumers must still read the supplied labels.

Do not restrict extraction to the athlete's listed fantasy position. A running back can record a passing statistic, and other cross-position plays are possible.

## 6. Get scoring-play detail and distance

Aggregate boxscore totals do not necessarily preserve the distance or attribution needed for every scoring event. The Site API summary's `scoringPlays` array provides fields such as:

```json
{
  "id": "play-id",
  "type": {
    "text": "Passing Touchdown",
    "abbreviation": "TD"
  },
  "text": "Receiver Name 45 Yd pass from Quarterback Name",
  "team": { "id": "12" },
  "awayScore": 7,
  "homeScore": 14
}
```

Practical interpretation:

- Use athlete IDs to locate the correct boxscore participant first.
- Use scoring-play text only for information not otherwise keyed, such as scorer name, passer name, or play distance.
- A distance can commonly be parsed with `/([0-9]+)\s+Yd/i`, but missing or differently worded descriptions must be tolerated.
- Passing touchdown text commonly starts with the receiver and contains `pass from {passer}`.
- Two-point conversions may appear in parenthetical text rather than as a separate normalized record.
- Defensive and return plays require inspecting both `type.text` and the description.

ESPN labels and text are not perfectly normalized. Observed examples include blocked-field-goal return wording and the typo `Touchown Return`. Keep raw event IDs and descriptions available for debugging rather than silently discarding unmatched scoring plays.

## 7. Get injuries, designations, and player notes

### League injury/status feed

```http
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries
```

The observed payload is grouped approximately as:

```text
injuries[]
  .injuries[]
    .date
    .status
    .type.abbreviation
    .type.description
    .shortComment
    .longComment
    .athlete.links[]
    .athlete.notes.items[]
```

This is not purely a list of currently injured players. It can blend official-looking designations with general player-status notes.

### Identify the athlete

An embedded `athlete.id` has not been reliable in the payloads used by this project. The athlete ID can be extracted from an athlete link whose path contains `/id/{athleteId}`:

```js
const match = link.href?.match(/\/id\/(\d+)(?:\/|$)/);
```

### Distinguish a designation from a note

- `type.abbreviation` can contain a designation such as `Q`, `O`, or `IR`.
- `type.description` or `status` can provide its human-readable label.
- An abbreviation of `A` represents active and should not be displayed as an injury designation.
- `shortComment` and `longComment` sometimes only repeat the designation. Consumers may suppress those duplicates.
- The same athlete can have multiple records. Select or merge by parsed date rather than response order.

Player notes can be embedded under `athlete.notes.items`. Observed useful fields include:

```json
{
  "id": "note-id",
  "type": "news",
  "date": "2026-08-18T09:00Z",
  "headline": "Player returns to practice",
  "text": "...",
  "source": "RotoWire"
}
```

These notes are status-feed summaries, not necessarily standalone ESPN articles. Deduplicate them, validate their dates, and apply a consumer-appropriate freshness window. The current application uses 30 days, but that is an application policy rather than ESPN API behavior.

The presence of an athlete in this endpoint does not prove the athlete is injured, and the absence of a designation does not guarantee availability. Offseason reporting can be especially different from official in-season game designations.

### Team injury endpoint

The Core-style pattern below has appeared in prior notes but has not been recently verified by this project:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{teamId}/injuries
```

Prefer the verified league Site API feed unless a team-specific workflow has independently confirmed the endpoint and response shape.

## 8. Get rosters and depth charts

The verified current-roster endpoint is:

```http
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/roster
```

Current rosters are useful for present-day team and position metadata. They must not overwrite historical team attribution obtained from an old game summary.

Core-style roster and depth-chart patterns have appeared in prior references:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{teamId}/roster
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{teamId}/depthcharts
```

These paths and their response shapes have not been recently verified here. Inspect current team resources for relevant `$ref` links and validate the payload before building a dependency on them.

## 9. Get season-long player statistics

Earlier versions of this guide listed the following pattern:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/{athleteId}/stats?season={season}&seasontype={seasonType}
```

It has not been recently verified and should not be treated as a stable contract. When season totals are needed:

1. Inspect the resolved athlete and season resources for current statistics `$ref` links.
2. Confirm the returned categories, labels, season, and season type.
3. Preserve the query and raw payload used to generate any analysis.
4. For custom scoring or auditable historical work, prefer aggregating verified game summaries. Season totals often omit the play-level detail needed for distance-based scoring.

## 10. Get odds and totals

A known Core API pattern is:

```http
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eventId}/competitions/{competitionId}/odds
```

This endpoint has not been recently verified by this project. Odds can be provider-specific, can move over time, and may be missing or delayed. A consumer that needs an auditable frozen line must capture the provider, value, and timestamp rather than repeatedly querying the current value.

The KJFFL Upset Special deliberately uses a manually supplied league line. ESPN odds must not silently replace that user-supplied value.

## 11. Replay a historical regular season

For broad historical discovery, the Site API scoreboard has been effective:

```http
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={calendarYear}&seasontype=2&limit=1000
```

An NFL season crosses calendar years. To gather a season completely:

1. Query `dates={season}`.
2. Query `dates={season + 1}` to capture January games.
3. Combine and deduplicate events by event ID.
4. Keep only events where `event.season.year === season` and `event.season.type === 2`.
5. Fetch `/summary?event={eventId}` for every retained event.

Cache each scoreboard and summary by season/event ID. Historical replay can require hundreds of requests, so use bounded concurrency; the project research script uses eight workers.

Current roster metadata may help label a player's present position, but historical team, opponent, and week attribution must come from the historical summary. Retain raw summaries or a compact normalized weekly record so disputed results can be reconstructed.

## 12. Join entities safely

A common weekly flow is:

```text
Athlete ID
  -> current or historical team ID
  -> weekly event ID
  -> Site API game summary
  -> team boxscore/stat group
  -> athlete stat line and scoring plays
```

Recommended keys:

| Entity | Key and caution |
| --- | --- |
| Athlete | Normalize ESPN athlete ID to a string; do not join by name alone |
| Team | Normalize ESPN team ID to a string; abbreviations can change |
| Event | ESPN event ID identifies the game |
| Competition | Discover from the event; do not universally assume it equals the event ID |
| D/ST | Using team ID as a fantasy-player ID is a consumer convention, not an ESPN athlete identity |

Names remain useful for matching human-readable scoring-play text, but the athlete ID should establish which player is being evaluated first.

## 13. Reliability, retries, and caching

### Retry policy

- Retry network failures, `429`, and transient `5xx` responses with bounded backoff.
- Respect `Retry-After` when present.
- Do not repeatedly retry permanent validation or not-found responses without changing the request.
- Keep concurrency modest when resolving collections or replaying seasons.

### General cache guidance

| Data | Volatility | Practical guidance |
| --- | --- | --- |
| Teams and IDs | Very low | Cache for a season; refresh occasionally |
| Current rosters | Medium | Refresh daily or when transactions matter |
| Player search index | Low/medium | Daily is usually sufficient |
| Future schedules | Medium | Refresh as scheduling changes matter |
| Live summaries | High | Poll conservatively while a game is active |
| Final summaries | Low | Cache long-term, while allowing stat corrections |
| Injury/status feed | High | Refresh more frequently near lineup decisions |
| Historical raw summaries | Very low | Cache by event ID for reproducibility |
| Odds | Very high | Store timestamp and provider with every captured value |

There is no documented service-level or rate-limit guarantee. “Cache aggressively” should not mean serving stale injury or live-game information without communicating its age.

## 14. Common failure modes

- Assuming a Core collection embeds entities when it only returns `$ref` pointers.
- Assuming Site and Core payloads share the same nesting.
- Treating stat array positions as fixed instead of mapping `labels` to `stats`.
- Treating a scheduled `0-0` as a final shutout.
- Expecting boxscore players to exist before kickoff.
- Treating every entry in `/injuries` as an active injury designation.
- Using current roster membership to assign a historical game to a team.
- Restricting stat extraction to a player's nominal position.
- Assuming a missing event always means a bye without checking season type and week validity.
- Assuming final data can never be corrected.
- Using a current odds value when the business rule requires a frozen historical line.
- Joining scoring-play text by a short or ambiguous name without first locating the ESPN athlete ID.

## 15. Quick retrieval recipes

### Current searchable player index

1. List and resolve Core teams.
2. Fetch each Site team roster.
3. Flatten athlete groups and attach team ID/abbreviation.
4. Normalize desired positions and athlete names.
5. Add team-based D/ST records if the consumer needs them.
6. Cache the index and search locally.

### One player's weekly boxscore

1. Determine the relevant team ID for that season/week.
2. Fetch and resolve the Core weekly event collection.
3. Map the team ID to an event ID.
4. Fetch the Site game summary.
5. Find the team, statistic group, and athlete ID.
6. Zip `labels` to `stats` and normalize values.
7. Use scoring plays only when play-level detail is needed.

### Current injury designation and recent status notes

1. Fetch the Site league `/injuries` feed.
2. Flatten team injury groups.
3. Extract athlete IDs from athlete links.
4. Separate designation fields from embedded `type: "news"` notes.
5. Exclude active-only designations where appropriate.
6. Parse dates, select the newest designation, deduplicate notes, and apply an explicit freshness policy.

### Historical season dataset

1. Fetch Site scoreboards for the season year and next calendar year.
2. Filter by ESPN season year/type and deduplicate event IDs.
3. Download and cache each Site summary with bounded concurrency.
4. Normalize weekly players, teams, boxscores, and scoring plays.
5. Aggregate only after preserving enough weekly data for later auditing.

## Final guidance

If you remember five things:

1. Core collections are often `$ref` graphs; Site responses are usually embedded presentation payloads.
2. Join by ESPN IDs and normalize them to strings.
3. Map stat labels dynamically.
4. Treat scheduled, live, final, missing, and revised data as distinct states.
5. Preserve raw event IDs and payloads when reproducibility matters.

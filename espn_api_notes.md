# ESPN NFL Data APIs – Practical Guide for Fantasy Football

> **Audience**: LLM coding agents and developers
>
> **Scope**: NFL-only usage of ESPN's public (undocumented) data APIs
>
> **Use cases**: fantasy football, analytics, roster management, schedules, box scores, and player stats

---

## ⚠️ Important Notes

* ESPN does **not** officially document or guarantee these APIs.
* Endpoints are public and widely used but may change without notice.
* All examples below are **read-only** HTTP GET requests.
* Rate limit conservatively and cache aggressively (daily where possible).

Base NFL league path used throughout:

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl
```

---

## 1. Enumerate All Active NFL Players

### Endpoint

```
/athletes?active=true&limit=500
```

### Example

```
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?active=true&limit=500
```

### Notes

* Results are **paginated**
* Follow the `"next".$ref` field until exhausted
* Each athlete is returned as a `$ref` pointer

### Typical Flow

1. Fetch athletes list
2. Resolve each `$ref` to get full player metadata
3. Cache results (daily recommended)

### Useful Fields (resolved athlete)

```json
{
  "id": "4040715",
  "fullName": "Patrick Mahomes",
  "position": { "abbreviation": "QB" },
  "team": { "$ref": ".../teams/12" },
  "headshot": "https://a.espncdn.com/i/headshots/nfl/players/full/4040715.png"
}
```

---

## 2. Search for a Player by Name

ESPN does **not** provide a true search endpoint.

### Recommended Strategy

* Build your own local index from `/athletes`
* Normalize names (lowercase, remove punctuation)
* Use fuzzy or prefix matching

### Optional Heuristic

Filter athletes client-side:

```
athlete.fullName.includes("mahomes")
```

---

## 3. Teams: Names, Abbreviations, Logos

### List All NFL Teams

```
GET /teams
```

Example:

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams
```

### Team Object (Resolved)

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

### Fantasy Use

* Team abbreviation for matchup display
* Logos for UI
* Team ID for schedule and stats lookups

---

## 4. NFL Schedule (Determine Opponent by Week)

### Season Schedule

```
GET /seasons/{season}/types/2/weeks/{week}/events
```

Example (2024, Week 1):

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2024/types/2/weeks/1/events
```

### Event (Game) Structure

```json
{
  "id": "401671345",
  "competitions": [
    {
      "competitors": [
        {
          "team": { "$ref": ".../teams/12" },
          "homeAway": "home"
        },
        {
          "team": { "$ref": ".../teams/24" },
          "homeAway": "away"
        }
      ]
    }
  ]
}
```

### Determining Opponent

1. Identify player team ID
2. Find matching competitor in event
3. The *other* competitor is the opponent

---

## 5. Game Scores & Results

### Game (Event) Endpoint

```
GET /events/{eventId}
```

Example:

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401671345
```

### Score Fields

```json
"competitions": [
  {
    "competitors": [
      {
        "score": "31",
        "winner": true
      }
    ],
    "status": {
      "type": { "completed": true }
    }
  }
]
```

### Fantasy Use

* Final scores
* Win/loss
* Game completion status

---

## 6. Player Stats for a Specific Game

### Box Score Endpoint

```
GET /events/{eventId}/competitions/{competitionId}/boxscore
```

Example:

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401671345/competitions/401671345/boxscore
```

### Player Stat Line Example

```json
{
  "athlete": { "id": "4040715" },
  "stats": [
    "28/42",
    "315",
    "3",
    "1"
  ]
}
```

### Mapping Stats

Stat meanings are defined by:

```
boxscore.playerStats[*].labels
```

Always read labels dynamically.

---

## 7. Season-Long Player Stats

### Endpoint

```
GET /athletes/{athleteId}/stats
```

Optional filters:

* `?season=2024`
* `?seasontype=2` (regular season)

### Fantasy Use

* Season totals
* Per-game averages
* Trend analysis

---

## 8. Depth Charts & Rosters

### Team Roster

```
GET /teams/{teamId}/roster
```

### Depth Chart

```
GET /teams/{teamId}/depthcharts
```

### Fantasy Use

* Starter vs backup
* Injury replacement logic
* Handcuff identification

---

## 9. Injuries & Status

### Team Injuries

```
GET /teams/{teamId}/injuries
```

### Athlete Status Field

```json
"status": {
  "type": "out",
  "abbreviation": "O"
}
```

### Fantasy Use

* Lineup eligibility
* Late-scratch detection

---

## 10. Betting & Vegas Lines (Optional)

### Odds (per event)

```
GET /events/{eventId}/competitions/{competitionId}/odds
```

Useful for:

* Over/Under
* Implied team totals
* DFS optimization

---

## 11. Caching & Performance Best Practices

* Cache **athletes**: daily
* Cache **teams**: weekly
* Cache **schedule**: per season
* Cache **boxscores**: immutable after completion

Avoid resolving `$ref` repeatedly—memoize aggressively.

---

## 12. Canonical Entity IDs (Important)

| Entity         | Stability              |
| -------------- | ---------------------- |
| Athlete ID     | Stable                 |
| Team ID        | Stable                 |
| Event ID       | Stable per season      |
| Competition ID | Same as Event ID (NFL) |

---

## 13. Minimal Fantasy MVP Dataset

For most fantasy apps, you need:

* Athlete ID
* Full name
* Position
* Team ID / abbreviation
* Headshot URL
* Weekly opponent
* Game status
* Player game stats

Everything above is derivable from these APIs.

---

## 14. Known Pitfalls

* No official search endpoint
* Inconsistent stat ordering → always read labels
* Bye weeks have no events
* Postseason uses `seasontype=3`

---

## 15. Agent Rules (Read First)

These rules are intended for **LLM coding agents** consuming ESPN NFL data.

1. **Always resolve `$ref` URLs** before accessing entity fields.
2. **Never assume stat ordering**; always read `labels` alongside `stats`.
3. **Treat athlete, team, and event IDs as canonical keys**.
4. **Expect missing data** (bye weeks, injuries, inactive players).
5. **Cache aggressively** and prefer stale data over refetching.
6. **Assume eventual consistency**: game data may lag live events.
7. **Never hardcode week counts** (international games, flexible scheduling).

---

## 16. Common Entity Joins (Mental Model)

Most fantasy workflows require joining these entities:

```
Athlete ──▶ Team ──▶ Event (Game) ──▶ Competition ──▶ Boxscore
```

### Canonical Join Keys

| From        | To          | Key                      |
| ----------- | ----------- | ------------------------ |
| Athlete     | Team        | `athlete.team.$ref`      |
| Team        | Event       | `competitors[*].team.id` |
| Event       | Competition | Same ID (NFL)            |
| Competition | Boxscore    | `{eventId}/boxscore`     |

### Practical Join Flow (Weekly Fantasy)

1. Athlete → teamId
2. Team → event for given week
3. Event → opponent team
4. Event → boxscore
5. Boxscore → athlete stat line

---

## 17. Worked Example: QB Fantasy Points (Single Week)

### Goal

Compute **fantasy points** for a QB in Week 5, 2024.

### Step 1: Identify Athlete

* Athlete ID: `4040715` (Patrick Mahomes)
* Position: QB
* Team ID resolved from athlete

### Step 2: Find Week Event

```
GET /seasons/2024/types/2/weeks/5/events
```

Scan events where Mahomes' team appears as a competitor.

### Step 3: Fetch Boxscore

```
GET /events/{eventId}/competitions/{eventId}/boxscore
```

Locate Mahomes under:

```
boxscore.playerStats[*].athletes[*]
```

### Step 4: Read Passing Labels

Example labels:

```
["C/ATT", "YDS", "TD", "INT"]
```

Corresponding stats:

```
["28/42", "315", "3", "1"]
```

### Step 5: Apply Fantasy Scoring (Example)

| Stat          | Value | Points |
| ------------- | ----- | ------ |
| Passing Yards | 315   | 12.6   |
| Passing TDs   | 3     | 12     |
| Interceptions | 1     | -2     |

**Total: 22.6 fantasy points**

---

## 18. Endpoint Reliability & Cacheability

| Endpoint                    | Volatility  | Cache Recommendation |
| --------------------------- | ----------- | -------------------- |
| `/athletes`                 | Low         | Daily                |
| `/teams`                    | Very Low    | Weekly / Season      |
| `/seasons/*/weeks/*/events` | Medium      | Per Week             |
| `/events/{id}`              | Medium      | Until Final          |
| `/boxscore`                 | High (live) | After Game Final     |
| `/athletes/{id}/stats`      | Medium      | Daily                |
| `/depthcharts`              | Medium      | Daily                |
| `/injuries`                 | High        | Hourly (game day)    |

### Reliability Notes

* **IDs are stable** across seasons
* Live games may briefly return partial stats
* Final boxscores are immutable
* Odds endpoints may disappear or lag

---

## 19. Tight Reference Summary (Fantasy MVP)

Minimum data needed per player per week:

* Athlete ID
* Position
* Team abbreviation
* Opponent abbreviation
* Game status (scheduled / live / final)
* Passing / rushing / receiving stats

All are derivable using:

* `/athletes`
* `/teams`
* `/seasons/*/weeks/*/events`
* `/events/{id}/boxscore`

---

## 20. Final Guidance

If you remember only three things:

1. Follow `$ref` links
2. Read stat labels dynamically
3. Cache everything you can

This API is powerful, unofficial, and absolutely sufficient for a full fantasy football platform.

---

**End of document**

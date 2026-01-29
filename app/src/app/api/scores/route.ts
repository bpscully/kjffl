import { NextRequest, NextResponse } from 'next/server';
import { espnApi } from '@/lib/espn-api';
import { ScoringEngine, PlayerScoreResult } from '@/lib/scoring-engine';

export async function POST(req: NextRequest) {
  try {
    const { players, season, week, seasonType = 2 } = await req.json();

    if (!players || !Array.isArray(players)) {
      return NextResponse.json({ error: 'Missing players array' }, { status: 400 });
    }

    // 1. Fetch Week Events
    const events = await espnApi.getWeekEvents(season, week, seasonType);
    console.log(`Fetched ${events.length} events for ${season} Week ${week} (Type ${seasonType})`);
    
    // 2. Map Team ID -> Event ID
    const teamToEventMap = new Map<string, string>();
    events.forEach((event: any) => {
      event.competitions[0].competitors.forEach((c: any) => {
        // We need to be absolutely sure we have the correct Team ID
        // In the core API events response, the competitor object often has an 'id' that IS the team ID,
        // but it's safer to extract it from the team ref if present.
        let tId = c.id;
        if (c.team?.$ref) {
            const parts = c.team.$ref.split('/');
            tId = parts[parts.length - 1].split('?')[0];
        }
        teamToEventMap.set(tId, event.id);
      });
    });

    console.log('Team to Event Mapping Keys:', Array.from(teamToEventMap.keys()));
    console.log('Sample Player from Request:', players[0]);

        // 3. Collect Unique Event IDs we need to fetch
        const uniqueEventIds = new Set<string>();
        players.forEach((p: any) => {
          if (!p.teamId) {
              console.error(`Player ${p.id} (${p.name}) is missing teamId!`);
              return;
          }
          const eventId = teamToEventMap.get(p.teamId);
          if (eventId) {
              uniqueEventIds.add(eventId);
          }
        });
    
        // 4. Fetch Event Summaries
        const summariesMap = new Map<string, any>();
        await Promise.all(
          Array.from(uniqueEventIds).map(async (id) => {
            try {
                const summary = await espnApi.getGameSummary(id);
                summariesMap.set(id, summary);
            } catch (err) {
                console.error(`Failed to fetch summary for event ${id}`, err);
            }
          })
        );
    
        // 5. Calculate Scores
        const results: PlayerScoreResult[] = players.map((p: any) => {
          const eventId = teamToEventMap.get(p.teamId);
          const summary = eventId ? summariesMap.get(eventId) : null;
    
                if (!summary) {
                  const hasTeamId = !!p.teamId;
                  const msg = hasTeamId ? 'Bye Week / Game Not Found' : 'Missing Team ID - Please Remove and Re-add Player';
                  return {
                    playerId: p.id,
                    totalPoints: 0,
                    details: [{ reason: msg, points: 0 }],
                    gameStatus: 'N/A',
                    opponentAbbr: '--'
                  };
                }    
          return ScoringEngine.calculatePlayerScore(p.id, summary, p.pos);
        });
    
        return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores', details: (error as Error).message },
      { status: 500 }
    );
  }
}
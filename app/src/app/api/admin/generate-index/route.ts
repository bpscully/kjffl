import { NextResponse } from 'next/server';
import { espnApi, EspnAthlete, EspnTeam } from '@/lib/espn-api';
import { savePlayerIndex } from '@/lib/player-storage';

export const dynamic = 'force-dynamic';

export interface PlayerIndexItem {
  id: string;
  name: string;
  pos: string;
  team: string; // Abbreviation
  teamId: string;
}

const OFFENSIVE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'PK']);

export async function GET() {
  try {
    console.log('Starting index generation...');
    const startTime = Date.now();
    
    // 1. Fetch Teams (needed for mapping IDs to Abbr AND for D/ST players)
    console.log('Fetching teams...');
    const teams = await espnApi.getAllTeams();
    const teamMap = new Map<string, string>(); // ID -> Abbr
    
    // Create D/ST players from teams
    const defensePlayers: PlayerIndexItem[] = [];

    teams.forEach((t: EspnTeam) => {
      teamMap.set(t.id, t.abbreviation);
      
      defensePlayers.push({
        id: t.id, // Using Team ID as Player ID for D/ST
        name: `${t.name} D/ST`,
        pos: 'D/ST',
        team: t.abbreviation,
        teamId: t.id
      });
    });
    console.log(`Fetched ${teams.length} teams.`);

    // 2. Fetch Players
    console.log('Fetching players via team rosters...');
    const players = await espnApi.getAllPlayers();
    console.log(`Fetched ${players.length} raw players.`);

    // 3. Build & Filter Index
    const offensivePlayers: PlayerIndexItem[] = players
      .filter((p) => {
        const pos = p.position?.abbreviation;
        return pos && OFFENSIVE_POSITIONS.has(pos);
      })
      .map((p: EspnAthlete) => {
        let teamAbbr = 'FA'; // Free Agent
        let teamId = '0';
        if (p.team?.$ref) {
          const parts = p.team.$ref.split('/');
          teamId = parts[parts.length - 1].split('?')[0];
          teamAbbr = teamMap.get(teamId) || 'UNK';
        }

        return {
          id: p.id,
          name: p.fullName,
          pos: p.position?.abbreviation || 'UNK',
          team: teamAbbr,
          teamId: teamId
        };
      });

    const fullIndex = [...defensePlayers, ...offensivePlayers];

    // 4. Save using Storage Service
    await savePlayerIndex(fullIndex);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      message: `Successfully generated index in ${duration}s.`,
      stats: {
        total: fullIndex.length,
        defense: defensePlayers.length,
        offense: offensivePlayers.length,
      },
      sample: fullIndex.slice(0, 3)
    });

  } catch (error) {
    console.error('Error generating index:', error);
    return NextResponse.json(
      { message: 'Failed to generate index', error: (error as Error).message },
      { status: 500 }
    );
  }
}
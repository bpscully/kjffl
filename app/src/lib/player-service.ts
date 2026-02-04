import { unstable_cache } from 'next/cache';
import { espnApi, EspnAthlete, EspnTeam } from '@/lib/espn-api';
import { Player } from '@/types';

const OFFENSIVE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'PK']);

async function fetchAndProcessPlayers(): Promise<Player[]> {
  console.log('Refreshing Player Index from ESPN...');
  
  // 1. Fetch Teams (needed for mapping IDs to Abbr AND for D/ST players)
  const teams = await espnApi.getAllTeams();
  const teamMap = new Map<string, string>(); // ID -> Abbr
  
  // Create D/ST players from teams
  const defensePlayers: Player[] = [];

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

  // 2. Fetch Players
  const players = await espnApi.getAllPlayers();

  // 3. Build & Filter Index
  const offensivePlayers: Player[] = players
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
  console.log(`Generated index with ${fullIndex.length} players.`);
  return fullIndex;
}

// Cache the result for 24 hours (86400 seconds)
export const getPlayers = unstable_cache(
  async () => fetchAndProcessPlayers(),
  ['players-index'],
  { revalidate: 86400, tags: ['players-index'] }
);

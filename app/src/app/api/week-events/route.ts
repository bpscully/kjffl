import { NextRequest, NextResponse } from 'next/server';
import { espnApi } from '@/lib/espn-api';

interface EventCompetitor {
  id?: string;
  name?: string;
  abbreviation?: string;
  team?: {
    $ref?: string;
    displayName?: string;
    name?: string;
    abbreviation?: string;
  };
}

interface WeekEvent {
  id: string | number;
  name?: string;
  shortName?: string;
  competitions?: {
    competitors?: EventCompetitor[];
  }[];
}

const NFL_TEAMS: Record<string, { abbreviation: string; name: string }> = {
  '1': { abbreviation: 'ATL', name: 'Atlanta Falcons' },
  '2': { abbreviation: 'BUF', name: 'Buffalo Bills' },
  '3': { abbreviation: 'CHI', name: 'Chicago Bears' },
  '4': { abbreviation: 'CIN', name: 'Cincinnati Bengals' },
  '5': { abbreviation: 'CLE', name: 'Cleveland Browns' },
  '6': { abbreviation: 'DAL', name: 'Dallas Cowboys' },
  '7': { abbreviation: 'DEN', name: 'Denver Broncos' },
  '8': { abbreviation: 'DET', name: 'Detroit Lions' },
  '9': { abbreviation: 'GB', name: 'Green Bay Packers' },
  '10': { abbreviation: 'TEN', name: 'Tennessee Titans' },
  '11': { abbreviation: 'IND', name: 'Indianapolis Colts' },
  '12': { abbreviation: 'KC', name: 'Kansas City Chiefs' },
  '13': { abbreviation: 'LV', name: 'Las Vegas Raiders' },
  '14': { abbreviation: 'LAR', name: 'Los Angeles Rams' },
  '15': { abbreviation: 'MIA', name: 'Miami Dolphins' },
  '16': { abbreviation: 'MIN', name: 'Minnesota Vikings' },
  '17': { abbreviation: 'NE', name: 'New England Patriots' },
  '18': { abbreviation: 'NO', name: 'New Orleans Saints' },
  '19': { abbreviation: 'NYG', name: 'New York Giants' },
  '20': { abbreviation: 'NYJ', name: 'New York Jets' },
  '21': { abbreviation: 'PHI', name: 'Philadelphia Eagles' },
  '22': { abbreviation: 'ARI', name: 'Arizona Cardinals' },
  '23': { abbreviation: 'PIT', name: 'Pittsburgh Steelers' },
  '24': { abbreviation: 'LAC', name: 'Los Angeles Chargers' },
  '25': { abbreviation: 'SF', name: 'San Francisco 49ers' },
  '26': { abbreviation: 'SEA', name: 'Seattle Seahawks' },
  '27': { abbreviation: 'TB', name: 'Tampa Bay Buccaneers' },
  '28': { abbreviation: 'WSH', name: 'Washington Commanders' },
  '29': { abbreviation: 'CAR', name: 'Carolina Panthers' },
  '30': { abbreviation: 'JAX', name: 'Jacksonville Jaguars' },
  '33': { abbreviation: 'BAL', name: 'Baltimore Ravens' },
  '34': { abbreviation: 'HOU', name: 'Houston Texans' },
};

function getTeamId(competitor: EventCompetitor): string {
  if (competitor.id) return String(competitor.id);
  if (competitor.team?.$ref) {
    const parts = competitor.team.$ref.split('/');
    return parts[parts.length - 1].split('?')[0];
  }
  return '';
}

function getTeamName(competitor: EventCompetitor): string {
  const teamId = getTeamId(competitor);
  return competitor.team?.displayName || competitor.team?.name || competitor.name || NFL_TEAMS[teamId]?.name || teamId;
}

function getTeamAbbreviation(competitor: EventCompetitor): string {
  const teamId = getTeamId(competitor);
  return competitor.team?.abbreviation || competitor.abbreviation || NFL_TEAMS[teamId]?.abbreviation || getTeamName(competitor);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get('season'));
    const week = Number(searchParams.get('week'));
    const seasonType = Number(searchParams.get('seasonType') || 2);

    if (!season || !week) {
      return NextResponse.json({ error: 'Missing season or week' }, { status: 400 });
    }

    const events = await espnApi.getWeekEvents(season, week, seasonType) as WeekEvent[];
    const matchups = events.map((event) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      const teams = competitors.map((competitor) => ({
        id: getTeamId(competitor),
        abbreviation: getTeamAbbreviation(competitor),
        name: getTeamName(competitor),
      }));

      return {
        eventId: String(event.id),
        name: event.name || teams.map((team) => team.abbreviation).join(' @ '),
        shortName: event.shortName || teams.map((team) => team.abbreviation).join(' @ '),
        teams,
      };
    });

    return NextResponse.json({ matchups });
  } catch (error) {
    console.error('Error fetching week events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch week events', details: (error as Error).message },
      { status: 500 },
    );
  }
}

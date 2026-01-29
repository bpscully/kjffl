import { fetchWithRetry } from './utils';

const ESPN_API_BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

export interface EspnTeam {
  id: string;
  name: string;
  abbreviation: string;
  logos: { href: string }[];
}

export interface EspnAthlete {
  id: string;
  fullName: string;
  position: { abbreviation: string };
  team?: { $ref: string };
  headshot?: { href: string };
  active: boolean;
}

class EspnApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ESPN_API_BASE;
  }

  private async fetch(endpoint: string) {
    return fetchWithRetry(`${this.baseUrl}${endpoint}`);
  }

  async getAllTeams(): Promise<EspnTeam[]> {
    let allTeamsRefs: { $ref: string }[] = [];
    let nextUrl: string | undefined = `${this.baseUrl}/teams?limit=100`;

    while (nextUrl) {
      const response = await fetchWithRetry(nextUrl);
      const data = await response.json();
      allTeamsRefs = allTeamsRefs.concat(data.items);
      nextUrl = data.next ? data.next.$ref : undefined;
    }

    const teams = await Promise.all(
        allTeamsRefs.map(async (ref) => {
            const res = await fetchWithRetry(ref.$ref);
            return res.json();
        })
    );
    return teams;
  }

  async getAllPlayers(): Promise<EspnAthlete[]> {
    // 1. Get all teams first to iterate rosters
    const teams = await this.getAllTeams();
    
    // 2. Fetch rosters for all teams in parallel (Site API)
    // site.api.espn.com returns full athlete objects in the roster, saving thousands of calls.
    const rosterPromises = teams.map(async (team) => {
        try {
            const res = await fetchWithRetry(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`);
            const data = await res.json();
            
            // Site API returns athletes grouped (Offense, Defense, Special Teams, etc.)
            const allAthletes: any[] = [];
            data.athletes?.forEach((group: any) => {
                group.items?.forEach((athlete: any) => {
                    allAthletes.push({
                        id: athlete.id,
                        fullName: athlete.fullName,
                        position: { abbreviation: athlete.position?.abbreviation },
                        team: { $ref: `.../teams/${team.id}` }, // Mock ref to match our indexer logic
                        headshot: athlete.headshot,
                        active: athlete.status?.type === 'active' || athlete.status?.name === 'Active',
                    });
                });
            });
            return allAthletes;
        } catch (err) {
            console.error(`Failed to fetch roster for team ${team.id}`, err);
            return [];
        }
    });

    const rosters = await Promise.all(rosterPromises);
    const flatPlayers = rosters.flat();

    return flatPlayers as EspnAthlete[];
  }

  async getWeekEvents(season: number, week: number, seasonType: number = 2) {
    const url = `${this.baseUrl}/seasons/${season}/types/${seasonType}/weeks/${week}/events?limit=50`;
    const res = await fetchWithRetry(url);
    const data = await res.json();
    
    // Resolve each event $ref
    const eventPromises = data.items.map(async (ref: { $ref: string }) => {
        const res = await fetchWithRetry(ref.$ref);
        return res.json();
    });
    return Promise.all(eventPromises);
  }

  async getGameSummary(eventId: string) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;
    const res = await fetchWithRetry(url);
    return res.json();
  }
}

export const espnApi = new EspnApi();

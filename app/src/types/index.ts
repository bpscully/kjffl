export interface Player {
  id: string;
  name: string;
  pos: string;
  team: string;
  teamId: string;
}

export interface RosterPlayer extends Player {
  addedAt: number; // Timestamp for sorting or uniqueness
  isStarter?: boolean; // For future use
}

export interface PlayerNewsItem {
  id: string;
  headline: string;
  description: string;
  publishedAt: string;
  source?: string;
}

export interface PlayerInjuryUpdate {
  designation: string;
  label: string;
  updatedAt: string;
  shortComment: string;
  longComment: string;
  source?: string;
}

export interface PlayerUpdateResult {
  playerId: string;
  news: PlayerNewsItem[];
  injury: PlayerInjuryUpdate | null;
  errors?: Array<'news' | 'injury'>;
}

export interface WeekTeam {
  id: string;
  abbreviation: string;
  name: string;
}

export interface WeekMatchup {
  eventId: string;
  name: string;
  shortName: string;
  teams: WeekTeam[];
}

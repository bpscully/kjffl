export interface Player {
  id: string;
  name: string;
  pos: string;
  team: string;
}

export interface RosterPlayer extends Player {
  addedAt: number; // Timestamp for sorting or uniqueness
  isStarter?: boolean; // For future use
}

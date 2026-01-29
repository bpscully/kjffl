import { scoringRules } from '../../lib/scoring_rules';

/**
 * Types for ESPN API Responses (Site API /summary)
 */

export interface EspnScoringPlay {
  id: string;
  type: {
    id: string;
    text: string;
    abbreviation: string;
  };
  text: string;
  awayScore: number;
  homeScore: number;
  team: {
    id: string;
  };
}

export interface EspnPlayerStatLine {
  athlete: {
    id: string;
    displayName: string;
  };
  stats: string[];
}

export interface EspnStatGroup {
  name: string;
  labels: string[];
  athletes: EspnPlayerStatLine[];
}

export interface EspnSummary {
  id: string;
  header: {
    competitions: {
      competitors: {
        id: string;
        score: string;
        winner: boolean;
      }[];
      status: {
        type: {
          name: string;
          description: string;
          detail: string;
        };
      };
    }[];
  };
  scoringPlays: EspnScoringPlay[];
  boxscore: {
    players: {
      team: { id: string; abbreviation: string };
      statistics: EspnStatGroup[];
    }[];
  };
}

/**
 * Result Types
 */

export interface ScoringDetail {
  reason: string;
  points: number;
}

export interface PlayerScoreResult {
  playerId: string;
  totalPoints: number;
  details: ScoringDetail[];
  gameStatus: string; // e.g. "Final", "Q3 2:10", "Scheduled"
  opponentAbbr: string; // e.g. "KC"
}

/**
 * SCORING ENGINE
 */

export class ScoringEngine {
  
  /**
   * Main entry point for calculating a single player's score from a game summary.
   */
  static calculatePlayerScore(playerId: string, summary: EspnSummary, position?: string): PlayerScoreResult {
    const details: ScoringDetail[] = [];
    
    if (position === 'D/ST') {
      this.addDstPoints(playerId, summary, details);
    } else {
      // 1. Calculate Yardage & Totals from Boxscore
      this.addBoxscorePoints(playerId, summary, details);
      
      // 2. Calculate Touchdowns & FGs from Scoring Plays (for precise distance points)
      this.addScoringPlayPoints(playerId, summary, details);
    }

    const totalPoints = details.reduce((sum, d) => sum + d.points, 0);
    
    // Extract Game Status & Opponent
    const competition = summary.header.competitions[0];
    const gameStatus = competition.status?.type?.detail || competition.status?.type?.description || 'Unknown';
    
    // Find Team/Opponent for this player
    let teamAbbr = '??';
    let oppAbbr = '??';
    
    const teamData = summary.boxscore.players.find(p => {
        const teamIdStr = String(p.team.id);
        const playerIdStr = String(playerId);

        if (position === 'D/ST') {
            return teamIdStr === playerIdStr;
        }
        return p.statistics.some(g => 
            g.athletes.some(a => String(a.athlete.id) === playerIdStr)
        );
    });

    if (teamData) {
        teamAbbr = teamData.team.abbreviation;
        const teamIdStr = String(teamData.team.id);
        const oppData = summary.boxscore.players.find(p => String(p.team.id) !== teamIdStr);
        oppAbbr = oppData?.team?.abbreviation || '??';
    }

    return {
      playerId,
      totalPoints: Number(totalPoints.toFixed(2)),
      details,
      gameStatus,
      opponentAbbr: oppAbbr
    };
  }

  private static addDstPoints(teamId: string, summary: EspnSummary, details: ScoringDetail[]) {
    const competition = summary.header.competitions[0];
    const teamCompetitor = competition.competitors.find(c => c.id === teamId);
    const oppCompetitor = competition.competitors.find(c => c.id !== teamId);

    if (!teamCompetitor || !oppCompetitor) return;

    const pointsAllowed = parseInt(oppCompetitor.score || '0');
    const isWin = teamCompetitor.winner;

    // 1. Shutout (4 pts)
    if (pointsAllowed === 0) {
      details.push({ reason: 'Shutout', points: scoringRules.defense.shutOut });
    } 
    // 2. Hold < 10 (3 pts, Win Only)
    else if (pointsAllowed < 10 && isWin) {
      details.push({ reason: 'Held Opponent < 10 Pts (Win)', points: scoringRules.defense.holdMinus10 });
    }

    // 3. Defensive Actions from scoringPlays
    let defensiveTds = 0;
    let safeties = 0;

    for (const play of summary.scoringPlays) {
      const isForTeam = play.team.id === teamId;
      const type = play.type.text;

      if (isForTeam) {
        if (type.includes('Interception Return Touchdown') || type.includes('Fumble Recovery Touchdown')) {
          defensiveTds++;
        }
        if (type.includes('Safety')) {
          safeties++;
        }
      }
    }

    if (defensiveTds > 0) {
      details.push({ reason: `${defensiveTds} Defensive TD(s)`, points: defensiveTds * scoringRules.defense.td });
    }
    if (safeties > 0) {
      details.push({ reason: `${safeties} Safety`, points: safeties * scoringRules.defense.safety });
    }
  }

  private static addBoxscorePoints(playerId: string, summary: EspnSummary, details: ScoringDetail[]) {
    // Find the player in the boxscore
    for (const teamData of summary.boxscore.players) {
      for (const group of teamData.statistics) {
        const line = group.athletes.find(a => a.athlete.id === playerId);
        if (!line) continue;

        const statMap = this.mapLabelsToStats(group.labels, line.stats);

        if (group.name === 'rushing') {
          const yds = parseInt(statMap['YDS'] || '0');
          this.addRangeBonus(yds, scoringRules.rushingGameTotal, 'Rushing Total', details);
        } else if (group.name === 'passing') {
          const yds = parseInt(statMap['YDS'] || '0');
          this.addRangeBonus(yds, scoringRules.passingGameTotal, 'Passing Total', details);
        } else if (group.name === 'receiving') {
          const yds = parseInt(statMap['YDS'] || '0');
          this.addRangeBonus(yds, scoringRules.receivingGameTotal, 'Receiving Total', details);
        } else if (group.name === 'kicking') {
          // PATs are usually in the boxscore as "XP" or similar
          // Note: scoringPlays is better for FGs but boxscore is good for PAT totals
          const xp = statMap['XP'] || '0/0'; // Usually "1/1"
          const made = parseInt(xp.split('/')[0]);
          if (made > 0) {
            details.push({ reason: `${made} PAT(s)`, points: made * scoringRules.kicking.pat });
          }
        }
      }
    }
  }

  private static addScoringPlayPoints(playerId: string, summary: EspnSummary, details: ScoringDetail[]) {
    const playerName = this.getPlayerName(playerId, summary);
    if (!playerName) return;

    for (const play of summary.scoringPlays) {
      const text = play.text;
      const yards = this.parseYardage(text);
      const type = play.type.text;

      // 1. Rushing Touchdown
      // Format: "Drake Maye 6 Yd Rush"
      if (type === 'Rushing Touchdown') {
        if (text.startsWith(playerName)) {
          this.addDistancePoints(yards, scoringRules.tdRushing, `Rushing TD (${yards} yds)`, details);
        }
      } 
      
      // 2. Passing / Receiving Touchdown
      // Format: "Courtland Sutton 6 Yd pass from Jarrett Stidham"
      else if (type === 'Passing Touchdown') {
        // Check if receiver: Starts with name
        if (text.startsWith(playerName)) {
          this.addDistancePoints(yards, scoringRules.tdPassingReceiving, `Receiving TD (${yards} yds)`, details);
        }
        // Check if passer: Name is after "pass from"
        else if (text.includes(`pass from ${playerName}`)) {
          this.addDistancePoints(yards, scoringRules.tdPassingReceiving, `Passing TD (${yards} yds)`, details);
        }
      }

      // 3. Field Goal
      // Format: "Andy Borregales 23 Yd Field Goal"
      else if (type === 'Field Goal Good') {
        if (text.startsWith(playerName)) {
          this.addDistancePoints(yards, scoringRules.kicking, `FG (${yards} yds)`, details);
        }
      }

      // 4. Two-Point Conversions (Always in parentheses)
      // Format: "... (Baker Mayfield Pass to Chris Godwin Jr. for Two-Point Conversion)"
      // Format: "... (Breece Hall Rush for Two-Point Conversion)"
      const conversionMatch = text.match(/\(([^)]+for Two-Point Conversion)\)/i);
      if (conversionMatch) {
        const convText = conversionMatch[1];
        
        // Pass Conversion
        if (convText.includes('Pass to')) {
            const [passerPart, receiverPart] = convText.split(' Pass to ');
            if (passerPart.includes(playerName)) {
                details.push({ reason: '2-Pt Conversion (Pass)', points: (scoringRules as any).conversions.pass });
            } else if (receiverPart.includes(playerName)) {
                details.push({ reason: '2-Pt Conversion (Reception)', points: (scoringRules as any).conversions.receive });
            }
        } 
        // Rush/Run Conversion
        else if (convText.includes('Rush') || convText.includes('Run')) {
            if (convText.includes(playerName)) {
                details.push({ reason: '2-Pt Conversion (Rush)', points: (scoringRules as any).conversions.rush });
            }
        }
      }
    }
  }

  private static mapLabelsToStats(labels: string[], stats: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    labels.forEach((label, i) => {
      map[label] = stats[i];
    });
    return map;
  }

  private static parseYardage(text: string): number {
    const match = text.match(/(\d+)\s+Yd/i);
    return match ? parseInt(match[1]) : 0;
  }

  private static getPlayerName(playerId: string, summary: EspnSummary): string | null {
    for (const team of summary.boxscore.players) {
      for (const group of team.statistics) {
        const line = group.athletes.find(a => a.athlete.id === playerId);
        if (line) return line.athlete.displayName;
      }
    }
    return null;
  }

  private static addRangeBonus(value: number, rules: Record<string, number>, label: string, details: ScoringDetail[]) {
    for (const [range, points] of Object.entries(rules)) {
      if (this.isInRange(value, range)) {
        details.push({ reason: `${label}: ${value} yds`, points });
        break; // Only highest range applies
      }
    }
  }

  private static addDistancePoints(yards: number, rules: Record<string, number>, label: string, details: ScoringDetail[]) {
    for (const [range, points] of Object.entries(rules)) {
      if (this.isInRange(yards, range)) {
        details.push({ reason: label, points });
        break;
      }
    }
  }

  private static isInRange(value: number, rangeStr: string): boolean {
    if (rangeStr.endsWith('+')) {
      const min = parseInt(rangeStr);
      return value >= min;
    }
    const [min, max] = rangeStr.split('-').map(Number);
    return value >= min && value <= max;
  }
}

import { describe, it, expect } from 'vitest';
import { ScoringEngine, EspnSummary } from './scoring-engine';

describe('ScoringEngine', () => {
  const mockSummary: EspnSummary = {
    id: '1',
    header: {
      competitions: [{
        competitors: [
          { id: '12', score: '31', winner: true },
          { id: '7', score: '7', winner: false }
        ],
        status: {
          type: { name: 'STATUS_FINAL', description: 'Final', detail: 'Final' }
        }
      }]
    },
    scoringPlays: [
      {
        id: 'p1',
        type: { id: '67', text: 'Passing Touchdown', abbreviation: 'TD' },
        text: 'Travis Kelce 25 Yd pass from Patrick Mahomes',
        awayScore: 0, homeScore: 7,
        team: { id: '12' }
      },
      {
        id: 'p2',
        type: { id: '68', text: 'Rushing Touchdown', abbreviation: 'TD' },
        text: 'Patrick Mahomes 5 Yd Rush',
        awayScore: 0, homeScore: 14,
        team: { id: '12' }
      }
    ],
    boxscore: {
      players: [
        {
          team: { id: '12', abbreviation: 'KC' },
          statistics: [
            {
              name: 'passing',
              labels: ['C/ATT', 'YDS', 'TD', 'INT'],
              athletes: [{
                athlete: { id: '101', displayName: 'Patrick Mahomes' },
                stats: ['25/35', '315', '1', '0']
              }]
            },
            {
              name: 'rushing',
              labels: ['CAR', 'YDS', 'TD'],
              athletes: [{
                athlete: { id: '101', displayName: 'Patrick Mahomes' },
                stats: ['5', '45', '1']
              }]
            },
            {
              name: 'receiving',
              labels: ['REC', 'YDS', 'TD'],
              athletes: [{
                athlete: { id: '102', displayName: 'Travis Kelce' },
                stats: ['8', '110', '1']
              }]
            }
          ]
        }
      ]
    }
  };

  it('should calculate QB score correctly (Mahomes)', () => {
    const result = ScoringEngine.calculatePlayerScore('101', mockSummary);
    
    // Passing: 315 yds -> 2 pts (range 300-399)
    // Passing TD: 25 yds -> 3 pts (range 20-29)
    // Rushing TD: 5 yds -> 2 pts (range 0-5)
    // Total expected: 7 pts
    
    expect(result.totalPoints).toBe(7);
    expect(result.details).toContainEqual({ reason: 'Passing Total: 315 yds', points: 2 });
    expect(result.details).toContainEqual({ reason: 'Passing TD (25 yds)', points: 3 });
    expect(result.details).toContainEqual({ reason: 'Rushing TD (5 yds)', points: 2 });
  });

  it('should calculate WR/TE score correctly (Kelce)', () => {
    const result = ScoringEngine.calculatePlayerScore('102', mockSummary);
    
    // Receiving: 110 yds -> 2 pts (range 100-149)
    // Receiving TD: 25 yds -> 3 pts (range 20-29)
    // Total expected: 5 pts
    
    expect(result.totalPoints).toBe(5);
    expect(result.details).toContainEqual({ reason: 'Receiving Total: 110 yds', points: 2 });
    expect(result.details).toContainEqual({ reason: 'Receiving TD (25 yds)', points: 3 });
  });

  it('should calculate D/ST score correctly (KC)', () => {
    const result = ScoringEngine.calculatePlayerScore('12', mockSummary, 'D/ST');
    
    // Points Allowed: 7 (Win) -> 3 pts (Hold < 10)
    expect(result.totalPoints).toBe(3);
    expect(result.details).toContainEqual({ reason: 'Held Opponent < 10 Pts (Win)', points: 3 });
  });
});

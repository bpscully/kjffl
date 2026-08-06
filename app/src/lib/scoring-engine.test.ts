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

  it('should apply Puka Nacua\'s flex bonus from 2025 Week 2', () => {
    const pukaWeekTwoSummary: EspnSummary = {
      id: '401772724',
      header: {
        competitions: [{
          competitors: [
            { id: '14', score: '33', winner: true },
            { id: '10', score: '19', winner: false },
          ],
          status: {
            type: { name: 'STATUS_FINAL', description: 'Final', detail: 'Final' },
          },
        }],
      },
      scoringPlays: [{
        id: 'puka-rush-td',
        type: { id: '68', text: 'Rushing Touchdown', abbreviation: 'TD' },
        text: 'Puka Nacua 45 Yd Rush (Joshua Karty Kick)',
        awayScore: 0,
        homeScore: 7,
        team: { id: '14' },
      }],
      boxscore: {
        players: [{
          team: { id: '14', abbreviation: 'LAR' },
          statistics: [
            {
              name: 'rushing',
              labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'],
              athletes: [{
                athlete: { id: '4426515', displayName: 'Puka Nacua' },
                stats: ['1', '45', '45.0', '1', '45'],
              }],
            },
            {
              name: 'receiving',
              labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'],
              athletes: [{
                athlete: { id: '4426515', displayName: 'Puka Nacua' },
                stats: ['8', '91', '11.4', '0', '24', '9'],
              }],
            },
          ],
        }],
      },
    };

    const result = ScoringEngine.calculatePlayerScore('4426515', pukaWeekTwoSummary);

    expect(result.totalPoints).toBe(6);
    expect(result.details).toContainEqual({ reason: 'Rushing TD (45 yds)', points: 5 });
    expect(result.details).toContainEqual({
      reason: 'Flex Bonus: 136 combined yds (45 rush, 91 receiving)',
      points: 1,
    });
  });

  it('should calculate D/ST score correctly (KC)', () => {
    const result = ScoringEngine.calculatePlayerScore('12', mockSummary, 'D/ST');
    
    // Points Allowed: 7 (Win) -> 3 pts (Hold < 10)
    expect(result.totalPoints).toBe(3);
    expect(result.details).toContainEqual({ reason: 'Held Opponent < 10 Pts (Win)', points: 3 });
  });

  it('should calculate 2-pt conversions correctly (Baker Mayfield)', () => {
    const conversionSummary: EspnSummary = {
        id: '2',
        header: {
          competitions: [{
            competitors: [
              { id: '27', score: '28', winner: true },
              { id: '1', score: '14', winner: false }
            ],
            status: { type: { name: 'STATUS_FINAL', description: 'Final', detail: 'Final' } }
          }]
        },
        scoringPlays: [
          {
            id: 'cp1',
            type: { id: '67', text: 'Passing Touchdown', abbreviation: 'TD' },
            text: 'Chris Godwin Jr. 3 Yd pass from Baker Mayfield (Baker Mayfield Pass to Chris Godwin Jr. for Two-Point Conversion)',
            awayScore: 14, homeScore: 28,
            team: { id: '27' }
          }
        ],
        boxscore: {
          players: [
            {
              team: { id: '27', abbreviation: 'TB' },
              statistics: [
                {
                  name: 'passing',
                  labels: ['C/ATT', 'YDS', 'TD'],
                  athletes: [{
                    athlete: { id: '201', displayName: 'Baker Mayfield' },
                    stats: ['20/30', '250', '1']
                  }]
                },
                {
                  name: 'receiving',
                  labels: ['REC', 'YDS', 'TD'],
                  athletes: [{
                    athlete: { id: '202', displayName: 'Chris Godwin Jr.' },
                    stats: ['5', '60', '1']
                  }]
                }
              ]
            }
          ]
        }
    };

    const bakerResult = ScoringEngine.calculatePlayerScore('201', conversionSummary);
    const godwinResult = ScoringEngine.calculatePlayerScore('202', conversionSummary);

    // Baker: Passing TD (3 yds) -> 2 pts, 2-pt Conv -> 1 pt. Total = 3
    expect(bakerResult.details).toContainEqual({ reason: '2-Pt Conversion (Pass)', points: 1 });
    expect(bakerResult.totalPoints).toBe(3);

    // Godwin: Receiving TD (3 yds) -> 2 pts, 2-pt Conv -> 1 pt. Total = 3
    expect(godwinResult.details).toContainEqual({ reason: '2-Pt Conversion (Reception)', points: 1 });
    expect(godwinResult.totalPoints).toBe(3);
  });
});

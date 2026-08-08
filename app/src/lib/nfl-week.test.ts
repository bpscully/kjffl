import { describe, expect, it } from 'vitest';
import { getDefaultNflWeek, getSeasonOptions } from './nfl-week';

describe('nfl week defaults', () => {
  it('uses current year through the upcoming season before week 1 starts', () => {
    expect(getDefaultNflWeek(new Date(2026, 7, 8))).toEqual({ season: 2026, week: 1 });
  });

  it('starts week 1 on the Thursday after Labor Day', () => {
    expect(getDefaultNflWeek(new Date(2026, 8, 10))).toEqual({ season: 2026, week: 1 });
    expect(getDefaultNflWeek(new Date(2026, 8, 17))).toEqual({ season: 2026, week: 2 });
  });

  it('uses the previous season in January and February', () => {
    expect(getDefaultNflWeek(new Date(2027, 0, 15))).toEqual({ season: 2026, week: 18 });
  });

  it('offers current year through current year minus three', () => {
    expect(getSeasonOptions(new Date(2026, 7, 8))).toEqual([2026, 2025, 2024, 2023]);
  });
});

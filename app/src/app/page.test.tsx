import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('@/hooks/use-roster', () => ({
  useRoster: () => ({
    roster: [],
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    clearRoster: vi.fn(),
    toggleStarter: vi.fn(),
    isLoaded: true,
  }),
}));

vi.mock('@/hooks/use-player-updates', () => ({
  usePlayerUpdates: () => ({ updates: {}, isLoadingUpdates: false, fetchUpdates: vi.fn() }),
}));

vi.mock('@/hooks/use-upset-special-pick', () => ({
  useUpsetSpecialPick: () => ({ pick: {}, updatePick: vi.fn() }),
}));

vi.mock('@/hooks/use-upset-special-score', () => ({
  useUpsetSpecialScore: () => ({
    score: undefined,
    error: null,
    isScoring: false,
    refreshScore: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-over-under-pick', () => ({
  useOverUnderPick: () => ({ pick: {}, updatePick: vi.fn() }),
}));

vi.mock('@/hooks/use-over-under-score', () => ({
  useOverUnderScore: () => ({
    score: undefined,
    error: null,
    isScoring: false,
    refreshScore: vi.fn(),
    canScore: false,
  }),
}));

vi.mock('@/hooks/use-week-matchups', () => ({
  useWeekMatchups: () => ({ matchups: [], error: null, isLoading: false }),
}));

vi.mock('@/components/features/player-search', () => ({
  PlayerSearch: () => <div>Player search</div>,
}));

vi.mock('@/components/features/upset-special-picker', () => ({
  UpsetSpecialPicker: () => <div>Upset Special</div>,
}));

vi.mock('@/components/features/over-under-picker', () => ({
  OverUnderPicker: () => <div>Over / Under</div>,
}));

vi.mock('@/components/features/weekly-score-summary', () => ({
  WeeklyScoreSummary: () => <div>Weekly Score</div>,
}));

describe('Home', () => {
  it('keeps the Bench section visible when it is empty', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
    expect(screen.getByText(
      'No players on the bench. Use the Sit button on a starter to move them here.',
    )).toBeInTheDocument();
  });
});

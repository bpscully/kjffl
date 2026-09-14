import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player, RosterPlayer } from '@/types';
import Home from './page';

const rosterMocks = vi.hoisted(() => ({
  roster: [] as RosterPlayer[],
  addPlayer: vi.fn(),
}));

const selectedPlayer: Player = {
  id: '1234',
  name: 'Example Player',
  pos: 'WR',
  team: 'SEA',
  teamId: '26',
};

vi.mock('@/hooks/use-roster', () => ({
  useRoster: () => ({
    roster: rosterMocks.roster,
    addPlayer: rosterMocks.addPlayer,
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
  PlayerSearch: ({ onSelectPlayer }: { onSelectPlayer: (player: Player) => void }) => (
    <button onClick={() => onSelectPlayer(selectedPlayer)}>Add test player</button>
  ),
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
  beforeEach(() => {
    rosterMocks.roster = [];
    rosterMocks.addPlayer.mockReset();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps empty lineup and Bench guidance visible', () => {
    render(<Home />);

    expect(screen.getByText(
      'No starters set. Search and add players or start from the bench',
    )).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
    expect(screen.getByText(
      'No players on the bench. Use the Sit button on a starter to move them here.',
    )).toBeInTheDocument();
  });

  it('confirms that a selected player was added and can reveal its Bench card', () => {
    const { rerender } = render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: 'Add test player' }));

    expect(rosterMocks.addPlayer).toHaveBeenCalledWith(selectedPlayer);
    expect(screen.getByRole('status')).toHaveTextContent('Example Player added to Bench.');

    rosterMocks.roster = [{
      ...selectedPlayer,
      addedAt: 1,
      isStarter: false,
    }];
    rerender(<Home />);
    const benchCard = document.getElementById(`bench-player-${selectedPlayer.id}`);
    const scrollIntoView = vi.fn();
    if (benchCard) benchCard.scrollIntoView = scrollIntoView;

    expect(benchCard).toHaveClass('ring-2');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('reports a duplicate player without adding them again', () => {
    rosterMocks.roster = [{
      ...selectedPlayer,
      addedAt: 1,
      isStarter: false,
    }];
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: 'Add test player' }));

    expect(rosterMocks.addPlayer).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      "Example Player is already on this week's roster.",
    );
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerCard } from './player-card';
import { PlayerUpdateResult, RosterPlayer } from '@/types';

const player: RosterPlayer = {
  id: '1234',
  name: 'Example Player',
  pos: 'WR',
  team: 'SEA',
  teamId: '26',
  addedAt: 1,
  isStarter: true,
};

const updates: PlayerUpdateResult = {
  playerId: player.id,
  news: [{
    id: 'news-1',
    headline: 'Player returns to practice',
    description: 'The complete summary remains available inside the application.',
    publishedAt: '2026-08-18T10:00:00Z',
    source: 'RotoWire',
  }],
  injury: {
    designation: 'Q',
    label: 'questionable',
    updatedAt: '2026-08-18T09:00:00Z',
    shortComment: 'Limited in practice.',
    longComment: 'The player will be evaluated again before game day.',
    source: 'RotoWire',
  },
};

describe('PlayerCard updates', () => {
  afterEach(() => vi.useRealTimers());

  it('shows recent in-app news and keeps news and scoring expansions exclusive', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T12:00:00Z'));

    render(
      <PlayerCard
        player={player}
        updates={{ ...updates, injury: null }}
        score={7}
        scoreDetails={[{ reason: 'Reception', points: 1 }]}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    const newsButton = screen.getByRole('button', { name: 'Recent news for Example Player' });
    expect(newsButton).toHaveClass('text-amber-600');

    fireEvent.click(screen.getByText('Pts'));
    expect(screen.getByText('Scoring Breakdown')).toBeInTheDocument();

    fireEvent.click(newsButton);
    expect(screen.queryByText('Scoring Breakdown')).not.toBeInTheDocument();
    expect(screen.getByText('Player returns to practice')).toBeInTheDocument();
    expect(screen.getByText('The complete summary remains available inside the application.')).toBeInTheDocument();
    expect(screen.getByText('RotoWire player update')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses the injury icon for a shared injury and news expansion', () => {
    render(
      <PlayerCard
        player={player}
        updates={updates}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'questionable updates for Example Player' }));

    expect(screen.getByText('Player Updates')).toBeInTheDocument();
    expect(screen.getByText('questionable')).toBeInTheDocument();
    expect(screen.getByText('Player returns to practice')).toBeInTheDocument();
    expect(screen.getByText('The complete summary remains available inside the application.')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="popover-content"]')).not.toBeInTheDocument();
  });

  it('shows injury comments in the expansion when there is no news note', () => {
    render(
      <PlayerCard
        player={player}
        updates={{ ...updates, news: [] }}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'questionable updates for Example Player' }));
    expect(screen.getByText('Limited in practice.')).toBeInTheDocument();
    expect(screen.getByText('The player will be evaluated again before game day.')).toBeInTheDocument();
  });

  it('does not repeat status-only injury comments', () => {
    render(
      <PlayerCard
        player={player}
        updates={{
          ...updates,
          news: [],
          injury: {
            ...updates.injury!,
            shortComment: '',
            longComment: '',
            source: undefined,
          },
        }}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'questionable updates for Example Player' }));
    expect(screen.getAllByText('questionable')).toHaveLength(1);
    expect(screen.queryByText(/injury update/i)).not.toBeInTheDocument();
  });

  it('does not show player updates for D/ST cards', () => {
    render(
      <PlayerCard
        player={{ ...player, pos: 'D/ST' }}
        updates={updates}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /news for/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /questionable updates/i })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        updates={updates}
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

  it('shows injury details in an in-app popover', async () => {
    render(
      <PlayerCard
        player={player}
        updates={updates}
        onRemove={vi.fn()}
        onToggleStarter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'questionable for Example Player' }));
    await waitFor(() => {
      expect(screen.getByText('Limited in practice.')).toBeInTheDocument();
      expect(screen.getByText('The player will be evaluated again before game day.')).toBeInTheDocument();
      expect(screen.getByText('Source: RotoWire')).toBeInTheDocument();
    });
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
    expect(screen.queryByRole('button', { name: /questionable for/i })).not.toBeInTheDocument();
  });
});

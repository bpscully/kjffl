import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverUnderPick } from '@/hooks/use-over-under-pick';
import { UpsetSpecialPick } from '@/hooks/use-upset-special-pick';
import { RosterPlayer, WeekMatchup } from '@/types';
import { LineupCopyButton } from './lineup-copy-button';

const matchups: WeekMatchup[] = [
  {
    eventId: 'ne-sea',
    name: 'New England Patriots at Seattle Seahawks',
    shortName: 'NE @ SEA',
    teams: [
      { id: '17', abbreviation: 'NE', name: 'New England Patriots' },
      { id: '26', abbreviation: 'SEA', name: 'Seattle Seahawks' },
    ],
  },
  {
    eventId: 'dal-nyg',
    name: 'Dallas Cowboys at New York Giants',
    shortName: 'DAL @ NYG',
    teams: [
      { id: '6', abbreviation: 'DAL', name: 'Dallas Cowboys' },
      { id: '19', abbreviation: 'NYG', name: 'New York Giants' },
    ],
  },
];

const emptyUpsetPick: UpsetSpecialPick = { pickedTeamId: '', spread: '' };
const emptyOverUnderPick: OverUnderPick = {
  eventId: '',
  line: '',
  mode: 'game-total',
  call: '',
  pickedTeamId: '',
};

function player(name: string, pos: string, team = 'TEST'): RosterPlayer {
  return {
    id: `${name}-${pos}`,
    name,
    pos,
    team,
    teamId: team,
    addedAt: 1,
    isStarter: true,
  };
}

describe('LineupCopyButton', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('copies starters grouped by position followed by both compact picks', async () => {
    const starters = [
      player('Chris Olave', 'WR'),
      player('Caleb Williams', 'QB'),
      player('Chase Brown', 'RB'),
      player('Derrick Henry', 'RB'),
      player('Zay Flowers', 'WR'),
      player('Ladd McConkey', 'WR'),
      player('Garrett Wilson', 'WR'),
      player('Jake Bates', 'K'),
      player('Pittsburgh Steelers D/ST', 'D/ST', 'PIT'),
    ];

    render(
      <LineupCopyButton
        starters={starters}
        upsetPick={{ pickedTeamId: '17', spread: '3.5' }}
        overUnderPick={{
          eventId: 'dal-nyg',
          line: '48.5',
          mode: 'game-total',
          call: 'over',
          pickedTeamId: '',
        }}
        matchups={matchups}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy lineup' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      'C. Williams\n' +
      'C. Brown D. Henry\n' +
      'C. Olave Z. Flowers L. McConkey G. Wilson\n' +
      'J. Bates\n' +
      'PIT D/ST\n' +
      'NE +3.5\n' +
      'DAL/NYG O 48.5',
    );
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Lineup copied');
  });

  it('preserves family names and copies only a completed one-team pick', async () => {
    render(
      <LineupCopyButton
        starters={[
          player('Amon-Ra St. Brown', 'WR'),
          player('Marvin Harrison Jr.', 'WR'),
          player('Tucker Kraft', 'TE'),
        ]}
        upsetPick={emptyUpsetPick}
        overUnderPick={{
          eventId: 'dal-nyg',
          line: '49.5',
          mode: 'one-team',
          call: '',
          pickedTeamId: '6',
        }}
        matchups={matchups}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy lineup' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      'A. St. Brown M. Harrison Jr.\nT. Kraft\nDAL One-Team O 49.5',
    );
  });

  it('uses Picks TBD when neither pick is complete', async () => {
    render(
      <LineupCopyButton
        starters={[player('Jordan Love', 'QB')]}
        upsetPick={emptyUpsetPick}
        overUnderPick={emptyOverUnderPick}
        matchups={matchups}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy lineup' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('J. Love\nPicks TBD'));
  });

  it('is disabled when no starters or completed picks are set', () => {
    render(
      <LineupCopyButton
        starters={[]}
        upsetPick={emptyUpsetPick}
        overUnderPick={emptyOverUnderPick}
        matchups={matchups}
      />,
    );

    expect(screen.getByRole('button', { name: 'Copy lineup' })).toBeDisabled();
  });

  it('shows an accessible clipboard failure', async () => {
    writeText.mockRejectedValueOnce(new Error('Permission denied'));
    render(
      <LineupCopyButton
        starters={[player('Jordan Love', 'QB')]}
        upsetPick={emptyUpsetPick}
        overUnderPick={emptyOverUnderPick}
        matchups={matchups}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy lineup' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to copy lineup');
  });
});

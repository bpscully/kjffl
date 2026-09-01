import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OverUnderPick } from '@/hooks/use-over-under-pick';
import { OverUnderPicker } from './over-under-picker';

const matchups = [{
  eventId: '401772999',
  name: 'Arizona Cardinals at Los Angeles Chargers',
  shortName: 'ARI @ LAC',
  teams: [
    { id: '22', abbreviation: 'ARI', name: 'Arizona Cardinals' },
    { id: '24', abbreviation: 'LAC', name: 'Los Angeles Chargers' },
  ],
}];

const emptyPick: OverUnderPick = {
  eventId: '',
  line: '',
  mode: 'game-total',
  call: '',
  pickedTeamId: '',
};

function PickerHarness({ onPickLabelChange = vi.fn() }) {
  const [pick, setPick] = useState(emptyPick);
  return (
    <OverUnderPicker
      matchups={matchups}
      matchupError=""
      isLoadingMatchups={false}
      pick={pick}
      updatePick={(updates) => setPick((current) => ({ ...current, ...updates }))}
      score={null}
      error=""
      isScoring={false}
      onPickLabelChange={onPickLabelChange}
    />
  );
}

describe('OverUnderPicker', () => {
  it('reveals the active mode controls and calculates the one-team ranges', async () => {
    const onPickLabelChange = vi.fn();
    render(<PickerHarness onPickLabelChange={onPickLabelChange} />);

    fireEvent.change(screen.getByLabelText('O/U matchup'), { target: { value: '401772999' } });
    fireEvent.change(screen.getByLabelText('O/U line'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'One Team' }));

    expect(screen.getByText('3 pts: 31–40 · 4 pts: 41+')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ARI' }));

    await waitFor(() => {
      expect(onPickLabelChange).toHaveBeenLastCalledWith('ARI — One Team, O/U 40');
    });
  });

  it('shows the final zero-point outcome instead of a generic message', () => {
    render(
      <OverUnderPicker
        matchups={matchups}
        matchupError=""
        isLoadingMatchups={false}
        pick={{ ...emptyPick, eventId: '401772999', line: '40', call: 'over' }}
        updatePick={vi.fn()}
        score={{
          mode: 'game-total',
          line: 40,
          call: 'over',
          totalPoints: 0,
          details: [{ reason: 'Push: 40 total vs 40', points: 0 }],
          gameStatus: 'Final',
          gameStatusType: 'STATUS_FINAL',
          isFinal: true,
          outcome: 'push',
          actualTotal: 40,
        }}
        error=""
        isScoring={false}
        onPickLabelChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Push: 40 total vs 40')).toBeInTheDocument();
    expect(screen.getByText('0.00', { selector: 'span' })).toBeInTheDocument();
  });

  it('explains that a scheduled pick will score only after the final', () => {
    render(
      <OverUnderPicker
        matchups={matchups}
        matchupError=""
        isLoadingMatchups={false}
        pick={{ ...emptyPick, eventId: '401772999', line: '40', call: 'under' }}
        updatePick={vi.fn()}
        score={{
          mode: 'game-total',
          line: 40,
          call: 'under',
          totalPoints: 0,
          details: [],
          gameStatus: 'Sun, Sep 13, 1:25 PM PDT',
          gameStatusType: 'STATUS_SCHEDULED',
          isFinal: false,
          outcome: 'pending',
        }}
        error=""
        isScoring={false}
        onPickLabelChange={vi.fn()}
      />,
    );

    expect(screen.getByText('O/U points will be awarded after the game is final.')).toBeInTheDocument();
  });
});

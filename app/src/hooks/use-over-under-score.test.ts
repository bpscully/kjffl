import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverUnderPick } from './use-over-under-pick';
import { useOverUnderScore } from './use-over-under-score';

const finalResult = {
  mode: 'game-total' as const,
  line: 40,
  call: 'over' as const,
  totalPoints: 2,
  details: [{ reason: 'Over hit: 44 total vs 40', points: 2 }],
  gameStatus: 'Final',
  gameStatusType: 'STATUS_FINAL',
  isFinal: true,
  outcome: 'win' as const,
  actualTotal: 44,
};

const gameTotalPick: OverUnderPick = {
  eventId: '401772999',
  line: '40',
  mode: 'game-total',
  call: 'over',
  pickedTeamId: '',
};

describe('useOverUnderScore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: finalResult }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('automatically scores a valid game-total pick after the input debounce', async () => {
    const { result } = renderHook(() => useOverUnderScore(2026, 2, 1, gameTotalPick));

    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetch).toHaveBeenCalledWith('/api/over-under', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        season: 2026,
        seasonType: 2,
        week: 1,
        eventId: '401772999',
        line: 40,
        mode: 'game-total',
        call: 'over',
      }),
    }));
    expect(result.current.score).toEqual(finalResult);
    expect(result.current.canScore).toBe(true);
  });

  it('does not request a score until the active mode is complete', async () => {
    const incompletePick: OverUnderPick = { ...gameTotalPick, call: '' };
    const { result } = renderHook(() => useOverUnderScore(2026, 2, 1, incompletePick));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.canScore).toBe(false);
  });

  it('sends only the selected team for the one-team mode', async () => {
    const oneTeamPick: OverUnderPick = {
      ...gameTotalPick,
      mode: 'one-team',
      pickedTeamId: '22',
    };
    renderHook(() => useOverUnderScore(2026, 2, 1, oneTeamPick));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetch).toHaveBeenCalledWith('/api/over-under', expect.objectContaining({
      body: JSON.stringify({
        season: 2026,
        seasonType: 2,
        week: 1,
        eventId: '401772999',
        line: 40,
        mode: 'one-team',
        pickedTeamId: '22',
      }),
    }));
  });

  it('clears the prior score when the pick changes', async () => {
    const { result, rerender } = renderHook(
      ({ line }) => useOverUnderScore(2026, 2, 1, { ...gameTotalPick, line }),
      { initialProps: { line: '40' } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.score).toEqual(finalResult);

    rerender({ line: '40.5' });
    expect(result.current.score).toBeNull();
  });
});

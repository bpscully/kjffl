import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpsetSpecialScore } from './use-upset-special-score';

const finalResult = {
  pickedTeamId: '27',
  totalPoints: 4,
  details: [{ reason: 'Underdog Win (+3.5)', points: 4 }],
  gameStatus: 'Final',
  gameStatusType: 'STATUS_FINAL',
  isFinal: true,
};

describe('useUpsetSpecialScore', () => {
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

  it('automatically scores a valid pick after the input debounce', async () => {
    const { result } = renderHook(() => useUpsetSpecialScore(
      2026,
      2,
      1,
      { pickedTeamId: '27', spread: '3.5' },
    ));

    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/upset-special', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        season: 2026,
        seasonType: 2,
        week: 1,
        pickedTeamId: '27',
        spread: 3.5,
      }),
    }));
    expect(result.current.score).toEqual(finalResult);
  });

  it('does not request a score for an incomplete pick', async () => {
    renderHook(() => useUpsetSpecialScore(
      2026,
      2,
      1,
      { pickedTeamId: '27', spread: '' },
    ));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('clears the previous result and recalculates when the pick changes', async () => {
    const { result, rerender } = renderHook(
      ({ spread }) => useUpsetSpecialScore(
        2026,
        2,
        1,
        { pickedTeamId: '27', spread },
      ),
      { initialProps: { spread: '3.5' } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.score).toEqual(finalResult);

    rerender({ spread: '7.5' });
    expect(result.current.score).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/upset-special', expect.objectContaining({
      body: JSON.stringify({
        season: 2026,
        seasonType: 2,
        week: 1,
        pickedTeamId: '27',
        spread: 7.5,
      }),
    }));
  });
});

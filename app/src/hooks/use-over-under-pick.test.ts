import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOverUnderPick } from './use-over-under-pick';

describe('useOverUnderPick', () => {
  beforeEach(() => localStorage.clear());

  it('persists independent picks by season type and week', async () => {
    const { result, rerender } = renderHook(
      ({ week }) => useOverUnderPick(2026, 2, week),
      { initialProps: { week: 1 } },
    );

    act(() => result.current.updatePick({
      eventId: '401772999',
      line: '40',
      call: 'over',
    }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('kjffl-over-under-picks') || '{}')).toMatchObject({
        '2026-2-1': {
          eventId: '401772999',
          line: '40',
          mode: 'game-total',
          call: 'over',
        },
      });
    });

    rerender({ week: 2 });
    expect(result.current.pick.eventId).toBe('');

    rerender({ week: 1 });
    expect(result.current.pick).toMatchObject({
      eventId: '401772999',
      line: '40',
      call: 'over',
    });
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoster } from './use-roster';

const storedRoster = [{
  id: '4426515',
  name: 'Puka Nacua',
  pos: 'WR',
  team: 'LAR',
  teamId: '14',
  addedAt: 1,
  isStarter: true,
}];

describe('useRoster', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kjffl-roster', JSON.stringify(storedRoster));
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  it('clears roster state and persisted storage', async () => {
    const { result } = renderHook(() => useRoster());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.roster).toEqual(storedRoster);

    act(() => result.current.clearRoster());

    expect(result.current.roster).toEqual([]);
    await waitFor(() => {
      expect(localStorage.getItem('kjffl-roster')).toBe('[]');
    });
  });
});

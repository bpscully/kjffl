import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player, RosterPlayer } from '@/types';
import { useRoster } from './use-roster';

const starter: RosterPlayer = {
  id: '4426515',
  name: 'Puka Nacua',
  pos: 'WR',
  team: 'LAR',
  teamId: '14',
  addedAt: 1,
  isStarter: true,
};

const benchPlayer: RosterPlayer = {
  id: '4360569',
  name: 'Jordan Mason',
  pos: 'RB',
  team: 'MIN',
  teamId: '16',
  addedAt: 2,
  isStarter: false,
};

const waiverPlayer: Player = {
  id: '9999',
  name: 'Waiver Player',
  pos: 'WR',
  team: 'SEA',
  teamId: '26',
};

type HookProps = { season: number; seasonType: number; week: number };

const renderRoster = (initialProps: HookProps) => renderHook(
  ({ season, seasonType, week }: HookProps) => useRoster(season, seasonType, week),
  { initialProps },
);

describe('useRoster', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('migrates the legacy roster into the initially selected week', async () => {
    localStorage.setItem('kjffl-roster', JSON.stringify([starter, benchPlayer]));
    const { result } = renderRoster({ season: 2026, seasonType: 2, week: 1 });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.roster).toEqual([starter, benchPlayer]);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('kjffl-weekly-rosters') || '{}')).toEqual({
        '2026-2-1': [starter, benchPlayer],
      });
    });
    expect(JSON.parse(localStorage.getItem('kjffl-roster') || '[]')).toEqual([starter, benchPlayer]);
  });

  it('inherits the latest earlier lineup until the selected week is changed', async () => {
    localStorage.setItem('kjffl-weekly-rosters', JSON.stringify({
      '2026-2-1': [starter, benchPlayer],
    }));
    const { result, rerender } = renderRoster({ season: 2026, seasonType: 2, week: 1 });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    rerender({ season: 2026, seasonType: 2, week: 3 });
    expect(result.current.roster).toEqual([starter, benchPlayer]);
    expect(JSON.parse(localStorage.getItem('kjffl-weekly-rosters') || '{}')).not.toHaveProperty('2026-2-3');

    act(() => result.current.toggleStarter(benchPlayer.id));
    expect(result.current.roster.find((player) => player.id === benchPlayer.id)?.isStarter).toBe(true);

    rerender({ season: 2026, seasonType: 2, week: 1 });
    expect(result.current.roster).toEqual([starter, benchPlayer]);

    rerender({ season: 2026, seasonType: 2, week: 3 });
    expect(result.current.roster.find((player) => player.id === benchPlayer.id)?.isStarter).toBe(true);
  });

  it('keeps membership changes local and carries them into unset later weeks', async () => {
    localStorage.setItem('kjffl-weekly-rosters', JSON.stringify({
      '2026-2-1': [starter],
      '2026-2-4': [starter],
    }));
    const { result, rerender } = renderRoster({ season: 2026, seasonType: 2, week: 2 });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.addPlayer(waiverPlayer));
    expect(result.current.roster.find((player) => player.id === waiverPlayer.id)).toMatchObject({
      ...waiverPlayer,
      isStarter: false,
    });

    act(() => result.current.removePlayer(starter.id));
    expect(result.current.roster.map((player) => player.id)).toEqual([waiverPlayer.id]);

    rerender({ season: 2026, seasonType: 2, week: 3 });
    expect(result.current.roster.map((player) => player.id)).toEqual([waiverPlayer.id]);

    rerender({ season: 2026, seasonType: 2, week: 1 });
    expect(result.current.roster.map((player) => player.id)).toEqual([starter.id]);

    rerender({ season: 2026, seasonType: 2, week: 4 });
    expect(result.current.roster.map((player) => player.id)).toEqual([starter.id]);
  });

  it('does not inherit across seasons or season types', async () => {
    localStorage.setItem('kjffl-weekly-rosters', JSON.stringify({
      '2026-2-1': [starter],
    }));
    const { result, rerender } = renderRoster({ season: 2025, seasonType: 2, week: 2 });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.roster).toEqual([]);

    rerender({ season: 2026, seasonType: 3, week: 1 });
    expect(result.current.roster).toEqual([]);
  });

  it('clears only the selected week and makes that empty snapshot inheritable', async () => {
    localStorage.setItem('kjffl-weekly-rosters', JSON.stringify({
      '2026-2-1': [starter],
      '2026-2-2': [starter, benchPlayer],
    }));
    const { result, rerender } = renderRoster({ season: 2026, seasonType: 2, week: 2 });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.clearRoster());
    expect(result.current.roster).toEqual([]);

    rerender({ season: 2026, seasonType: 2, week: 1 });
    expect(result.current.roster).toEqual([starter]);

    rerender({ season: 2026, seasonType: 2, week: 3 });
    expect(result.current.roster).toEqual([]);
  });
});

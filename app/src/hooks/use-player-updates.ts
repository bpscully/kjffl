'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlayerUpdateResult, RosterPlayer } from '@/types';

export function usePlayerUpdates(roster: RosterPlayer[], enabled = true) {
  const [updates, setUpdates] = useState<Record<string, PlayerUpdateResult>>({});
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);
  const eligiblePlayers = useMemo(
    () => roster.filter((player) => player.pos !== 'D/ST'),
    [roster],
  );

  const fetchUpdates = useCallback(async () => {
    if (!enabled || eligiblePlayers.length === 0) {
      setUpdates({});
      return;
    }

    setIsLoadingUpdates(true);
    try {
      const response = await fetch('/api/player-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: eligiblePlayers.map((player) => ({ id: player.id, pos: player.pos })),
        }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json() as { results?: PlayerUpdateResult[] };
      const updateMap: Record<string, PlayerUpdateResult> = {};
      for (const result of data.results ?? []) {
        updateMap[result.playerId] = result;
      }
      setUpdates(updateMap);
    } catch (error) {
      console.error('Failed to fetch player updates:', error);
    } finally {
      setIsLoadingUpdates(false);
    }
  }, [eligiblePlayers, enabled]);

  useEffect(() => {
    void fetchUpdates();
    if (!enabled || eligiblePlayers.length === 0) return;

    const intervalId = window.setInterval(() => void fetchUpdates(), 15 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [eligiblePlayers.length, enabled, fetchUpdates]);

  return { updates, isLoadingUpdates, fetchUpdates };
}

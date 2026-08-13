'use client';

import { useState, useEffect } from 'react';
import { Player, RosterPlayer } from '@/types';

const STORAGE_KEY = 'kjffl-roster';

export function useRoster() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasRefreshedRoster, setHasRefreshedRoster] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const loadedRoster: RosterPlayer[] = JSON.parse(stored);
        setRoster(loadedRoster);
      } catch (e) {
        console.error('Failed to parse roster from local storage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
    }
  }, [roster, isLoaded]);

  useEffect(() => {
    if (!isLoaded || hasRefreshedRoster || roster.length === 0) return;

    const refreshRosterMetadata = async () => {
      try {
        const ids = roster.map((player) => player.id).join(',');
        const response = await fetch(`/api/players?ids=${encodeURIComponent(ids)}`);
        if (!response.ok) return;

        const data = await response.json();
        const currentPlayers = new Map<string, Player>(
          (data.results || []).map((player: Player) => [player.id, player]),
        );

        setRoster((currentRoster) => currentRoster.map((rosterPlayer) => {
          const currentPlayer = currentPlayers.get(rosterPlayer.id);
          if (!currentPlayer) return rosterPlayer;

          return {
            ...rosterPlayer,
            name: currentPlayer.name,
            pos: currentPlayer.pos,
            team: currentPlayer.team,
            teamId: currentPlayer.teamId,
          };
        }));
      } catch (error) {
        console.error('Failed to refresh roster player metadata', error);
      } finally {
        setHasRefreshedRoster(true);
      }
    };

    refreshRosterMetadata();
  }, [hasRefreshedRoster, isLoaded, roster]);

  const addPlayer = (player: Player) => {
    if (roster.some((p) => p.id === player.id)) {
      return;
    }
    const newPlayer: RosterPlayer = {
      ...player,
      addedAt: Date.now(),
      isStarter: true,
    };
    setRoster((prev) => [...prev, newPlayer]);
  };

  const removePlayer = (playerId: string) => {
    setRoster((prev) => prev.filter((p) => p.id !== playerId));
  };

  const clearRoster = () => {
    setRoster([]);
  };

  const toggleStarter = (playerId: string) => {
    setRoster((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, isStarter: !p.isStarter } : p
      )
    );
  };

  return {
    roster,
    addPlayer,
    removePlayer,
    clearRoster,
    toggleStarter,
    isLoaded,
  };
}

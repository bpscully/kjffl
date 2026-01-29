'use client';

import { useState, useEffect } from 'react';
import { Player, RosterPlayer } from '@/types';

const STORAGE_KEY = 'kjffl-roster';

export function useRoster() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRoster(JSON.parse(stored));
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

  const addPlayer = (player: Player) => {
    if (roster.some((p) => p.id === player.id)) {
      return;
    }
    const newPlayer: RosterPlayer = {
      ...player,
      addedAt: Date.now(),
      isStarter: roster.length < 9, // Simple default logic
    };
    setRoster((prev) => [...prev, newPlayer]);
  };

  const removePlayer = (playerId: string) => {
    setRoster((prev) => prev.filter((p) => p.id !== playerId));
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
    toggleStarter,
    isLoaded,
  };
}

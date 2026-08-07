'use client';

import { useEffect, useMemo, useState } from 'react';

export interface UpsetSpecialPick {
  pickedTeamId: string;
  spread: string;
}

const STORAGE_KEY = 'kjffl-upset-special-picks';

type PickMap = Record<string, UpsetSpecialPick>;

const emptyPick: UpsetSpecialPick = {
  pickedTeamId: '',
  spread: '',
};

export function useUpsetSpecialPick(season: number, seasonType: number, week: number) {
  const [picks, setPicks] = useState<PickMap>(() => {
    if (typeof window === 'undefined') return {};

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse upset special picks from local storage', error);
      return {};
    }
  });
  const pickKey = useMemo(() => `${season}-${seasonType}-${week}`, [season, seasonType, week]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    }
  }, [picks]);

  const pick = picks[pickKey] || emptyPick;

  const updatePick = (updates: Partial<UpsetSpecialPick>) => {
    setPicks((current) => ({
      ...current,
      [pickKey]: {
        ...(current[pickKey] || emptyPick),
        ...updates,
      },
    }));
  };

  return {
    pick,
    updatePick,
  };
}

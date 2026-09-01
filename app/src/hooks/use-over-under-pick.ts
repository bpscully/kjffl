'use client';

import { useEffect, useMemo, useState } from 'react';
import { OverUnderCall, OverUnderMode } from '@/lib/scoring-engine';

export interface OverUnderPick {
  eventId: string;
  line: string;
  mode: OverUnderMode;
  call: OverUnderCall | '';
  pickedTeamId: string;
}

const STORAGE_KEY = 'kjffl-over-under-picks';

type PickMap = Record<string, OverUnderPick>;

const emptyPick: OverUnderPick = {
  eventId: '',
  line: '',
  mode: 'game-total',
  call: '',
  pickedTeamId: '',
};

export function useOverUnderPick(season: number, seasonType: number, week: number) {
  const [picks, setPicks] = useState<PickMap>(() => {
    if (typeof window === 'undefined') return {};

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse over/under picks from local storage', error);
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

  const updatePick = (updates: Partial<OverUnderPick>) => {
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

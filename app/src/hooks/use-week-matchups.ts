'use client';

import { useCallback, useEffect, useState } from 'react';
import { WeekMatchup } from '@/types';

export function useWeekMatchups(season: number, seasonType: number, week: number) {
  const [matchups, setMatchups] = useState<WeekMatchup[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchMatchups = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        season: String(season),
        seasonType: String(seasonType),
        week: String(week),
      });
      const response = await fetch(`/api/week-events?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setMatchups(data.matchups || []);
    } catch (caught) {
      setMatchups([]);
      setError((caught as Error).message || 'Failed to load matchups');
    } finally {
      setIsLoading(false);
    }
  }, [season, seasonType, week]);

  useEffect(() => {
    void fetchMatchups();
  }, [fetchMatchups]);

  return {
    matchups,
    error,
    isLoading,
    refreshMatchups: fetchMatchups,
  };
}

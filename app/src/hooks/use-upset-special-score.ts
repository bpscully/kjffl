'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UpsetSpecialScoreResult } from '@/lib/scoring-engine';
import { UpsetSpecialPick } from '@/hooks/use-upset-special-pick';

const SCORE_DEBOUNCE_MS = 400;

export function useUpsetSpecialScore(
  season: number,
  seasonType: number,
  week: number,
  pick: UpsetSpecialPick,
) {
  const [score, setScore] = useState<UpsetSpecialScoreResult | null>(null);
  const [error, setError] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const requestIdRef = useRef(0);

  const spread = Number(pick.spread);
  const canScore = Boolean(pick.pickedTeamId) && Number.isFinite(spread) && spread > 0;

  const fetchScore = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!canScore) {
      setScore(null);
      setError('');
      setIsScoring(false);
      return;
    }

    setIsScoring(true);
    setError('');

    try {
      const response = await fetch('/api/upset-special', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season,
          seasonType,
          week,
          pickedTeamId: pick.pickedTeamId,
          spread,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (requestId === requestIdRef.current) {
        setScore(data.result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError((err as Error).message || 'Failed to score pick');
        setScore(null);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsScoring(false);
      }
    }
  }, [canScore, pick.pickedTeamId, season, seasonType, spread, week]);

  useEffect(() => {
    requestIdRef.current += 1;
    setScore(null);
    setError('');
    setIsScoring(false);

    if (!canScore) return;

    const timeout = window.setTimeout(() => {
      void fetchScore();
    }, SCORE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      requestIdRef.current += 1;
    };
  }, [canScore, fetchScore]);

  return {
    score,
    error,
    isScoring,
    refreshScore: fetchScore,
  };
}

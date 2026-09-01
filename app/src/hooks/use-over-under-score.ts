'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OverUnderScoreResult } from '@/lib/scoring-engine';
import { OverUnderPick } from '@/hooks/use-over-under-pick';

const SCORE_DEBOUNCE_MS = 400;

export function useOverUnderScore(
  season: number,
  seasonType: number,
  week: number,
  pick: OverUnderPick,
) {
  const [score, setScore] = useState<OverUnderScoreResult | null>(null);
  const [error, setError] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const requestIdRef = useRef(0);

  const line = Number(pick.line);
  const hasModeSelection = pick.mode === 'game-total'
    ? Boolean(pick.call)
    : Boolean(pick.pickedTeamId);
  const canScore = Boolean(pick.eventId)
    && Number.isFinite(line)
    && line > 0
    && hasModeSelection;

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
      const modeInput = pick.mode === 'game-total'
        ? { call: pick.call }
        : { pickedTeamId: pick.pickedTeamId };
      const response = await fetch('/api/over-under', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season,
          seasonType,
          week,
          eventId: pick.eventId,
          line,
          mode: pick.mode,
          ...modeInput,
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
    } catch (caught) {
      if (requestId === requestIdRef.current) {
        setError((caught as Error).message || 'Failed to score pick');
        setScore(null);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsScoring(false);
      }
    }
  }, [canScore, line, pick.call, pick.eventId, pick.mode, pick.pickedTeamId, season, seasonType, week]);

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
    canScore,
  };
}

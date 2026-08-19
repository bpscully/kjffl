'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoringDetail, UpsetSpecialScoreResult } from '@/lib/scoring-engine';
import { useUpsetSpecialPick } from '@/hooks/use-upset-special-pick';

interface WeekTeam {
  id: string;
  abbreviation: string;
  name: string;
}

interface WeekMatchup {
  eventId: string;
  name: string;
  shortName: string;
  teams: WeekTeam[];
}

interface UpsetSpecialPickerProps {
  season: number;
  seasonType: number;
  week: number;
}

export function UpsetSpecialPicker({ season, seasonType, week }: UpsetSpecialPickerProps) {
  const { pick, updatePick } = useUpsetSpecialPick(season, seasonType, week);
  const [matchups, setMatchups] = useState<WeekMatchup[]>([]);
  const [score, setScore] = useState<UpsetSpecialScoreResult | null>(null);
  const [error, setError] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const teams = useMemo(() => {
    return matchups.flatMap((matchup) => matchup.teams.map((team) => ({
      ...team,
      matchup: matchup.shortName,
    }))).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
  }, [matchups]);

  const selectedTeam = teams.find((team) => team.id === pick.pickedTeamId);
  const spreadNumber = Number(pick.spread);
  const canScore = Boolean(pick.pickedTeamId) && Number.isFinite(spreadNumber) && spreadNumber > 0;

  const fetchWeekEvents = useCallback(async () => {
    setIsLoadingTeams(true);
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
    } catch (err) {
      setError((err as Error).message || 'Failed to load matchups');
    } finally {
      setIsLoadingTeams(false);
    }
  }, [season, seasonType, week]);

  useEffect(() => {
    fetchWeekEvents();
    setScore(null);
  }, [fetchWeekEvents]);

  useEffect(() => {
    setScore(null);
    setError('');
  }, [pick.pickedTeamId, pick.spread]);

  const scorePick = async () => {
    if (!canScore) return;

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
          spread: spreadNumber,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      setScore(data.result);
    } catch (err) {
      setError((err as Error).message || 'Failed to score pick');
      setScore(null);
    } finally {
      setIsScoring(false);
    }
  };

  const renderDetails = (details: ScoringDetail[]) => {
    if (details.length === 0) {
      return <span className="text-xs text-muted-foreground">No upset points earned</span>;
    }

    return details.map((detail, index) => (
      <div key={`${detail.reason}-${index}`} className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{detail.reason}</span>
        <span className="font-semibold">+{detail.points.toFixed(2)}</span>
      </div>
    ));
  };

  const renderScore = (result: UpsetSpecialScoreResult) => {
    if (!result.isFinal) {
      return (
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">{result.gameStatus}</span>
          {'. '}Upset points will be awarded after the game is final.
        </span>
      );
    }

    return renderDetails(result.details);
  };

  return (
    <section className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upset Special</h2>
          {selectedTeam && (
            <div className="text-xs text-muted-foreground mt-1">{selectedTeam.matchup}</div>
          )}
        </div>
        <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold border border-primary/20">
          {(score?.totalPoints || 0).toFixed(2)} <span className="text-[10px] uppercase opacity-70 ml-0.5">pts</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_96px_auto]">
        <select
          value={pick.pickedTeamId}
          onChange={(event) => updatePick({ pickedTeamId: event.target.value })}
          disabled={isLoadingTeams}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{isLoadingTeams ? 'Loading teams...' : 'Underdog team'}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.abbreviation} - {team.name}
            </option>
          ))}
        </select>

        <Input
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          placeholder="Spread"
          value={pick.spread}
          onChange={(event) => updatePick({ spread: event.target.value })}
        />

        <Button
          type="button"
          variant="outline"
          onClick={scorePick}
          disabled={!canScore || isScoring || isLoadingTeams}
          className="sm:w-24"
        >
          {isScoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Score'}
        </Button>
      </div>

      {(score || error) && (
        <div className="mt-4 border-t pt-3 space-y-2">
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : (
            score ? renderScore(score) : null
          )}
        </div>
      )}
    </section>
  );
}

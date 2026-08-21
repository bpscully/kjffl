'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScoringDetail, UpsetSpecialScoreResult } from '@/lib/scoring-engine';
import { UpsetSpecialPick } from '@/hooks/use-upset-special-pick';

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
  pick: UpsetSpecialPick;
  updatePick: (updates: Partial<UpsetSpecialPick>) => void;
  score: UpsetSpecialScoreResult | null;
  error: string;
  isScoring: boolean;
  onPickLabelChange: (label: string) => void;
}

export function UpsetSpecialPicker({
  season,
  seasonType,
  week,
  pick,
  updatePick,
  score,
  error,
  isScoring,
  onPickLabelChange,
}: UpsetSpecialPickerProps) {
  const [matchups, setMatchups] = useState<WeekMatchup[]>([]);
  const [matchupError, setMatchupError] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const teams = useMemo(() => {
    return matchups.flatMap((matchup) => matchup.teams.map((team) => ({
      ...team,
      matchup: matchup.shortName,
    }))).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
  }, [matchups]);

  const selectedTeam = teams.find((team) => team.id === pick.pickedTeamId);
  const spreadNumber = Number(pick.spread);

  const fetchWeekEvents = useCallback(async () => {
    setIsLoadingTeams(true);
    setMatchupError('');
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
      setMatchupError((err as Error).message || 'Failed to load matchups');
    } finally {
      setIsLoadingTeams(false);
    }
  }, [season, seasonType, week]);

  useEffect(() => {
    fetchWeekEvents();
  }, [fetchWeekEvents]);

  useEffect(() => {
    const formattedSpread = Number.isFinite(spreadNumber) && spreadNumber > 0
      ? ` +${spreadNumber}`
      : '';
    onPickLabelChange(selectedTeam ? `${selectedTeam.abbreviation}${formattedSpread}` : 'No pick');
  }, [onPickLabelChange, selectedTeam, spreadNumber]);

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
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold text-yellow-600 dark:text-yellow-400">{result.gameStatus}</div>
          <div>Upset points will be awarded after the game is final.</div>
        </div>
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

      <div className="grid gap-3 sm:grid-cols-[1fr_112px]">
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
      </div>

      {isScoring && (
        <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Updating upset score...
        </div>
      )}

      {!isScoring && (score || error || matchupError) && (
        <div className="mt-4 border-t pt-3 space-y-2">
          {error || matchupError ? (
            <div className="text-xs text-destructive">{error || matchupError}</div>
          ) : (
            score ? renderScore(score) : null
          )}
        </div>
      )}
    </section>
  );
}

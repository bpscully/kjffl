'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OverUnderScoreResult, ScoringDetail } from '@/lib/scoring-engine';
import { OverUnderPick } from '@/hooks/use-over-under-pick';
import { WeekMatchup } from '@/types';
import { cn } from '@/lib/utils';

interface OverUnderPickerProps {
  matchups: WeekMatchup[];
  matchupError: string;
  isLoadingMatchups: boolean;
  pick: OverUnderPick;
  updatePick: (updates: Partial<OverUnderPick>) => void;
  score: OverUnderScoreResult | null;
  error: string;
  isScoring: boolean;
  onPickLabelChange: (label: string) => void;
}

function formatLine(line: number) {
  return Number.isInteger(line) ? line.toFixed(0) : String(line);
}

export function OverUnderPicker({
  matchups,
  matchupError,
  isLoadingMatchups,
  pick,
  updatePick,
  score,
  error,
  isScoring,
  onPickLabelChange,
}: OverUnderPickerProps) {
  const selectedMatchup = matchups.find((matchup) => matchup.eventId === pick.eventId);
  const selectedTeam = selectedMatchup?.teams.find((team) => team.id === pick.pickedTeamId);
  const lineNumber = Number(pick.line);
  const hasValidLine = Number.isFinite(lineNumber) && lineNumber > 0;
  const threePointMinimum = hasValidLine ? Math.floor(lineNumber - 10) + 1 : null;
  const threePointMaximum = hasValidLine ? Math.floor(lineNumber) : null;
  const fourPointMinimum = hasValidLine ? Math.floor(lineNumber) + 1 : null;

  useEffect(() => {
    if (!selectedMatchup || !hasValidLine) {
      onPickLabelChange('No pick');
      return;
    }

    const lineLabel = formatLine(lineNumber);
    if (pick.mode === 'game-total' && pick.call) {
      const callLabel = pick.call === 'over' ? 'Over' : 'Under';
      onPickLabelChange(`${selectedMatchup.shortName} — ${callLabel} ${lineLabel}`);
    } else if (pick.mode === 'one-team' && selectedTeam) {
      onPickLabelChange(`${selectedTeam.abbreviation} — One Team, O/U ${lineLabel}`);
    } else {
      onPickLabelChange('No pick');
    }
  }, [hasValidLine, lineNumber, onPickLabelChange, pick.call, pick.mode, selectedMatchup, selectedTeam]);

  const renderDetails = (details: ScoringDetail[]) => {
    if (details.length === 0) {
      return <span className="text-xs text-muted-foreground">No O/U points earned</span>;
    }

    return details.map((detail, index) => (
      <div key={`${detail.reason}-${index}`} className="flex items-start justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{detail.reason}</span>
        <span className="shrink-0 font-semibold">
          {detail.points > 0 ? '+' : ''}{detail.points.toFixed(2)}
        </span>
      </div>
    ));
  };

  const renderScore = (result: OverUnderScoreResult) => {
    if (!result.isFinal) {
      return (
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold text-yellow-600 dark:text-yellow-400">{result.gameStatus}</div>
          <div>O/U points will be awarded after the game is final.</div>
        </div>
      );
    }

    return renderDetails(result.details);
  };

  const modeButtonClass = (isSelected: boolean) => cn(
    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isSelected
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground',
  );

  const choiceButtonClass = (isSelected: boolean) => cn(
    'min-h-9 rounded-md border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isSelected
      ? 'border-primary bg-primary/10 text-primary'
      : 'border-input bg-transparent hover:bg-muted/50',
  );

  return (
    <section className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Over / Under</h2>
          {selectedMatchup && (
            <div className="text-xs text-muted-foreground mt-1">{selectedMatchup.shortName}</div>
          )}
        </div>
        <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold border border-primary/20">
          {(score?.totalPoints || 0).toFixed(2)} <span className="text-[10px] uppercase opacity-70 ml-0.5">pts</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_112px]">
        <select
          aria-label="O/U matchup"
          value={pick.eventId}
          onChange={(event) => updatePick({ eventId: event.target.value, pickedTeamId: '' })}
          disabled={isLoadingMatchups}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{isLoadingMatchups ? 'Loading matchups...' : 'Select matchup'}</option>
          {matchups.map((matchup) => (
            <option key={matchup.eventId} value={matchup.eventId}>{matchup.shortName}</option>
          ))}
        </select>

        <Input
          aria-label="O/U line"
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          placeholder="O/U line"
          value={pick.line}
          onChange={(event) => updatePick({ line: event.target.value })}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" aria-label="O/U pick type">
        <button
          type="button"
          aria-pressed={pick.mode === 'game-total'}
          className={modeButtonClass(pick.mode === 'game-total')}
          onClick={() => updatePick({ mode: 'game-total' })}
        >
          Game Total
        </button>
        <button
          type="button"
          aria-pressed={pick.mode === 'one-team'}
          className={modeButtonClass(pick.mode === 'one-team')}
          onClick={() => updatePick({ mode: 'one-team' })}
        >
          One Team
        </button>
      </div>

      {pick.mode === 'game-total' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={pick.call === 'over'}
            className={choiceButtonClass(pick.call === 'over')}
            onClick={() => updatePick({ call: 'over' })}
          >
            Over
          </button>
          <button
            type="button"
            aria-pressed={pick.call === 'under'}
            className={choiceButtonClass(pick.call === 'under')}
            onClick={() => updatePick({ call: 'under' })}
          >
            Under
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {(selectedMatchup?.teams || []).map((team) => (
              <button
                key={team.id}
                type="button"
                aria-pressed={pick.pickedTeamId === team.id}
                className={choiceButtonClass(pick.pickedTeamId === team.id)}
                onClick={() => updatePick({ pickedTeamId: team.id })}
              >
                {team.abbreviation}
              </button>
            ))}
          </div>
          {!selectedMatchup && (
            <div className="text-xs text-muted-foreground">Select a matchup, then choose one team.</div>
          )}
          {hasValidLine && (
            <div className="text-xs text-muted-foreground">
              3 pts: {threePointMinimum}&ndash;{threePointMaximum} &middot; 4 pts: {fourPointMinimum}+
            </div>
          )}
        </div>
      )}

      {isScoring && (
        <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Updating O/U score...
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

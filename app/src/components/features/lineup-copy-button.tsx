'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OverUnderPick } from '@/hooks/use-over-under-pick';
import { UpsetSpecialPick } from '@/hooks/use-upset-special-pick';
import { RosterPlayer, WeekMatchup } from '@/types';

interface LineupCopyButtonProps {
  starters: RosterPlayer[];
  upsetPick: UpsetSpecialPick;
  overUnderPick: OverUnderPick;
  matchups: WeekMatchup[];
}

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'];

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}

function formatPlayerName(player: RosterPlayer) {
  if (player.pos === 'D/ST') return `${player.team} D/ST`;

  const [firstName, ...familyName] = player.name.trim().split(/\s+/);
  if (!firstName || familyName.length === 0) return player.name.trim();

  return `${firstName.charAt(0).toUpperCase()}. ${familyName.join(' ')}`;
}

function formatUpsetPick(pick: UpsetSpecialPick, matchups: WeekMatchup[]) {
  const spread = Number(pick.spread);
  if (!pick.pickedTeamId || !Number.isFinite(spread) || spread <= 0) return null;

  const selectedTeam = matchups
    .flatMap((matchup) => matchup.teams)
    .find((team) => team.id === pick.pickedTeamId);

  return selectedTeam ? `${selectedTeam.abbreviation} +${formatNumber(spread)}` : null;
}

function formatMatchup(matchup: WeekMatchup) {
  if (matchup.shortName.includes('@')) {
    return matchup.shortName.split('@').map((team) => team.trim()).join('/');
  }

  return matchup.teams.map((team) => team.abbreviation).join('/');
}

function formatOverUnderPick(pick: OverUnderPick, matchups: WeekMatchup[]) {
  const line = Number(pick.line);
  const matchup = matchups.find((candidate) => candidate.eventId === pick.eventId);
  if (!matchup || !Number.isFinite(line) || line <= 0) return null;

  const lineLabel = formatNumber(line);
  if (pick.mode === 'game-total' && pick.call) {
    return `${formatMatchup(matchup)} ${pick.call === 'over' ? 'O' : 'U'} ${lineLabel}`;
  }

  if (pick.mode === 'one-team') {
    const selectedTeam = matchup.teams.find((team) => team.id === pick.pickedTeamId);
    return selectedTeam ? `${selectedTeam.abbreviation} One-Team O ${lineLabel}` : null;
  }

  return null;
}

function buildLineupMessage(
  starters: RosterPlayer[],
  upsetPick: UpsetSpecialPick,
  overUnderPick: OverUnderPick,
  matchups: WeekMatchup[],
) {
  const positionGroups = new Map<string, string[]>();

  starters.forEach((player) => {
    const position = player.pos === 'PK' ? 'K' : player.pos;
    const players = positionGroups.get(position) || [];
    players.push(formatPlayerName(player));
    positionGroups.set(position, players);
  });

  const knownPositions = POSITION_ORDER.filter((position) => positionGroups.has(position));
  const otherPositions = [...positionGroups.keys()]
    .filter((position) => !POSITION_ORDER.includes(position))
    .sort();
  const lines = [...knownPositions, ...otherPositions]
    .map((position) => positionGroups.get(position)?.join(' '))
    .filter((line): line is string => Boolean(line));

  const upsetLine = formatUpsetPick(upsetPick, matchups);
  const overUnderLine = formatOverUnderPick(overUnderPick, matchups);
  const pickLines = [upsetLine, overUnderLine].filter((line): line is string => Boolean(line));

  lines.push(...(pickLines.length > 0 ? pickLines : ['Picks TBD']));

  return {
    text: lines.join('\n'),
    canCopy: starters.length > 0 || pickLines.length > 0,
  };
}

export function LineupCopyButton({
  starters,
  upsetPick,
  overUnderPick,
  matchups,
}: LineupCopyButtonProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const message = useMemo(
    () => buildLineupMessage(starters, upsetPick, overUnderPick, matchups),
    [matchups, overUnderPick, starters, upsetPick],
  );

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const timeoutId = window.setTimeout(() => setCopyStatus('idle'), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  const copyLineup = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(message.text);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {copyStatus !== 'idle' && (
        <span
          className={copyStatus === 'error' ? 'text-xs text-destructive' : 'sr-only'}
          role="status"
          aria-live="polite"
        >
          {copyStatus === 'copied' ? 'Lineup copied' : 'Unable to copy lineup'}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!message.canCopy}
        onClick={copyLineup}
      >
        {copyStatus === 'copied' ? <Check /> : <Clipboard />}
        {copyStatus === 'copied' ? 'Copied' : 'Copy lineup'}
      </Button>
    </div>
  );
}

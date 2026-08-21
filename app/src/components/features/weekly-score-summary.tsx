'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WeeklyScoreLine {
  id: string;
  label: string;
  points: number;
}

export interface WeeklyScoreSection {
  id: string;
  label: string;
  points: number;
  lines: WeeklyScoreLine[];
}

interface WeeklyScoreSummaryProps {
  season: number;
  seasonType: number;
  week: number;
  sections: WeeklyScoreSection[];
}

function formatPoints(points: number) {
  return `${points.toFixed(2)} pts`;
}

function seasonTypeLabel(seasonType: number) {
  return seasonType === 3 ? 'Postseason' : 'Regular Season';
}

export function WeeklyScoreSummary({ season, seasonType, week, sections }: WeeklyScoreSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const total = sections.reduce((sum, section) => sum + section.points, 0);
  const panelId = 'weekly-score-breakdown';

  const report = useMemo(() => {
    const lines = [`KJ's FFL Scores — ${season} ${seasonTypeLabel(seasonType)}, Week ${week}`, ''];

    sections.forEach((section, index) => {
      lines.push(`${section.label} — ${formatPoints(section.points)}`);
      section.lines.forEach((line) => lines.push(`${line.label} — ${formatPoints(line.points)}`));
      if (index < sections.length - 1) lines.push('');
    });

    lines.push('', `Week Total — ${formatPoints(total)}`);
    return lines.join('\n');
  }, [season, seasonType, sections, total, week]);

  const copyReport = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(report);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className="text-sm font-semibold">Week {week} Total</span>
        <span className="flex items-center gap-2">
          <span className="text-lg font-extrabold text-primary">{formatPoints(total)}</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className="space-y-4 border-t px-4 py-4">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{section.label}</span>
                <span>{formatPoints(section.points)}</span>
              </div>
              <div className="space-y-1 border-l-2 border-muted pl-3">
                {section.lines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                    <span>{line.label}</span>
                    <span className="shrink-0 tabular-nums">{formatPoints(line.points)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {copyStatus === 'copied' && 'Score report copied'}
              {copyStatus === 'error' && 'Unable to copy score report'}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={copyReport}>
              {copyStatus === 'copied' ? <Check /> : <Clipboard />}
              {copyStatus === 'copied' ? 'Copied' : 'Copy scores'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

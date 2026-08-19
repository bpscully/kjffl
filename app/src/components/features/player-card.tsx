'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerUpdateResult, RosterPlayer } from '@/types';
import { cn } from '@/lib/utils';
import { formatPacificDateTime } from '@/lib/date-time';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  BriefcaseMedical,
  ChevronDown,
  ChevronUp,
  Newspaper,
  X,
} from 'lucide-react';

interface PlayerCardProps {
  player: RosterPlayer;
  score?: number;
  scoreDetails?: { reason: string; points: number }[];
  gameStatus?: string;
  gameStatusType?: string;
  opponentAbbr?: string;
  loading?: boolean;
  updates?: PlayerUpdateResult;
  onRemove: (id: string) => void;
  onToggleStarter: (id: string) => void;
}

export function PlayerCard({ 
  player, 
  score, 
  scoreDetails, 
  gameStatus, 
  gameStatusType,
  opponentAbbr, 
  loading, 
  updates,
  onRemove, 
  onToggleStarter 
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'score' | 'updates' | null>(null);
  const [referenceTime] = useState(() => Date.now());
  
  const isDST = player.pos === 'D/ST';
  const headshotUrl = isDST 
    ? `https://a.espncdn.com/i/teamlogos/nfl/500/${player.team.toLowerCase()}.png`
    : `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`;
    
  const fallbackUrl = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/0.png&w=350&h=254&cb=1';

  const hasDetails = scoreDetails && scoreDetails.length > 0;
  const isScheduled = gameStatusType === 'STATUS_SCHEDULED' || gameStatus === 'Scheduled';
  const isFinal = gameStatusType === 'STATUS_FINAL' || Boolean(gameStatus?.includes('Final'));
  const isLive = Boolean(gameStatus) && !isScheduled && !isFinal && gameStatus !== 'N/A';
  const isBench = !player.isStarter;
  const news = isDST ? [] : updates?.news ?? [];
  const injury = isDST ? null : updates?.injury ?? null;
  const hasNews = news.length > 0;
  const hasUpdates = hasNews || Boolean(injury);
  const hasRecentNews = news.some((item) => {
    const publishedAt = Date.parse(item.publishedAt);
    return Number.isFinite(publishedAt)
      && referenceTime >= publishedAt
      && referenceTime - publishedAt <= 48 * 60 * 60 * 1000;
  });

  const toggleSection = (section: 'score' | 'updates') => {
    setExpandedSection((current) => current === section ? null : section);
  };

  return (
    <Card className={cn(
        "w-full relative overflow-hidden group hover:shadow-md transition-all",
        isBench ? "bg-muted/40 border-dashed" : "bg-card"
    )}>
      <div className="absolute top-1 right-1 flex gap-1 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button 
            variant="secondary" 
            size="icon" 
            className="h-7 w-7 sm:h-6 sm:w-6 shadow-sm border" 
            title={player.isStarter ? "Move to Bench" : "Move to Starters"}
            onClick={(e) => {
                e.stopPropagation();
                onToggleStarter(player.id);
            }}
        >
            {player.isStarter ? <ArrowDownWideNarrow className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <ArrowUpWideNarrow className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
        </Button>
        <Button 
            variant="secondary" 
            size="icon" 
            className="h-7 w-7 sm:h-6 sm:w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-sm border" 
            onClick={(e) => {
                e.stopPropagation();
                onRemove(player.id);
            }}
        >
            <X className="h-4 w-4 sm:h-3.5 sm:h-3.5" />
        </Button>
      </div>
      
      <CardContent className="p-0">
        <div className="p-3 flex items-center gap-3">
            {/* Headshot / Logo */}
            <div className={cn(
                "relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden border transition-all",
                isDST ? "bg-transparent border-none" : "bg-muted rounded-full",
                isBench && !isDST && "grayscale opacity-70"
            )}>
            <img 
                src={imgError ? fallbackUrl : headshotUrl} 
                alt={player.name} 
                className={cn(
                    "h-full w-full",
                    isDST ? "object-contain" : "object-cover",
                    isBench && isDST && "grayscale opacity-50"
                )}
                onError={() => setImgError(true)}
            />
            {isLive && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
            )}
            {isScheduled && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-yellow-400 border-2 border-background rounded-full" />
            )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className={cn(
                        "font-bold text-sm sm:text-base truncate leading-tight",
                        isBench && "text-muted-foreground/80"
                    )}>{player.name}</h3>
                    {isBench && (
                        <span className="text-[9px] font-black bg-muted-foreground/20 text-muted-foreground px-1 rounded-sm uppercase tracking-tighter">
                            Bench
                        </span>
                    )}
                    {hasUpdates && (
                        <Button
                            variant="ghost"
                            size={injury ? 'sm' : 'icon'}
                            className={cn(
                                "relative h-6 shrink-0 gap-1 px-1.5 text-[10px] font-bold",
                                injury ? "border" : "w-6 px-0",
                                injury
                                  ? getInjuryColorClass(injury.designation)
                                  : hasRecentNews
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  : "text-muted-foreground",
                            )}
                            aria-label={injury
                              ? `${injury.label} updates for ${player.name}`
                              : hasRecentNews
                                ? `Recent news for ${player.name}`
                                : `News for ${player.name}`}
                            aria-expanded={expandedSection === 'updates'}
                            onClick={() => toggleSection('updates')}
                        >
                            {injury ? (
                                <>
                                    <BriefcaseMedical className="h-3.5 w-3.5" />
                                    <span>{injury.designation.toUpperCase()}</span>
                                </>
                            ) : <Newspaper className="h-3.5 w-3.5" />}
                            {!injury && hasRecentNews && (
                                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-background" />
                            )}
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{player.pos} • {player.team}</p>
                    {opponentAbbr && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                            isBench ? "bg-muted/60 text-muted-foreground/60" : "bg-muted text-muted-foreground"
                        )}>
                            vs {opponentAbbr}
                        </span>
                    )}
                </div>
                {gameStatus && (
                    <p className={cn(
                        "text-[10px] font-medium mt-1",
                        isLive && "text-green-600 font-bold",
                        isScheduled && "text-yellow-600 dark:text-yellow-400 font-bold",
                        !isLive && !isScheduled && "text-muted-foreground",
                        isBench && !isLive && !isScheduled && "opacity-60"
                    )}>
                        {gameStatus}
                    </p>
                )}
            </div>

            {/* Score */}
            <div 
                className={cn(
                    "flex flex-col items-end cursor-pointer select-none min-w-[60px]",
                    hasDetails && "hover:opacity-70"
                )}
                onClick={() => hasDetails && toggleSection('score')}
            >
            {loading ? (
                <div className="h-6 w-10 bg-muted animate-pulse rounded" />
            ) : (
                <>
                    <div className="flex items-center gap-1">
                        <span className={cn(
                            "text-xl font-bold font-mono",
                            isScheduled && "text-yellow-600 dark:text-yellow-400",
                            isLive && "text-green-600",
                            !isScheduled && !isLive && isFinal && "text-foreground",
                            !isScheduled && !isLive && !isFinal && "text-muted-foreground",
                            score && score > 0 && !isScheduled && !isLive && (isBench ? "text-muted-foreground" : "text-primary")
                        )}>
                            {score !== undefined ? score.toFixed(2) : '--'}
                        </span>
                        {hasDetails && (
                            expandedSection === 'score' ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground">Pts</span>
                </>
            )}
            </div>
        </div>

        {/* Details Expansion */}
        {expandedSection === 'score' && hasDetails && (
            <div className="bg-muted/30 border-t p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Scoring Breakdown</h4>
                {scoreDetails.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{detail.reason}</span>
                        <span className="font-semibold">+{detail.points.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        )}

        {expandedSection === 'updates' && hasUpdates && (
            <div className="border-t bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between border-b px-3 py-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Player Updates</h4>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Close player updates"
                        onClick={() => setExpandedSection(null)}
                    >
                        <ChevronUp className="h-3 w-3" />
                    </Button>
                </div>
                <div className="max-h-80 divide-y overflow-y-auto">
                    {injury && (
                        <section className="space-y-2 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <BriefcaseMedical className="h-3.5 w-3.5" />
                                    <h5 className="text-xs font-bold capitalize">{injury.label}</h5>
                                </div>
                                <span className={cn(
                                    "rounded border px-1.5 py-0.5 text-[10px] font-bold",
                                    getInjuryColorClass(injury.designation),
                                )}>
                                    {injury.designation.toUpperCase()}
                                </span>
                            </div>
                            <time
                                dateTime={injury.updatedAt}
                                title={formatPacificDateTime(injury.updatedAt)}
                                className="block text-[10px] text-muted-foreground"
                            >
                                Updated {formatRelativeTime(injury.updatedAt, referenceTime)}
                            </time>
                            {!hasNews && injury.shortComment && (
                                <p className="text-xs font-medium leading-relaxed">{injury.shortComment}</p>
                            )}
                            {!hasNews && injury.longComment && injury.longComment !== injury.shortComment && (
                                <p className="text-xs leading-relaxed text-muted-foreground">{injury.longComment}</p>
                            )}
                            {!hasNews && injury.source && (
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">{injury.source} injury update</p>
                            )}
                        </section>
                    )}
                    {news.map((item) => (
                        <article key={item.id} className="space-y-1 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <h5 className="text-xs font-bold leading-snug">{item.headline}</h5>
                                <time
                                    dateTime={item.publishedAt}
                                    title={formatPacificDateTime(item.publishedAt)}
                                    className="shrink-0 text-[10px] text-muted-foreground"
                                >
                                    {formatRelativeTime(item.publishedAt, referenceTime)}
                                </time>
                            </div>
                            {item.description && (
                                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                            )}
                            {item.source && (
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">{item.source} player update</p>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(value: string, referenceTime: number): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently';

  const seconds = Math.round((timestamp - referenceTime) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function getInjuryColorClass(designation: string): string {
  return {
    Q: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
    D: 'border-orange-500/40 bg-orange-500/10 text-orange-700',
    O: 'border-red-500/40 bg-red-500/10 text-red-700',
    IR: 'border-red-500/40 bg-red-500/10 text-red-700',
    SUSP: 'border-purple-500/40 bg-purple-500/10 text-purple-700',
  }[designation.toUpperCase()] ?? 'border-border bg-muted text-muted-foreground';
}

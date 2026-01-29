'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RosterPlayer } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, X, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';

interface PlayerCardProps {
  player: RosterPlayer;
  score?: number;
  scoreDetails?: { reason: string; points: number }[];
  gameStatus?: string;
  opponentAbbr?: string;
  loading?: boolean;
  onRemove: (id: string) => void;
  onToggleStarter: (id: string) => void;
}

export function PlayerCard({ 
  player, 
  score, 
  scoreDetails, 
  gameStatus, 
  opponentAbbr, 
  loading, 
  onRemove, 
  onToggleStarter 
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const isDST = player.pos === 'D/ST';
  const headshotUrl = isDST 
    ? `https://a.espncdn.com/i/teamlogos/nfl/500/${player.team.toLowerCase()}.png`
    : `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`;
    
  const fallbackUrl = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/0.png&w=350&h=254&cb=1';

  const hasDetails = scoreDetails && scoreDetails.length > 0;
  const isLive = gameStatus && !gameStatus.includes('Final') && !gameStatus.includes('Scheduled') && !gameStatus.includes('N/A');
  const isBench = !player.isStarter;

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
                        isLive ? "text-green-600 font-bold" : "text-muted-foreground",
                        isBench && !isLive && "opacity-60"
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
                onClick={() => hasDetails && setExpanded(!expanded)}
            >
            {loading ? (
                <div className="h-6 w-10 bg-muted animate-pulse rounded" />
            ) : (
                <>
                    <div className="flex items-center gap-1">
                        <span className={cn(
                            "text-xl font-bold font-mono",
                            score && score > 0 ? (isBench ? "text-muted-foreground" : "text-primary") : "text-muted-foreground"
                        )}>
                            {score !== undefined ? score.toFixed(2) : '--'}
                        </span>
                        {hasDetails && (
                            expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground">Pts</span>
                </>
            )}
            </div>
        </div>

        {/* Details Expansion */}
        {expanded && hasDetails && (
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
      </CardContent>
    </Card>
  );
}
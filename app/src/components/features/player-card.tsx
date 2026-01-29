'use client';

import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RosterPlayer } from '@/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: RosterPlayer;
  onRemove: (id: string) => void;
  onToggleStarter?: (id: string) => void;
}

export function PlayerCard({ player, onRemove, onToggleStarter }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  
  const isDST = player.pos === 'D/ST';
  const headshotUrl = isDST 
    ? `https://a.espncdn.com/i/teamlogos/nfl/500/${player.team.toLowerCase()}.png`
    : `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`;
    
  const fallbackUrl = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/0.png&w=350&h=254&cb=1';

  return (
    <Card className="w-full relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={() => onRemove(player.id)}
        >
            <X className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-3 flex items-center gap-3">
        {/* Headshot / Logo */}
        <div className={cn(
            "relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden border",
            isDST ? "bg-transparent border-none" : "bg-muted rounded-full"
        )}>
           <img 
             src={imgError ? fallbackUrl : headshotUrl} 
             alt={player.name} 
             className={cn(
                 "h-full w-full",
                 isDST ? "object-contain" : "object-cover"
             )}
             onError={() => setImgError(true)}
           />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
           <h3 className="font-bold text-sm sm:text-base truncate leading-tight">{player.name}</h3>
           <p className="text-xs text-muted-foreground">{player.pos} • {player.team}</p>
        </div>

        {/* Score Placeholder */}
        <div className="flex flex-col items-end">
           <span className="text-xl font-bold font-mono">--</span>
           <span className="text-[10px] uppercase text-muted-foreground">Pts</span>
        </div>
      </CardContent>
    </Card>
  );
}

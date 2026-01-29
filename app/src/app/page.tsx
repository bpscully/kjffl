'use client';

import { useState, useEffect } from 'react';
import { useRoster } from '@/hooks/use-roster';
import { PlayerSearch } from '@/components/features/player-search';
import { PlayerCard } from '@/components/features/player-card';
import { PlayerScoreResult } from '@/lib/scoring-engine';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { roster, addPlayer, removePlayer, toggleStarter, isLoaded } = useRoster();
  const [season, setSeason] = useState(2025);
  const [week, setWeek] = useState(1);
  const [seasonType, setSeasonType] = useState(2); // 2 = Regular, 3 = Post
  
  const [scores, setScores] = useState<Record<string, PlayerScoreResult>>({});
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  // Fetch scores when roster or week changes
  useEffect(() => {
    if (isLoaded && roster.length > 0) {
      console.log('Current Roster:', roster);
      fetchScores();
    }
  }, [roster.length, season, week, seasonType, isLoaded]);

  const fetchScores = async () => {
    setIsLoadingScores(true);
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: roster.map(p => ({ id: p.id, teamId: p.teamId, pos: p.pos, name: p.name })),
          season,
          week,
          seasonType
        })
      });
      
      if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.results) {
        const scoreMap: Record<string, PlayerScoreResult> = {};
        data.results.forEach((res: PlayerScoreResult) => {
          scoreMap[res.playerId] = res;
        });
        setScores(scoreMap);
      }
    } catch (err) {
      console.error('Failed to fetch scores:', err);
    } finally {
      setIsLoadingScores(false);
    }
  };

  const clearRoster = () => {
    if (confirm('Clear entire roster?')) {
        localStorage.removeItem('kjffl-roster');
        window.location.reload();
    }
  };

  const positionOrder: Record<string, number> = {
    'QB': 1,
    'RB': 2,
    'WR': 3,
    'TE': 4,
    'K': 5,
    'PK': 5,
    'D/ST': 6
  };

  const sortPlayers = (a: any, b: any) => {
    const orderA = positionOrder[a.pos] || 99;
    const orderB = positionOrder[b.pos] || 99;
    return orderA - orderB;
  };

  const starters = roster.filter(p => p.isStarter).sort(sortPlayers);
  const bench = roster.filter(p => !p.isStarter).sort(sortPlayers);

  const starterTotal = starters.reduce((sum, p) => sum + (scores[p.id]?.totalPoints || 0), 0);
  const benchTotal = bench.reduce((sum, p) => sum + (scores[p.id]?.totalPoints || 0), 0);

  if (!isLoaded) return <div className="p-8 flex justify-center italic text-muted-foreground">Loading roster...</div>;

  return (
    <main className="container mx-auto max-w-2xl p-4 space-y-8 pb-20">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">KJ's FFL Scores</h1>
            <div className="flex gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearRoster}
                    className="text-xs text-muted-foreground hover:text-destructive"
                >
                    Clear Roster
                </Button>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchScores} 
                    disabled={isLoadingScores || roster.length === 0}
                    className={isLoadingScores ? "animate-spin" : ""}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
        </div>
        
        <div className="flex gap-3 items-center">
            <select 
                value={season} 
                onChange={(e) => setSeason(Number(e.target.value))}
                className="bg-secondary text-secondary-foreground text-sm font-medium px-2 py-1 rounded-md border-none outline-none focus:ring-2 focus:ring-ring"
            >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
            </select>

            <select 
                value={seasonType} 
                onChange={(e) => setSeasonType(Number(e.target.value))}
                className="bg-secondary text-secondary-foreground text-sm font-medium px-2 py-1 rounded-md border-none outline-none focus:ring-2 focus:ring-ring"
            >
                <option value={2}>Regular</option>
                <option value={3}>Postseason</option>
            </select>

            <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
                <button 
                    onClick={() => setWeek(Math.max(1, week - 1))}
                    className="px-2 py-0.5 hover:bg-background rounded-sm transition-colors text-xs font-bold"
                >
                    &lt;
                </button>
                <span className="text-sm font-bold min-w-[60px] text-center">Week {week}</span>
                <button 
                    onClick={() => setWeek(week + 1)}
                    className="px-2 py-0.5 hover:bg-background rounded-sm transition-colors text-xs font-bold"
                >
                    &gt;
                </button>
            </div>
        </div>
      </header>

      <section className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Add to Roster</h2>
        <div className="flex w-full">
            <PlayerSearch onSelectPlayer={addPlayer} />
        </div>
      </section>

      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Starting Lineup</h2>
                <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold border border-primary/20">
                    {starterTotal.toFixed(2)} <span className="text-[10px] uppercase opacity-70 ml-0.5">pts</span>
                </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{starters.length}</span>
          </div>
          
          {starters.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-8 border-2 border-dashed rounded-xl text-center bg-muted/20">
              No starters set. Search and add players.
            </div>
          ) : (
            <div className="grid gap-3">
              {starters.map(player => (
                <PlayerCard 
                    key={player.id} 
                    player={player} 
                    onRemove={removePlayer} 
                    onToggleStarter={toggleStarter}
                    score={scores[player.id]?.totalPoints}
                    scoreDetails={scores[player.id]?.details}
                    gameStatus={scores[player.id]?.gameStatus}
                    opponentAbbr={scores[player.id]?.opponentAbbr}
                    loading={isLoadingScores}
                />
              ))}
            </div>
          )}
        </section>

        {bench.length > 0 && (
            <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-muted-foreground">Bench</h2>
                    <div className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-sm font-bold border border-border">
                        {benchTotal.toFixed(2)} <span className="text-[10px] uppercase opacity-70 ml-0.5">pts</span>
                    </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{bench.length}</span>
            </div>
            <div className="grid gap-3 opacity-80 hover:opacity-100 transition-opacity">
                {bench.map(player => (
                <PlayerCard 
                    key={player.id} 
                    player={player} 
                    onRemove={removePlayer} 
                    onToggleStarter={toggleStarter}
                    score={scores[player.id]?.totalPoints}
                    scoreDetails={scores[player.id]?.details}
                    gameStatus={scores[player.id]?.gameStatus}
                    opponentAbbr={scores[player.id]?.opponentAbbr}
                    loading={isLoadingScores}
                />
                ))}
            </div>
            </section>
        )}
      </div>
    </main>
  );
}

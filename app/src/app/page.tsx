'use client';

import { useRoster } from '@/hooks/use-roster';
import { PlayerSearch } from '@/components/features/player-search';
import { PlayerCard } from '@/components/features/player-card';

export default function Home() {
  const { roster, addPlayer, removePlayer, isLoaded } = useRoster();

  const starters = roster.filter(p => p.isStarter);
  const bench = roster.filter(p => !p.isStarter);

  if (!isLoaded) return <div className="p-8 flex justify-center">Loading...</div>;

  return (
    <main className="container mx-auto max-w-2xl p-4 space-y-8 pb-20">
      <header className="flex flex-col gap-4 mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">KJ's FFL Scores</h1>
        <div className="flex gap-2">
            <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md">2026</div>
            <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md">Week 1</div>
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
            <h2 className="text-xl font-bold flex items-center gap-2">
                Starting Lineup 
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{starters.length} / 9</span>
          </div>
          
          {starters.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-8 border-2 border-dashed rounded-xl text-center bg-muted/20">
              No starters set. Add players to your roster.
            </div>
          ) : (
            <div className="grid gap-3">
              {starters.map(player => (
                <PlayerCard key={player.id} player={player} onRemove={removePlayer} />
              ))}
            </div>
          )}
        </section>

        {bench.length > 0 && (
            <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                    Bench
                </h2>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{bench.length}</span>
            </div>
            <div className="grid gap-3 opacity-80 hover:opacity-100 transition-opacity">
                {bench.map(player => (
                <PlayerCard key={player.id} player={player} onRemove={removePlayer} />
                ))}
            </div>
            </section>
        )}
      </div>
    </main>
  );
}
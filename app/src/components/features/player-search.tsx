'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Player } from '@/types';

interface PlayerSearchProps {
  onSelectPlayer: (player: Player) => void;
}

export function PlayerSearch({ onSelectPlayer }: PlayerSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [results, setResults] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!value || value.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {value ? value : "Search player..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}> 
          <CommandInput 
            placeholder="Search player..." 
            value={value}
            onValueChange={setValue}
          />
          <CommandList>
            {value.length < 3 && <div className="py-6 text-center text-sm text-muted-foreground">Type 3+ characters...</div>}
            {loading && <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
            {!loading && value.length >= 3 && results.length === 0 && (
              <CommandEmpty>No player found.</CommandEmpty>
            )}
            {!loading && value.length >= 3 && results.length > 0 && (
                <CommandGroup>
                {results.map((player) => (
                    <CommandItem
                    key={player.id}
                    value={player.name}
                    onSelect={() => {
                        onSelectPlayer(player);
                        setOpen(false);
                        setValue(""); // Reset search after select
                        setResults([]);
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        "opacity-0" 
                        )}
                    />
                    <div className="flex flex-col">
                        <span className="font-bold">{player.name}</span>
                        <span className="text-xs text-muted-foreground">{player.pos} - {player.team}</span>
                    </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

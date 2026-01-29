'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import playerIndex from '@/data/players-index.json';
import { Player } from '@/types';

interface PlayerSearchProps {
  onSelectPlayer: (player: Player) => void;
}

export function PlayerSearch({ onSelectPlayer }: PlayerSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  // Filter players based on search value
  const filteredPlayers = React.useMemo(() => {
     if (!value || value.length < 3) return [];
     const lower = value.toLowerCase();
     return (playerIndex as Player[])
       .filter(p => p.name.toLowerCase().includes(lower))
       .slice(0, 10);
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
            {value.length >= 3 && filteredPlayers.length === 0 && (
              <CommandEmpty>No player found.</CommandEmpty>
            )}
            {value.length >= 3 && filteredPlayers.length > 0 && (
                <CommandGroup>
                {filteredPlayers.map((player) => (
                    <CommandItem
                    key={player.id}
                    value={player.name}
                    onSelect={() => {
                        onSelectPlayer(player);
                        setOpen(false);
                        setValue(""); // Reset search after select
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

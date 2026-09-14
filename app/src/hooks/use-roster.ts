'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, RosterPlayer } from '@/types';

const LEGACY_STORAGE_KEY = 'kjffl-roster';
const STORAGE_KEY = 'kjffl-weekly-rosters';

type RosterSnapshotMap = Record<string, RosterPlayer[]>;

function getSnapshotKey(season: number, seasonType: number, week: number) {
  return `${season}-${seasonType}-${week}`;
}

function hasSnapshot(snapshots: RosterSnapshotMap, key: string) {
  return Object.prototype.hasOwnProperty.call(snapshots, key);
}

function resolveRoster(
  snapshots: RosterSnapshotMap,
  season: number,
  seasonType: number,
  week: number,
): RosterPlayer[] {
  const currentKey = getSnapshotKey(season, seasonType, week);
  if (hasSnapshot(snapshots, currentKey)) {
    return snapshots[currentKey];
  }

  let latestPriorWeek = -1;
  let latestPriorRoster: RosterPlayer[] = [];

  for (const [key, snapshot] of Object.entries(snapshots)) {
    const [snapshotSeason, snapshotSeasonType, snapshotWeek] = key.split('-').map(Number);
    if (
      snapshotSeason === season
      && snapshotSeasonType === seasonType
      && snapshotWeek < week
      && snapshotWeek > latestPriorWeek
    ) {
      latestPriorWeek = snapshotWeek;
      latestPriorRoster = snapshot;
    }
  }

  return latestPriorRoster.map((player) => ({ ...player }));
}

function mergePlayerMetadata(roster: RosterPlayer[], currentPlayers: Map<string, Player>) {
  return roster.map((rosterPlayer) => {
    const currentPlayer = currentPlayers.get(rosterPlayer.id);
    if (!currentPlayer) return rosterPlayer;

    return {
      ...rosterPlayer,
      name: currentPlayer.name,
      pos: currentPlayer.pos,
      team: currentPlayer.team,
      teamId: currentPlayer.teamId,
    };
  });
}

export function useRoster(season: number, seasonType: number, week: number) {
  const snapshotKey = useMemo(
    () => getSnapshotKey(season, seasonType, week),
    [season, seasonType, week],
  );
  const [initialSnapshotKey] = useState(() => snapshotKey);
  const [snapshots, setSnapshots] = useState<RosterSnapshotMap>({});
  const [draftRosters, setDraftRosters] = useState<RosterSnapshotMap>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const hasRefreshedRoster = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let loadedSnapshots: RosterSnapshotMap | null = null;
      const storedSnapshots = localStorage.getItem(STORAGE_KEY);

      if (storedSnapshots) {
        try {
          loadedSnapshots = JSON.parse(storedSnapshots);
        } catch (error) {
          console.error('Failed to parse weekly rosters from local storage', error);
        }
      }

      if (!loadedSnapshots) {
        const legacyRoster = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRoster) {
          try {
            const parsedLegacyRoster: RosterPlayer[] = JSON.parse(legacyRoster);
            loadedSnapshots = { [initialSnapshotKey]: parsedLegacyRoster };
          } catch (error) {
            console.error('Failed to parse legacy roster from local storage', error);
          }
        }
      }

      setSnapshots(loadedSnapshots || {});
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialSnapshotKey]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    }
  }, [isLoaded, snapshots]);

  const roster = useMemo(() => {
    if (hasSnapshot(snapshots, snapshotKey)) {
      return snapshots[snapshotKey];
    }
    if (hasSnapshot(draftRosters, snapshotKey)) {
      return draftRosters[snapshotKey];
    }
    return resolveRoster(snapshots, season, seasonType, week);
  }, [draftRosters, season, seasonType, snapshotKey, snapshots, week]);

  useEffect(() => {
    if (!isLoaded || hasRefreshedRoster.current || roster.length === 0) return;

    hasRefreshedRoster.current = true;
    const keyAtRequest = snapshotKey;
    const rosterAtRequest = roster;
    const snapshotWasSaved = hasSnapshot(snapshots, keyAtRequest);

    const refreshRosterMetadata = async () => {
      try {
        const ids = rosterAtRequest.map((player) => player.id).join(',');
        const response = await fetch(`/api/players?ids=${encodeURIComponent(ids)}`);
        if (!response.ok) return;

        const data = await response.json();
        const currentPlayers = new Map<string, Player>(
          (data.results || []).map((player: Player) => [player.id, player]),
        );

        if (snapshotWasSaved) {
          setSnapshots((current) => {
            if (!hasSnapshot(current, keyAtRequest)) return current;
            return {
              ...current,
              [keyAtRequest]: mergePlayerMetadata(current[keyAtRequest], currentPlayers),
            };
          });
        } else {
          setDraftRosters((current) => ({
            ...current,
            [keyAtRequest]: mergePlayerMetadata(
              current[keyAtRequest] || rosterAtRequest,
              currentPlayers,
            ),
          }));
        }
      } catch (error) {
        console.error('Failed to refresh roster player metadata', error);
      }
    };

    void refreshRosterMetadata();
  }, [isLoaded, roster, snapshotKey, snapshots]);

  const updateCurrentRoster = (update: (current: RosterPlayer[]) => RosterPlayer[]) => {
    setSnapshots((currentSnapshots) => {
      const currentRoster = hasSnapshot(currentSnapshots, snapshotKey)
        ? currentSnapshots[snapshotKey]
        : draftRosters[snapshotKey] || resolveRoster(currentSnapshots, season, seasonType, week);

      return {
        ...currentSnapshots,
        [snapshotKey]: update(currentRoster),
      };
    });

    setDraftRosters((current) => {
      if (!hasSnapshot(current, snapshotKey)) return current;
      const next = { ...current };
      delete next[snapshotKey];
      return next;
    });
  };

  const addPlayer = (player: Player) => {
    if (roster.some((rosterPlayer) => rosterPlayer.id === player.id)) return;

    const newPlayer: RosterPlayer = {
      ...player,
      addedAt: Date.now(),
      isStarter: false,
    };
    updateCurrentRoster((current) => [...current, newPlayer]);
  };

  const removePlayer = (playerId: string) => {
    updateCurrentRoster((current) => current.filter((player) => player.id !== playerId));
  };

  const clearRoster = () => {
    updateCurrentRoster(() => []);
  };

  const toggleStarter = (playerId: string) => {
    updateCurrentRoster((current) => current.map((player) => (
      player.id === playerId ? { ...player, isStarter: !player.isStarter } : player
    )));
  };

  return {
    roster,
    addPlayer,
    removePlayer,
    clearRoster,
    toggleStarter,
    isLoaded,
  };
}

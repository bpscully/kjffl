import { unstable_cache } from 'next/cache';
import { espnApi } from '@/lib/espn-api';
import { PlayerInjuryUpdate, PlayerNewsItem, PlayerUpdateResult } from '@/types';

interface EspnInjuryNote {
  id?: string | number;
  type?: string;
  date?: string;
  headline?: string;
  text?: string;
  source?: string;
}

interface EspnInjury {
  id?: string | number;
  date?: string;
  status?: string;
  shortComment?: string;
  longComment?: string;
  type?: {
    abbreviation?: string;
    description?: string;
  };
  athlete?: {
    links?: Array<{ href?: string }>;
    notes?: { items?: EspnInjuryNote[] };
  };
}

interface EspnInjuryTeam {
  injuries?: EspnInjury[];
}

interface EspnInjuryResponse {
  injuries?: EspnInjuryTeam[];
}

const NEWS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizePlayerNotes(
  payload: EspnInjuryResponse,
  referenceTime = Date.now(),
): Map<string, PlayerNewsItem[]> {
  const notesByPlayer = new Map<string, PlayerNewsItem[]>();
  const seenByPlayer = new Map<string, Set<string>>();

  for (const team of payload.injuries ?? []) {
    for (const injury of team.injuries ?? []) {
      const playerId = getInjuryAthleteId(injury);
      const designation = (injury.type?.abbreviation ?? injury.status ?? '').toUpperCase();
      if (!playerId || designation !== 'A') continue;

      for (const note of injury.athlete?.notes?.items ?? []) {
        const publishedAt = note.date ?? injury.date;
        if (note.type !== 'news' || !note.headline || !publishedAt) continue;

        const publishedTime = Date.parse(publishedAt);
        if (!Number.isFinite(publishedTime)
          || publishedTime > referenceTime
          || referenceTime - publishedTime > NEWS_MAX_AGE_MS) continue;

        const dedupeKey = `${note.headline.trim().toLowerCase()}|${publishedAt}`;
        const seen = seenByPlayer.get(playerId) ?? new Set<string>();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        seenByPlayer.set(playerId, seen);

        const playerNotes = notesByPlayer.get(playerId) ?? [];
        playerNotes.push({
          id: String(note.id ?? injury.id ?? dedupeKey),
          headline: note.headline,
          description: note.text ?? injury.longComment ?? '',
          publishedAt,
          source: note.source,
        });
        notesByPlayer.set(playerId, playerNotes);
      }
    }
  }

  for (const notes of notesByPlayer.values()) {
    notes.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }

  return notesByPlayer;
}

function getInjuryAthleteId(injury: EspnInjury): string | null {
  for (const link of injury.athlete?.links ?? []) {
    const match = link.href?.match(/\/id\/(\d+)(?:\/|$)/);
    if (match) return match[1];
  }
  return null;
}

export function normalizeInjuries(payload: EspnInjuryResponse): Map<string, PlayerInjuryUpdate> {
  const injuries = new Map<string, PlayerInjuryUpdate>();

  for (const team of payload.injuries ?? []) {
    for (const injury of team.injuries ?? []) {
      const playerId = getInjuryAthleteId(injury);
      if (!playerId || !injury.date || !Number.isFinite(Date.parse(injury.date))) continue;

      const current = injuries.get(playerId);
      if (current && Date.parse(current.updatedAt) >= Date.parse(injury.date)) continue;

      const espnDesignation = injury.type?.abbreviation ?? injury.status ?? 'INJ';
      if (espnDesignation.toUpperCase() === 'A') continue;

      injuries.set(playerId, {
        designation: espnDesignation,
        label: injury.type?.description ?? injury.status ?? 'Injury update',
        updatedAt: injury.date,
        shortComment: injury.shortComment ?? '',
        longComment: injury.longComment ?? '',
        source: injury.athlete?.notes?.items?.[0]?.source,
      });
    }
  }

  return injuries;
}

const getCachedPlayerStatusFeed = unstable_cache(
  async () => {
    const response = await espnApi.getLeagueInjuries() as EspnInjuryResponse;
    return {
      notes: Array.from(normalizePlayerNotes(response).entries()),
      injuries: Array.from(normalizeInjuries(response).entries()),
    };
  },
  ['nfl-player-status-v1'],
  { revalidate: 300, tags: ['nfl-player-status'] },
);

export async function getPlayerUpdates(playerIds: string[]): Promise<PlayerUpdateResult[]> {
  try {
    const feed = await getCachedPlayerStatusFeed();
    const notes = new Map(feed.notes);
    const injuries = new Map(feed.injuries);

    return playerIds.map((playerId) => ({
      playerId,
      news: notes.get(playerId) ?? [],
      injury: injuries.get(playerId) ?? null,
    }));
  } catch (error) {
    console.error('Failed to fetch ESPN player status feed:', error);
    return playerIds.map((playerId) => ({
      playerId,
      news: [],
      injury: null,
      errors: ['news', 'injury'],
    }));
  }
}

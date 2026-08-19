import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (callback: unknown) => callback,
}));

vi.mock('@/lib/espn-api', () => ({
  espnApi: {},
}));

import { normalizeInjuries, normalizePlayerNotes } from './player-updates-service';

describe('player update normalization', () => {
  it('normalizes meaningful notes for Active and designated players', () => {
    const notes = normalizePlayerNotes({
      injuries: [{ injuries: [
        {
          id: 10,
          date: '2026-08-18T12:00:00Z',
          status: 'Active',
          type: { abbreviation: 'A', description: 'active' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/1234/example-player' }],
            notes: { items: [
              {
                id: 2,
                type: 'news',
                date: '2026-08-18T12:00:00Z',
                headline: 'Newest update',
                text: 'Complete available summary',
                source: 'RotoWire',
              },
              {
                id: 1,
                type: 'news',
                date: '2026-08-16T12:00:00Z',
                headline: 'Older update',
                text: 'Older summary',
                source: 'RotoWire',
              },
              {
                id: 5,
                type: 'news',
                date: '2026-07-01T12:00:00Z',
                headline: 'Stale update',
                text: 'This should not reach the client.',
              },
            ] },
          },
        },
        {
          date: '2026-08-18T13:00:00Z',
          status: 'Questionable',
          shortComment: 'questionable',
          longComment: 'questionable',
          type: { abbreviation: 'Q', description: 'questionable' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/9999/status-only-player' }],
            notes: { items: [{ source: 'RotoWire' }] },
          },
        },
        {
          date: '2026-08-18T12:00:00Z',
          status: 'Questionable',
          type: { abbreviation: 'Q', description: 'questionable' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/9999/status-only-player' }],
            notes: { items: [{
              id: 7,
              type: 'news',
              date: '2026-08-18T12:00:00Z',
              headline: 'questionable',
              text: 'questionable',
            }] },
          },
        },
        {
          date: '2026-08-18T12:00:00Z',
          status: 'Questionable',
          type: { abbreviation: 'Q', description: 'questionable' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/5678/injured-player' }],
            notes: { items: [{
              id: 6,
              type: 'news',
              date: '2026-08-18T12:00:00Z',
              headline: 'Injury update',
              text: 'This belongs in the shared expansion.',
            }] },
          },
        },
      ] }],
    }, Date.parse('2026-08-18T12:00:00Z'));

    expect(notes.get('1234')).toEqual([
      {
        id: '2',
        headline: 'Newest update',
        description: 'Complete available summary',
        publishedAt: '2026-08-18T12:00:00Z',
        source: 'RotoWire',
      },
      {
        id: '1',
        headline: 'Older update',
        description: 'Older summary',
        publishedAt: '2026-08-16T12:00:00Z',
        source: 'RotoWire',
      },
    ]);
    expect(notes.get('5678')).toEqual([{
      id: '6',
      headline: 'Injury update',
      description: 'This belongs in the shared expansion.',
      publishedAt: '2026-08-18T12:00:00Z',
    }]);
    expect(notes.has('9999')).toBe(false);
  });

  it('extracts athlete IDs, ignores Active records, and keeps the newest designation', () => {
    const injuries = normalizeInjuries({
      injuries: [{ injuries: [
        {
          date: '2026-08-17T12:00:00Z',
          status: 'Active',
          type: { abbreviation: 'A', description: 'active' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/1234/example-player' }],
          },
        },
        {
          date: '2026-08-18T10:00:00Z',
          status: 'Active',
          shortComment: 'Sidelined for two weeks.',
          type: { abbreviation: 'A', description: 'active' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/5678/another-player' }],
          },
        },
        {
          date: '2026-08-18T12:00:00Z',
          status: 'Questionable',
          shortComment: 'Latest note',
          longComment: 'Full injury context.',
          type: { abbreviation: 'Q', description: 'questionable' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/1234/example-player' }],
            notes: { items: [{ source: 'RotoWire' }] },
          },
        },
        {
          date: '2026-08-18T13:00:00Z',
          status: 'Questionable',
          shortComment: 'questionable',
          longComment: 'questionable',
          type: { abbreviation: 'Q', description: 'questionable' },
          athlete: {
            links: [{ href: 'https://www.espn.com/nfl/player/_/id/9999/status-only-player' }],
            notes: { items: [{ source: 'RotoWire' }] },
          },
        },
      ] }],
    });

    expect(injuries.get('1234')).toEqual({
      designation: 'Q',
      label: 'questionable',
      updatedAt: '2026-08-18T12:00:00Z',
      shortComment: 'Latest note',
      longComment: 'Full injury context.',
      source: 'RotoWire',
    });
    expect(injuries.has('5678')).toBe(false);
    expect(injuries.get('9999')).toEqual({
      designation: 'Q',
      label: 'questionable',
      updatedAt: '2026-08-18T13:00:00Z',
      shortComment: '',
      longComment: '',
      source: undefined,
    });
  });
});

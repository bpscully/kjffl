import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getPlayerUpdates } = vi.hoisted(() => ({
  getPlayerUpdates: vi.fn(),
}));

vi.mock('@/lib/player-updates-service', () => ({
  getPlayerUpdates,
}));

import { POST } from './route';

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/player-updates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/player-updates', () => {
  beforeEach(() => getPlayerUpdates.mockReset());

  it('validates the players array', async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing players array' });
  });

  it('deduplicates players, excludes D/ST, and reports partial results', async () => {
    getPlayerUpdates.mockResolvedValue([{
      playerId: '1234',
      news: [],
      injury: null,
      errors: ['news'],
    }]);

    const response = await POST(createRequest({
      players: [
        { id: '1234', pos: 'WR' },
        { id: '1234', pos: 'WR' },
        { id: '26', pos: 'D/ST' },
      ],
    }));

    expect(getPlayerUpdates).toHaveBeenCalledWith(['1234']);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ partial: true });
  });
});

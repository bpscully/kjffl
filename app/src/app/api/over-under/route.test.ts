import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getWeekEvents, getGameSummary } = vi.hoisted(() => ({
  getWeekEvents: vi.fn(),
  getGameSummary: vi.fn(),
}));

vi.mock('@/lib/espn-api', () => ({
  espnApi: { getWeekEvents, getGameSummary },
}));

import { POST } from './route';

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/over-under', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const event = {
  id: '401772999',
  competitions: [{ competitors: [{ id: '22' }, { id: '24' }] }],
};

const summary = {
  id: '401772999',
  header: {
    competitions: [{
      competitors: [
        { id: '22', score: '24', winner: true, team: { abbreviation: 'ARI' } },
        { id: '24', score: '20', winner: false, team: { abbreviation: 'LAC' } },
      ],
      status: { type: { name: 'STATUS_FINAL', description: 'Final', detail: 'Final' } },
    }],
  },
  scoringPlays: [],
  boxscore: { players: [] },
};

describe('POST /api/over-under', () => {
  beforeEach(() => {
    getWeekEvents.mockReset().mockResolvedValue([event]);
    getGameSummary.mockReset().mockResolvedValue(summary);
  });

  it('validates the common and mode-specific inputs', async () => {
    const missingResponse = await POST(createRequest({}));
    expect(missingResponse.status).toBe(400);

    const missingCallResponse = await POST(createRequest({
      season: 2026,
      seasonType: 2,
      week: 1,
      eventId: '401772999',
      line: 40,
      mode: 'game-total',
    }));
    expect(missingCallResponse.status).toBe(400);
    expect(await missingCallResponse.json()).toEqual({ error: 'Select Over or Under' });
  });

  it('rejects a one-team selection outside the selected game', async () => {
    const response = await POST(createRequest({
      season: 2026,
      seasonType: 2,
      week: 1,
      eventId: '401772999',
      line: 40,
      mode: 'one-team',
      pickedTeamId: '9',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Selected team does not belong to this game' });
    expect(getGameSummary).not.toHaveBeenCalled();
  });

  it('scores a final game-total pick', async () => {
    const response = await POST(createRequest({
      season: 2026,
      seasonType: 2,
      week: 1,
      eventId: '401772999',
      line: 40,
      mode: 'game-total',
      call: 'over',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWeekEvents).toHaveBeenCalledWith(2026, 1, 2);
    expect(getGameSummary).toHaveBeenCalledWith('401772999');
    expect(body.result).toMatchObject({ totalPoints: 2, outcome: 'win', actualTotal: 44 });
  });
});

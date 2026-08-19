import { NextRequest, NextResponse } from 'next/server';
import { getPlayerUpdates } from '@/lib/player-updates-service';

interface PlayerUpdateRequest {
  id?: string;
  pos?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { players?: PlayerUpdateRequest[] };
    if (!Array.isArray(body.players)) {
      return NextResponse.json({ error: 'Missing players array' }, { status: 400 });
    }

    const playerIds = Array.from(new Set(
      body.players
        .filter((player) => player.pos !== 'D/ST' && typeof player.id === 'string')
        .map((player) => player.id!.trim())
        .filter(Boolean),
    ));

    const results = await getPlayerUpdates(playerIds);
    return NextResponse.json({
      results,
      partial: results.some((result) => Boolean(result.errors?.length)),
    });
  } catch (error) {
    console.error('Error fetching player updates:', error);
    return NextResponse.json({ error: 'Failed to fetch player updates' }, { status: 500 });
  }
}

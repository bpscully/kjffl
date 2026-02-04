import { NextRequest, NextResponse } from 'next/server';
import { getPlayers } from '@/lib/player-service';

export const dynamic = 'force-dynamic'; // Ensure we process query params

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.toLowerCase();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const players = await getPlayers();
    
    const results = players
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 10); // Limit to top 10

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in player search:', error);
    return NextResponse.json(
        { error: 'Failed to search players' },
        { status: 500 }
    );
  }
}

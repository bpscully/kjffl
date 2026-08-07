import { NextRequest, NextResponse } from 'next/server';
import { espnApi } from '@/lib/espn-api';
import { ScoringEngine } from '@/lib/scoring-engine';

interface EventCompetitor {
  id?: string;
  team?: {
    $ref?: string;
  };
}

interface WeekEvent {
  id: string | number;
  competitions?: {
    competitors?: EventCompetitor[];
  }[];
}

function getTeamId(competitor: EventCompetitor): string {
  if (competitor.id) return String(competitor.id);
  if (competitor.team?.$ref) {
    const parts = competitor.team.$ref.split('/');
    return parts[parts.length - 1].split('?')[0];
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { season, week, seasonType = 2, pickedTeamId, spread } = await req.json();
    const parsedSpread = Number(spread);

    if (!season || !week || !pickedTeamId || !Number.isFinite(parsedSpread) || parsedSpread <= 0) {
      return NextResponse.json({ error: 'Missing or invalid upset special input' }, { status: 400 });
    }

    const events = await espnApi.getWeekEvents(Number(season), Number(week), Number(seasonType)) as WeekEvent[];
    const event = events.find((candidate) => {
      const competitors = candidate.competitions?.[0]?.competitors || [];
      return competitors.some((competitor) => getTeamId(competitor) === String(pickedTeamId));
    });

    if (!event) {
      return NextResponse.json({ error: 'Selected team does not have a game for this week' }, { status: 404 });
    }

    const summary = await espnApi.getGameSummary(String(event.id));
    const result = ScoringEngine.calculateUpsetSpecialScore({
      summary,
      pickedTeamId: String(pickedTeamId),
      spread: Math.abs(parsedSpread),
    });

    return NextResponse.json({
      result,
      eventId: String(event.id),
    });
  } catch (error) {
    console.error('Error scoring upset special:', error);
    return NextResponse.json(
      { error: 'Failed to score upset special', details: (error as Error).message },
      { status: 500 },
    );
  }
}

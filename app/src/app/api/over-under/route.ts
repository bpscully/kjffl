import { NextRequest, NextResponse } from 'next/server';
import { espnApi } from '@/lib/espn-api';
import { OverUnderCall, OverUnderMode, ScoringEngine } from '@/lib/scoring-engine';

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
    const {
      season,
      week,
      seasonType = 2,
      eventId,
      line,
      mode,
      call,
      pickedTeamId,
    } = await req.json();
    const parsedLine = Number(line);
    const parsedMode = mode as OverUnderMode;

    if (
      !season
      || !week
      || !eventId
      || !Number.isFinite(parsedLine)
      || parsedLine <= 0
      || !['game-total', 'one-team'].includes(parsedMode)
    ) {
      return NextResponse.json({ error: 'Missing or invalid over/under input' }, { status: 400 });
    }

    if (parsedMode === 'game-total' && !['over', 'under'].includes(call as OverUnderCall)) {
      return NextResponse.json({ error: 'Select Over or Under' }, { status: 400 });
    }

    if (parsedMode === 'one-team' && !pickedTeamId) {
      return NextResponse.json({ error: 'Select a team for the one-team option' }, { status: 400 });
    }

    const events = await espnApi.getWeekEvents(Number(season), Number(week), Number(seasonType)) as WeekEvent[];
    const event = events.find((candidate) => String(candidate.id) === String(eventId));

    if (!event) {
      return NextResponse.json({ error: 'Selected game does not belong to this week' }, { status: 404 });
    }

    if (parsedMode === 'one-team') {
      const teamIds = (event.competitions?.[0]?.competitors || []).map(getTeamId);
      if (!teamIds.includes(String(pickedTeamId))) {
        return NextResponse.json({ error: 'Selected team does not belong to this game' }, { status: 400 });
      }
    }

    const summary = await espnApi.getGameSummary(String(event.id));
    const result = parsedMode === 'game-total'
      ? ScoringEngine.calculateOverUnderScore({
          summary,
          line: parsedLine,
          mode: parsedMode,
          call: call as OverUnderCall,
        })
      : ScoringEngine.calculateOverUnderScore({
          summary,
          line: parsedLine,
          mode: parsedMode,
          pickedTeamId: String(pickedTeamId),
        });

    return NextResponse.json({
      result,
      eventId: String(event.id),
    });
  } catch (error) {
    console.error('Error scoring over/under:', error);
    return NextResponse.json(
      { error: 'Failed to score over/under', details: (error as Error).message },
      { status: 500 },
    );
  }
}

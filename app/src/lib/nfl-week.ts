export interface DefaultNflWeek {
  season: number;
  week: number;
}

const REGULAR_SEASON_WEEKS = 18;

export function getSeasonOptions(date = new Date()): number[] {
  const currentYear = date.getFullYear();
  return Array.from({ length: 4 }, (_, index) => currentYear - index);
}

export function getDefaultNflWeek(date = new Date()): DefaultNflWeek {
  const year = date.getFullYear();
  const month = date.getMonth();
  const season = month < 3 ? year - 1 : year;
  const weekOneStart = getThursdayAfterLaborDay(season);
  const daysSinceWeekOne = Math.floor((startOfDay(date).getTime() - weekOneStart.getTime()) / 86400000);
  const week = Math.min(REGULAR_SEASON_WEEKS, Math.max(1, Math.floor(daysSinceWeekOne / 7) + 1));

  return { season, week };
}

function getThursdayAfterLaborDay(year: number): Date {
  const date = new Date(year, 8, 1);
  const daysUntilMonday = (1 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilMonday + 3);
  return startOfDay(date);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

import { describe, expect, it } from 'vitest';
import { formatPacificDateTime } from './date-time';

describe('Pacific date and time formatting', () => {
  it('converts daylight-saving timestamps to PDT', () => {
    expect(formatPacificDateTime('2026-09-15T00:15:00Z')).toBe('Mon, Sep 14, 5:15 PM PDT');
  });

  it('converts winter timestamps to PST', () => {
    expect(formatPacificDateTime('2026-12-15T01:15:00Z')).toBe('Mon, Dec 14, 5:15 PM PST');
  });

  it('preserves unparseable values', () => {
    expect(formatPacificDateTime('TBD')).toBe('TBD');
  });
});

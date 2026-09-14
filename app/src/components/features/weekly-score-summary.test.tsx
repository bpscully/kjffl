import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklyScoreSummary } from './weekly-score-summary';

const sections = [
  {
    id: 'starting-lineup',
    label: 'Starting Lineup',
    points: 10.5,
    lines: [
      { id: 'player-1', label: 'Matthew Stafford', points: 6.5 },
      { id: 'player-2', label: 'Breece Hall', points: 4 },
      { id: 'player-3', label: 'Zero Point Starter', points: 0 },
    ],
  },
  {
    id: 'upset-special',
    label: 'Upset Special',
    points: 4,
    lines: [{ id: 'upset-pick', label: 'TB +3.5', points: 4 }],
  },
  {
    id: 'over-under',
    label: 'Over / Under',
    points: 2,
    lines: [{ id: 'over-under-pick', label: 'TB @ CIN — Over 40', points: 2 }],
  },
];

describe('WeeklyScoreSummary', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('shows the combined total and expands a concise attribution', () => {
    render(
      <WeeklyScoreSummary week={4} sections={sections} />,
    );

    const toggle = screen.getByRole('button', { name: /week 4 total/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('16.50 pts')).toBeInTheDocument();
    expect(screen.queryByText('Matthew Stafford')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Matthew Stafford')).toBeInTheDocument();
    expect(screen.getByText('Zero Point Starter')).toBeInTheDocument();
    expect(screen.getByText('TB +3.5')).toBeInTheDocument();
    expect(screen.getByText('TB @ CIN — Over 40')).toBeInTheDocument();
  });

  it('copies a concise list of score attribution and the grand total', async () => {
    render(
      <WeeklyScoreSummary week={4} sections={sections} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /week 4 total/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy scores/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      'Matthew Stafford — 6.50 pts\n' +
      'Breece Hall — 4.00 pts\n' +
      'Zero Point Starter — 0.00 pts\n' +
      'TB +3.5 — 4.00 pts\n' +
      'TB @ CIN — Over 40 — 2.00 pts\n\n' +
      'Week Total — 16.50 pts',
    );
    expect(await screen.findByText('Score report copied')).toBeInTheDocument();
  });

  it('omits unset pick rows from the copied report', async () => {
    const sectionsWithUnsetPicks = sections.map((section) => (
      section.id === 'starting-lineup'
        ? section
        : { ...section, points: 0, lines: [{ ...section.lines[0], label: 'No pick', points: 0 }] }
    ));
    render(
      <WeeklyScoreSummary week={4} sections={sectionsWithUnsetPicks} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /week 4 total/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy scores/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      'Matthew Stafford — 6.50 pts\n' +
      'Breece Hall — 4.00 pts\n' +
      'Zero Point Starter — 0.00 pts\n\n' +
      'Week Total — 10.50 pts',
    );
  });
});

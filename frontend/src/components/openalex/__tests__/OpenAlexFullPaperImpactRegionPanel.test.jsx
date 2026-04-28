// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFullPaperImpactRegionPanel from '../OpenAlexFullPaperImpactRegionPanel';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperImpactRegionPanel', () => {
  it('renders fallback guidance when no region summary is selected', () => {
    render(<OpenAlexFullPaperImpactRegionPanel />);

    expect(screen.getByText('Impact-first panel')).toBeTruthy();
    expect(
      screen.getByText(/select a projected region to inspect regional paper counts/i),
    ).toBeTruthy();
  });

  it('renders evidence fields from a populated region summary', () => {
    render(
      <OpenAlexFullPaperImpactRegionPanel
        activeTopicLabel="Topic Alpha"
        regionSummary={{
          maxCitations: 120,
          meanCitations: 105.4,
          regionPaperCount: 2,
          representatives: [
            {
              id: 'A1',
              title: 'Alpha Impact Paper',
              publicationYear: 2024,
              citedByCount: 120,
              primaryTopicDisplayName: 'Topic Alpha',
            },
          ],
          smoothedImpact: 98.25,
          topicMix: [
            {
              count: 2,
              label: 'Topic Alpha',
              topicId: 'TA',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/active topic scope: topic alpha/i)).toBeTruthy();
    expect(screen.getByText('98.3')).toBeTruthy();
    expect(screen.getByText('105.4')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('Region papers')).toBeTruthy();
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getAllByText('Topic Alpha')).toHaveLength(2);
    expect(screen.getByText('Alpha Impact Paper')).toBeTruthy();
    expect(screen.getByText(/2024 · cited by 120/i)).toBeTruthy();
  });
});

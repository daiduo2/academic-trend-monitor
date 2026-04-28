// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFullPaperImpactShellRegionPanel from '../OpenAlexFullPaperImpactShellRegionPanel';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperImpactShellRegionPanel', () => {
  it('renders shell evidence guidance when no region is selected', () => {
    render(<OpenAlexFullPaperImpactShellRegionPanel />);

    expect(screen.getByText('Shell region evidence')).toBeTruthy();
    expect(
      screen.getByText(/select a shell patch to inspect its regional citation evidence/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/representative papers stay secondary in this first shell view/i),
    ).toBeTruthy();
  });

  it('renders regional evidence and topic mix for a selected shell region', () => {
    render(
      <OpenAlexFullPaperImpactShellRegionPanel
        activeTopicLabel="Topic Alpha"
        regionSummary={{
          impactScore: 0.81,
          paperIds: ['W1', 'W2', 'W3'],
          summary: {
            localRelativeHeat: 0.78,
            maxCitations: 132,
            meanCitations: 88.4,
            regionPaperCount: 3,
          },
          topicMix: [
            {
              paperCount: 2,
              share: 0.67,
              topicDisplayName: 'Topic Alpha',
              topicId: 'TA',
            },
            {
              paperCount: 1,
              share: 0.33,
              topicDisplayName: 'Topic Beta',
              topicId: 'TB',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Shell region evidence')).toBeTruthy();
    expect(screen.getByText(/active topic scope: topic alpha/i)).toBeTruthy();
    expect(screen.getByText('0.81')).toBeTruthy();
    expect(screen.getByText('0.78')).toBeTruthy();
    expect(screen.getByText('88.4')).toBeTruthy();
    expect(screen.getByText('132')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Topic Alpha')).toBeTruthy();
    expect(screen.getByText('Topic Beta')).toBeTruthy();
    expect(screen.getByText('67% of region papers')).toBeTruthy();
    expect(screen.getByText('33% of region papers')).toBeTruthy();
  });
});

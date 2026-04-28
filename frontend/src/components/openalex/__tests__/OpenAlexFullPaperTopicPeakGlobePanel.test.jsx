// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFullPaperTopicPeakGlobePanel from '../OpenAlexFullPaperTopicPeakGlobePanel';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperTopicPeakGlobePanel', () => {
  it('renders topic-peak guidance when no topic is selected', () => {
    render(<OpenAlexFullPaperTopicPeakGlobePanel />);

    expect(screen.getAllByText('主题山峰地形')).toHaveLength(2);
    expect(screen.getByText(/旋转或选择地形上的主题山峰/i)).toBeTruthy();
    expect(screen.getByText(/高度表示影响力分位分数/i)).toBeTruthy();
    expect(screen.getByText(/山体范围随主题规模扩大/i)).toBeTruthy();
  });

  it('renders the selected normalized topic summary in the side panel', () => {
    const { container } = render(
      <OpenAlexFullPaperTopicPeakGlobePanel
        topic={{
          averageCitations: 12.8,
          center: [0.62, 0.34, 0.42],
          centerMetadata: {
            azimuth: 0.8,
            elevation: 0.3,
            unitVector: [0.62, 0.34, 0.42],
          },
          colorHex: '#0284c7',
          citationMassScore: 0.75,
          citationQualityScore: 0.8,
          influenceScore: 82.5,
          mixedInfluence: 2.31,
          paperCount: 128,
          sharpness: 2.9,
          subfieldDisplayName: 'Statistics and Probability',
          summitHeight: 0.48,
          topicDisplayName: 'Bayesian Inference',
          topicId: 'T10243',
          totalCitations: 1640,
          volumeScore: 0.6,
        }}
      />,
    );

    expect(screen.getByText('Bayesian Inference')).toBeTruthy();
    expect(screen.getAllByText('Statistics and Probability')).toHaveLength(2);
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByText('1,640')).toBeTruthy();
    expect(screen.getByText('12.8')).toBeTruthy();
    expect(screen.getByText('82.5')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('T10243')).toBeTruthy();
    expect(screen.queryByText(/^Field$/i)).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]').style.backgroundColor).toBe('rgb(2, 132, 199)');
  });
});

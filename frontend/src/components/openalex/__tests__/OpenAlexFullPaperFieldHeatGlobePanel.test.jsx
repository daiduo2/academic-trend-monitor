// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFullPaperFieldHeatGlobePanel from '../OpenAlexFullPaperFieldHeatGlobePanel';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperFieldHeatGlobePanel', () => {
  it('renders topic-globe guidance when no patch is selected', () => {
    render(<OpenAlexFullPaperFieldHeatGlobePanel />);

    expect(screen.getByText('Topic overview')).toBeTruthy();
    expect(screen.getByText(/select a topic patch to inspect its paper volume/i)).toBeTruthy();
  });

  it('renders the selected topic summary in the side panel', () => {
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobePanel
        patch={{
          color: '#dc2626',
          fieldDisplayName: 'Mathematics',
          fieldColor: '#1d4ed8',
          fillColor: '#16a34a',
          relativeHeat: 1.33,
          subfieldDisplayName: 'Statistics and Probability',
          summary: {
            meanCitations: 12,
            paperCount: 2,
          },
          topicDisplayName: 'Bayesian Inference',
          topicId: 'T10243',
        }}
      />,
    );

    expect(screen.getByText('Bayesian Inference')).toBeTruthy();
    expect(screen.getByText('Topic heat globe')).toBeTruthy();
    expect(screen.getByText(/Mathematics · Statistics and Probability/)).toBeTruthy();
    expect(screen.getByText('12.0')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1.33')).toBeTruthy();
    expect(screen.getByText('T10243')).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]').style.backgroundColor).toBe('rgb(29, 78, 216)');
  });
});

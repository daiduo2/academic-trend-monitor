// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFullPaperTopicStructurePanel from '../OpenAlexFullPaperTopicStructurePanel';
import { resolveTopicFamilyColor } from '../../../utils/openAlexFullPaperTopicStructureScene';

afterEach(() => {
  cleanup();
});

describe('OpenAlexFullPaperTopicStructurePanel', () => {
  it('renders topic-structure guidance when no topic is hovered or selected', () => {
    render(<OpenAlexFullPaperTopicStructurePanel />);

    expect(screen.getByRole('heading', { name: 'Topic structure' })).toBeTruthy();
    expect(screen.getByText(/hover or select a topic fragment to inspect/i)).toBeTruthy();
  });

  it('renders topic hover metadata in the side panel', () => {
    const { container } = render(
      <OpenAlexFullPaperTopicStructurePanel
        topic={{
          colorHex: '#1d4ed8',
          fieldDisplayName: 'Mathematics',
          meanCitations: 11.5,
          paperCount: 12,
          subfieldDisplayName: 'Modeling and Simulation',
          topicDisplayName: 'Topic One',
          topicId: 'T1',
        }}
      />,
    );

    expect(screen.getByText('Topic One')).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('Modeling and Simulation')).toBeTruthy();
    expect(screen.getByText('11.5')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('T1')).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]').style.backgroundColor).toBe('rgb(29, 78, 216)');
  });

  it('uses the shared family color when the live topic lacks colorHex', () => {
    const topic = {
      fieldDisplayName: 'Mathematics',
      meanCitations: 11.5,
      paperCount: 12,
      subfieldDisplayName: 'Modeling and Simulation',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    };
    const { container } = render(
      <OpenAlexFullPaperTopicStructurePanel
        topic={topic}
      />,
    );
    const swatchColor = resolveTopicFamilyColor(topic);
    const expectedRgb = `rgb(${Number.parseInt(swatchColor.slice(1, 3), 16)}, ${Number.parseInt(swatchColor.slice(3, 5), 16)}, ${Number.parseInt(swatchColor.slice(5, 7), 16)})`;

    expect(container.querySelector('[aria-hidden="true"]').style.backgroundColor).toBe(expectedRgb);
  });
});

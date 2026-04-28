// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexFieldHeat from '../OpenAlexFieldHeat';

const mockUseOpenAlexFullPaperTopicPeakGlobe = vi.fn();

vi.mock('../../hooks/useOpenAlexFullPaperTopicPeakGlobe', () => ({
  useOpenAlexFullPaperTopicPeakGlobe: () => mockUseOpenAlexFullPaperTopicPeakGlobe(),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperTopicPeakGlobeViewport', () => ({
  default: ({ activeTopicId, topicPeakGlobe }) => (
    <div data-testid="topic-peak-globe-viewport">
      <p>山峰起伏主题地形</p>
      <p>active topic: {activeTopicId || 'none'}</p>
      <p>topic count: {topicPeakGlobe?.topics?.length || 0}</p>
    </div>
  ),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperTopicPeakGlobePanel', () => ({
  default: ({ topic }) => (
    <div data-testid="topic-peak-globe-panel">
      <p>{topic?.topicDisplayName || 'no topic'}</p>
    </div>
  ),
}));

function buildTopicPeakGlobe() {
  const topics = [
    {
      mixedInfluence: 12.5,
      paperCount: 96,
      subfieldDisplayName: 'Geometry and Topology',
      topicDisplayName: 'Algebraic Geometry and Number Theory',
      topicId: 'T10061',
    },
  ];

  return {
    topicById: Object.fromEntries(topics.map((topic) => [topic.topicId, topic])),
    topicIds: topics.map((topic) => topic.topicId),
    topics,
  };
}

describe('OpenAlexFieldHeat', () => {
  afterEach(() => {
    cleanup();
    mockUseOpenAlexFullPaperTopicPeakGlobe.mockReset();
  });

  it('renders the latest mountain-style topic peak globe instead of the old patch heat globe', () => {
    mockUseOpenAlexFullPaperTopicPeakGlobe.mockReturnValue({
      message: '',
      status: 'ready',
      topicPeakGlobe: buildTopicPeakGlobe(),
    });

    render(<OpenAlexFieldHeat />);

    expect(screen.getByTestId('dashboard-shell').className).toContain('bg-slate-950');
    expect(screen.getByText('领域热力图')).toBeTruthy();
    expect(screen.getByText('子领域')).toBeTruthy();
    expect(screen.getByText('主题山峰')).toBeTruthy();
    expect(screen.getByText('山峰起伏主题地形')).toBeTruthy();
    expect(screen.getByText('Algebraic Geometry and Number Theory')).toBeTruthy();
  });
});

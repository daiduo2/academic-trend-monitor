// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OpenAlexPaperCloud from '../OpenAlexPaperCloud';

const mockUseOpenAlexFullPaperLightPaperCloud = vi.fn();

vi.mock('../../hooks/useOpenAlexFullPaperLightPaperCloud', () => ({
  useOpenAlexFullPaperLightPaperCloud: () => mockUseOpenAlexFullPaperLightPaperCloud(),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperLightPaperCloudViewport', () => ({
  default: () => <div data-testid="paper-cloud-viewport">paper cloud viewport</div>,
}));

vi.mock('../../components/openalex/OpenAlexFullPaperLightPaperCloudPanel', () => ({
  default: ({ topic }) => <aside data-testid="paper-cloud-panel">{topic?.topicDisplayName || 'none'}</aside>,
}));

afterEach(() => {
  cleanup();
  mockUseOpenAlexFullPaperLightPaperCloud.mockReset();
});

function readyBundle() {
  return {
    sampledPoints: [
      {
        coordinates3d: { x: 0, y: 0, z: 0 },
        paperIndex: 0,
        topicId: 'T1',
        workId: 'W1',
      },
    ],
    topicById: {
      T1: {
        paperCount: 10,
        sampledPointIndices: [0],
        subfieldDisplayName: 'Statistics and Probability',
        topicDisplayName: 'Bayesian Inference',
        topicId: 'T1',
      },
    },
    topics: [
      {
        paperCount: 10,
        sampledPointIndices: [0],
        subfieldDisplayName: 'Statistics and Probability',
        topicDisplayName: 'Bayesian Inference',
        topicId: 'T1',
      },
    ],
  };
}

describe('OpenAlexPaperCloud', () => {
  it('uses an atlas-sized main viewport beside the detail panel', () => {
    mockUseOpenAlexFullPaperLightPaperCloud.mockReturnValue({
      lightPaperCloud: readyBundle(),
      message: '',
      status: 'ready',
    });

    const { container } = render(<OpenAlexPaperCloud />);

    expect(screen.getByTestId('dashboard-shell').className).toContain('bg-slate-950');
    expect(screen.getByText('文献点云图')).toBeTruthy();
    expect(screen.getByText(/更高区分度的主题颜色和主题标签/i)).toBeTruthy();
    expect(screen.getByText('抽样论文')).toBeTruthy();
    expect(screen.getByText('主题数')).toBeTruthy();
    expect(screen.getByTestId('paper-cloud-viewport')).toBeTruthy();
    expect(screen.getByTestId('paper-cloud-panel').textContent).toContain('Bayesian Inference');
    expect(container.querySelector('[data-testid="paper-cloud-viewport-shell"]').className).toContain('min-h-[720px]');
  });
});

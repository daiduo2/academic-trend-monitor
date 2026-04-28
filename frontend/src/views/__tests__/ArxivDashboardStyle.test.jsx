// @vitest-environment jsdom

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import DomainDashboard from '../DomainDashboard';
import TimeDashboard from '../TimeDashboard';

const mockData = {
  periods: ['2026-03', '2026-04'],
  structure: {
    structure: {
      math: {
        'math.AG': [
          {
            active_months: 2,
            hierarchy_path: ['Algebraic Geometry'],
            id: 'topic-1',
            keywords: ['moduli', 'curves'],
            latest_paper_count: 12,
            name: 'Algebraic Geometry',
          },
        ],
      },
    },
  },
  hierarchies: {
    'math.math.AG': {
      tree: {
        children: [
          {
            children: [],
            name: 'Algebraic Geometry',
          },
        ],
        name: 'Mathematics',
      },
    },
  },
  trends: {
    trends: {
      'topic-1': {
        history: [
          { paper_count: 7, period: '2026-03' },
          { paper_count: 12, period: '2026-04' },
        ],
      },
    },
  },
};

vi.mock('../../hooks/useDomainData', () => ({
  getLayer1List: (structure) => Object.keys(structure?.structure || {}),
  getLayer2List: (structure, layer1) => Object.keys(structure?.structure?.[layer1] || {}),
  getTopicsForLayer2: (structure, layer1, layer2) => structure?.structure?.[layer1]?.[layer2] || [],
  getTopicsWithTrends: (structure, trends, layer1, layer2) => (
    (structure?.structure?.[layer1]?.[layer2] || []).map((topic) => ({
      ...topic,
      trend: trends?.trends?.[topic.id]?.history || [],
    }))
  ),
  useDomainData: () => ({ data: mockData, error: null, loading: false }),
}));

vi.mock('recharts', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  return {
    Area: () => <div />,
    AreaChart: passthrough,
    Bar: passthrough,
    BarChart: passthrough,
    CartesianGrid: () => <div />,
    Cell: () => <div />,
    Line: () => <div />,
    LineChart: passthrough,
    ResponsiveContainer: passthrough,
    Tooltip: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
  };
});

vi.mock('../../data/taxonomy', () => ({
  TAXONOMY: {
    getLayer1Display: (value) => value,
    getLayer2Display: (_layer1, value) => value,
  },
}));

afterEach(() => {
  cleanup();
});

describe('arXiv dashboard visual style', () => {
  it('renders the domain dashboard in the shared dark dashboard shell', async () => {
    const { container } = render(
      <MemoryRouter>
        <DomainDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '领域热度分析' })).toBeTruthy();
    });

    expect(container.querySelector('[data-testid="dashboard-shell"]').className).toContain('bg-slate-950');
    expect(screen.getByText('arXiv · domain heat')).toBeTruthy();
  });

  it('renders the time dashboard in the shared dark dashboard shell', async () => {
    const { container } = render(<TimeDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '趋势追踪分析' })).toBeTruthy();
    });

    expect(container.querySelector('[data-testid="dashboard-shell"]').className).toContain('bg-slate-950');
    expect(screen.getByText('arXiv · trend tracker')).toBeTruthy();
  });
});

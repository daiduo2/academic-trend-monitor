// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenAlexFullPaperEmbeddingsBaseline from '../OpenAlexFullPaperEmbeddingsBaseline';

const mockUseOpenAlexFullPaperEmbeddings = vi.fn();
const mockUseOpenAlexFullPaperTopicPeakGlobe = vi.fn();
const mockUseOpenAlexFullPaperLightPaperCloud = vi.fn();

vi.mock('../../hooks/useOpenAlexFullPaperEmbeddings', () => ({
  useOpenAlexFullPaperEmbeddings: () => mockUseOpenAlexFullPaperEmbeddings(),
}));

vi.mock('../../hooks/useOpenAlexFullPaperTopicPeakGlobe', () => ({
  useOpenAlexFullPaperTopicPeakGlobe: () => mockUseOpenAlexFullPaperTopicPeakGlobe(),
  default: () => mockUseOpenAlexFullPaperTopicPeakGlobe(),
}));

vi.mock('../../hooks/useOpenAlexFullPaperLightPaperCloud', () => ({
  useOpenAlexFullPaperLightPaperCloud: () => mockUseOpenAlexFullPaperLightPaperCloud(),
  default: () => mockUseOpenAlexFullPaperLightPaperCloud(),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperTopicPeakGlobeViewport', () => ({
  default: ({ activeTopicId, onHoverTopic, onSelectTopic }) => (
    <div data-testid="topic-peak-globe-viewport">
      <p>topic peak viewport</p>
      <p>active topic: {activeTopicId || 'none'}</p>
      <button
        type="button"
        onClick={() => onHoverTopic?.({
          averageCitations: 9.5,
          mixedInfluence: 1.42,
          paperCount: 96,
          subfieldDisplayName: 'Numerical Analysis',
          topicDisplayName: 'Topic Beta',
          topicId: 'topic-beta',
          totalCitations: 720,
        })}
      >
        Hover beta peak
      </button>
      <button type="button" onClick={() => onHoverTopic?.(null)}>
        Clear hovered peak
      </button>
      <button type="button" onClick={() => onSelectTopic?.('topic-beta')}>
        Select beta peak
      </button>
    </div>
  ),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperTopicPeakGlobePanel', () => ({
  default: ({ topic }) => (
    <div data-testid="topic-peak-globe-panel">
      <p>topic peak panel: {topic?.topicDisplayName || 'none'}</p>
    </div>
  ),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperLightPaperCloudViewport', () => ({
  default: ({ onHoverTopic, onSelectTopic, selectedTopicId }) => (
    <div data-testid="light-paper-cloud-viewport">
      <p>light paper cloud viewport</p>
      <p>active topic: {selectedTopicId || 'none'}</p>
      <button
        type="button"
        onClick={() => onHoverTopic?.({
          averageCitations: 9.5,
          paperCount: 96,
          subfieldDisplayName: 'Numerical Analysis',
          topicDisplayName: 'Topic Beta',
          topicId: 'topic-beta',
          totalCitations: 720,
        })}
      >
        Hover beta cloud
      </button>
      <button type="button" onClick={() => onHoverTopic?.(null)}>
        Clear hovered cloud
      </button>
      <button
        type="button"
        onClick={() => onSelectTopic?.({
          averageCitations: 9.5,
          paperCount: 96,
          subfieldDisplayName: 'Numerical Analysis',
          topicDisplayName: 'Topic Beta',
          topicId: 'topic-beta',
          totalCitations: 720,
        })}
      >
        Select beta cloud
      </button>
    </div>
  ),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperLightPaperCloudPanel', () => ({
  default: ({ topic }) => (
    <div data-testid="light-paper-cloud-panel">
      <p>light paper cloud panel: {topic?.topicDisplayName || 'none'}</p>
    </div>
  ),
}));

vi.mock('../../components/openalex/OpenAlexFullPaperEmbeddingsInspector', () => ({
  default: ({ paper }) => (
    <div data-testid="paper-inspector">{paper?.title || 'no paper selected'}</div>
  ),
}));

function buildBundle() {
  const papers = [
    {
      citedByCount: 120,
      coordinates: { x: -0.6, y: 0.02 },
      coordinates3d: { x: -0.6, y: 0.02, z: 0.1 },
      id: 'A1',
      primaryTopicDisplayName: 'Topic Alpha',
      primaryTopicId: 'TA',
      publicationYear: 2024,
      searchText: 'alpha impact paper',
      title: 'Alpha Impact Paper',
      workId: 'A1',
    },
    {
      citedByCount: 8,
      coordinates: { x: 0.72, y: 0.82 },
      coordinates3d: { x: 0.72, y: 0.82, z: -0.08 },
      id: 'B1',
      primaryTopicDisplayName: 'Topic Beta',
      primaryTopicId: 'TB',
      publicationYear: 2025,
      searchText: 'beta search target',
      title: 'Beta Search Target',
      workId: 'B1',
    },
  ];

  return {
    availableViewModes: ['2d', '3d'],
    papers,
    papersById: Object.fromEntries(papers.map((paper) => [paper.id, paper])),
    papersByPrimaryTopicId: {
      TA: papers.filter((paper) => paper.primaryTopicId === 'TA'),
      TB: papers.filter((paper) => paper.primaryTopicId === 'TB'),
    },
    source: {
      ingest_run_id: 'test-run',
      selection_mode: 'full_math_works_core',
    },
    stats: {
      distinct_primary_topic_count: 2,
      total_paper_count: 2,
      vector_dimensions: 1536,
    },
    topicColorById: {
      TA: '#22c55e',
      TB: '#f59e0b',
    },
    topicOptions: [
      { color: '#0ea5e9', count: 2, label: 'All topics', value: 'all' },
      { color: '#22c55e', count: 1, label: 'Topic Alpha', value: 'TA' },
      { color: '#f59e0b', count: 1, label: 'Topic Beta', value: 'TB' },
    ],
  };
}

function buildTopicPeakGlobe() {
  const topics = [
    {
      averageCitations: 11.5,
      center: [0.62, 0.34, 0.42],
      mixedInfluence: 2.31,
      paperCount: 128,
      subfieldDisplayName: 'Statistics and Probability',
      topicDisplayName: 'Topic Alpha',
      topicId: 'topic-alpha',
      totalCitations: 1640,
    },
    {
      averageCitations: 9.5,
      center: [-0.38, 0.16, 0.71],
      mixedInfluence: 1.42,
      paperCount: 96,
      subfieldDisplayName: 'Numerical Analysis',
      topicDisplayName: 'Topic Beta',
      topicId: 'topic-beta',
      totalCitations: 720,
    },
  ];

  return {
    meta: {
      geometryMode: 'topic-peak-globe',
    },
    topicById: Object.fromEntries(topics.map((topic) => [topic.topicId, topic])),
    topicIds: topics.map((topic) => topic.topicId),
    topics,
  };
}

function buildLightPaperCloud() {
  const topics = [
    {
      averageCitations: 11.5,
      paperCount: 128,
      paperIndices: [0],
      sampledPointIndices: [0],
      subfieldDisplayName: 'Statistics and Probability',
      topicDisplayName: 'Topic Alpha',
      topicId: 'topic-alpha',
      totalCitations: 1640,
    },
    {
      averageCitations: 9.5,
      paperCount: 96,
      paperIndices: [1],
      sampledPointIndices: [1],
      subfieldDisplayName: 'Numerical Analysis',
      topicDisplayName: 'Topic Beta',
      topicId: 'topic-beta',
      totalCitations: 720,
    },
  ];

  return {
    meta: {
      geometryMode: 'light-paper-cloud',
    },
    sampledPoints: [
      { coordinates3d: { x: -0.2, y: 0.1, z: 0.3 }, paperIndex: 0, topicId: 'topic-alpha', workId: 'A1' },
      { coordinates3d: { x: 0.2, y: -0.1, z: 0.5 }, paperIndex: 1, topicId: 'topic-beta', workId: 'B1' },
    ],
    topicById: Object.fromEntries(topics.map((topic) => [topic.topicId, topic])),
    topicIds: topics.map((topic) => topic.topicId),
    topics,
  };
}

function renderReadyView(options = {}) {
  mockUseOpenAlexFullPaperEmbeddings.mockReturnValue({
    bundle: null,
    error: null,
    fullPaperEmbeddings: buildBundle(),
    loading: false,
    message: '',
    status: 'ready',
  });

  mockUseOpenAlexFullPaperTopicPeakGlobe.mockReturnValue({
    message: options.topicPeakMessage ?? '',
    status: options.topicPeakStatus ?? 'ready',
    topicPeakGlobe: Object.prototype.hasOwnProperty.call(options, 'topicPeakGlobe')
      ? options.topicPeakGlobe
      : buildTopicPeakGlobe(),
  });

  mockUseOpenAlexFullPaperLightPaperCloud.mockReturnValue({
    lightPaperCloud: Object.prototype.hasOwnProperty.call(options, 'lightPaperCloud')
      ? options.lightPaperCloud
      : buildLightPaperCloud(),
    message: options.lightCloudMessage ?? '',
    status: options.lightCloudStatus ?? 'ready',
  });

  return render(<OpenAlexFullPaperEmbeddingsBaseline />);
}

afterEach(() => {
  cleanup();
  mockUseOpenAlexFullPaperEmbeddings.mockReset();
  mockUseOpenAlexFullPaperTopicPeakGlobe.mockReset();
  mockUseOpenAlexFullPaperLightPaperCloud.mockReset();
  vi.clearAllMocks();
});

describe('OpenAlexFullPaperEmbeddingsBaseline', () => {
  it('keeps the macro view inside a fixed-height canvas shell instead of a tall stacked page section', async () => {
    renderReadyView();

    const macroCanvasShell = await screen.findByTestId('macro-canvas-shell');
    const routeContentShell = screen.getByTestId('baseline-content-shell');
    const macroStageShell = screen.getByTestId('macro-stage-shell');

    expect(macroCanvasShell.className).toContain('h-[840px]');
    expect(routeContentShell.className).toContain('xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]');
    expect(macroStageShell.className).toContain('xl:grid-cols-[minmax(0,1fr)_22rem]');
  });

  it('renders topic peak globe controls instead of the old field/topic-structure tabs', async () => {
    renderReadyView();

    expect(await screen.findByTestId('topic-peak-globe-viewport')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Topic Peak Globe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Light Paper Cloud' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Topic Heat Globe' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Topic Structure' })).toBeNull();
  });

  it('switches to light paper cloud and updates the topic panel independently', async () => {
    renderReadyView();

    fireEvent.click(await screen.findByRole('button', { name: 'Light Paper Cloud' }));

    expect(screen.getByTestId('light-paper-cloud-viewport')).toBeTruthy();
    expect(screen.getByText('light paper cloud panel: Topic Alpha')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Select beta cloud' }));

    await waitFor(() => {
      expect(screen.getByText('light paper cloud panel: Topic Beta')).toBeTruthy();
    });
    expect(screen.queryByTestId('topic-peak-globe-viewport')).toBeNull();
  });

  it('previews the hovered topic peak before reverting to the selected topic peak', async () => {
    renderReadyView();

    expect(await screen.findByText('active topic: topic-alpha')).toBeTruthy();
    expect(screen.getByText('topic peak panel: Topic Alpha')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Hover beta peak' }));

    await waitFor(() => {
      expect(screen.getByText('active topic: topic-beta')).toBeTruthy();
    });
    expect(screen.getByText('topic peak panel: Topic Beta')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear hovered peak' }));

    await waitFor(() => {
      expect(screen.getByText('active topic: topic-alpha')).toBeTruthy();
    });
    expect(screen.getByText('topic peak panel: Topic Alpha')).toBeTruthy();
  });

  it('keeps the topic peak globe tab reachable when the light paper cloud bundle is unavailable', async () => {
    renderReadyView({
      lightCloudMessage: 'Light paper cloud unavailable.',
      lightCloudStatus: 'unavailable',
      lightPaperCloud: null,
    });

    expect(await screen.findByTestId('topic-peak-globe-viewport')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Light Paper Cloud' }));

    expect(await screen.findByRole('heading', { name: /light paper cloud unavailable/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Topic Peak Globe' }));

    expect(await screen.findByTestId('topic-peak-globe-viewport')).toBeTruthy();
  });

  it('updates the paper inspector from local search without changing the active macro tab', async () => {
    renderReadyView();

    fireEvent.click(await screen.findByRole('button', { name: 'Light Paper Cloud' }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'beta search' },
    });

    const resultButton = await screen.findByRole('button', { name: /beta search target/i });
    fireEvent.click(resultButton);

    await waitFor(() => {
      expect(screen.getByTestId('paper-inspector').textContent).toContain('Beta Search Target');
    });
    expect(screen.getByTestId('light-paper-cloud-viewport')).toBeTruthy();
    expect(screen.queryByTestId('topic-peak-globe-viewport')).toBeNull();
  });
});

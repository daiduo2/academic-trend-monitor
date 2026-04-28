// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenAlexFullPaperTopicPeakGlobeViewport from '../OpenAlexFullPaperTopicPeakGlobeViewport';

const mockContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
};

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
const originalSetPointerCapture = HTMLCanvasElement.prototype.setPointerCapture;
const originalReleasePointerCapture = HTMLCanvasElement.prototype.releasePointerCapture;
const originalResizeObserver = globalThis.ResizeObserver;

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    this.callback();
  }

  disconnect() {}
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 960;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 720;
    },
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    top: 0,
    width: 960,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
  globalThis.ResizeObserver = ResizeObserverMock;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  }
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  HTMLCanvasElement.prototype.setPointerCapture = originalSetPointerCapture;
  HTMLCanvasElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('OpenAlexFullPaperTopicPeakGlobeViewport', () => {
  const topicPeakGlobe = {
    topicById: {
      T10243: {
        center: [0, 0, 1],
        centerMetadata: {
          azimuth: 0,
          elevation: 0,
          unitVector: [0, 0, 1],
        },
        mixedInfluence: 2.31,
        paperCount: 128,
        subfieldDisplayName: 'Statistics and Probability',
        subfieldHueKey: 'subfield:S1301',
        topicDisplayName: 'Bayesian Inference',
        topicId: 'T10243',
        totalCitations: 1640,
      },
      T20480: {
        center: [0.3, 0.2, 0.93],
        centerMetadata: {
          azimuth: 0.2,
          elevation: 0.1,
          unitVector: [0.3, 0.2, 0.93],
        },
        mixedInfluence: 1.42,
        paperCount: 96,
        subfieldDisplayName: 'Numerical Analysis',
        subfieldHueKey: 'subfield:S1402',
        topicDisplayName: 'Finite Element Methods',
        topicId: 'T20480',
        totalCitations: 720,
      },
    },
    topicIds: ['T10243', 'T20480'],
    topics: [
      {
        center: [0, 0, 1],
        centerMetadata: {
          azimuth: 0,
          elevation: 0,
          unitVector: [0, 0, 1],
        },
        mixedInfluence: 2.31,
        paperCount: 128,
        subfieldDisplayName: 'Statistics and Probability',
        subfieldHueKey: 'subfield:S1301',
        topicDisplayName: 'Bayesian Inference',
        topicId: 'T10243',
        totalCitations: 1640,
      },
      {
        center: [0.3, 0.2, 0.93],
        centerMetadata: {
          azimuth: 0.2,
          elevation: 0.1,
          unitVector: [0.3, 0.2, 0.93],
        },
        mixedInfluence: 1.42,
        paperCount: 96,
        subfieldDisplayName: 'Numerical Analysis',
        subfieldHueKey: 'subfield:S1402',
        topicDisplayName: 'Finite Element Methods',
        topicId: 'T20480',
        totalCitations: 720,
      },
    ],
    terrain: {
      indices: [0, 1, 2, 0, 2, 3],
      ownership: ['T10243', 'T10243', 'T10243', 'T20480'],
      seams: [],
      vertices: [
        [-1.2, -1.2, 1],
        [1.2, -1.2, 1],
        [0, 1.4, 1],
        [1.4, 1.4, -0.8],
      ],
    },
  };

  it('renders a canvas terrain surface instead of one button per topic and resolves hover plus selection through canvas picking', async () => {
    const onHoverTopic = vi.fn();
    const onSelectTopic = vi.fn();

    const { container } = render(
      <OpenAlexFullPaperTopicPeakGlobeViewport
        activeTopicId="T10243"
        onHoverTopic={onHoverTopic}
        onSelectTopic={onSelectTopic}
        topicPeakGlobe={topicPeakGlobe}
      />,
    );

    const host = container.firstChild;
    const canvas = screen.getByLabelText(/topic peak globe terrain/i);

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(mockContext.clip).not.toHaveBeenCalled();
    expect(host.getAttribute('data-active-topic-id')).toBe('T10243');
    expect(host.getAttribute('data-hover-topic-id')).toBe('');
    expect(host.getAttribute('data-peak-count')).toBe('2');
    expect(host.getAttribute('data-saddle-count')).toBe('1');
    expect(screen.queryByRole('button', { name: /Bayesian Inference/i })).toBeNull();
    expect(screen.getByText(/subfield-clustered topic terrain/i)).toBeTruthy();
    expect(screen.getByText(/peak summits 2/i)).toBeTruthy();
    expect(screen.getByText(/saddle seams 1/i)).toBeTruthy();

    fireEvent.pointerMove(canvas, { clientX: 480, clientY: 360 });

    await waitFor(() => {
      expect(host.getAttribute('data-hover-topic-id')).toBe('T10243');
    });
    expect(onHoverTopic).toHaveBeenCalledWith(expect.objectContaining({
      topicId: 'T10243',
      topicDisplayName: 'Bayesian Inference',
    }));

    fireEvent.click(canvas, { clientX: 480, clientY: 360 });
    expect(onSelectTopic).toHaveBeenCalledWith('T10243');
  });

  it('keeps representative terrain strokes inside the bounded canvas without relying on a spherical clip mask', async () => {
    const wideBundle = {
      ...topicPeakGlobe,
      terrain: {
        ...topicPeakGlobe.terrain,
        indices: [0, 1, 2, 0, 2, 3, 1, 3, 4],
        ownership: ['T10243', 'T10243', 'T10243', 'T20480', 'T20480'],
        vertices: [
          [-1.9, -1.35, 1.1],
          [1.95, -1.4, 1.02],
          [0.1, 1.95, 1.3],
          [1.85, 1.7, -0.95],
          [-1.65, 1.55, -0.88],
        ],
      },
    };

    render(
      <OpenAlexFullPaperTopicPeakGlobeViewport
        activeTopicId="T10243"
        onSelectTopic={vi.fn()}
        topicPeakGlobe={wideBundle}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(mockContext.clip).not.toHaveBeenCalled();

    const coordinates = [
      ...mockContext.moveTo.mock.calls.flat(),
      ...mockContext.lineTo.mock.calls.flat(),
      ...mockContext.arc.mock.calls.flatMap((call) => call.slice(0, 2)),
    ]
      .filter((value) => typeof value === 'number' && Number.isFinite(value));

    expect(coordinates.length).toBeGreaterThan(0);

    coordinates.forEach((value, index) => {
      if (index % 2 === 0) {
        expect(value).toBeGreaterThanOrEqual(-32);
        expect(value).toBeLessThanOrEqual(992);
      } else {
        expect(value).toBeGreaterThanOrEqual(-32);
        expect(value).toBeLessThanOrEqual(752);
      }
    });
  });

  it('shows the unavailable fallback only when the terrain bundle is structurally unusable', () => {
    render(
      <OpenAlexFullPaperTopicPeakGlobeViewport
        activeTopicId={null}
        onSelectTopic={vi.fn()}
        topicPeakGlobe={{
          topicById: {},
          topicIds: [],
          topics: [],
          terrain: {
            indices: [],
            ownership: [],
            seams: [],
            vertices: [],
          },
        }}
      />,
    );

    expect(screen.getByText('Topic peak globe unavailable')).toBeTruthy();
    expect(screen.getByText(/topic peak globe geometry is unavailable for this view/i)).toBeTruthy();
  });

  it('still renders when seam metadata is present alongside peak terrain cues, not just the old flat shell assumptions', async () => {
    const peakBundle = {
      ...topicPeakGlobe,
      topicIds: ['T20480', 'T10243'],
      topicById: {
        ...topicPeakGlobe.topicById,
        T20480: {
          ...topicPeakGlobe.topicById.T20480,
          subfieldDisplayName: 'Statistics and Probability',
          subfieldHueKey: 'subfield:S1301',
        },
      },
      topics: topicPeakGlobe.topics.map((topic) => (
        topic.topicId === 'T20480'
          ? {
            ...topic,
            subfieldDisplayName: 'Statistics and Probability',
            subfieldHueKey: 'subfield:S1301',
          }
          : topic
      )),
      terrain: {
        ...topicPeakGlobe.terrain,
        seams: [
          {
            faceIndex: 0,
            owners: ['T20480', 'T10243', 'T10243'],
            topicId: 'T10243',
          },
        ],
        vertices: [
          [-1.05, -1.1, 1.08],
          [1.15, -1.05, 1.02],
          [0, 1.3, 1.24],
          [1.1, 1.25, 0.92],
        ],
      },
    };

    const { container } = render(
      <OpenAlexFullPaperTopicPeakGlobeViewport
        activeTopicId="T10243"
        onSelectTopic={vi.fn()}
        topicPeakGlobe={peakBundle}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    const host = container.firstChild;
    expect(host.getAttribute('data-peak-count')).toBe('2');
    expect(host.getAttribute('data-saddle-count')).toBe('1');
    expect(screen.getByText(/connected terrain with low saddles/i)).toBeTruthy();
    expect(screen.getByText(/peak summits 2/i)).toBeTruthy();
  });
});

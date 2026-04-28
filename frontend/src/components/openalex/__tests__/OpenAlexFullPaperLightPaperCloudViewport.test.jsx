// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenAlexFullPaperLightPaperCloudViewport from '../OpenAlexFullPaperLightPaperCloudViewport';

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
const originalResizeObserver = globalThis.ResizeObserver;
const originalSetPointerCapture = HTMLCanvasElement.prototype.setPointerCapture;
const originalReleasePointerCapture = HTMLCanvasElement.prototype.releasePointerCapture;

const mockContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  measureText: vi.fn((text) => ({ width: String(text || '').length * 6 })),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
};

function captureFillAlphas() {
  const alphas = [];
  let currentAlpha = 1;

  Object.defineProperty(mockContext, 'globalAlpha', {
    configurable: true,
    get() {
      return currentAlpha;
    },
    set(value) {
      currentAlpha = value;
    },
  });

  mockContext.fill.mockImplementation(() => {
    alphas.push(currentAlpha);
  });

  return alphas;
}

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
  delete mockContext.globalAlpha;
  mockContext.fill.mockReset();
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

const mockBundle = {
  sampledPoints: [
    { coordinates3d: { x: -0.6, y: -0.4, z: -0.25 }, paperIndex: 0, topicId: 'T1', workId: 'W1' },
    { coordinates3d: { x: 0.4, y: 0.4, z: 0.25 }, paperIndex: 4, topicId: 'T2', workId: 'W5' },
    { coordinates3d: { x: 0.8, y: 0.5, z: 0.35 }, paperIndex: 5, topicId: 'T2', workId: 'W6' },
  ],
  topicById: {
    T1: {
      paperIndices: [0, 1, 2, 3],
      sampledPointIndices: [0],
      subfieldDisplayName: 'Statistics and Probability',
      topicDisplayName: 'Bayesian Inference',
      topicId: 'T1',
    },
    T2: {
      paperIndices: [4, 5, 6, 7],
      sampledPointIndices: [1, 2],
      subfieldDisplayName: 'Geometry and Topology',
      topicDisplayName: 'Graph Theory',
      topicId: 'T2',
    },
  },
  topicIds: ['T1', 'T2'],
  topics: [
    {
      paperIndices: [0, 1, 2, 3],
      sampledPointIndices: [0],
      subfieldDisplayName: 'Statistics and Probability',
      topicDisplayName: 'Bayesian Inference',
      topicId: 'T1',
    },
    {
      paperIndices: [4, 5, 6, 7],
      sampledPointIndices: [1, 2],
      subfieldDisplayName: 'Geometry and Topology',
      topicDisplayName: 'Graph Theory',
      topicId: 'T2',
    },
  ],
};

const overflowingTopicBundle = {
  sampledPoints: Array.from({ length: 12 }, (_, index) => ({
    coordinates3d: {
      x: -1.2 + (index * 0.24),
      y: -0.8 + (index * 0.16),
      z: -0.5 + (index * 0.1),
    },
    paperIndex: index,
    topicId: `T${index + 1}`,
    workId: `W${index + 1}`,
  })),
  topicById: Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => {
      const topicId = `T${index + 1}`;
      return [topicId, {
        paperIndices: [index, index + 12],
        sampledPointIndices: [index],
        subfieldDisplayName: index % 2 === 0 ? 'Statistics and Probability' : 'Geometry and Topology',
        topicDisplayName: `Topic ${index + 1}`,
        topicId,
      }];
    }),
  ),
  topicIds: Array.from({ length: 12 }, (_, index) => `T${index + 1}`),
  topics: Array.from({ length: 12 }, (_, index) => ({
    paperIndices: [index, index + 12],
    sampledPointIndices: [index],
    subfieldDisplayName: index % 2 === 0 ? 'Statistics and Probability' : 'Geometry and Topology',
    topicDisplayName: `Topic ${index + 1}`,
    topicId: `T${index + 1}`,
  })),
};

describe('OpenAlexFullPaperLightPaperCloudViewport', () => {
  it('renders sampled paper points onto the canvas instead of leaving a blank shell', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/文献点云视窗/i)).toBeTruthy();
    expect(screen.getByLabelText('抽样论文：3')).toBeTruthy();
    expect(screen.getByLabelText('聚焦论文：1')).toBeTruthy();
    expect(screen.getAllByText('Bayesian Inference').length).toBeGreaterThan(0);
    expect(container.querySelector('canvas')).toBeTruthy();
    expect(container.querySelector('canvas').className).toContain('h-[720px]');
  });

  it('fits and rasterizes the cloud against an atlas-sized 720px canvas frame', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    const canvas = container.querySelector('canvas');
    expect(canvas.style.height).toBe('720px');
    expect(canvas.height).toBe(720);
  });

  it('removes the internal topic overlay list so the map owns the viewport area', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={overflowingTopicBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('light-paper-cloud-topic-overlay-scroll')).toBeNull();
    expect(screen.queryByRole('button', { name: /Topic 12/i })).toBeNull();
    expect(container.querySelector('canvas').style.height).toBe('720px');
  });

  it('draws atlas topic labels without the fog-like radial density layer', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={overflowingTopicBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(container.querySelector('[data-atlas-region-count]')?.getAttribute('data-atlas-region-count')).toBe('12');
    expect(mockContext.createRadialGradient).not.toHaveBeenCalled();
    expect(mockContext.fillText).toHaveBeenCalled();
  });

  it('renders global points close to opaque and dims only non-selected context points', async () => {
    const unfocusedAlphas = captureFillAlphas();
    const { unmount } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId={null}
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(unfocusedAlphas).toContain(0.86);

    unmount();
    vi.clearAllMocks();
    delete mockContext.globalAlpha;
    mockContext.fill.mockReset();

    const focusedAlphas = captureFillAlphas();
    render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(focusedAlphas).toContain(1);
    expect(focusedAlphas).toContain(0.38);
  });

  it('supports multi-topic focus and can hide non-selected context points', async () => {
    const hiddenContextAlphas = captureFillAlphas();
    render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        hideUnselectedTopics
        selectedTopicIds={['T1']}
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    expect(hiddenContextAlphas).toContain(1);
    expect(hiddenContextAlphas).toContain(0);
  });

  it('updates orbit camera state after a drag gesture on the atlas-sized canvas', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    const viewport = container.querySelector('[aria-label="文献点云视窗"]');
    const canvas = container.querySelector('canvas');
    const initialAzimuth = Number(viewport.getAttribute('data-camera-azimuth'));
    const initialElevation = Number(viewport.getAttribute('data-camera-elevation'));

    fireEvent.pointerDown(canvas, {
      clientX: 120,
      clientY: 140,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 180,
      clientY: 108,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 180,
      clientY: 108,
      pointerId: 1,
    });

    expect(Number(viewport.getAttribute('data-camera-azimuth'))).not.toBe(initialAzimuth);
    expect(Number(viewport.getAttribute('data-camera-elevation'))).not.toBe(initialElevation);
  });

  it('updates zoom radius after wheel input while keeping the camera bounded', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    const viewport = container.querySelector('[aria-label="文献点云视窗"]');
    const canvas = container.querySelector('canvas');
    const initialRadius = Number(viewport.getAttribute('data-camera-radius'));
    const minRadius = Number(viewport.getAttribute('data-camera-min-radius'));
    const maxRadius = Number(viewport.getAttribute('data-camera-max-radius'));

    fireEvent.wheel(canvas, {
      deltaY: -240,
    });

    const zoomedRadius = Number(viewport.getAttribute('data-camera-radius'));
    expect(zoomedRadius).toBeLessThan(initialRadius);
    expect(zoomedRadius).toBeGreaterThanOrEqual(minRadius);

    fireEvent.wheel(canvas, {
      deltaY: 4000,
    });

    const clampedRadius = Number(viewport.getAttribute('data-camera-radius'));
    expect(clampedRadius).toBeLessThanOrEqual(maxRadius);
    expect(clampedRadius).toBeGreaterThanOrEqual(minRadius);
  });

  it('keeps wheel input inside the viewport from scrolling the page', async () => {
    const { container } = render(
      <OpenAlexFullPaperLightPaperCloudViewport
        bundle={mockBundle}
        selectedTopicId="T1"
        onHoverTopic={vi.fn()}
        onSelectTopic={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    const viewport = container.querySelector('[aria-label="文献点云视窗"]');
    const initialRadius = Number(viewport.getAttribute('data-camera-radius'));
    const wheelEvent = createEvent.wheel(viewport, {
      deltaY: -240,
    });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

    fireEvent(viewport, wheelEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(Number(viewport.getAttribute('data-camera-radius'))).toBeLessThan(initialRadius);
  });
});

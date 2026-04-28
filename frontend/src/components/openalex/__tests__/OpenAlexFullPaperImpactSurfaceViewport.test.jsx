// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenAlexFullPaperImpactSurfaceViewport from '../OpenAlexFullPaperImpactSurfaceViewport';

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
const originalResizeObserver = globalThis.ResizeObserver;

const mockContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
};

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
      return 1200;
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
    right: 1200,
    top: 0,
    width: 1200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
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
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('OpenAlexFullPaperImpactSurfaceViewport', () => {
  it('selects the nearest real evidence-bearing impact region on click', async () => {
    const onSelectRegion = vi.fn();

    const { container } = render(
      <OpenAlexFullPaperImpactSurfaceViewport
        activeRegionId={null}
        cells={[
          {
            centerX: -0.51,
            centerY: 0.24,
            column: 0,
            id: 'smoothed-region',
            neighborhoodPaperIds: ['A1', 'A2'],
            paperIds: [],
            row: 0,
            smoothedImpact: 180,
          },
          {
            centerX: -0.5,
            centerY: 0.25,
            column: 0,
            id: 'alpha-region',
            paperIds: ['A1'],
            row: 0,
            smoothedImpact: 120,
          },
          {
            centerX: 0.75,
            centerY: -0.5,
            column: 1,
            id: 'beta-region',
            paperIds: ['B1'],
            row: 1,
            smoothedImpact: 12,
          },
        ]}
        coordinateBounds={{ maxX: 1, maxY: 1, minX: -1, minY: -1 }}
        onSelectRegion={onSelectRegion}
      />,
    );

    const canvas = container.querySelector('canvas');

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    fireEvent.click(canvas, {
      clientX: 294,
      clientY: 274,
    });

    expect(onSelectRegion).toHaveBeenCalledWith('smoothed-region');
  });

  it('does not clear the active region when clicking empty canvas space', async () => {
    const onSelectRegion = vi.fn();

    const { container } = render(
      <OpenAlexFullPaperImpactSurfaceViewport
        activeRegionId="alpha-region"
        cells={[
          {
            centerX: -0.5,
            centerY: 0.25,
            column: 0,
            id: 'alpha-region',
            paperIds: ['A1'],
            row: 0,
            smoothedImpact: 120,
          },
        ]}
        coordinateBounds={{ maxX: 1, maxY: 1, minX: -1, minY: -1 }}
        onSelectRegion={onSelectRegion}
      />,
    );

    const canvas = container.querySelector('canvas');

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    fireEvent.click(canvas, {
      clientX: 1190,
      clientY: 20,
    });

    expect(onSelectRegion).not.toHaveBeenCalled();
  });
});

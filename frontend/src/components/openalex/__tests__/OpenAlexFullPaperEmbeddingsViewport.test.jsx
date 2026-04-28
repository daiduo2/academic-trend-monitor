// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import OpenAlexFullPaperEmbeddingsViewport from '../OpenAlexFullPaperEmbeddingsViewport';

vi.mock('../../../utils/openAlexFullPaperViewport', async () => {
  const actual = await vi.importActual('../../../utils/openAlexFullPaperViewport');

  return {
    ...actual,
    projectFullPaperToScreen: vi.fn(({ paper }) => {
      if (paper.id === 'OFF') {
        return {
          depth: 0.9,
          paper,
          radius: 8,
          screenX: -12,
          screenY: 220,
        };
      }

      return {
        depth: 0.1,
        paper,
        radius: 8,
        screenX: 160,
        screenY: 220,
      };
    }),
  };
});

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
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
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

describe('OpenAlexFullPaperEmbeddingsViewport', () => {
  it('does not select an off-canvas projected paper', async () => {
    const onSelectPaper = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperEmbeddingsViewport
        activePaperCount={2}
        activeTopicLabel="All topics"
        coordinateBounds2d={{ maxX: 1, maxY: 1, minX: -1, minY: -1 }}
        coordinateBounds3d={{ maxX: 1, maxY: 1, maxZ: 1, minX: -1, minY: -1, minZ: -1 }}
        onSelectPaper={onSelectPaper}
        paperGroups={[{
          color: '#22c55e',
          papers: [
            {
              coordinates: { x: 0, y: 0 },
              coordinates3d: { x: 0, y: 0, z: 0 },
              id: 'OFF',
              title: 'Off Canvas Paper',
            },
            {
              coordinates: { x: 0.5, y: 0.5 },
              coordinates3d: { x: 0.5, y: 0.5, z: 0.1 },
              id: 'ON',
              title: 'Visible Paper',
            },
          ],
          topicId: 'T1',
        }]}
        resetCameraToken={0}
        selectedPaper={null}
        selectedPaperColor={null}
        viewMode="2d"
      />,
    );
    const canvas = container.querySelector('canvas');

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    fireEvent.pointerDown(canvas, {
      clientX: -8,
      clientY: 220,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: -8,
      clientY: 220,
      pointerId: 1,
    });

    expect(onSelectPaper).toHaveBeenCalledWith(null);
  });
});

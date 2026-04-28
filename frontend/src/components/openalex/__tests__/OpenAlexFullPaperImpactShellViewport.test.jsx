// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const threeMockState = vi.hoisted(() => ({
  cameraInstances: [],
  meshInstances: [],
  raycasterInstances: [],
  rendererInstances: [],
  sceneAddCalls: [],
}));

vi.mock('three', () => {
  class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.set(x, y, z);
    }

    set(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }

  class MockObject3D {
    constructor() {
      this.children = [];
      this.position = new MockVector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = new MockVector3(1, 1, 1);
      this.visible = true;
    }

    add(child) {
      this.children.push(child);
    }
  }

  class Scene extends MockObject3D {
    add(child) {
      threeMockState.sceneAddCalls.push(child);
      super.add(child);
    }
  }

  class PerspectiveCamera extends MockObject3D {
    constructor() {
      super();
      this.aspect = 1;
      this.lookAt = vi.fn();
      this.updateProjectionMatrix = vi.fn();
      threeMockState.cameraInstances.push(this);
    }
  }

  class WebGLRenderer {
    constructor() {
      this.domElement = document.createElement('canvas');
      this.render = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      this.dispose = vi.fn();
      threeMockState.rendererInstances.push(this);
    }
  }

  class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.index = null;
    }

    setAttribute(name, attribute) {
      this.attributes[name] = attribute;
      return this;
    }

    setIndex(attribute) {
      this.index = attribute;
      return this;
    }

    computeBoundingSphere = vi.fn();
    dispose = vi.fn();
  }

  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
    }
  }

  class MeshBasicMaterial {
    constructor(config = {}) {
      this.config = config;
      this.dispose = vi.fn();
    }
  }

  class Mesh extends MockObject3D {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      threeMockState.meshInstances.push(this);
    }
  }

  class SphereGeometry {
    constructor(radius) {
      this.radius = radius;
      this.dispose = vi.fn();
    }
  }

  class AmbientLight extends MockObject3D {}
  class DirectionalLight extends MockObject3D {}

  class Raycaster {
    constructor() {
      this.setFromCamera = vi.fn();
      this.intersectObject = vi.fn(() => []);
      threeMockState.raycasterInstances.push(this);
    }
  }

  return {
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    Color: class {},
    DirectionalLight,
    Float32BufferAttribute: BufferAttribute,
    Group: MockObject3D,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Raycaster,
    Scene,
    SphereGeometry,
    Vector2: class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    Vector3: MockVector3,
    WebGLRenderer,
  };
});

import OpenAlexFullPaperImpactShellViewport from '../OpenAlexFullPaperImpactShellViewport';

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
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
  globalThis.ResizeObserver = ResizeObserverMock;
});

afterEach(() => {
  cleanup();
  threeMockState.cameraInstances.length = 0;
  threeMockState.rendererInstances.length = 0;
  threeMockState.raycasterInstances.length = 0;
  threeMockState.meshInstances.length = 0;
  threeMockState.sceneAddCalls.length = 0;
  vi.clearAllMocks();
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  }
  HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('OpenAlexFullPaperImpactShellViewport', () => {
  const shell = {
    mesh: {
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      positions: [-1, 0, 0, 1, 0, 0, 0, 1, 0],
      vertexImpact: [0.2, 0.6, 0.95],
      vertexLift: [0.05, 0.1, 0.2],
    },
    regions: [
      {
        centroid: { x: -0.8, y: 0, z: 0.05 },
        id: 'alpha',
        vertexIndices: [0, 1, 2],
      },
      {
        centroid: { x: 0.85, y: 0, z: 0.18 },
        id: 'beta',
        vertexIndices: [2],
      },
    ],
    regionById: {
      alpha: {
        centroid: { x: -0.8, y: 0, z: 0.05 },
        id: 'alpha',
        vertexIndices: [0, 1, 2],
      },
      beta: {
        centroid: { x: 0.85, y: 0, z: 0.18 },
        id: 'beta',
        vertexIndices: [2],
      },
    },
  };

  it('derives readable camera defaults from an off-origin shell', async () => {
    render(
      <OpenAlexFullPaperImpactShellViewport
        activeRegionId={null}
        onSelectRegion={vi.fn()}
        shell={{
          ...shell,
          mesh: {
            indices: [0, 1, 2],
            normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
            positions: [20, -8, 5, 26, -8, 5, 24, -2, 11],
            vertexImpact: [0.2, 0.6, 0.95],
            vertexLift: [0.05, 0.1, 0.2],
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.cameraInstances).toHaveLength(1);
    });

    const camera = threeMockState.cameraInstances[0];

    expect(camera.lookAt).toHaveBeenCalledWith(23, -5, 8);
    expect(camera.position.x).toBeGreaterThan(23);
    expect(camera.position.y).toBeGreaterThan(-5);
    expect(camera.position.z).toBeGreaterThan(8);
  });

  it('uses region vertex membership before centroid distance when picking a shell patch', async () => {
    const onSelectRegion = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperImpactShellViewport
        activeRegionId={null}
        onSelectRegion={onSelectRegion}
        shell={shell}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
      expect(threeMockState.cameraInstances).toHaveLength(1);
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        face: { a: 0, b: 1, c: 2 },
        point: { x: 0.88, y: 0.02, z: 0.19 },
      },
    ]);

    fireEvent.click(container.querySelector('canvas'), {
      clientX: 480,
      clientY: 320,
    });

    expect(onSelectRegion).toHaveBeenCalledWith('alpha');
  });

  it('moves the active region marker when activeRegionId changes', async () => {
    const { rerender } = render(
      <OpenAlexFullPaperImpactShellViewport
        activeRegionId={null}
        onSelectRegion={vi.fn()}
        shell={shell}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    const markerMesh = threeMockState.meshInstances[1];
    expect(markerMesh.visible).toBe(false);

    rerender(
      <OpenAlexFullPaperImpactShellViewport
        activeRegionId="alpha"
        onSelectRegion={vi.fn()}
        shell={shell}
      />,
    );

    expect(markerMesh.visible).toBe(true);
    expect(markerMesh.position).toMatchObject({
      x: -0.8,
      y: 0,
      z: 0.05,
    });
  });

  it('rotates on drag without selecting a region on the trailing click', async () => {
    const onSelectRegion = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperImpactShellViewport
        activeRegionId={null}
        onSelectRegion={onSelectRegion}
        shell={shell}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.cameraInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    const canvas = container.querySelector('canvas');
    const camera = threeMockState.cameraInstances[0];
    const startingPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        face: { a: 0, b: 1, c: 2 },
        point: { x: -0.82, y: 0.01, z: 0.04 },
      },
    ]);

    fireEvent.pointerDown(canvas, {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 226,
      clientY: 224,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 226,
      clientY: 224,
      pointerId: 1,
    });
    fireEvent.click(canvas, {
      clientX: 226,
      clientY: 224,
    });

    expect(camera.position).not.toMatchObject(startingPosition);
    expect(onSelectRegion).not.toHaveBeenCalled();
  });
});

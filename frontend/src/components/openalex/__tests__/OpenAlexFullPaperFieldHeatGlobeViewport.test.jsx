// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const threeMockState = vi.hoisted(() => ({
  cameraInstances: [],
  meshInstances: [],
  raycasterInstances: [],
  rendererInstances: [],
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
      this.userData = {};
      this.visible = true;
    }

    add(child) {
      this.children.push(child);
    }

    remove(child) {
      this.children = this.children.filter((item) => item !== child);
    }
  }

  class Scene extends MockObject3D {}

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

  class AmbientLight extends MockObject3D {}
  class DirectionalLight extends MockObject3D {}

  class Raycaster {
    constructor() {
      this.setFromCamera = vi.fn();
      this.intersectObject = vi.fn(() => []);
      threeMockState.raycasterInstances.push(this);
    }

    intersectObjects() {
      return this.intersectObject();
    }
  }

  return {
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    DirectionalLight,
    Float32BufferAttribute: BufferAttribute,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Raycaster,
    Scene,
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

import OpenAlexFullPaperFieldHeatGlobeViewport from '../OpenAlexFullPaperFieldHeatGlobeViewport';

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

describe('OpenAlexFullPaperFieldHeatGlobeViewport', () => {
  const globe = {
    patchById: {
      'field-26': {
        color: '#1d4ed8',
        fieldDisplayName: 'Mathematics',
        fieldId: 'field-26',
        indices: [0, 1, 2],
        positions: [20, -8, 5, 26, -8, 5, 24, -2, 11],
      },
      'field-27': {
        color: '#dc2626',
        fieldDisplayName: 'Computer Science',
        fieldId: 'field-27',
        indices: [0, 1, 2],
        positions: [-6, 0, -2, -4, 0, -2, -5, 3, 0],
      },
    },
    patches: [
      {
        color: '#1d4ed8',
        fieldDisplayName: 'Mathematics',
        fieldId: 'field-26',
        indices: [0, 1, 2],
        positions: [20, -8, 5, 26, -8, 5, 24, -2, 11],
      },
      {
        color: '#dc2626',
        fieldDisplayName: 'Computer Science',
        fieldId: 'field-27',
        indices: [0, 1, 2],
        positions: [-6, 0, -2, -4, 0, -2, -5, 3, 0],
      },
    ],
  };

  it('derives readable camera defaults from off-origin patch geometry', async () => {
    render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.cameraInstances).toHaveLength(1);
    });

    const camera = threeMockState.cameraInstances[0];

    expect(camera.lookAt).toHaveBeenCalledWith(10, -2.5, 4.5);
    expect(camera.position.x).toBeGreaterThan(10);
    expect(camera.position.y).toBeGreaterThan(-2.5);
    expect(camera.position.z).toBeGreaterThan(4.5);
  });

  it('uses patch ids for hover and click resolution', async () => {
    const onSelectPatch = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={onSelectPatch}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);

    const canvas = container.querySelector('canvas');

    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    expect(container.firstChild.dataset.hoverPatchId).toBe('field-27');

    fireEvent.pointerLeave(canvas, {
      clientX: 480,
      clientY: 320,
      pointerId: 1,
    });
    expect(container.firstChild.dataset.hoverPatchId).toBe('');

    fireEvent.click(canvas, {
      clientX: 480,
      clientY: 320,
    });
    expect(onSelectPatch).toHaveBeenCalledWith('field-27');
  });

  it('clears drag state on pointercancel so interrupted drags do not stick', async () => {
    const onSelectPatch = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={onSelectPatch}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);

    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerCancel(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.click(canvas, {
      clientX: 480,
      clientY: 320,
    });

    expect(onSelectPatch).toHaveBeenCalledWith('field-27');
  });

  it('suppresses selection after a real drag release', async () => {
    const onSelectPatch = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={onSelectPatch}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);

    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.click(canvas, {
      clientX: 480,
      clientY: 320,
    });

    expect(onSelectPatch).not.toHaveBeenCalled();
  });

  it('updates selected treatment without rebuilding geometry or resetting camera state', async () => {
    const { container, rerender } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    const rotatedPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    rerender(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId="field-27"
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(3);
    });

    const selectedOverlay = threeMockState.meshInstances.find((mesh) => mesh.userData.renderRole === 'selection-overlay');
    const selectedPatchMesh = threeMockState.meshInstances
      .filter((mesh) => mesh.userData.patchId === 'field-27' && mesh.userData.renderRole === 'patch')
      .at(-1);

    expect(camera.position).toMatchObject(rotatedPosition);
    expect(selectedOverlay).toBeTruthy();
    expect(selectedOverlay.userData.patchId).toBe('field-27');
    expect(selectedOverlay.material.config.wireframe).toBeFalsy();
    expect(selectedOverlay.material.config.transparent).toBe(true);
    expect(Array.from(selectedOverlay.geometry.attributes.position.array)).not.toEqual(
      Array.from(selectedPatchMesh.geometry.attributes.position.array),
    );
    expect(
      selectedOverlay.geometry.attributes.position.array[0] - selectedPatchMesh.geometry.attributes.position.array[0],
    ).not.toBe(
      selectedOverlay.geometry.attributes.position.array[3] - selectedPatchMesh.geometry.attributes.position.array[3],
    );
    expect(selectedPatchMesh.userData.isSelected).toBe(true);
  });

  it('updates patch colors without rebuilding geometry or resetting camera state', async () => {
    const { container, rerender } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    const rotatedPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);
    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    expect(container.firstChild.dataset.hoverPatchId).toBe('field-27');

    const initialRenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const initialPatchMeshes = initialRenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');
    const firstPatchMesh = initialPatchMeshes.find((mesh) => mesh.userData.patchId === 'field-26');
    const initialFirstPatchColor = firstPatchMesh.material.config.color;

    rerender(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={{
          ...JSON.parse(JSON.stringify(globe)),
          patches: globe.patches.map((patch) => (
            patch.fieldId === 'field-26'
              ? { ...patch, color: '#16a34a' }
              : { ...patch, color: '#f59e0b' }
          )),
        }}
        onSelectPatch={vi.fn()}
      />,
    );

    const rerenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const rerenderedPatchMeshes = rerenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');
    const rerenderedFirstPatch = rerenderedPatchMeshes.find((mesh) => mesh.userData.patchId === 'field-26');

    expect(threeMockState.meshInstances).toHaveLength(2);
    expect(camera.position).toMatchObject(rotatedPosition);
    expect(container.firstChild.dataset.hoverPatchId).toBe('');
    expect(rerenderedPatchMeshes).toEqual(initialPatchMeshes);
    expect(rerenderedFirstPatch.material.config.color).not.toEqual(initialFirstPatchColor);
  });

  it('shows the geometry-unavailable fallback when every patch is non-renderable', async () => {
    const allInvalidGlobe = {
      patches: [
        {
          color: '#1d4ed8',
          fieldId: 'field-26',
          indices: [],
          positions: [10, -4, 2, 14, -4, 2],
        },
        {
          color: '#dc2626',
          fieldId: 'field-27',
          indices: [0, 1, 99],
          positions: [-8, 3, -2, -5, 5, -1, -6, 7, 1],
        },
      ],
    };
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={allInvalidGlobe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
    });

    expect(container.textContent).toContain('Topic heat globe geometry is unavailable for this view.');
  });

  it('preserves camera state when rerendered with equivalent globe geometry and new object identity', async () => {
    const { container, rerender } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    const rotatedPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const initialRenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const initialPatchMeshes = initialRenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');

    rerender(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={JSON.parse(JSON.stringify(globe))}
        onSelectPatch={vi.fn()}
      />,
    );

    const rerenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const rerenderedPatchMeshes = rerenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');

    expect(threeMockState.meshInstances).toHaveLength(2);
    expect(camera.position).toMatchObject(rotatedPosition);
    expect(rerenderedPatchMeshes).toHaveLength(2);
    expect(rerenderedPatchMeshes).toEqual(initialPatchMeshes);
  });

  it('preserves live scene and camera when only a malformed hidden patch changes', async () => {
    const globeWithHiddenMalformedPatch = {
      ...globe,
      patches: [
        ...globe.patches,
        {
          color: '#0f172a',
          fieldDisplayName: 'Hidden malformed field',
          fieldId: 'field-hidden',
          indices: [0, 1, 99],
          positions: [100, 100, 100, 101, 100, 100, 100, 101, 100],
        },
      ],
    };
    const { container, rerender } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globeWithHiddenMalformedPatch}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(2);
    });

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    const rotatedPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const initialRenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const initialPatchMeshes = initialRenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');

    rerender(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={{
          ...globeWithHiddenMalformedPatch,
          patches: globeWithHiddenMalformedPatch.patches.map((patch) => (
            patch.fieldId === 'field-hidden'
              ? {
                ...patch,
                indices: [0, 2, 500],
                positions: [200, 200, 200, 205, 200, 200, 200, 205, 200],
              }
              : { ...patch }
          )),
        }}
        onSelectPatch={vi.fn()}
      />,
    );

    const rerenderedScene = threeMockState.rendererInstances[0].render.mock.lastCall[0];
    const rerenderedPatchMeshes = rerenderedScene.children.filter((mesh) => mesh.userData.renderRole === 'patch');

    expect(threeMockState.meshInstances).toHaveLength(2);
    expect(camera.position).toMatchObject(rotatedPosition);
    expect(rerenderedPatchMeshes).toHaveLength(2);
    expect(rerenderedPatchMeshes).toEqual(initialPatchMeshes);
  });

  it('clears stale hover state when a new globe bundle loads', async () => {
    const { container, rerender } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);

    const canvas = container.querySelector('canvas');

    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    expect(container.firstChild.dataset.hoverPatchId).toBe('field-27');

    rerender(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={{
          ...globe,
          patches: [globe.patches[0]],
        }}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.firstChild.dataset.hoverPatchId).toBe('');
    });
  });

  it('does not rotate the camera for sub-threshold click jitter before selection', async () => {
    const onSelectPatch = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={onSelectPatch}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.rendererInstances).toHaveLength(1);
      expect(threeMockState.raycasterInstances).toHaveLength(1);
      expect(threeMockState.cameraInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockReturnValue([
      {
        object: {
          userData: {
            patchId: 'field-27',
          },
        },
      },
    ]);

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');
    const startingPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    fireEvent.pointerDown(canvas, {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 203,
      clientY: 204,
      pointerId: 1,
    });

    expect(camera.position).toMatchObject(startingPosition);

    fireEvent.pointerUp(canvas, {
      clientX: 203,
      clientY: 204,
      pointerId: 1,
    });
    fireEvent.click(canvas, {
      clientX: 203,
      clientY: 204,
    });

    expect(camera.position).toMatchObject(startingPosition);
    expect(onSelectPatch).toHaveBeenCalledWith('field-27');
  });

  it('rotates on drag and zooms on wheel using the shell interaction model', async () => {
    const { container } = render(
      <OpenAlexFullPaperFieldHeatGlobeViewport
        activePatchId={null}
        globe={globe}
        onSelectPatch={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.cameraInstances).toHaveLength(1);
    });

    const camera = threeMockState.cameraInstances[0];
    const canvas = container.querySelector('canvas');
    const startingX = camera.position.x;
    const startingZ = camera.position.z;

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    expect(camera.position.x).not.toBe(startingX);
    expect(camera.position.z).not.toBe(startingZ);

    const radiusAfterDrag = Math.hypot(
      camera.position.x - 10,
      camera.position.y + 2.5,
      camera.position.z - 4.5,
    );

    fireEvent.wheel(canvas, {
      deltaY: -120,
    });

    const radiusAfterWheel = Math.hypot(
      camera.position.x - 10,
      camera.position.y + 2.5,
      camera.position.z - 4.5,
    );

    expect(radiusAfterWheel).toBeLessThan(radiusAfterDrag);
  });
});

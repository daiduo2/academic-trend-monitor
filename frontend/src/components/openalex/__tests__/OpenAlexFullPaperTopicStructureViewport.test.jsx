// @vitest-environment jsdom

import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const threeMockState = vi.hoisted(() => ({
  cameraInstances: [],
  meshInstances: [],
  pointsInstances: [],
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

  class Points extends MockObject3D {
    constructor() {
      super();
      threeMockState.pointsInstances.push(this);
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

    intersectObjects(meshes) {
      return meshes.flatMap((mesh) => this.intersectObject(mesh));
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
    Points,
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

import OpenAlexFullPaperTopicStructureViewport from '../OpenAlexFullPaperTopicStructureViewport';

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
  threeMockState.meshInstances.length = 0;
  threeMockState.pointsInstances.length = 0;
  threeMockState.raycasterInstances.length = 0;
  threeMockState.rendererInstances.length = 0;
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

describe('OpenAlexFullPaperTopicStructureViewport', () => {
  const structure = {
    fragmentById: {
      'topic-T1-fragment-0': {
        fragmentId: 'topic-T1-fragment-0',
        indices: [0, 1, 2],
        positions: [20, -8, 5, 26, -8, 5, 24, -2, 11],
        topicId: 'T1',
      },
      'topic-T1-fragment-1': {
        fragmentId: 'topic-T1-fragment-1',
        indices: [0, 1, 2],
        positions: [30, -5, 4, 34, -5, 4, 32, -1, 8],
        topicId: 'T1',
      },
      'topic-T2-fragment-0': {
        fragmentId: 'topic-T2-fragment-0',
        indices: [0, 1, 2],
        positions: [-6, 0, -2, -4, 0, -2, -5, 3, 0],
        topicId: 'T2',
      },
    },
    fragments: [
      {
        fragmentId: 'topic-T1-fragment-0',
        indices: [0, 1, 2],
        positions: [20, -8, 5, 26, -8, 5, 24, -2, 11],
        topicId: 'T1',
      },
      {
        fragmentId: 'topic-T1-fragment-1',
        indices: [0, 1, 2],
        positions: [30, -5, 4, 34, -5, 4, 32, -1, 8],
        topicId: 'T1',
      },
      {
        fragmentId: 'topic-T2-fragment-0',
        indices: [0, 1, 2],
        positions: [-6, 0, -2, -4, 0, -2, -5, 3, 0],
        topicId: 'T2',
      },
    ],
    topicById: {
      T1: {
        fieldDisplayName: 'Mathematics',
        meanCitations: 11.5,
        paperCount: 12,
        subfieldDisplayName: 'Modeling and Simulation',
        topicDisplayName: 'Topic One',
        topicId: 'T1',
      },
      T2: {
        fieldDisplayName: 'Computer Science',
        meanCitations: 6.2,
        paperCount: 8,
        subfieldDisplayName: 'Systems',
        topicDisplayName: 'Topic Two',
        topicId: 'T2',
      },
    },
    topics: [],
  };

  it('renders one semi-transparent mesh per fragment with no raw paper points', async () => {
    render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onSelectTopic={vi.fn()}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.meshInstances).toHaveLength(3);
    });

    expect(threeMockState.pointsInstances).toHaveLength(0);
    threeMockState.meshInstances.forEach((mesh) => {
      expect(mesh.material.config.transparent).toBe(true);
      expect(mesh.material.config.opacity).toBeGreaterThanOrEqual(0.28);
      expect(mesh.material.config.opacity).toBeLessThanOrEqual(0.42);
    });
    expect(threeMockState.meshInstances[0].material.config.color).toBe(
      threeMockState.meshInstances[1].material.config.color,
    );
  });

  it('resolves hover and click selection at topic level from fragment picks', async () => {
    const onHoverTopic = vi.fn();
    const onSelectTopic = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onHoverTopic={onHoverTopic}
        onSelectTopic={onSelectTopic}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockImplementation((mesh) => (
      mesh.userData.fragmentId === 'topic-T1-fragment-1'
        ? [{ object: mesh }]
        : []
    ));

    const canvas = container.querySelector('canvas');

    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    fireEvent.click(canvas, {
      clientX: 480,
      clientY: 320,
    });

    expect(onHoverTopic).toHaveBeenCalledWith(expect.objectContaining({
      ...structure.topicById.T1,
      colorHex: expect.any(String),
    }));
    expect(onSelectTopic).toHaveBeenCalledWith('T1');
  });

  it('clears hover on pointer leave and when structure changes', async () => {
    const onHoverTopic = vi.fn();
    const { container, rerender } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onHoverTopic={onHoverTopic}
        onSelectTopic={vi.fn()}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockImplementation((mesh) => (
      mesh.userData.fragmentId === 'topic-T1-fragment-1'
        ? [{ object: mesh }]
        : []
    ));

    const canvas = container.querySelector('canvas');

    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    fireEvent.pointerLeave(canvas, {
      clientX: 480,
      clientY: 320,
      pointerId: 1,
    });

    expect(onHoverTopic).toHaveBeenNthCalledWith(1, null);
    expect(onHoverTopic).toHaveBeenNthCalledWith(2, expect.objectContaining({
      ...structure.topicById.T1,
      colorHex: expect.any(String),
    }));
    expect(onHoverTopic).toHaveBeenNthCalledWith(3, null);

    rerender(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onHoverTopic={onHoverTopic}
        onSelectTopic={vi.fn()}
        structure={null}
      />,
    );

    expect(onHoverTopic).toHaveBeenLastCalledWith(null);
  });

  it('preserves the current camera/orbit context when only activeTopicId changes', async () => {
    const { container, rerender } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onSelectTopic={vi.fn()}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.cameraInstances).toHaveLength(1);
      expect(threeMockState.meshInstances).toHaveLength(3);
    });

    const canvas = container.querySelector('canvas');
    const camera = threeMockState.cameraInstances[0];
    const draggedPosition = { ...camera.position };

    fireEvent.pointerDown(canvas, {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 228,
      clientY: 224,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 228,
      clientY: 224,
      pointerId: 1,
    });

    expect(camera.position).not.toMatchObject(draggedPosition);
    const movedPosition = { ...camera.position };
    const initialMeshInstances = threeMockState.meshInstances.slice();

    rerender(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId="T1"
        onSelectTopic={vi.fn()}
        structure={structure}
      />,
    );

    expect(threeMockState.meshInstances).toHaveLength(3);
    expect(threeMockState.meshInstances).toEqual(initialMeshInstances);
    expect(camera.position).toMatchObject(movedPosition);
  });

  it('recovers hover and click after pointercancel interrupts a drag', async () => {
    const onHoverTopic = vi.fn();
    const onSelectTopic = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onHoverTopic={onHoverTopic}
        onSelectTopic={onSelectTopic}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockImplementation((mesh) => (
      mesh.userData.fragmentId === 'topic-T1-fragment-1'
        ? [{ object: mesh }]
        : []
    ));

    const canvas = container.querySelector('canvas');

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
    fireEvent.pointerCancel(canvas, {
      clientX: 226,
      clientY: 224,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    fireEvent.click(canvas, {
      clientX: 480,
      clientY: 320,
    });

    expect(onHoverTopic).toHaveBeenLastCalledWith(expect.objectContaining({
      ...structure.topicById.T1,
      colorHex: expect.any(String),
    }));
    expect(onSelectTopic).toHaveBeenCalledWith('T1');
  });

  it('suppresses topic selection on the click that follows a real drag release', async () => {
    const onSelectTopic = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onSelectTopic={onSelectTopic}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
      expect(threeMockState.cameraInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockImplementation((mesh) => (
      mesh.userData.fragmentId === 'topic-T1-fragment-1'
        ? [{ object: mesh }]
        : []
    ));

    const canvas = container.querySelector('canvas');
    const camera = threeMockState.cameraInstances[0];
    const startingPosition = { ...camera.position };

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
    expect(onSelectTopic).not.toHaveBeenCalled();
  });

  it('does not re-emit hover updates when repeated pointer moves stay on the same topic', async () => {
    const onHoverTopic = vi.fn();
    const { container } = render(
      <OpenAlexFullPaperTopicStructureViewport
        activeTopicId={null}
        onHoverTopic={onHoverTopic}
        onSelectTopic={vi.fn()}
        structure={structure}
      />,
    );

    await waitFor(() => {
      expect(threeMockState.raycasterInstances).toHaveLength(1);
    });

    threeMockState.raycasterInstances[0].intersectObject.mockImplementation((mesh) => (
      mesh.userData.fragmentId === 'topic-T1-fragment-1'
        ? [{ object: mesh }]
        : []
    ));

    const canvas = container.querySelector('canvas');

    fireEvent.pointerMove(canvas, {
      clientX: 480,
      clientY: 320,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 482,
      clientY: 318,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 484,
      clientY: 316,
    });

    expect(onHoverTopic).toHaveBeenCalledTimes(2);
    expect(onHoverTopic).toHaveBeenNthCalledWith(1, null);
    expect(onHoverTopic).toHaveBeenNthCalledWith(2, expect.objectContaining({
      ...structure.topicById.T1,
      colorHex: expect.any(String),
    }));
  });
});

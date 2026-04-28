import { describe, expect, it } from 'vitest';
import {
  buildFieldHeatGlobeGeometryBuffers,
  deriveFieldHeatGlobeCameraState,
  resolvePickedFieldPatchId,
} from '../openAlexFullPaperFieldHeatGlobeScene';

const SAMPLE_GLOBE = {
  meta: {
    fieldCount: 2,
  },
  patchById: {
    'field-26': {
      color: '#1d4ed8',
      fieldDisplayName: 'Mathematics',
      fieldId: 'field-26',
      indices: [0, 1, 2, 0, 2, 3],
      positions: [10, -4, 2, 14, -4, 2, 14, 0, 6, 10, 0, 6],
      summary: {
        meanCitations: 12,
        paperCount: 2,
      },
    },
    'field-27': {
      color: '#dc2626',
      fieldDisplayName: 'Computer Science',
      fieldId: 'field-27',
      indices: [0, 1, 2],
      positions: [-8, 3, -2, -5, 5, -1, -6, 7, 1],
      summary: {
        meanCitations: 6,
        paperCount: 1,
      },
    },
  },
  patches: [
    {
      color: '#1d4ed8',
      fieldDisplayName: 'Mathematics',
      fieldId: 'field-26',
      indices: [0, 1, 2, 0, 2, 3],
      positions: [10, -4, 2, 14, -4, 2, 14, 0, 6, 10, 0, 6],
      summary: {
        meanCitations: 12,
        paperCount: 2,
      },
    },
    {
      color: '#dc2626',
      fieldDisplayName: 'Computer Science',
      fieldId: 'field-27',
      indices: [0, 1, 2],
      positions: [-8, 3, -2, -5, 5, -1, -6, 7, 1],
      summary: {
        meanCitations: 6,
        paperCount: 1,
      },
    },
  ],
};

describe('openAlexFullPaperFieldHeatGlobeScene', () => {
  it('builds typed geometry buffers keyed by patch id', () => {
    const buffers = buildFieldHeatGlobeGeometryBuffers(SAMPLE_GLOBE);

    expect(buffers.patchMeshes['field-26'].positions).toBeInstanceOf(Float32Array);
    expect(Array.from(buffers.patchMeshes['field-26'].positions)).toEqual([
      10, -4, 2, 14, -4, 2, 14, 0, 6, 10, 0, 6,
    ]);
    expect(buffers.patchMeshes['field-26'].indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(buffers.patchMeshes['field-26'].indices)).toEqual([0, 1, 2, 0, 2, 3]);
    expect(buffers.patchMeshes['field-26'].color).toEqual([29 / 255, 78 / 255, 216 / 255]);
    expect(buffers.patchMeshes['field-27'].color).toEqual([220 / 255, 38 / 255, 38 / 255]);
  });

  it('prefers field identity color over other color keys when both are present', () => {
    const buffers = buildFieldHeatGlobeGeometryBuffers({
      patches: [
        {
          color: '#dc2626',
          fieldColor: '#1d4ed8',
          fieldId: 'field-26',
          fillColor: '#16a34a',
          indices: [0, 1, 2],
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        },
      ],
    });

    expect(buffers.patchMeshes['field-26'].color).toEqual([29 / 255, 78 / 255, 216 / 255]);
  });

  it('derives a stable default camera from the combined patch bounds', () => {
    const cameraState = deriveFieldHeatGlobeCameraState(SAMPLE_GLOBE);

    expect(cameraState.target).toEqual({
      x: 3,
      y: 1.5,
      z: 2,
    });
    expect(cameraState.radius).toBeGreaterThan(10);
    expect(cameraState.minRadius).toBeGreaterThan(0);
    expect(cameraState.maxRadius).toBeGreaterThan(cameraState.radius);
  });

  it('ignores non-renderable patches when deriving the default camera fit', () => {
    const cameraState = deriveFieldHeatGlobeCameraState({
      patches: [
        SAMPLE_GLOBE.patches[0],
        {
          color: '#0f172a',
          fieldDisplayName: 'Hidden malformed patch',
          fieldId: 'field-hidden',
          indices: [],
          positions: [5000, 5000, 5000, 9000, 9000, 9000],
        },
      ],
    });

    expect(cameraState.target).toEqual({
      x: 12,
      y: -2,
      z: 4,
    });
    expect(cameraState.radius).toBeGreaterThan(3);
    expect(cameraState.radius).toBeLessThanOrEqual(4);
  });

  it('resolves picked field patch ids from the mesh userData before other fallbacks', () => {
    expect(resolvePickedFieldPatchId(SAMPLE_GLOBE.patches, {
      object: {
        userData: {
          patchId: 'field-27',
        },
      },
    })).toBe('field-27');
  });

  it('fails closed when a picked mesh does not carry a patch id', () => {
    expect(resolvePickedFieldPatchId(SAMPLE_GLOBE.patches, {
      face: { a: 0, b: 1, c: 2 },
      object: {
        userData: {},
      },
    })).toBeNull();
  });

  it('fails closed into empty typed arrays for malformed patch meshes', () => {
    const buffers = buildFieldHeatGlobeGeometryBuffers({
      patches: [
        {
          color: '#1d4ed8',
          fieldId: 'field-26',
          indices: [0, 1, 'bad'],
          positions: [0, 1, Number.NaN],
        },
      ],
    });

    expect(Array.from(buffers.patchMeshes['field-26'].indices)).toEqual([]);
    expect(Array.from(buffers.patchMeshes['field-26'].positions)).toEqual([]);
    expect(buffers.patchMeshes['field-26'].color).toEqual([29 / 255, 78 / 255, 216 / 255]);
  });

  it('fails closed when triangle indices reference vertices outside the patch positions buffer', () => {
    const buffers = buildFieldHeatGlobeGeometryBuffers({
      patches: [
        {
          color: '#1d4ed8',
          fieldId: 'field-26',
          indices: [0, 1, 99],
          positions: [10, -4, 2, 14, -4, 2, 14, 0, 6],
        },
      ],
    });
    const cameraState = deriveFieldHeatGlobeCameraState({
      patches: [
        {
          color: '#1d4ed8',
          fieldId: 'field-26',
          indices: [0, 1, 99],
          positions: [5000, 5000, 5000, 9000, 9000, 9000, 7000, 7000, 7000],
        },
      ],
    });

    expect(Array.from(buffers.patchMeshes['field-26'].indices)).toEqual([]);
    expect(Array.from(buffers.patchMeshes['field-26'].positions)).toEqual([10, -4, 2, 14, -4, 2, 14, 0, 6]);
    expect(cameraState.target).toEqual({ x: 0, y: 0, z: 0 });
  });
});

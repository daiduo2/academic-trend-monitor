import { describe, expect, it } from 'vitest';
import {
  buildShellGeometryBuffers,
  buildShellVertexColors,
  deriveShellCameraState,
  findNearestShellRegion,
  resolvePickedShellRegion,
} from '../openAlexFullPaperImpactShellScene';

describe('openAlexFullPaperImpactShellScene', () => {
  it('builds typed geometry buffers from shell mesh payloads', () => {
    const shell = {
      mesh: {
        indices: ['0', '1', '2', '2', '3', '0'],
        normals: ['0', '0', '1', '0', '1', '0'],
        positions: ['-1', '0.5', '0', '1', '0.5', '0'],
        vertexImpact: ['0.15', '0.85'],
        vertexLift: ['0.02', '0.2'],
      },
    };

    const buffers = buildShellGeometryBuffers(shell);

    expect(buffers.indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(buffers.indices)).toEqual([0, 1, 2, 2, 3, 0]);
    expect(buffers.positions).toBeInstanceOf(Float32Array);
    expect(Array.from(buffers.positions)).toEqual([-1, 0.5, 0, 1, 0.5, 0]);
    expect(buffers.normals).toBeInstanceOf(Float32Array);
    expect(Array.from(buffers.normals)).toEqual([0, 0, 1, 0, 1, 0]);
    expect(buffers.vertexImpact).toBeInstanceOf(Float32Array);
    expect(Array.from(buffers.vertexImpact)).toEqual([
      expect.closeTo(0.15, 5),
      expect.closeTo(0.85, 5),
    ]);
    expect(buffers.vertexLift).toBeInstanceOf(Float32Array);
    expect(Array.from(buffers.vertexLift)).toEqual([
      expect.closeTo(0.02, 5),
      expect.closeTo(0.2, 5),
    ]);
  });

  it('derives readable heat colors from vertex impact values', () => {
    const colors = buildShellVertexColors(Float32Array.from([0, 0.5, 1]));

    expect(colors).toBeInstanceOf(Float32Array);
    expect(colors).toHaveLength(9);
    expect(colors[2]).toBeGreaterThan(colors[0]);
    expect(colors[3]).toBeGreaterThan(colors[5]);
    expect(colors[6]).toBeGreaterThan(colors[8]);
    expect(Array.from(colors).every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('finds the nearest shell region by centroid distance', () => {
    const regions = [
      {
        centroid: { x: -0.8, y: 0.1, z: 0 },
        id: 'alpha',
      },
      {
        centroid: { x: 0.25, y: -0.2, z: 0.1 },
        id: 'beta',
      },
      {
        centroid: { x: 0.9, y: 0.8, z: 0.4 },
        id: 'gamma',
      },
    ];

    expect(findNearestShellRegion(regions, { x: 0.2, y: -0.25, z: 0.15 })).toEqual(regions[1]);
    expect(findNearestShellRegion([], { x: 0, y: 0, z: 0 })).toBeNull();
    expect(findNearestShellRegion(regions, null)).toBeNull();
  });

  it('derives a readable default camera from off-origin shell geometry', () => {
    const cameraState = deriveShellCameraState({
      mesh: {
        positions: [
          10, -4, 2,
          14, -4, 2,
          10, 2, 8,
          14, 2, 8,
        ],
      },
    });

    expect(cameraState.target).toEqual({
      x: 12,
      y: -1,
      z: 5,
    });
    expect(cameraState.radius).toBeGreaterThan(5);
    expect(cameraState.minRadius).toBeGreaterThan(0);
    expect(cameraState.maxRadius).toBeGreaterThan(cameraState.radius);
  });

  it('falls back to safe camera defaults for malformed shell payloads', () => {
    const cameraState = deriveShellCameraState({
      mesh: {
        positions: ['bad', null, undefined],
      },
    });

    expect(cameraState.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(cameraState.radius).toBeGreaterThan(0);
    expect(cameraState.minRadius).toBeGreaterThan(0);
    expect(cameraState.maxRadius).toBeGreaterThan(cameraState.minRadius);
  });

  it('resolves picked shell regions by vertex membership before centroid fallback', () => {
    const regions = [
      {
        centroid: { x: -0.8, y: 0.1, z: 0 },
        id: 'alpha',
        vertexIndices: [0, 1, 2],
      },
      {
        centroid: { x: 0.15, y: 0.1, z: 0.1 },
        id: 'beta',
        vertexIndices: [3, 4, 5],
      },
      {
        centroid: { x: 0.9, y: 0.8, z: 0.4 },
        id: 'gamma',
        vertexIndices: [6, 7, 8],
      },
    ];

    expect(resolvePickedShellRegion(regions, {
      face: { a: 4, b: 2, c: 1 },
      point: { x: 0.88, y: 0.8, z: 0.41 },
    })).toEqual(regions[0]);

    expect(resolvePickedShellRegion(regions, {
      point: { x: 0.86, y: 0.82, z: 0.39 },
    })).toEqual(regions[2]);

    expect(resolvePickedShellRegion(regions, {
      face: { a: 42, b: 43, c: 44 },
      point: null,
    })).toBeNull();
  });

  it('normalizes malformed mesh payloads into empty typed buffers', () => {
    const buffers = buildShellGeometryBuffers({
      mesh: {
        indices: 'bad',
        normals: null,
        positions: undefined,
        vertexImpact: {},
        vertexLift: 'bad',
      },
    });

    expect(Array.from(buffers.indices)).toEqual([]);
    expect(Array.from(buffers.normals)).toEqual([]);
    expect(Array.from(buffers.positions)).toEqual([]);
    expect(Array.from(buffers.vertexImpact)).toEqual([]);
    expect(Array.from(buffers.vertexLift)).toEqual([]);
  });

  it('fails closed on partially malformed numeric mesh arrays', () => {
    const buffers = buildShellGeometryBuffers({
      mesh: {
        indices: [0, 1, 'bad'],
        normals: [0, 0, 1, 0, Number.NaN, 1],
        positions: [0, 1, 'bad', 3, 4, 5],
        vertexImpact: [0.2, 'bad'],
        vertexLift: [0.1, Number.POSITIVE_INFINITY],
      },
    });

    expect(Array.from(buffers.indices)).toEqual([]);
    expect(Array.from(buffers.normals)).toEqual([]);
    expect(Array.from(buffers.positions)).toEqual([]);
    expect(Array.from(buffers.vertexImpact)).toEqual([]);
    expect(Array.from(buffers.vertexLift)).toEqual([]);
  });
});

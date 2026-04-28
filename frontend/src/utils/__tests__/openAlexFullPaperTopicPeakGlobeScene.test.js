import { describe, expect, it } from 'vitest';
import {
  buildTopicPeakGlobeGeometryBuffers,
  deriveTopicPeakGlobeCameraState,
  resolvePickedTopicPeak,
  resolveTopicPeakColor,
} from '../openAlexFullPaperTopicPeakGlobeScene';

function roundList(values) {
  return values.map((value) => Number(value.toFixed(6)));
}

const SAMPLE_BUNDLE = {
  topicById: {
    T1: {
      center: [0, 0, 1],
      mixedInfluence: 1.4,
      subfieldDisplayName: 'Geometry and Topology',
      subfieldHueKey: 'subfield:2606',
      subfieldId: '2606',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    },
    T2: {
      center: [1, 0, 0],
      mixedInfluence: 1.1,
      subfieldDisplayName: 'Statistics and Probability',
      subfieldHueKey: 'subfield:2613',
      subfieldId: '2613',
      topicDisplayName: 'Topic Two',
      topicId: 'T2',
    },
  },
  topicIds: ['T1', 'T2'],
  topics: [],
  terrain: {
    indices: [0, 1, 2],
    ownership: ['T1', 'T2', 'T1'],
    seams: [
      {
        faceIndex: 0,
        owners: ['T1', 'T2', 'T1'],
        topicId: 'T1',
      },
    ],
    vertices: [
      [0, 0, 1.2],
      [1.1, 0, 0],
      [0, 1.3, 0],
    ],
  },
};

describe('openAlexFullPaperTopicPeakGlobeScene', () => {
  it('builds typed terrain buffers plus peak and saddle metadata keyed by topic identity', () => {
    const geometry = buildTopicPeakGlobeGeometryBuffers(SAMPLE_BUNDLE);

    expect(geometry.terrainMesh.positions).toBeInstanceOf(Float32Array);
    expect(roundList(Array.from(geometry.terrainMesh.positions))).toEqual([0, 0, 1.2, 1.1, 0, 0, 0, 1.3, 0]);
    expect(geometry.terrainMesh.indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(geometry.terrainMesh.indices)).toEqual([0, 1, 2]);
    expect(geometry.terrainMesh.ownership).toEqual(['T1', 'T2', 'T1']);
    expect(geometry.renderableTopicIds).toEqual(['T1', 'T2']);
    expect(geometry.topicLookup.T1).toMatchObject({
      colorHex: resolveTopicPeakColor(SAMPLE_BUNDLE.topicById.T1),
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    });
    expect(geometry.topicPeaks).toHaveLength(2);
    expect(geometry.topicPeaks.map((peak) => peak.topicId)).toEqual(['T1', 'T2']);
    expect(geometry.topicPeaks[0]).toMatchObject({
      topicId: 'T1',
    });
    expect(geometry.seamSegments).toHaveLength(1);
    expect(geometry.seamSegments[0]).toMatchObject({
      ownerIds: ['T1', 'T2'],
      sameSubfield: false,
    });
  });

  it('supports terrain-derived peak markers and same-subfield saddle segments, not just flat triangle fills', () => {
    const geometry = buildTopicPeakGlobeGeometryBuffers({
      topicById: {
        T1: {
          center: [0, 0, 1],
          mixedInfluence: 2.4,
          subfieldDisplayName: 'Geometry and Topology',
          subfieldHueKey: 'subfield:2606',
          subfieldId: '2606',
          topicDisplayName: 'Topic One',
          topicId: 'T1',
        },
        T2: {
          center: [0.2, 0.1, 0.97],
          mixedInfluence: 1.7,
          subfieldDisplayName: 'Geometry and Topology',
          subfieldHueKey: 'subfield:2606',
          subfieldId: '2606',
          topicDisplayName: 'Topic Two',
          topicId: 'T2',
        },
      },
      topicIds: ['T2', 'T1'],
      terrain: {
        indices: [0, 1, 2],
        ownership: ['T1', 'T2', 'T1'],
        seams: [
          {
            faceIndex: 0,
            owners: ['T2', 'T1', 'T1'],
            topicId: 'T1',
          },
        ],
        vertices: [
          [0, 0, 1.35],
          [0.4, 0.1, 1.08],
          [0, 0.45, 1.18],
        ],
      },
      topics: [],
    });

    expect(geometry.topicPeaks).toHaveLength(2);
    expect(geometry.topicPeaks.every((peak) => peak.height > 1)).toBe(true);
    expect(geometry.seamSegments).toHaveLength(1);
    expect(geometry.seamSegments[0]).toMatchObject({
      ownerIds: ['T1', 'T2'],
      sameSubfield: true,
    });
  });

  it('derives a stable camera fit from terrain bounds', () => {
    const cameraState = deriveTopicPeakGlobeCameraState(SAMPLE_BUNDLE);

    expect(roundList(Object.values(cameraState.target))).toEqual([0.55, 0.65, 0.6]);
    expect(cameraState.radius).toBeGreaterThan(1);
    expect(cameraState.maxRadius).toBeGreaterThan(cameraState.radius);
    expect(cameraState.minRadius).toBeGreaterThan(0);
  });

  it('resolves picked topics from explicit topic ids before terrain ownership fallbacks', () => {
    expect(resolvePickedTopicPeak(SAMPLE_BUNDLE, {
      object: {
        userData: {
          topicId: 'T2',
        },
      },
    })).toMatchObject({
      colorHex: resolveTopicPeakColor(SAMPLE_BUNDLE.topicById.T2),
      topicId: 'T2',
    });
  });

  it('falls back to terrain ownership when a terrain face is picked', () => {
    expect(resolvePickedTopicPeak(SAMPLE_BUNDLE, {
      face: { a: 0, b: 1, c: 2 },
      object: {
        userData: {
          meshType: 'terrain',
        },
      },
    })).toMatchObject({
      topicId: 'T1',
    });
  });

  it('fails closed for malformed terrain geometry', () => {
    const geometry = buildTopicPeakGlobeGeometryBuffers({
      ...SAMPLE_BUNDLE,
      terrain: {
        indices: [0, 1, 99],
        ownership: ['T1'],
        seams: [],
        vertices: [[0, 0, 1], [1, Number.NaN, 0], [0, 1, 0]],
      },
    });

    expect(Array.from(geometry.terrainMesh.positions)).toEqual([]);
    expect(Array.from(geometry.terrainMesh.indices)).toEqual([]);
    expect(geometry.terrainMesh.ownership).toEqual([]);
  });

  it('fails closed when terrain ownership cannot be reconciled to the topic lookup', () => {
    const geometry = buildTopicPeakGlobeGeometryBuffers({
      ...SAMPLE_BUNDLE,
      terrain: {
        ...SAMPLE_BUNDLE.terrain,
        ownership: ['T1', 'T9', 'T1'],
      },
    });

    expect(Array.from(geometry.terrainMesh.positions)).toEqual([]);
    expect(Array.from(geometry.terrainMesh.indices)).toEqual([]);
    expect(geometry.terrainMesh.ownership).toEqual([]);
  });
});

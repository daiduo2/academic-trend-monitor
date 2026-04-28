import { describe, expect, it } from 'vitest';
import {
  buildTopicStructureGeometryBuffers,
  resolveTopicFamilyColor,
  resolvePickedTopicFromFragmentPick,
} from '../openAlexFullPaperTopicStructureScene';

const SAMPLE_STRUCTURE = {
  fragmentById: {
    'topic-T1-fragment-0': {
      centroid: [-1.25, 0.1, 0.4],
      fragmentId: 'topic-T1-fragment-0',
      indices: [0, 1, 2],
      positions: [-2, 0, 0, -1, 1, 0, -1, -1, 0],
      topicId: 'T1',
    },
    'topic-T1-fragment-1': {
      centroid: [2.25, 0.35, -0.4],
      fragmentId: 'topic-T1-fragment-1',
      indices: [0, 1, 2],
      positions: [1, 0, 0, 2, 1, 0, 2, -1, 0],
      topicId: 'T1',
    },
    'topic-T2-fragment-0': {
      centroid: [0.2, 2.5, 0.6],
      fragmentId: 'topic-T2-fragment-0',
      indices: [0, 1, 2],
      positions: [0, 2, 0, 1, 3, 0, -1, 3, 0],
      topicId: 'T2',
    },
  },
  fragments: [
    {
      centroid: [-1.25, 0.1, 0.4],
      fragmentId: 'topic-T1-fragment-0',
      indices: [0, 1, 2],
      positions: [-2, 0, 0, -1, 1, 0, -1, -1, 0],
      topicId: 'T1',
    },
    {
      centroid: [2.25, 0.35, -0.4],
      fragmentId: 'topic-T1-fragment-1',
      indices: [0, 1, 2],
      positions: [1, 0, 0, 2, 1, 0, 2, -1, 0],
      topicId: 'T1',
    },
    {
      centroid: [0.2, 2.5, 0.6],
      fragmentId: 'topic-T2-fragment-0',
      indices: [0, 1, 2],
      positions: [0, 2, 0, 1, 3, 0, -1, 3, 0],
      topicId: 'T2',
    },
  ],
  topicById: {
    T1: {
      fieldDisplayName: 'Mathematics',
      fragments: [],
      meanCitations: 11.5,
      paperCount: 12,
      subfieldDisplayName: 'Modeling and Simulation',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    },
    T2: {
      fieldDisplayName: 'Mathematics',
      fragments: [],
      meanCitations: 8.1,
      paperCount: 5,
      subfieldDisplayName: 'Optimization',
      topicDisplayName: 'Topic Two',
      topicId: 'T2',
    },
  },
  topics: [],
};

describe('openAlexFullPaperTopicStructureScene', () => {
  it('builds typed fragment buffers while preserving topic ownership', () => {
    const geometry = buildTopicStructureGeometryBuffers(SAMPLE_STRUCTURE);

    expect(geometry.fragments).toHaveLength(3);
    expect(geometry.fragments[0]).toMatchObject({
      colorHex: expect.any(String),
      fragmentId: 'topic-T1-fragment-0',
      topicId: 'T1',
      topic: SAMPLE_STRUCTURE.topicById.T1,
    });
    expect(geometry.fragments[0].positions).toBeInstanceOf(Float32Array);
    expect(geometry.fragments[0].indices).toBeInstanceOf(Uint32Array);
    expect(geometry.fragments[0].opacity).toBeGreaterThanOrEqual(0.28);
    expect(geometry.fragments[0].opacity).toBeLessThanOrEqual(0.42);
    expect(geometry.fragments[0].colorHex).toBe(geometry.fragments[1].colorHex);
    expect(geometry.fragments[0].colorHex).not.toBe(geometry.fragments[2].colorHex);
  });

  it('resolves topic identity from fragment picks even when fragments are separate', () => {
    const pickedTopic = resolvePickedTopicFromFragmentPick(SAMPLE_STRUCTURE, {
      object: {
        userData: {
          fragmentId: 'topic-T1-fragment-1',
        },
      },
    });

    expect(pickedTopic).toMatchObject({
      ...SAMPLE_STRUCTURE.topicById.T1,
      colorHex: resolveTopicFamilyColor(SAMPLE_STRUCTURE.topicById.T1),
    });
  });

  it('fails closed when fragment indices point outside the local positions buffer', () => {
    const geometry = buildTopicStructureGeometryBuffers({
      ...SAMPLE_STRUCTURE,
      fragments: [
        {
          ...SAMPLE_STRUCTURE.fragments[0],
          indices: [0, 1, 4],
          positions: [-2, 0, 0, -1, 1, 0, -1, -1, 0],
        },
      ],
    });

    expect(geometry.fragments[0].positions).toBeInstanceOf(Float32Array);
    expect(Array.from(geometry.fragments[0].positions)).toEqual([-2, 0, 0, -1, 1, 0, -1, -1, 0]);
    expect(Array.from(geometry.fragments[0].indices)).toEqual([]);
  });
});

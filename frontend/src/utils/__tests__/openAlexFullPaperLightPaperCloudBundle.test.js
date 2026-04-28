import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperLightPaperCloudPath,
  buildOpenAlexFullPaperLightPaperCloudStaticPath,
  normalizeOpenAlexFullPaperLightPaperCloudBundle,
} from '../openAlexFullPaperLightPaperCloudBundle';

const SAMPLE_BUNDLE = {
  meta: {
    paperCount: 12,
    sampleLimit: 8,
    sampledPaperCount: 8,
  },
  sampledPoints: [
    {
      coordinates3d: { x: '-0.6', y: '-0.4', z: '-0.25' },
      paperIndex: '0',
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W1',
    },
    {
      coordinates3d: { x: '0.4', y: '0.4', z: '0.25' },
      paperIndex: '4',
      subfieldId: '2606',
      topicId: 'T2',
      workId: 'W5',
    },
  ],
  topics: {
    T1: {
      averageCitations: '7.5',
      paperIndices: ['0', '1', '2', '3'],
      paperCount: '4',
      sampledPointIndices: ['0'],
      subfieldDisplayName: 'Statistics and Probability',
      subfieldId: '2613',
      totalCitations: '30',
      topicDisplayName: 'Statistical Inference',
      topicId: 'T1',
    },
    T2: {
      averageCitations: '5',
      paperIndices: ['4', '5', '6', '7'],
      paperCount: '4',
      sampledPointIndices: ['1'],
      subfieldDisplayName: 'Geometry and Topology',
      subfieldId: '2606',
      totalCitations: '20',
      topicDisplayName: 'Geometric Analysis',
      topicId: 'T2',
    },
  },
  version: 'openalex_full_paper_light_paper_cloud_v1',
};

describe('openAlexFullPaperLightPaperCloudBundle', () => {
  it('builds the static Pages bundle path under the app base path', () => {
    expect(buildOpenAlexFullPaperLightPaperCloudStaticPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/data/output/openalex_full_paper_light_paper_cloud/openalex_full_paper_light_paper_cloud_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/light_paper_cloud_bundle.json',
    );
  });

  it('builds the light paper cloud bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperLightPaperCloudPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-light-paper-cloud',
    );
  });

  it('normalizes sampled points and topic overlay indices into frontend-ready structures', () => {
    const normalized = normalizeOpenAlexFullPaperLightPaperCloudBundle(SAMPLE_BUNDLE);

    expect(normalized.meta).toMatchObject({
      paperCount: 12,
      sampledPaperCount: 8,
    });
    expect(normalized.sampledPoints).toHaveLength(2);
    expect(normalized.sampledPoints[0]).toMatchObject({
      coordinates3d: { x: -0.6, y: -0.4, z: -0.25 },
      paperIndex: 0,
      subfieldId: '2613',
      topicId: 'T1',
      workId: 'W1',
    });
    expect(normalized.sampledPointsByPaperIndex[0]).toEqual(normalized.sampledPoints[0]);
    expect(normalized.topicById.T1).toMatchObject({
      averageCitations: 7.5,
      paperIndices: [0, 1, 2, 3],
      paperCount: 4,
      sampledPointIndices: [0],
      totalCitations: 30,
      topicDisplayName: 'Statistical Inference',
      topicId: 'T1',
    });
    expect(normalized.topicIds).toEqual(['T1', 'T2']);
  });

  it('assigns topic colors by paper-count rank so adjacent candidates have separated hues', () => {
    const normalized = normalizeOpenAlexFullPaperLightPaperCloudBundle({
      ...SAMPLE_BUNDLE,
      topics: {
        ...SAMPLE_BUNDLE.topics,
        T1: {
          ...SAMPLE_BUNDLE.topics.T1,
          paperCount: '10',
        },
        T2: {
          ...SAMPLE_BUNDLE.topics.T2,
          paperCount: '30',
        },
        T3: {
          ...SAMPLE_BUNDLE.topics.T2,
          paperCount: '20',
          topicDisplayName: 'Algebraic Geometry',
        },
      },
    });

    expect(normalized.topicById.T2.colorIndex).toBe(0);
    expect(normalized.topicById.T3.colorIndex).toBe(1);
    expect(normalized.topicById.T1.colorIndex).toBe(2);

    const hueValues = ['T2', 'T3', 'T1'].map((topicId) => (
      Number(normalized.topicById[topicId].colorHex.match(/hsl\((\d+)/)?.[1])
    ));
    const hueDistance = Math.abs(hueValues[0] - hueValues[1]);

    expect(normalized.topicById.T2.colorHex).toMatch(/^hsl\(/);
    expect(Math.min(hueDistance, 360 - hueDistance)).toBeGreaterThan(90);
  });

  it('fails closed when sampled point coordinates or topic indices are malformed', () => {
    const normalized = normalizeOpenAlexFullPaperLightPaperCloudBundle({
      ...SAMPLE_BUNDLE,
      sampledPoints: [
        {
          ...SAMPLE_BUNDLE.sampledPoints[0],
          coordinates3d: { x: 'bad', y: '0', z: '0' },
          paperIndex: 'oops',
        },
      ],
      topics: {
        T1: {
          ...SAMPLE_BUNDLE.topics.T1,
          paperIndices: ['0', 'bad'],
          sampledPointIndices: ['0', '9'],
        },
      },
    });

    expect(normalized.sampledPoints).toEqual([]);
    expect(normalized.sampledPointsByPaperIndex).toEqual({});
    expect(normalized.topicById.T1.paperIndices).toEqual([]);
    expect(normalized.topicById.T1.paperCount).toBe(4);
    expect(normalized.topicById.T1.sampledPointIndices).toEqual([]);
    expect(normalized.topicById.T1.totalCitations).toBe(30);
    expect(normalized.topicById.T1.averageCitations).toBe(7.5);
  });

  it('rejects structurally wrong top-level payloads instead of normalizing them as ready bundles', () => {
    expect(() => normalizeOpenAlexFullPaperLightPaperCloudBundle({
      meta: {},
      sampledPoints: null,
      topics: [],
    })).toThrow(/light paper cloud bundle is structurally invalid/i);
  });
});

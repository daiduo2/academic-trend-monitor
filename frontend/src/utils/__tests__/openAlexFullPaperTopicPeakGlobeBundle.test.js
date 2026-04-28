import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperTopicPeakGlobePath,
  buildOpenAlexFullPaperTopicPeakGlobeStaticPath,
  normalizeOpenAlexFullPaperTopicPeakGlobeBundle,
} from '../openAlexFullPaperTopicPeakGlobeBundle';

const SAMPLE_BUNDLE = {
  meta: {
    metric: 'log1p(paper_count) * log1p(total_citations)',
    topicCount: 2,
  },
  peaks: [
    {
      anchorId: 'subfield-anchor:2606',
      averageCitations: '7.5',
      center: {
        azimuth: '0.1',
        elevation: '0.2',
        unitVector: ['0', '0', '1'],
      },
      citationMassScore: '0.75',
      citationQualityScore: '0.8',
      footprintRadius: '0.11',
      influenceScore: '82.5',
      mixedInfluence: '1.4',
      paperCount: '4',
      sharpness: '2.9',
      subfieldDisplayName: 'Geometry and Topology',
      subfieldHueKey: 'subfield:2606',
      subfieldId: '2606',
      summitHeight: '0.48',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
      totalCitations: '30',
      volumeScore: '0.6',
    },
    {
      anchorId: 'subfield-anchor:2613',
      averageCitations: '5',
      center: {
        azimuth: '0.4',
        elevation: '-0.1',
        unitVector: ['1', '0', '0'],
      },
      citationMassScore: '0.4',
      citationQualityScore: '0.55',
      footprintRadius: '0.11',
      influenceScore: '52',
      mixedInfluence: '1.1',
      paperCount: '3',
      sharpness: '2.4',
      subfieldDisplayName: 'Statistics and Probability',
      subfieldHueKey: 'subfield:2613',
      subfieldId: '2613',
      summitHeight: '0.28',
      topicDisplayName: 'Topic Two',
      topicId: 'T2',
      totalCitations: '15',
      volumeScore: '0.35',
    },
  ],
  terrain: {
    indices: ['0', '1', '2'],
    ownership: ['T1', 'T2', 'T1'],
    seams: [
      {
        faceIndex: '0',
        owners: ['T1', 'T2', 'T1'],
        topicId: 'T1',
      },
    ],
    vertices: ['0', '0', '1', '1', '0', '0', '0', '1', '0'],
  },
  version: 'openalex_full_paper_topic_peak_globe_v1',
};

describe('openAlexFullPaperTopicPeakGlobeBundle', () => {
  it('builds the static Pages bundle path under the app base path', () => {
    expect(buildOpenAlexFullPaperTopicPeakGlobeStaticPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/data/output/openalex_full_paper_topic_peak_globe/openalex_full_paper_topic_peak_globe_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/topic_peak_globe_bundle.json',
    );
  });

  it('builds the topic peak globe bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperTopicPeakGlobePath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-topic-peak-globe',
    );
  });

  it('normalizes terrain vertices, seams, and topic metadata', () => {
    const normalized = normalizeOpenAlexFullPaperTopicPeakGlobeBundle(SAMPLE_BUNDLE);

    expect(normalized.meta).toMatchObject({
      metric: 'log1p(paper_count) * log1p(total_citations)',
      topicCount: 2,
    });
    expect(normalized.topics).toHaveLength(2);
    expect(normalized.topicById.T1).toEqual(normalized.topics[0]);
    expect(normalized.topics[0]).toMatchObject({
      anchorId: 'subfield-anchor:2606',
      averageCitations: 7.5,
      center: [0, 0, 1],
      citationMassScore: 0.75,
      citationQualityScore: 0.8,
      footprintRadius: 0.11,
      influenceScore: 82.5,
      mixedInfluence: 1.4,
      paperCount: 4,
      sharpness: 2.9,
      subfieldDisplayName: 'Geometry and Topology',
      subfieldHueKey: 'subfield:2606',
      subfieldId: '2606',
      summitHeight: 0.48,
      topicDisplayName: 'Topic One',
      topicId: 'T1',
      totalCitations: 30,
      volumeScore: 0.6,
    });
    expect(normalized.terrain.vertices).toEqual([
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(normalized.terrain.indices).toEqual([0, 1, 2]);
    expect(normalized.terrain.ownership).toEqual(['T1', 'T2', 'T1']);
    expect(normalized.terrain.seams[0]).toEqual({
      faceIndex: 0,
      owners: ['T1', 'T2', 'T1'],
      topicId: 'T1',
    });
  });

  it('accepts nested vertex tuples from test fixtures and keeps topic lookup stable', () => {
    const normalized = normalizeOpenAlexFullPaperTopicPeakGlobeBundle({
      ...SAMPLE_BUNDLE,
      terrain: {
        ...SAMPLE_BUNDLE.terrain,
        ownership: ['T1'],
        vertices: [[0, 0, 1]],
      },
    });

    expect(normalized.topicIds).toEqual(['T1', 'T2']);
    expect(normalized.terrain.vertices).toEqual([[0, 0, 1]]);
    expect(normalized.terrain.ownership).toEqual(['T1']);
  });

  it('fails closed when terrain numeric arrays are malformed or ownership length drifts', () => {
    const normalized = normalizeOpenAlexFullPaperTopicPeakGlobeBundle({
      ...SAMPLE_BUNDLE,
      terrain: {
        indices: ['0', '1', '99'],
        ownership: ['T1'],
        seams: [
          {
            faceIndex: 'bad',
            owners: ['T1'],
            topicId: 'T1',
          },
        ],
        vertices: ['0', 'oops', '1'],
      },
    });

    expect(normalized.terrain.vertices).toEqual([]);
    expect(normalized.terrain.indices).toEqual([]);
    expect(normalized.terrain.ownership).toEqual([]);
    expect(normalized.terrain.seams).toEqual([]);
  });

  it('rejects structurally wrong top-level payloads instead of normalizing them as ready bundles', () => {
    expect(() => normalizeOpenAlexFullPaperTopicPeakGlobeBundle({
      meta: { topicCount: 1 },
      sampledPoints: [],
      topics: {},
    })).toThrow(/topic peak globe bundle is structurally invalid/i);
  });
});

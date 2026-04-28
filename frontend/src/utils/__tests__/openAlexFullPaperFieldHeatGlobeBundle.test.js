import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperFieldHeatGlobePath,
  normalizeOpenAlexFullPaperFieldHeatGlobeBundle,
} from '../openAlexFullPaperFieldHeatGlobeBundle';

const SAMPLE_BUNDLE = {
  meta: {
    buildVersion: 'openalex_full_paper_field_heat_globe_v1',
    fieldCount: 1,
    globalTopicMean: 9,
    heatMetric: 'topic-relative-mean-citations',
    paperCount: 3,
    relativeHeatDenominator: 9,
    topicCount: 2,
  },
  patches: [
    {
      azimuth: '0',
      color: '#224466',
      elevation: '0.4',
      fieldDisplayName: 'Mathematics',
      fieldId: '26',
      height: '0.24',
      indices: ['0', '1', '2', '0', '2', '3'],
      patchId: 'T26',
      positions: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
      relativeHeat: '1.333333',
      subfieldDisplayName: 'Statistics and Probability',
      summary: {
        meanCitations: '12',
        paperCount: '2',
      },
      topicDisplayName: 'Bayesian Inference',
      topicId: 'T26',
    },
    {
      azimuth: '1.2',
      elevation: '-0.2',
      fieldDisplayName: 'Computer Science',
      fieldId: '27',
      height: '0.18',
      indices: ['0', '1', '2'],
      patchId: 'T27',
      positions: ['1', '1', '1', '2', '2', '2', '3', '3', '3'],
      relativeHeat: '1',
      subfieldDisplayName: 'Artificial Intelligence',
      summary: {
        meanCitations: '6',
        paperCount: '1',
      },
      topicDisplayName: 'Graph Neural Networks',
      topicId: 'T27',
    },
  ],
};

describe('openAlexFullPaperFieldHeatGlobeBundle', () => {
  it('builds the field heat globe bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperFieldHeatGlobePath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-field-heat-globe',
    );
  });

  it('normalizes topic heat globe bundles into frontend-ready patch collections', () => {
    const normalized = normalizeOpenAlexFullPaperFieldHeatGlobeBundle(SAMPLE_BUNDLE);

    expect(normalized.meta).toMatchObject({
      buildVersion: 'openalex_full_paper_field_heat_globe_v1',
      topicCount: 2,
    });
    expect(normalized.patches).toHaveLength(2);
    expect(normalized.patchById.T26).toEqual(normalized.patches[0]);
    expect(normalized.patches[0]).toMatchObject({
      azimuth: 0,
      color: '#224466',
      elevation: 0.4,
      fieldDisplayName: 'Mathematics',
      fieldId: '26',
      height: 0.24,
      patchId: 'T26',
      relativeHeat: 1.333333,
      subfieldDisplayName: 'Statistics and Probability',
      summary: {
        meanCitations: 12,
        paperCount: 2,
      },
      topicDisplayName: 'Bayesian Inference',
      topicId: 'T26',
    });
    expect(normalized.patches[0].positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(normalized.patches[0].indices).toEqual([0, 1, 2, 0, 2, 3]);
  });

  it('preserves bundle-provided field identity colors from supported raw keys', () => {
    const normalized = normalizeOpenAlexFullPaperFieldHeatGlobeBundle({
      ...SAMPLE_BUNDLE,
      patches: [
        SAMPLE_BUNDLE.patches[0],
        {
          ...SAMPLE_BUNDLE.patches[1],
          color: '',
          fieldColor: '#00aa88',
          fillColor: '#cc5500',
        },
        {
          ...SAMPLE_BUNDLE.patches[1],
          color: '',
          fieldColor: '',
          fieldId: '31',
          patchId: 'T31',
          fillColor: '#8844ff',
          topicId: 'T31',
        },
      ],
    });

    expect(normalized.patchById.T26.color).toBe('#224466');
    expect(normalized.patchById.T26.fillColor).toBe('#224466');
    expect(normalized.patchById.T26.fieldColor).toBe('#224466');
    expect(normalized.patchById.T27.color).toBe('#cc5500');
    expect(normalized.patchById.T27.fillColor).toBe('#cc5500');
    expect(normalized.patchById.T27.fieldColor).toBe('#00aa88');
    expect(normalized.patchById.T31.color).toBe('#8844ff');
  });

  it('skips invalid preferred color strings and falls through to valid fallback colors', () => {
    const normalized = normalizeOpenAlexFullPaperFieldHeatGlobeBundle({
      ...SAMPLE_BUNDLE,
      patches: [
        {
          ...SAMPLE_BUNDLE.patches[0],
          color: 'not-a-color',
          fieldColor: '#00aa88',
          fillColor: '#cc5500',
        },
      ],
    });

    expect(normalized.patchById.T26.color).toBe('#cc5500');
    expect(normalized.patchById.T26.fillColor).toBe('#cc5500');
    expect(normalized.patchById.T26.fieldColor).toBe('#00aa88');
  });

  it('fails closed when patch numeric arrays contain malformed values', () => {
    const normalized = normalizeOpenAlexFullPaperFieldHeatGlobeBundle({
      ...SAMPLE_BUNDLE,
      patches: [
        {
          ...SAMPLE_BUNDLE.patches[0],
          indices: ['0', '1', 'bad'],
          positions: ['0', '1', 'oops'],
        },
      ],
    });

    expect(normalized.patches[0].indices).toEqual([]);
    expect(normalized.patches[0].positions).toEqual([]);
    expect(normalized.patchById.T26.indices).toEqual([]);
    expect(normalized.patchById.T26.positions).toEqual([]);
  });

  it('fails closed when patch indices reference vertices outside the positions buffer', () => {
    const normalized = normalizeOpenAlexFullPaperFieldHeatGlobeBundle({
      ...SAMPLE_BUNDLE,
      patches: [
        {
          ...SAMPLE_BUNDLE.patches[0],
          indices: ['0', '1', '5'],
          positions: ['0', '1', '2', '3', '4', '5'],
        },
      ],
    });

    expect(normalized.patches[0].positions).toEqual([0, 1, 2, 3, 4, 5]);
    expect(normalized.patches[0].indices).toEqual([]);
  });

  it('rejects structurally wrong top-level payloads instead of normalizing them as ready bundles', () => {
    expect(() => normalizeOpenAlexFullPaperFieldHeatGlobeBundle({
      meta: {
        buildVersion: 'openalex_full_paper_topic_structure_v1',
      },
      topics: [],
      version: 'openalex_full_paper_topic_structure_v1',
    })).toThrow(/field heat globe bundle is structurally invalid/i);
  });
});

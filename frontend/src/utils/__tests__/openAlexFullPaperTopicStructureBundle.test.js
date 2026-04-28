import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperTopicStructurePath,
  getRenderableOpenAlexFullPaperTopicStructureTopics,
  normalizeOpenAlexFullPaperTopicStructureBundle,
} from '../openAlexFullPaperTopicStructureBundle';

const SAMPLE_BUNDLE = {
  meta: {
    paperCount: 3,
    topicCount: 1,
  },
  topics: [
    {
      fieldDisplayName: 'Mathematics',
      fragments: [
        {
          centroid: ['-1', '0', '0.5'],
          fragmentId: 'topic-T1-fragment-0',
          indices: ['0', '1', '2'],
          positions: ['-2', '0', '0', '-1', '1', '0', '-1', '-1', '0'],
          topicId: 'T1',
        },
        {
          centroid: ['2', '0.25', '-0.5'],
          fragmentId: 'topic-T1-fragment-1',
          indices: ['0', '1', '2'],
          positions: ['1', '0', '0', '2', '1', '0', '2', '-1', '0'],
          topicId: 'T1',
        },
      ],
      meanCitations: '11.5',
      paperCount: '3',
      subfieldDisplayName: 'Modeling and Simulation',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    },
  ],
  version: 'openalex_full_paper_topic_structure_v1',
};

describe('openAlexFullPaperTopicStructureBundle', () => {
  it('builds the topic structure bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperTopicStructurePath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-topic-structure',
    );
  });

  it('flattens topic fragments while preserving topic ownership', () => {
    const normalized = normalizeOpenAlexFullPaperTopicStructureBundle(SAMPLE_BUNDLE);

    expect(normalized.version).toBe('openalex_full_paper_topic_structure_v1');
    expect(normalized.topics).toHaveLength(1);
    expect(normalized.fragments).toHaveLength(2);
    expect(normalized.renderableTopics).toHaveLength(1);
    expect(normalized.renderableTopicIds).toEqual(['T1']);
    expect(normalized.topicById.T1).toEqual(normalized.topics[0]);
    expect(normalized.fragmentById['topic-T1-fragment-0']).toEqual(normalized.fragments[0]);
    expect(normalized.fragments[0]).toMatchObject({
      centroid: [-1, 0, 0.5],
      fragmentId: 'topic-T1-fragment-0',
      topicId: 'T1',
    });
    expect(normalized.topics[0]).toMatchObject({
      fieldDisplayName: 'Mathematics',
      fragmentIds: ['topic-T1-fragment-0', 'topic-T1-fragment-1'],
      meanCitations: 11.5,
      paperCount: 3,
      subfieldDisplayName: 'Modeling and Simulation',
      topicDisplayName: 'Topic One',
      topicId: 'T1',
    });
  });

  it('tracks no renderable topics when every topic fragment fails closed', () => {
    const normalized = normalizeOpenAlexFullPaperTopicStructureBundle({
      ...SAMPLE_BUNDLE,
      topics: [
        {
          ...SAMPLE_BUNDLE.topics[0],
          fragments: [
            {
              ...SAMPLE_BUNDLE.topics[0].fragments[0],
              indices: ['0', '1', '999'],
            },
          ],
        },
      ],
    });

    expect(normalized.renderableFragments).toEqual([]);
    expect(normalized.renderableTopicIds).toEqual([]);
    expect(normalized.renderableTopics).toEqual([]);
    expect(getRenderableOpenAlexFullPaperTopicStructureTopics(normalized)).toEqual([]);
  });

  it('fails closed when fragment numeric arrays contain malformed values', () => {
    const normalized = normalizeOpenAlexFullPaperTopicStructureBundle({
      ...SAMPLE_BUNDLE,
      topics: [
        {
          ...SAMPLE_BUNDLE.topics[0],
          fragments: [
            {
              ...SAMPLE_BUNDLE.topics[0].fragments[0],
              centroid: ['-1', 'oops', '0.5'],
              indices: ['0', '1', 'bad'],
              positions: ['-2', '0', '0', 'NaN', '1', '0'],
            },
          ],
        },
      ],
    });

    expect(normalized.fragments[0].centroid).toEqual([]);
    expect(normalized.fragments[0].indices).toEqual([]);
    expect(normalized.fragments[0].positions).toEqual([]);
    expect(normalized.fragmentById['topic-T1-fragment-0'].positions).toEqual([]);
  });

  it('fails closed when fragment indices reference vertices outside the positions buffer', () => {
    const normalized = normalizeOpenAlexFullPaperTopicStructureBundle({
      ...SAMPLE_BUNDLE,
      topics: [
        {
          ...SAMPLE_BUNDLE.topics[0],
          fragments: [
            {
              ...SAMPLE_BUNDLE.topics[0].fragments[0],
              indices: ['0', '1', '4'],
              positions: ['-2', '0', '0', '-1', '1', '0'],
            },
          ],
        },
      ],
    });

    expect(normalized.fragments[0].positions).toEqual([-2, 0, 0, -1, 1, 0]);
    expect(normalized.fragments[0].indices).toEqual([]);
  });

  it('fails closed when centroid arrays are longer than exactly three values', () => {
    const normalized = normalizeOpenAlexFullPaperTopicStructureBundle({
      ...SAMPLE_BUNDLE,
      topics: [
        {
          ...SAMPLE_BUNDLE.topics[0],
          fragments: [
            {
              ...SAMPLE_BUNDLE.topics[0].fragments[0],
              centroid: ['-1', '0', '0.5', '9'],
            },
          ],
        },
      ],
    });

    expect(normalized.fragments[0].centroid).toEqual([]);
  });

  it('rejects structurally wrong top-level payloads instead of normalizing them as ready bundles', () => {
    expect(() => normalizeOpenAlexFullPaperTopicStructureBundle({
      meta: {
        buildVersion: 'openalex_full_paper_field_heat_globe_v1',
      },
      patches: [],
    })).toThrow(/topic structure bundle is structurally invalid/i);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexTopicPaperEmbeddingsPath,
  normalizeOpenAlexTopicPaperEmbeddingsBundle,
  rankOpenAlexTopicPaperMatches,
} from '../openAlexTopicPaperEmbeddingsBundle';

const SAMPLE_BUNDLE = {
  generated_at: '2026-04-01T00:00:00Z',
  model: {
    encoder_name: 'all-MiniLM-L6-v2',
  },
  papers: [
    {
      abstract_available: true,
      cited_by_count: 8,
      coordinates: { x: -0.5, y: 0.75 },
      coordinates_3d: { x: -0.5, y: 0.75, z: -0.1 },
      publication_year: 2025,
      search_text: 'Bayesian Inference for Survey Models. Abstract: A paper about Bayesian survey inference.',
      title: 'Bayesian Inference for Survey Models',
      work_id: 'W1',
    },
    {
      abstract_available: false,
      cited_by_count: 2,
      coordinates: { x: 0.1, y: 0.2 },
      coordinates_3d: { x: 0.1, y: 0.2, z: 0.4 },
      publication_year: 2025,
      search_text: 'Bartlett-Type Corrections for Statistical Models',
      title: 'Bartlett-Type Corrections for Statistical Models',
      work_id: 'W2',
    },
    {
      abstract_available: true,
      cited_by_count: 25,
      coordinates: { x: 0.6, y: -0.4 },
      coordinates_3d: { x: 0.6, y: -0.4, z: 0.2 },
      publication_year: 2025,
      search_text: 'Robust Bayesian Model Comparison. Abstract: Leave-one-out model comparison under uncertainty.',
      title: 'Robust Bayesian Model Comparison',
      work_id: 'W3',
    },
  ],
  projection: {
    default_variant: 'semantic_pca_2d',
  },
  source: {
    topic_display_name: 'Statistical Methods and Bayesian Inference',
    topic_id: 'T10243',
  },
  stats: {
    abstract_available_count: 2,
    title_only_count: 1,
    total_paper_count: 3,
    vector_dimensions: 384,
  },
  version: 'openalex_topic_paper_embeddings_v1',
};

describe('openAlexTopicPaperEmbeddingsBundle', () => {
  it('builds the pilot bridge path under the app base path', () => {
    expect(buildOpenAlexTopicPaperEmbeddingsPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-paper-embeddings-pilot',
    );
  });

  it('normalizes bundle metadata, abstract parsing, and 2d/3d bounds', () => {
    const normalized = normalizeOpenAlexTopicPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(normalized.version).toBe('openalex_topic_paper_embeddings_v1');
    expect(normalized.availableViewModes).toEqual(['3d', '2d']);
    expect(normalized.coordinateBounds2d).toMatchObject({
      minX: -0.5,
      maxX: 0.6,
      minY: -0.4,
      maxY: 0.75,
    });
    expect(normalized.coordinateBounds3d).toMatchObject({
      minZ: -0.1,
      maxZ: 0.4,
    });
    expect(normalized.papersById.W1.abstractText).toBe('A paper about Bayesian survey inference.');
    expect(normalized.papersById.W2.abstractText).toBe('');
  });

  it('ranks exact title hits above broader search-text matches', () => {
    const normalized = normalizeOpenAlexTopicPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    const exactTitle = rankOpenAlexTopicPaperMatches(normalized, 'robust bayesian model comparison', { limit: 3 });
    expect(exactTitle[0]).toMatchObject({
      id: 'W3',
      title: 'Robust Bayesian Model Comparison',
    });

    const broadQuery = rankOpenAlexTopicPaperMatches(normalized, 'bayesian inference', { limit: 3 });
    expect(broadQuery[0]).toMatchObject({
      id: 'W1',
      title: 'Bayesian Inference for Survey Models',
    });
  });

  it('allows work-id lookup inside the local cohort search', () => {
    const normalized = normalizeOpenAlexTopicPaperEmbeddingsBundle(SAMPLE_BUNDLE);
    const matches = rankOpenAlexTopicPaperMatches(normalized, 'w2', { limit: 2 });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'W2',
    });
  });
});

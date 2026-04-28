import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexFullPaperEmbeddingsPath,
  computeOpenAlexFullPaperCoordinateBounds,
  computeOpenAlexFullPaperCoordinateBounds3d,
  filterOpenAlexFullPaperEmbeddings,
  getOpenAlexFullPaperTopicColor,
  normalizeOpenAlexFullPaperEmbeddingsBundle,
  OPENALEX_FULL_PAPER_ALL_TOPICS,
  searchOpenAlexFullPaperEmbeddings,
} from '../openAlexFullPaperEmbeddingsBundle';

const SAMPLE_BUNDLE = {
  generated_at: '2026-04-01T00:00:00Z',
  model: {
    encoder_name: 'all-MiniLM-L6-v2',
  },
  papers: [
    {
      cited_by_count: 4,
      coordinates: { x: -0.8, y: 0.1 },
      coordinates_3d: { x: -0.8, y: 0.1, z: 0.4 },
      primary_topic_display_name: 'Statistical Methods and Bayesian Inference',
      primary_topic_id: 'T10243',
      publication_year: 2025,
      search_text: 'Bayesian survey inference',
      title: 'Bayesian Survey Inference',
      work_id: 'W1',
    },
    {
      cited_by_count: 2,
      coordinates: { x: 0.25, y: -0.5 },
      coordinates_3d: { x: 0.25, y: -0.5, z: 0.2 },
      primary_topic_display_name: 'Statistical Methods and Bayesian Inference',
      primary_topic_id: 'T10243',
      publication_year: 2025,
      search_text: 'Bartlett corrections',
      title: 'Bartlett Corrections',
      work_id: 'W2',
    },
    {
      cited_by_count: 7,
      coordinates: { x: 0.75, y: 0.9 },
      coordinates_3d: { x: 0.75, y: 0.9, z: -0.3 },
      primary_topic_display_name: 'Mathematics Education and Pedagogy',
      primary_topic_id: 'T12522',
      publication_year: 2025,
      search_text: 'Mathematics teaching methods',
      title: 'Mathematics Teaching Methods',
      work_id: 'W3',
    },
  ],
  projection: {
    default_variant: 'semantic_pca_2d',
  },
  source: {
    ingest_run_id: '2026-03-23-math-primary-topic-full',
    selection_mode: 'full_math_works_core',
    text_mode: 'title_only_baseline',
  },
  stats: {
    distinct_primary_topic_count: 2,
    total_paper_count: 3,
    vector_dimensions: 384,
  },
  version: 'openalex_full_paper_title_embeddings_v1',
};

describe('openAlexFullPaperEmbeddingsBundle', () => {
  it('builds the full-paper baseline bridge path under the app base path', () => {
    expect(buildOpenAlexFullPaperEmbeddingsPath('/academic-trend-monitor/')).toBe(
      '/academic-trend-monitor/__openalex-full-paper-embeddings-baseline',
    );
  });

  it('normalizes bundle metadata, topic options, and coordinate bounds', () => {
    const normalized = normalizeOpenAlexFullPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(normalized.version).toBe('openalex_full_paper_title_embeddings_v1');
    expect(normalized.availableViewModes).toEqual(['3d', '2d']);
    expect(normalized.coordinateBounds2d).toMatchObject({
      minX: -0.8,
      maxX: 0.75,
      minY: -0.5,
      maxY: 0.9,
    });
    expect(normalized.coordinateBounds3d).toMatchObject({
      minZ: -0.3,
      maxZ: 0.4,
    });
    expect(normalized.topicOptions).toHaveLength(3);
    expect(normalized.topicOptions[0]).toMatchObject({
      value: OPENALEX_FULL_PAPER_ALL_TOPICS,
      count: 3,
      label: 'All topics',
    });
    expect(normalized.topicOptions[1]).toMatchObject({
      value: 'T10243',
      count: 2,
      label: 'Statistical Methods and Bayesian Inference',
    });
    expect(normalized.papersByPrimaryTopicId.T10243).toHaveLength(2);
  });

  it('filters the normalized bundle by topic or returns the full cohort', () => {
    const normalized = normalizeOpenAlexFullPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(filterOpenAlexFullPaperEmbeddings(normalized, OPENALEX_FULL_PAPER_ALL_TOPICS)).toHaveLength(3);
    expect(filterOpenAlexFullPaperEmbeddings(normalized, 'T12522')).toHaveLength(1);
    expect(computeOpenAlexFullPaperCoordinateBounds(filterOpenAlexFullPaperEmbeddings(normalized, 'T12522'))).toMatchObject({
      minX: 0.75,
      maxX: 0.75,
      minY: 0.9,
      maxY: 0.9,
    });
    expect(computeOpenAlexFullPaperCoordinateBounds3d(filterOpenAlexFullPaperEmbeddings(normalized, 'T12522'))).toMatchObject({
      minX: 0.75,
      maxX: 0.75,
      minY: 0.9,
      maxY: 0.9,
      minZ: -0.3,
      maxZ: -0.3,
    });
  });

  it('assigns deterministic colors by primary topic id', () => {
    expect(getOpenAlexFullPaperTopicColor('T10243')).toBe(getOpenAlexFullPaperTopicColor('T10243'));
    expect(getOpenAlexFullPaperTopicColor('T10243')).not.toBe(getOpenAlexFullPaperTopicColor('T12522'));
    expect(getOpenAlexFullPaperTopicColor('T10243')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('searches the active cohort lexically by title and work id', () => {
    const normalized = normalizeOpenAlexFullPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(searchOpenAlexFullPaperEmbeddings(normalized.papers, 'bartlett')).toMatchObject([
      { workId: 'W2' },
    ]);
    expect(searchOpenAlexFullPaperEmbeddings(normalized.papers, 'w3')).toMatchObject([
      { workId: 'W3' },
    ]);
    expect(searchOpenAlexFullPaperEmbeddings(
      filterOpenAlexFullPaperEmbeddings(normalized, 'T10243'),
      'mathematics',
    )).toEqual([]);
  });

  it('caps lexical search results to the requested limit', () => {
    const normalized = normalizeOpenAlexFullPaperEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(searchOpenAlexFullPaperEmbeddings(normalized.papers, 'w', 2)).toHaveLength(2);
  });
});

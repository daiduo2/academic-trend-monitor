import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexEmbeddingsAssetPath,
  getOpenAlexEmbeddingNeighbors,
  normalizeOpenAlexEmbeddingsBundle,
  rankOpenAlexEmbeddingMatches,
} from '../openAlexEmbeddingsBundle';

const SAMPLE_BUNDLE = {
  generated_at: '2026-03-29T00:00:00Z',
  model: {
    encoder_name: 'all-MiniLM-L6-v2',
  },
  projection: {
    method: 'semantic_pca_2d',
  },
  source: {
    dataset_slug: 'works_2025_math_primary_topic',
  },
  stats: {
    total_topic_count: 4,
    trunk_topic_count: 2,
    leaf_topic_count: 2,
  },
  version: 'openalex_topic_embeddings_v1',
  topics: [
    {
      topic_id: 'T1',
      label: 'Algebraic Geometry',
      node_kind: 'trunk_topic',
      candidate_state: 'candidate_statistical',
      coordinates: { x: -0.8, y: 0.8 },
      search_aliases: ['Geometry and Topology'],
      search_text: 'Algebraic Geometry. Field: Mathematics.',
      taxonomy: {
        field: { id: '26', label: 'Mathematics' },
        subfield: { id: '2608', label: 'Geometry and Topology' },
      },
      graph_flags: {
        retained_endpoint: true,
      },
    },
    {
      topic_id: 'T2',
      label: 'Statistical Methods',
      node_kind: 'trunk_topic',
      candidate_state: 'candidate_statistical',
      coordinates: { x: 0.6, y: 0.6 },
      search_aliases: ['Statistics and Probability'],
      search_text: 'Statistical Methods. Field: Mathematics.',
      taxonomy: {
        field: { id: '26', label: 'Mathematics' },
        subfield: { id: '2613', label: 'Statistics and Probability' },
      },
      graph_flags: {
        retained_endpoint: true,
      },
    },
    {
      topic_id: 'L1',
      label: 'Chemical Physics',
      node_kind: 'leaf_topic',
      candidate_state: 'candidate_statistical',
      coordinates: { x: -0.7, y: 0.65 },
      search_aliases: ['Physics and Astronomy', 'Algebraic Geometry'],
      search_text: 'Chemical Physics. Field: Physics and Astronomy.',
      taxonomy: {
        field: { id: '31', label: 'Physics and Astronomy' },
        subfield: { id: '3107', label: 'Atomic and Molecular Physics, and Optics' },
      },
      group_hints: {
        dominant_trunk_topic_id: 'T1',
      },
    },
    {
      topic_id: 'L2',
      label: 'Survey Sampling',
      node_kind: 'leaf_topic',
      candidate_state: 'candidate_statistical',
      coordinates: { x: 0.55, y: 0.5 },
      search_aliases: ['Statistics and Probability'],
      search_text: 'Survey Sampling. Field: Mathematics.',
      taxonomy: {
        field: { id: '26', label: 'Mathematics' },
        subfield: { id: '2613', label: 'Statistics and Probability' },
      },
      group_hints: {
        dominant_trunk_topic_id: 'T2',
      },
    },
  ],
};

function makeTopic({
  topic_id,
  label,
  node_kind = 'trunk_topic',
  retained_endpoint = true,
  coordinates,
  field = { id: '26', label: 'Mathematics' },
  subfield = { id: '2600', label: 'General Mathematics' },
  dominant_trunk_topic_id = null,
}) {
  const topic = {
    topic_id,
    label,
    node_kind,
    candidate_state: 'candidate_statistical',
    coordinates,
    search_aliases: [],
    search_text: `${label}. Field: ${field.label}.`,
    taxonomy: {
      field,
      subfield,
    },
  };

  if (node_kind === 'trunk_topic') {
    topic.graph_flags = {
      retained_endpoint,
    };
  }

  if (dominant_trunk_topic_id) {
    topic.group_hints = {
      dominant_trunk_topic_id,
    };
  }

  return topic;
}

const ANCHOR_BACKFILL_BUNDLE = {
  ...SAMPLE_BUNDLE,
  stats: {
    total_topic_count: 10,
    trunk_topic_count: 8,
    leaf_topic_count: 2,
  },
  topics: [
    makeTopic({
      topic_id: 'T1',
      label: 'Topology and Geometry',
      coordinates: { x: -0.75, y: -0.7 },
      subfield: { id: '2608', label: 'Geometry and Topology' },
    }),
    makeTopic({
      topic_id: 'T2',
      label: 'Applied Probability',
      coordinates: { x: -0.15, y: -0.75 },
      subfield: { id: '2613', label: 'Statistics and Probability' },
    }),
    makeTopic({
      topic_id: 'T3',
      label: 'Clinical Trial Statistics',
      coordinates: { x: 0.55, y: -0.65 },
      subfield: { id: '2613', label: 'Statistics and Probability' },
    }),
    makeTopic({
      topic_id: 'T4',
      label: 'Numerical Analysis for PDEs',
      coordinates: { x: -0.8, y: 0.0 },
      subfield: { id: '2604', label: 'Applied Mathematics' },
    }),
    makeTopic({
      topic_id: 'T5',
      label: 'Algebraic Topology',
      coordinates: { x: 0.6, y: 0.08 },
      subfield: { id: '2608', label: 'Geometry and Topology' },
    }),
    makeTopic({
      topic_id: 'T6',
      label: 'Statistical Mechanics',
      coordinates: { x: 0.75, y: 0.12 },
      subfield: { id: '2604', label: 'Applied Mathematics' },
    }),
    makeTopic({
      topic_id: 'T7',
      label: 'History and Theory of Mathematics',
      coordinates: { x: -0.2, y: 0.72 },
      subfield: { id: '2601', label: 'History and Philosophy of Science' },
    }),
    makeTopic({
      topic_id: 'T8',
      label: 'Mathematics Education and Programs',
      coordinates: { x: -0.05, y: 0.76 },
      subfield: { id: '2601', label: 'History and Philosophy of Science' },
    }),
    makeTopic({
      topic_id: 'L1',
      label: 'Education Research',
      node_kind: 'leaf_topic',
      coordinates: { x: 1, y: 1 },
      field: { id: '33', label: 'Social Sciences' },
      subfield: { id: '3304', label: 'Education' },
      dominant_trunk_topic_id: 'T7',
    }),
    makeTopic({
      topic_id: 'L2',
      label: 'Biomedical Signals',
      node_kind: 'leaf_topic',
      coordinates: { x: -1, y: -1 },
      field: { id: '27', label: 'Medicine' },
      subfield: { id: '2707', label: 'Health Informatics' },
      dominant_trunk_topic_id: 'T3',
    }),
  ],
};

const GENERIC_BUCKET_BUNDLE = {
  ...SAMPLE_BUNDLE,
  stats: {
    total_topic_count: 11,
    trunk_topic_count: 9,
    leaf_topic_count: 2,
  },
  topics: [
    makeTopic({
      topic_id: 'TG',
      label: 'Advanced Algebra and Geometry',
      coordinates: { x: 0.18, y: 0.73 },
      subfield: { id: '2608', label: 'Geometry and Topology' },
    }),
    makeTopic({
      topic_id: 'TS',
      label: 'Geometric and Algebraic Topology',
      coordinates: { x: 0.08, y: 0.68 },
      subfield: { id: '2608', label: 'Geometry and Topology' },
    }),
    makeTopic({
      topic_id: 'T1',
      label: 'Probability Theory',
      coordinates: { x: -0.8, y: -0.6 },
      subfield: { id: '2613', label: 'Statistics and Probability' },
    }),
    makeTopic({
      topic_id: 'T2',
      label: 'Combinatorics',
      coordinates: { x: -0.2, y: -0.6 },
      subfield: { id: '2606', label: 'Discrete Mathematics and Combinatorics' },
    }),
    makeTopic({
      topic_id: 'T3',
      label: 'Differential Equations',
      coordinates: { x: 0.7, y: -0.6 },
      subfield: { id: '2604', label: 'Applied Mathematics' },
    }),
    makeTopic({
      topic_id: 'T4',
      label: 'Numerical Analysis',
      coordinates: { x: -0.75, y: 0.0 },
      subfield: { id: '2604', label: 'Applied Mathematics' },
    }),
    makeTopic({
      topic_id: 'T5',
      label: 'Linear Systems',
      coordinates: { x: 0.2, y: 0.0 },
      subfield: { id: '2604', label: 'Applied Mathematics' },
    }),
    makeTopic({
      topic_id: 'T6',
      label: 'Statistical Inference',
      coordinates: { x: 0.75, y: 0.1 },
      subfield: { id: '2613', label: 'Statistics and Probability' },
    }),
    makeTopic({
      topic_id: 'T7',
      label: 'Set Theory',
      coordinates: { x: -0.75, y: 0.78 },
      subfield: { id: '2603', label: 'Logic' },
    }),
    makeTopic({
      topic_id: 'L1',
      label: 'Cross-field Context',
      node_kind: 'leaf_topic',
      coordinates: { x: 1, y: 1 },
      field: { id: '31', label: 'Physics and Astronomy' },
      subfield: { id: '3100', label: 'Physics' },
      dominant_trunk_topic_id: 'TS',
    }),
    makeTopic({
      topic_id: 'L2',
      label: 'Additional Context',
      node_kind: 'leaf_topic',
      coordinates: { x: -1, y: -1 },
      field: { id: '27', label: 'Medicine' },
      subfield: { id: '2700', label: 'Medicine' },
      dominant_trunk_topic_id: 'T2',
    }),
  ],
};

describe('openAlexEmbeddingsBundle', () => {
  it('builds static asset paths under the accepted embeddings root', () => {
    expect(buildOpenAlexEmbeddingsAssetPath('/academic-trend-monitor/', 'topic_embeddings_bundle.json')).toBe(
      '/academic-trend-monitor/data/output/openalex_topic_embeddings/openalex_topic_embeddings_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/topic_embeddings_bundle.json',
    );
  });

  it('normalizes bundle data into UI-friendly topic lookups and filters', () => {
    const embeddings = normalizeOpenAlexEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(embeddings.topicsById.T1).toMatchObject({
      id: 'T1',
      isTrunk: true,
      fieldLabel: 'Mathematics',
    });
    expect(embeddings.topicsById.L1).toMatchObject({
      dominantTrunkTopicId: 'T1',
      fieldLabel: 'Physics and Astronomy',
    });
    expect(embeddings.fieldOptions[0]).toMatchObject({
      value: 'Mathematics',
      count: 3,
    });
    expect(embeddings.anchorTopicIds).toEqual(expect.arrayContaining(['T1', 'T2']));
    expect(embeddings.coordinateBounds).toMatchObject({
      minX: -0.8,
      maxX: 0.6,
      minY: 0.5,
      maxY: 0.8,
    });
  });

  it('backfills sparse anchors up to the bounded trunk-only minimum', () => {
    const embeddings = normalizeOpenAlexEmbeddingsBundle(ANCHOR_BACKFILL_BUNDLE);

    expect(embeddings.anchorTopicIds).toHaveLength(8);
    expect(embeddings.anchorTopicIds.every((topicId) => embeddings.topicsById[topicId].isTrunk)).toBe(true);
    expect(embeddings.anchorTopicIds).not.toContain('L1');
    expect(embeddings.anchorTopicIds).not.toContain('L2');
  });

  it('penalizes generic trunk wrappers when a stronger same-bucket alternative exists', () => {
    const embeddings = normalizeOpenAlexEmbeddingsBundle(GENERIC_BUCKET_BUNDLE);

    expect(embeddings.anchorTopicIds).toContain('TS');
    expect(embeddings.anchorTopicIds).not.toContain('TG');
  });

  it('ranks matches across label, aliases, and search text', () => {
    const embeddings = normalizeOpenAlexEmbeddingsBundle(SAMPLE_BUNDLE);

    expect(rankOpenAlexEmbeddingMatches(embeddings, 'statistical methods')[0]).toMatchObject({
      id: 'T2',
      label: 'Statistical Methods',
    });

    expect(rankOpenAlexEmbeddingMatches(embeddings, 'geometry')[0]).toMatchObject({
      id: 'T1',
      label: 'Algebraic Geometry',
    });

    expect(rankOpenAlexEmbeddingMatches(embeddings, 'physics', { fieldLabel: 'Physics and Astronomy' })[0]).toMatchObject({
      id: 'L1',
      label: 'Chemical Physics',
    });
  });

  it('computes nearest neighbors from precomputed 2D coordinates', () => {
    const embeddings = normalizeOpenAlexEmbeddingsBundle(SAMPLE_BUNDLE);
    const neighbors = getOpenAlexEmbeddingNeighbors(embeddings, 'T2', { limit: 2 });

    expect(neighbors).toHaveLength(2);
    expect(neighbors[0]).toMatchObject({
      id: 'L2',
      label: 'Survey Sampling',
    });
    expect(neighbors[1]).toMatchObject({
      id: 'L1',
      label: 'Chemical Physics',
    });
  });
});

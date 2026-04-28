import { describe, expect, it } from 'vitest';
import {
  buildOpenAlexSemanticSearchErrorState,
  buildOpenAlexSemanticSearchPath,
  buildOpenAlexSemanticSearchIdleState,
  normalizeOpenAlexSemanticSearchResponse,
} from '../openAlexSemanticSearch';

describe('openAlexSemanticSearch', () => {
  it('builds semantic-search paths under the app base path', () => {
    expect(buildOpenAlexSemanticSearchPath('/academic-trend-monitor/', {
      limit: 12,
      query: 'bayesian statistics',
    })).toBe('/academic-trend-monitor/__openalex-semantic-search?query=bayesian+statistics&limit=12');
  });

  it('honors an active field filter before widening semantic matches', () => {
    const normalized = normalizeOpenAlexSemanticSearchResponse({
      available: true,
      matches: {
        topics: [
          {
            field_id: '26',
            field_label: 'Mathematics',
            label: 'Bayesian Methods and Mixture Models',
            node_kind: 'trunk_topic',
            score: 0.82,
            subfield_id: '2613',
            subfield_label: 'Statistics and Probability',
            topic_id: 'T1',
          },
          {
            field_id: '27',
            field_label: 'Medicine',
            label: 'Clinical Bayesian Modeling',
            node_kind: 'leaf_topic',
            score: 0.81,
            subfield_id: '2739',
            subfield_label: 'Public Health, Environmental and Occupational Health',
            topic_id: 'L1',
          },
        ],
      },
    }, {
      fieldLabel: 'Mathematics',
      limit: 5,
    });

    expect(normalized.available).toBe(true);
    expect(normalized.fieldFilterApplied).toBe(true);
    expect(normalized.widenedBeyondFieldFilter).toBe(false);
    expect(normalized.matches).toHaveLength(1);
    expect(normalized.matches[0]).toMatchObject({
      fieldLabel: 'Mathematics',
      id: 'T1',
      nodeKindLabel: 'Trunk',
    });
  });

  it('widens back to full semantic matches when the active field filter has no hits', () => {
    const normalized = normalizeOpenAlexSemanticSearchResponse({
      available: true,
      matches: {
        topics: [
          {
            field_id: '27',
            field_label: 'Medicine',
            label: 'Mathematical and Theoretical Epidemiology and Ecology Models',
            node_kind: 'leaf_topic',
            score: 0.78,
            subfield_id: '2739',
            subfield_label: 'Public Health, Environmental and Occupational Health',
            topic_id: 'L1',
          },
        ],
      },
    }, {
      fieldLabel: 'Mathematics',
      limit: 5,
    });

    expect(normalized.available).toBe(true);
    expect(normalized.fieldFilterApplied).toBe(false);
    expect(normalized.widenedBeyondFieldFilter).toBe(true);
    expect(normalized.matches[0]).toMatchObject({
      fieldLabel: 'Medicine',
      id: 'L1',
      nodeKindLabel: 'Leaf',
    });
  });

  it('normalizes an unavailable runtime response into a soft fallback state', () => {
    const normalized = normalizeOpenAlexSemanticSearchResponse({
      available: false,
      message: 'Semantic search sidecar path is not configured for local Vite serve mode.',
      reason: 'missing_sidecar_path',
    });

    expect(normalized).toMatchObject({
      available: false,
      message: 'Semantic search sidecar path is not configured for local Vite serve mode.',
      reason: 'missing_sidecar_path',
      status: 'unavailable',
    });
  });

  it('builds stable idle and error states', () => {
    expect(buildOpenAlexSemanticSearchIdleState()).toMatchObject({
      available: false,
      matches: [],
      status: 'idle',
    });

    const errorState = buildOpenAlexSemanticSearchErrorState(new Error('boom'));
    expect(errorState).toMatchObject({
      available: false,
      matches: [],
      reason: 'semantic_assist_error',
      status: 'error',
    });
    expect(errorState.error).toBeInstanceOf(Error);
  });
});

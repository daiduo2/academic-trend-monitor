import { describe, expect, it } from 'vitest';
import { resolveGlobalTopicsDetail, resolveHierarchyNodeDetail } from '../topicResolution';

describe('topicResolution', () => {
  const trends = {
    global_1: {
      name: 'Topic One',
      keywords: ['alpha', 'beta'],
      total_papers: 6,
      history: [
        { period: '2025-01', paper_count: 2 },
        { period: '2025-02', paper_count: 4 }
      ]
    },
    global_2: {
      name: 'Topic Two',
      keywords: ['beta', 'gamma'],
      total_papers: 5,
      history: [
        { period: '2025-02', paper_count: 1 },
        { period: '2025-03', paper_count: 4 }
      ]
    }
  };

  it('resolves hierarchy nodes through stable global topic ids', () => {
    const detail = resolveHierarchyNodeDetail(
      {
        name: 'Leaf Topic',
        keywords: ['seed'],
        topic_ids: ['1', '2']
      },
      trends
    );

    expect(detail.globalTopicIds).toEqual(['global_1', 'global_2']);
    expect(detail.representativeTopicId).toBe('global_1');
    expect(detail.isAggregate).toBe(true);
    expect(detail.history).toEqual([
      { period: '2025-01', paper_count: 2 },
      { period: '2025-02', paper_count: 5 },
      { period: '2025-03', paper_count: 4 }
    ]);
    expect(detail.trend).toEqual(detail.history);
    expect(detail.keywords).toEqual(['seed', 'alpha', 'beta', 'gamma']);
  });

  it('resolves aggregate details directly from global topic ids', () => {
    const detail = resolveGlobalTopicsDetail(['global_2'], trends, {
      name: 'Direct Topic'
    });

    expect(detail.id).toBe('global_2');
    expect(detail.isAggregate).toBe(false);
    expect(detail.constituentTopics).toEqual([{ id: 'global_2', name: 'Topic Two' }]);
    expect(detail.history).toEqual([
      { period: '2025-02', paper_count: 1 },
      { period: '2025-03', paper_count: 4 }
    ]);
  });
});

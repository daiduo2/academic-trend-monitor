function normalizeGlobalTopicId(topicId) {
  if (!topicId) return null;
  return String(topicId).startsWith('global_') ? String(topicId) : `global_${topicId}`;
}

function mergeHistoryEntries(histories) {
  const merged = new Map();

  histories.forEach(history => {
    history.forEach(entry => {
      const existing = merged.get(entry.period);
      if (existing) {
        existing.paper_count += entry.paper_count || 0;
      } else {
        merged.set(entry.period, {
          period: entry.period,
          paper_count: entry.paper_count || 0
        });
      }
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export function resolveGlobalTopicsDetail(globalTopicIds, trends, baseTopic = {}) {
  const normalizedIds = [...new Set((globalTopicIds || []).map(normalizeGlobalTopicId).filter(Boolean))];
  const trendEntries = normalizedIds
    .map(globalId => ({ globalId, trend: trends?.[globalId] }))
    .filter(entry => entry.trend);

  if (trendEntries.length === 0) {
    return {
      ...baseTopic,
      globalTopicIds: normalizedIds,
      representativeTopicId: normalizedIds[0] || baseTopic.id || null,
      history: baseTopic.history || [],
      trend: baseTopic.trend || baseTopic.history || [],
      keywords: baseTopic.keywords || [],
      constituentTopics: []
    };
  }

  const history = mergeHistoryEntries(trendEntries.map(entry => entry.trend.history || []));
  const keywordSet = new Set(baseTopic.keywords || []);
  const constituentTopics = trendEntries.map(({ globalId, trend }) => {
    (trend.keywords || []).forEach(keyword => keywordSet.add(keyword));
    return {
      id: globalId,
      name: trend.name
    };
  });

  const representative = trendEntries[0];

  return {
    ...baseTopic,
    id: representative.globalId,
    representativeTopicId: representative.globalId,
    globalTopicIds: trendEntries.map(entry => entry.globalId),
    history,
    trend: history,
    keywords: Array.from(keywordSet),
    totalPapers: trendEntries.reduce((sum, entry) => sum + (entry.trend.total_papers || 0), 0),
    activePeriods: history.length,
    constituentTopics,
    isAggregate: trendEntries.length > 1,
    category: representative.trend.category,
    subcategory: representative.trend.subcategory
  };
}

export function resolveHierarchyNodeDetail(node, trends) {
  if (!node) return null;

  if (node.topic_ids?.length) {
    return resolveGlobalTopicsDetail(node.topic_ids, trends, node);
  }

  if (node.id) {
    return resolveGlobalTopicsDetail([node.id], trends, node);
  }

  return {
    ...node,
    globalTopicIds: [],
    representativeTopicId: node.id || null,
    history: node.history || [],
    keywords: node.keywords || [],
    constituentTopics: []
  };
}

const OPENALEX_EMBEDDINGS_BUNDLE_ROOT = 'data/output/openalex_topic_embeddings/openalex_topic_embeddings_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full';
const DEFAULT_ANCHOR_COLUMNS = 4;
const DEFAULT_ANCHOR_ROWS = 3;
const DEFAULT_ANCHOR_MIN = 8;
const GENERIC_ANCHOR_PATTERNS = Object.freeze([
  /^advanced\b/i,
  /\bstudies\b/i,
  /\bresearch\b/i,
  /\bapplications\b/i,
  /\banalysis\b/i,
]);
export const OPENALEX_EMBEDDINGS_WORLD_LAYOUT = Object.freeze({
  width: 1600,
  height: 1000,
  padding: 92,
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) {
      return;
    }
    const normalized = normalizeText(text);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(text);
  });

  return result;
}

function computeCoordinateBounds(topics) {
  if (!topics.length) {
    return {
      minX: -1,
      maxX: 1,
      minY: -1,
      maxY: 1,
    };
  }

  return topics.reduce((bounds, topic) => ({
    minX: Math.min(bounds.minX, topic.coordinates.x),
    maxX: Math.max(bounds.maxX, topic.coordinates.x),
    minY: Math.min(bounds.minY, topic.coordinates.y),
    maxY: Math.max(bounds.maxY, topic.coordinates.y),
  }), {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function countGenericAnchorTerms(label) {
  return GENERIC_ANCHOR_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(String(label || '')) ? 1 : 0),
    0,
  );
}

function buildAnchorCandidate(topic, bounds) {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-9);
  const normalizedX = (topic.coordinates.x - bounds.minX) / spanX;
  const normalizedY = (topic.coordinates.y - bounds.minY) / spanY;
  const column = Math.max(0, Math.min(DEFAULT_ANCHOR_COLUMNS - 1, Math.floor(normalizedX * DEFAULT_ANCHOR_COLUMNS)));
  const row = Math.max(0, Math.min(DEFAULT_ANCHOR_ROWS - 1, Math.floor(normalizedY * DEFAULT_ANCHOR_ROWS)));
  const bucketCenterX = (column + 0.5) / DEFAULT_ANCHOR_COLUMNS;
  const bucketCenterY = (row + 0.5) / DEFAULT_ANCHOR_ROWS;

  return {
    bucketCenterDistance: Math.hypot(normalizedX - bucketCenterX, normalizedY - bucketCenterY),
    bucketKey: `${column}:${row}`,
    genericPenalty: countGenericAnchorTerms(topic.label),
    normalizedX,
    normalizedY,
    retainedEndpoint: Boolean(topic.graphFlags?.retainedEndpoint),
    topic,
  };
}

function compareBucketCandidates(left, right) {
  if (left.retainedEndpoint !== right.retainedEndpoint) {
    return left.retainedEndpoint ? -1 : 1;
  }
  if (left.genericPenalty !== right.genericPenalty) {
    return left.genericPenalty - right.genericPenalty;
  }
  if (left.bucketCenterDistance !== right.bucketCenterDistance) {
    return left.bucketCenterDistance - right.bucketCenterDistance;
  }
  return left.topic.label.localeCompare(right.topic.label);
}

function compareAnchorTopicOrder(left, right) {
  if (left.topic.coordinates.y !== right.topic.coordinates.y) {
    return left.topic.coordinates.y - right.topic.coordinates.y;
  }
  if (left.topic.coordinates.x !== right.topic.coordinates.x) {
    return left.topic.coordinates.x - right.topic.coordinates.x;
  }
  return left.topic.label.localeCompare(right.topic.label);
}

function computeAnchorCandidateDistance(left, right) {
  return Math.hypot(left.normalizedX - right.normalizedX, left.normalizedY - right.normalizedY);
}

function computeBackfillDistance(candidate, selectedCandidates) {
  if (!selectedCandidates.length) {
    return 1;
  }

  return selectedCandidates.reduce(
    (bestDistance, selectedCandidate) => Math.min(bestDistance, computeAnchorCandidateDistance(candidate, selectedCandidate)),
    Number.POSITIVE_INFINITY,
  );
}

function scoreBackfillCandidate(candidate, selectedCandidates) {
  return computeBackfillDistance(candidate, selectedCandidates)
    + (candidate.retainedEndpoint ? 0.08 : 0)
    - (candidate.genericPenalty * 0.14);
}

function compareBackfillCandidates(left, right, selectedCandidates) {
  const leftScore = scoreBackfillCandidate(left, selectedCandidates);
  const rightScore = scoreBackfillCandidate(right, selectedCandidates);

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  const leftDistance = computeBackfillDistance(left, selectedCandidates);
  const rightDistance = computeBackfillDistance(right, selectedCandidates);
  if (rightDistance !== leftDistance) {
    return rightDistance - leftDistance;
  }
  if (left.genericPenalty !== right.genericPenalty) {
    return left.genericPenalty - right.genericPenalty;
  }
  if (left.retainedEndpoint !== right.retainedEndpoint) {
    return left.retainedEndpoint ? -1 : 1;
  }
  return left.topic.label.localeCompare(right.topic.label);
}

function chooseAnchorTopics(topics, bounds) {
  const trunkTopics = topics.filter((topic) => topic.isTrunk);
  if (!trunkTopics.length) {
    return [];
  }

  const buckets = new Map();
  const anchorCandidates = trunkTopics
    .map((topic) => buildAnchorCandidate(topic, bounds))
    .sort((left, right) => left.topic.label.localeCompare(right.topic.label));

  anchorCandidates.forEach((candidate) => {
    const previous = buckets.get(candidate.bucketKey);
    if (!previous || compareBucketCandidates(candidate, previous) < 0) {
      buckets.set(candidate.bucketKey, candidate);
    }
  });

  const selectedCandidates = [...buckets.values()];
  const targetAnchorCount = Math.min(DEFAULT_ANCHOR_MIN, DEFAULT_ANCHOR_COLUMNS * DEFAULT_ANCHOR_ROWS, anchorCandidates.length);

  if (selectedCandidates.length < targetAnchorCount) {
    const selectedTopicIds = new Set(selectedCandidates.map((candidate) => candidate.topic.id));
    const remainingCandidates = anchorCandidates.filter((candidate) => !selectedTopicIds.has(candidate.topic.id));

    while (selectedCandidates.length < targetAnchorCount && remainingCandidates.length) {
      remainingCandidates.sort((left, right) => compareBackfillCandidates(left, right, selectedCandidates));
      const nextCandidate = remainingCandidates.shift();
      if (!nextCandidate) {
        break;
      }
      selectedCandidates.push(nextCandidate);
    }
  }

  return selectedCandidates
    .sort(compareAnchorTopicOrder)
    .map((candidate) => candidate.topic.id);
}

function scoreSearchMatch(topic, normalizedQuery) {
  if (!normalizedQuery) {
    return 0;
  }

  const label = normalizeText(topic.label);
  const aliases = topic.searchAliases.map((alias) => normalizeText(alias));
  const searchBlob = topic.searchBlob;

  let score = 0;

  if (label === normalizedQuery || aliases.includes(normalizedQuery)) {
    score = 1200;
  } else if (label.startsWith(normalizedQuery)) {
    score = 950;
  } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    score = 875;
  } else if (label.includes(normalizedQuery)) {
    score = 720;
  } else if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    score = 660;
  } else if (searchBlob.includes(normalizedQuery)) {
    score = 320;
  }

  if (!score) {
    return 0;
  }

  if (topic.isTrunk) {
    score += 12;
  }

  return score;
}

export function buildOpenAlexEmbeddingsAssetPath(basePath = '/', fileName = 'topic_embeddings_bundle.json') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_EMBEDDINGS_BUNDLE_ROOT}/${fileName}`;
}

export function projectOpenAlexEmbeddingPoint(
  topic,
  coordinateBounds,
  layout = OPENALEX_EMBEDDINGS_WORLD_LAYOUT,
) {
  const spanX = Math.max(coordinateBounds.maxX - coordinateBounds.minX, 1e-6);
  const spanY = Math.max(coordinateBounds.maxY - coordinateBounds.minY, 1e-6);
  const normalizedX = (topic.coordinates.x - coordinateBounds.minX) / spanX;
  const normalizedY = (topic.coordinates.y - coordinateBounds.minY) / spanY;
  const innerWidth = Math.max(layout.width - (layout.padding * 2), 1);
  const innerHeight = Math.max(layout.height - (layout.padding * 2), 1);

  return {
    x: layout.padding + (normalizedX * innerWidth),
    y: layout.padding + ((1 - normalizedY) * innerHeight),
  };
}

export function normalizeOpenAlexEmbeddingsBundle(bundle) {
  const topics = asArray(bundle?.topics).map((topic) => {
    const searchAliases = uniqueStrings([
      ...(asArray(topic?.search_aliases)),
      topic?.label,
      topic?.taxonomy?.field?.label,
      topic?.taxonomy?.subfield?.label,
    ]);

    const searchText = String(topic?.search_text || '').trim();
    const graphFlags = {
      isolatedTrunk: Boolean(topic?.graph_flags?.isolated_trunk),
      retainedEndpoint: Boolean(topic?.graph_flags?.retained_endpoint),
    };

    const normalizedTopic = {
      id: String(topic?.topic_id || ''),
      topicId: String(topic?.topic_id || ''),
      label: String(topic?.label || topic?.topic_id || ''),
      nodeKind: String(topic?.node_kind || topic?.group_hints?.node_kind || 'leaf_topic'),
      isTrunk: String(topic?.node_kind || topic?.group_hints?.node_kind || 'leaf_topic') === 'trunk_topic',
      candidateState: String(topic?.candidate_state || ''),
      coordinates: {
        x: Number(topic?.coordinates?.x || 0),
        y: Number(topic?.coordinates?.y || 0),
      },
      taxonomy: topic?.taxonomy || {},
      groupHints: topic?.group_hints || {},
      graphFlags,
      searchAliases,
      searchText,
    };

    const searchParts = uniqueStrings([
      normalizedTopic.label,
      ...normalizedTopic.searchAliases,
      searchText,
      normalizedTopic.taxonomy?.domain?.label,
      normalizedTopic.taxonomy?.field?.label,
      normalizedTopic.taxonomy?.subfield?.label,
    ]);

    return {
      ...normalizedTopic,
      searchBlob: searchParts.join(' ').toLowerCase(),
      domainLabel: normalizedTopic.taxonomy?.domain?.label || 'Unknown',
      fieldId: normalizedTopic.taxonomy?.field?.id || null,
      fieldLabel: normalizedTopic.taxonomy?.field?.label || 'Unknown',
      subfieldId: normalizedTopic.taxonomy?.subfield?.id || null,
      subfieldLabel: normalizedTopic.taxonomy?.subfield?.label || 'Unknown',
      dominantTrunkTopicId: normalizedTopic.groupHints?.dominant_trunk_topic_id || null,
    };
  });

  const topicsById = Object.fromEntries(topics.map((topic) => [topic.id, topic]));
  const coordinateBounds = computeCoordinateBounds(topics);
  const anchorTopicIds = chooseAnchorTopics(topics, coordinateBounds);
  const fieldCounts = topics.reduce((counts, topic) => {
    counts.set(topic.fieldLabel, (counts.get(topic.fieldLabel) || 0) + 1);
    return counts;
  }, new Map());
  const fieldOptions = [...fieldCounts.entries()]
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label);
    });

  return {
    version: bundle?.version || '',
    generatedAt: bundle?.generated_at || '',
    source: bundle?.source || {},
    model: bundle?.model || {},
    projection: bundle?.projection || {},
    stats: bundle?.stats || {},
    topics,
    topicsById,
    fieldOptions,
    coordinateBounds,
    anchorTopicIds,
  };
}

export function rankOpenAlexEmbeddingMatches(
  embeddings,
  query,
  {
    fieldLabel = 'all',
    limit = 8,
  } = {},
) {
  if (!embeddings) {
    return [];
  }

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  return embeddings.topics
    .filter((topic) => fieldLabel === 'all' || topic.fieldLabel === fieldLabel)
    .map((topic) => ({
      topic,
      matchScore: scoreSearchMatch(topic, normalizedQuery),
    }))
    .filter((entry) => entry.matchScore > 0)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      if (left.topic.isTrunk !== right.topic.isTrunk) {
        return left.topic.isTrunk ? -1 : 1;
      }
      return left.topic.label.localeCompare(right.topic.label);
    })
    .slice(0, limit)
    .map(({ topic, matchScore }) => ({
      ...topic,
      matchScore,
    }));
}

export function getOpenAlexEmbeddingNeighbors(
  embeddings,
  topicId,
  {
    limit = 6,
  } = {},
) {
  if (!embeddings?.topicsById?.[topicId]) {
    return [];
  }

  const selectedTopic = embeddings.topicsById[topicId];

  return embeddings.topics
    .filter((topic) => topic.id !== topicId)
    .map((topic) => {
      const deltaX = topic.coordinates.x - selectedTopic.coordinates.x;
      const deltaY = topic.coordinates.y - selectedTopic.coordinates.y;
      const distanceSquared = (deltaX ** 2) + (deltaY ** 2);

      return {
        ...topic,
        distance: Math.sqrt(distanceSquared),
        distanceSquared,
      };
    })
    .sort((left, right) => {
      if (left.distanceSquared !== right.distanceSquared) {
        return left.distanceSquared - right.distanceSquared;
      }
      if (left.isTrunk !== right.isTrunk) {
        return left.isTrunk ? -1 : 1;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

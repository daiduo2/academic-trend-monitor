const OPENALEX_SEMANTIC_SEARCH_ENDPOINT = '__openalex-semantic-search';
export const OPENALEX_SEMANTIC_SEARCH_REQUEST_LIMIT = 12;
export const OPENALEX_SEMANTIC_SEARCH_RESULT_LIMIT = 5;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toNodeKindLabel(nodeKind) {
  return nodeKind === 'trunk_topic'
    ? 'Trunk'
    : nodeKind === 'leaf_topic'
      ? 'Leaf'
      : 'Topic';
}

export function buildOpenAlexSemanticSearchPath(
  basePath = '/',
  {
    query = '',
    limit = OPENALEX_SEMANTIC_SEARCH_REQUEST_LIMIT,
  } = {},
) {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const searchParams = new URLSearchParams();
  const normalizedQuery = normalizeText(query);

  if (normalizedQuery) {
    searchParams.set('query', normalizedQuery);
  }
  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    searchParams.set('limit', String(Math.max(1, Math.floor(Number(limit)))));
  }

  const suffix = searchParams.toString();
  return `${normalizedBasePath}${OPENALEX_SEMANTIC_SEARCH_ENDPOINT}${suffix ? `?${suffix}` : ''}`;
}

function buildUnavailableState({
  reason = 'semantic_assist_unavailable',
  message = 'Semantic assist is unavailable. Lexical Top Matches remain the baseline.',
} = {}) {
  return {
    available: false,
    fieldFilterApplied: false,
    matches: [],
    message,
    reason,
    status: 'unavailable',
    totalTopicMatches: 0,
    widenedBeyondFieldFilter: false,
  };
}

export function normalizeOpenAlexSemanticSearchResponse(
  payload,
  {
    fieldLabel = 'all',
    limit = OPENALEX_SEMANTIC_SEARCH_RESULT_LIMIT,
  } = {},
) {
  if (payload?.available === false) {
    return buildUnavailableState({
      reason: payload?.reason,
      message: payload?.message,
    });
  }

  const normalizedMatches = asArray(payload?.matches?.topics)
    .map((topic) => ({
      fieldId: topic?.field_id || null,
      fieldLabel: normalizeText(topic?.field_label) || 'Unknown field',
      id: normalizeText(topic?.topic_id),
      isTrunk: topic?.node_kind === 'trunk_topic',
      label: normalizeText(topic?.label) || normalizeText(topic?.topic_id) || 'Unknown topic',
      nodeKind: normalizeText(topic?.node_kind) || 'leaf_topic',
      nodeKindLabel: toNodeKindLabel(topic?.node_kind),
      score: Number(topic?.score || 0),
      subfieldId: topic?.subfield_id || null,
      subfieldLabel: normalizeText(topic?.subfield_label) || 'Unknown subfield',
      topicId: normalizeText(topic?.topic_id),
    }))
    .filter((topic) => topic.id);

  const filteredMatches = fieldLabel === 'all'
    ? normalizedMatches
    : normalizedMatches.filter((topic) => topic.fieldLabel === fieldLabel);
  const activeMatches = filteredMatches.length ? filteredMatches : normalizedMatches;

  return {
    available: true,
    fieldFilterApplied: fieldLabel !== 'all' && filteredMatches.length > 0,
    matches: activeMatches.slice(0, limit),
    message: '',
    reason: '',
    status: 'ready',
    totalTopicMatches: normalizedMatches.length,
    widenedBeyondFieldFilter: fieldLabel !== 'all' && filteredMatches.length === 0 && normalizedMatches.length > 0,
  };
}

export function buildOpenAlexSemanticSearchErrorState(error) {
  return {
    available: false,
    error: error instanceof Error ? error : new Error(String(error)),
    fieldFilterApplied: false,
    matches: [],
    message: 'Semantic assist failed. Lexical Top Matches remain available.',
    reason: 'semantic_assist_error',
    status: 'error',
    totalTopicMatches: 0,
    widenedBeyondFieldFilter: false,
  };
}

export function buildOpenAlexSemanticSearchIdleState() {
  return {
    available: false,
    fieldFilterApplied: false,
    matches: [],
    message: '',
    reason: '',
    status: 'idle',
    totalTopicMatches: 0,
    widenedBeyondFieldFilter: false,
  };
}

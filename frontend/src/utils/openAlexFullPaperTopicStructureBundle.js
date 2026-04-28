export const OPENALEX_FULL_PAPER_TOPIC_STRUCTURE_ENDPOINT = '__openalex-full-paper-topic-structure';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function normalizeStrictNumericArray(values, { groupSize = 1, integer = false } = {}) {
  const source = asArray(values);

  if (!source.length || (groupSize > 1 && source.length % groupSize !== 0)) {
    return [];
  }

  const normalized = [];

  for (const value of source) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
      return [];
    }

    normalized.push(integer ? Math.round(parsed) : parsed);
  }

  return normalized;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function validateIndicesAgainstPositions(indices, positions) {
  if (!indices.length || !positions.length) {
    return [];
  }

  const vertexCount = Math.floor(positions.length / 3);
  if (vertexCount <= 0) {
    return [];
  }

  for (const index of indices) {
    if (index < 0 || index >= vertexCount) {
      return [];
    }
  }

  return indices;
}

export function isRenderableOpenAlexFullPaperTopicStructureFragment(fragment) {
  return asArray(fragment?.positions).length > 0 && asArray(fragment?.indices).length > 0;
}

function normalizeFragment(fragment, index, topicId) {
  const fragmentId = normalizeText(fragment?.fragmentId) || `${topicId || 'topic'}-fragment-${index}`;
  const positions = normalizeStrictNumericArray(fragment?.positions, { groupSize: 3 });
  const indices = validateIndicesAgainstPositions(
    normalizeStrictNumericArray(fragment?.indices, { groupSize: 3, integer: true }),
    positions,
  );
  const centroid = normalizeStrictNumericArray(fragment?.centroid, { groupSize: 3 });

  return {
    centroid: centroid.length === 3 ? centroid : [],
    fragmentId,
    indices,
    positions,
    topicId: normalizeText(fragment?.topicId) || topicId,
  };
}

function normalizeTopic(topic, index) {
  const topicId = normalizeText(topic?.topicId) || `topic-${index}`;
  const fragments = asArray(topic?.fragments).map((fragment, fragmentIndex) => (
    normalizeFragment(fragment, fragmentIndex, topicId)
  ));

  return {
    fieldDisplayName: normalizeText(topic?.fieldDisplayName),
    fragmentIds: fragments.map((fragment) => fragment.fragmentId),
    fragments,
    meanCitations: toNumber(topic?.meanCitations),
    paperCount: toInteger(topic?.paperCount),
    subfieldDisplayName: normalizeText(topic?.subfieldDisplayName),
    topicDisplayName: normalizeText(topic?.topicDisplayName),
    topicId,
  };
}

export function getRenderableOpenAlexFullPaperTopicStructureTopics(bundle) {
  return asArray(bundle?.topics).filter((topic) => (
    asArray(topic?.fragments).some(isRenderableOpenAlexFullPaperTopicStructureFragment)
  ));
}

export function buildOpenAlexFullPaperTopicStructurePath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_TOPIC_STRUCTURE_ENDPOINT}`;
}

export function normalizeOpenAlexFullPaperTopicStructureBundle(bundle) {
  if (!isObject(bundle) || !Array.isArray(bundle.topics) || !isObject(bundle.meta)) {
    throw new Error(
      'OpenAlex full-paper topic structure bundle is structurally invalid: expected top-level meta object and topics array.',
    );
  }

  const topics = asArray(bundle?.topics).map((topic, index) => normalizeTopic(topic, index));
  const topicById = {};
  const fragmentById = {};
  const fragments = [];
  const renderableFragments = [];

  topics.forEach((topic) => {
    if (topic.topicId) {
      topicById[topic.topicId] = topic;
    }

    topic.fragments.forEach((fragment) => {
      fragments.push(fragment);
      if (isRenderableOpenAlexFullPaperTopicStructureFragment(fragment)) {
        renderableFragments.push(fragment);
      }
      if (fragment.fragmentId) {
        fragmentById[fragment.fragmentId] = fragment;
      }
    });
  });

  const renderableTopicIds = new Set(renderableFragments.map((fragment) => fragment.topicId).filter(Boolean));
  const renderableTopics = topics.filter((topic) => renderableTopicIds.has(topic.topicId));

  return {
    fragmentById,
    fragments,
    meta: bundle?.meta || {},
    renderableFragments,
    renderableTopicIds: Array.from(renderableTopicIds),
    renderableTopics,
    topicById,
    topics,
    version: normalizeText(bundle?.version),
  };
}

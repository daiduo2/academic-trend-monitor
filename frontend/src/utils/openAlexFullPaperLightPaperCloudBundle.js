export const OPENALEX_FULL_PAPER_LIGHT_PAPER_CLOUD_ENDPOINT = '__openalex-full-paper-light-paper-cloud';
export const OPENALEX_FULL_PAPER_LIGHT_PAPER_CLOUD_STATIC_PATH = 'data/output/openalex_full_paper_light_paper_cloud/openalex_full_paper_light_paper_cloud_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/light_paper_cloud_bundle.json';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function buildReadableTopicColor(colorIndex) {
  const hue = Math.round((214 + (Number(colorIndex || 0) * 137.508)) % 360);
  const saturation = colorIndex % 2 === 0 ? 88 : 82;
  const lightness = colorIndex % 3 === 0 ? 62 : 56;

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function normalizeStrictNumericArray(values, { integer = false } = {}) {
  const source = asArray(values);

  if (!source.length) {
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

function normalizeCoordinates3d(coordinates) {
  if (!isObject(coordinates)) {
    return null;
  }

  const x = Number(coordinates.x);
  const y = Number(coordinates.y);
  const z = Number(coordinates.z);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return { x, y, z };
}

function normalizeSampledPoint(point) {
  const paperIndex = toInteger(point?.paperIndex, Number.NaN);
  const coordinates3d = normalizeCoordinates3d(point?.coordinates3d);

  if (!Number.isInteger(paperIndex) || paperIndex < 0 || !coordinates3d) {
    return null;
  }

  return {
    coordinates3d,
    paperIndex,
    subfieldId: normalizeText(point?.subfieldId),
    topicId: normalizeText(point?.topicId),
    workId: normalizeText(point?.workId) || `paper-${paperIndex}`,
  };
}

function normalizeTopic(topic, topicId, sampledPointCount, colorIndex = 0) {
  const paperIndices = normalizeStrictNumericArray(topic?.paperIndices, { integer: true });
  const sampledPointIndices = normalizeStrictNumericArray(topic?.sampledPointIndices, { integer: true });
  const sampledIndicesAreValid = sampledPointIndices.length > 0
    ? sampledPointIndices.every((index) => index >= 0 && index < sampledPointCount)
    : true;

  return {
    averageCitations: toNumber(topic?.averageCitations),
    colorHex: buildReadableTopicColor(colorIndex),
    colorIndex,
    paperCount: toInteger(topic?.paperCount),
    paperIndices,
    sampledPointIndices: sampledIndicesAreValid ? sampledPointIndices : [],
    subfieldDisplayName: normalizeText(topic?.subfieldDisplayName),
    subfieldId: normalizeText(topic?.subfieldId),
    totalCitations: toNumber(topic?.totalCitations),
    topicDisplayName: normalizeText(topic?.topicDisplayName) || topicId,
    topicId,
  };
}

export function buildOpenAlexFullPaperLightPaperCloudPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_LIGHT_PAPER_CLOUD_ENDPOINT}`;
}

export function buildOpenAlexFullPaperLightPaperCloudStaticPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_LIGHT_PAPER_CLOUD_STATIC_PATH}`;
}

export function normalizeOpenAlexFullPaperLightPaperCloudBundle(rawBundle) {
  if (!isObject(rawBundle?.meta) || !Array.isArray(rawBundle?.sampledPoints) || !isObject(rawBundle?.topics)) {
    throw new Error('OpenAlex full-paper light paper cloud bundle is structurally invalid.');
  }

  const sampledPoints = rawBundle.sampledPoints.map(normalizeSampledPoint);
  const sampledPointsAreValid = sampledPoints.every(Boolean);
  const normalizedSampledPoints = sampledPointsAreValid ? sampledPoints : [];
  const sampledPointsByPaperIndex = sampledPointsAreValid
    ? Object.fromEntries(normalizedSampledPoints.map((point) => [point.paperIndex, point]))
    : {};
  const topicIds = Object.keys(rawBundle.topics).sort((left, right) => left.localeCompare(right));
  const colorRankByTopicId = Object.fromEntries(
    Object.keys(rawBundle.topics)
      .sort((left, right) => {
        const countDelta = toInteger(rawBundle.topics[right]?.paperCount) - toInteger(rawBundle.topics[left]?.paperCount);

        if (countDelta !== 0) {
          return countDelta;
        }

        const leftName = normalizeText(rawBundle.topics[left]?.topicDisplayName) || left;
        const rightName = normalizeText(rawBundle.topics[right]?.topicDisplayName) || right;
        return leftName.localeCompare(rightName);
      })
      .map((topicId, colorIndex) => [topicId, colorIndex]),
  );
  const topicById = {};
  const topics = topicIds.map((topicId) => {
    const normalizedTopic = normalizeTopic(
      rawBundle.topics[topicId],
      topicId,
      normalizedSampledPoints.length,
      colorRankByTopicId[topicId] || 0,
    );
    topicById[topicId] = normalizedTopic;
    return normalizedTopic;
  });

  return {
    meta: rawBundle.meta || {},
    sampledPoints: normalizedSampledPoints,
    sampledPointsByPaperIndex,
    topicById,
    topicIds,
    topics,
    version: normalizeText(rawBundle?.version),
  };
}

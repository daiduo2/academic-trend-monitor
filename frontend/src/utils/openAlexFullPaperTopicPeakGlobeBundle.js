export const OPENALEX_FULL_PAPER_TOPIC_PEAK_GLOBE_ENDPOINT = '__openalex-full-paper-topic-peak-globe';
export const OPENALEX_FULL_PAPER_TOPIC_PEAK_GLOBE_STATIC_PATH = 'data/output/openalex_full_paper_topic_peak_globe/openalex_full_paper_topic_peak_globe_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/topic_peak_globe_bundle.json';

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

function normalizeVectorTriplets(values) {
  const source = asArray(values);

  if (!source.length) {
    return [];
  }

  if (Array.isArray(source[0])) {
    const triplets = [];

    for (const candidate of source) {
      const triplet = normalizeStrictNumericArray(candidate, { groupSize: 3 });
      if (triplet.length !== 3) {
        return [];
      }
      triplets.push(triplet);
    }

    return triplets;
  }

  const flattened = normalizeStrictNumericArray(source, { groupSize: 3 });
  if (!flattened.length) {
    return [];
  }

  const triplets = [];
  for (let index = 0; index < flattened.length; index += 3) {
    triplets.push(flattened.slice(index, index + 3));
  }

  return triplets;
}

function validateIndicesAgainstVertices(indices, vertices) {
  if (!indices.length || !vertices.length) {
    return [];
  }

  for (const index of indices) {
    if (index < 0 || index >= vertices.length) {
      return [];
    }
  }

  return indices;
}

function normalizeCenter(center) {
  const unitVectors = normalizeVectorTriplets([center?.unitVector]);
  const unitVector = unitVectors[0] || [];

  return unitVector.length === 3
    ? {
      azimuth: toNumber(center?.azimuth),
      elevation: toNumber(center?.elevation),
      unitVector,
    }
    : {
      azimuth: 0,
      elevation: 0,
      unitVector: [],
    };
}

function normalizeSeams(seams, { vertexCount, topicIds, terrainValid }) {
  if (!terrainValid) {
    return [];
  }

  return asArray(seams)
    .map((seam) => {
      const topicId = normalizeText(seam?.topicId);
      const owners = asArray(seam?.owners).map((owner) => normalizeText(owner)).filter(Boolean);
      const faceIndex = toInteger(seam?.faceIndex, Number.NaN);

      if (!topicId || !Number.isInteger(faceIndex) || faceIndex < 0 || !owners.length) {
        return null;
      }

      if (topicIds.size && (!topicIds.has(topicId) || owners.some((owner) => !topicIds.has(owner)))) {
        return null;
      }

      if (vertexCount <= 0) {
        return null;
      }

      return {
        faceIndex,
        owners,
        topicId,
      };
    })
    .filter(Boolean);
}

function normalizePeak(peak, index) {
  const topicId = normalizeText(peak?.topicId) || `topic-${index}`;
  const center = normalizeCenter(peak?.center);

  return {
    anchorId: normalizeText(peak?.anchorId),
    averageCitations: toNumber(peak?.averageCitations),
    center: center.unitVector,
    centerMetadata: center,
    citationMassScore: toNumber(peak?.citationMassScore),
    citationQualityScore: toNumber(peak?.citationQualityScore),
    footprintRadius: toNumber(peak?.footprintRadius),
    influenceScore: toNumber(peak?.influenceScore),
    mixedInfluence: toNumber(peak?.mixedInfluence),
    paperCount: toInteger(peak?.paperCount),
    sharpness: toNumber(peak?.sharpness),
    subfieldDisplayName: normalizeText(peak?.subfieldDisplayName),
    subfieldHueKey: normalizeText(peak?.subfieldHueKey),
    subfieldId: normalizeText(peak?.subfieldId),
    summitHeight: toNumber(peak?.summitHeight),
    topicDisplayName: normalizeText(peak?.topicDisplayName) || topicId,
    topicId,
    totalCitations: toNumber(peak?.totalCitations),
    volumeScore: toNumber(peak?.volumeScore),
  };
}

export function buildOpenAlexFullPaperTopicPeakGlobePath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_TOPIC_PEAK_GLOBE_ENDPOINT}`;
}

export function buildOpenAlexFullPaperTopicPeakGlobeStaticPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_TOPIC_PEAK_GLOBE_STATIC_PATH}`;
}

export function normalizeOpenAlexFullPaperTopicPeakGlobeBundle(rawBundle) {
  if (!isObject(rawBundle?.meta) || !Array.isArray(rawBundle?.peaks) || !isObject(rawBundle?.terrain)) {
    throw new Error('OpenAlex full-paper topic peak globe bundle is structurally invalid.');
  }

  const topics = rawBundle.peaks.map((peak, index) => normalizePeak(peak, index));
  const topicById = {};
  const topicIds = [];

  topics.forEach((topic) => {
    if (topic.topicId && !topicById[topic.topicId]) {
      topicById[topic.topicId] = topic;
      topicIds.push(topic.topicId);
    }
  });

  const topicIdSet = new Set(topicIds);
  const vertices = normalizeVectorTriplets(rawBundle.terrain.vertices);
  const rawIndices = normalizeStrictNumericArray(rawBundle.terrain.indices, { groupSize: 3, integer: true });
  const indices = validateIndicesAgainstVertices(rawIndices, vertices);
  const ownership = asArray(rawBundle.terrain.ownership)
    .map((owner) => normalizeText(owner))
    .filter(Boolean);
  const ownershipIsValid = vertices.length > 0
    && ownership.length === vertices.length
    && ownership.every((owner) => !topicIdSet.size || topicIdSet.has(owner));
  const terrainHasVertices = vertices.length > 0;
  const terrainHasRenderableIndices = terrainHasVertices && indices.length > 0;

  return {
    meta: rawBundle.meta || {},
    terrain: {
      indices: terrainHasRenderableIndices ? indices : [],
      ownership: ownershipIsValid ? ownership : [],
      seams: normalizeSeams(rawBundle.terrain.seams, {
        terrainValid: terrainHasRenderableIndices && ownershipIsValid,
        topicIds: topicIdSet,
        vertexCount: vertices.length,
      }),
      vertices,
    },
    topicById,
    topicIds,
    topics,
    version: normalizeText(rawBundle?.version),
  };
}

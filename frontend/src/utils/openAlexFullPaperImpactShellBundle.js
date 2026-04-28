export const OPENALEX_FULL_PAPER_IMPACT_SHELL_ENDPOINT = '__openalex-full-paper-impact-shell';

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

function normalizeIntegerArray(values) {
  return asArray(values).map((value) => toInteger(value));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeRegion(region, index) {
  const id = normalizeText(region?.id) || `region-${index}`;
  const centroid = region?.centroid || {};
  const topicMix = asArray(region?.topicMix)
    .map((topic) => ({
      paperCount: toInteger(topic?.paperCount),
      share: toNumber(topic?.share),
      topicDisplayName: normalizeText(topic?.topicDisplayName),
      topicId: normalizeText(topic?.topicId),
    }))
    .filter((topic) => topic.topicId || topic.topicDisplayName);

  return {
    centroid: {
      x: toNumber(centroid.x),
      y: toNumber(centroid.y),
      z: toNumber(centroid.z),
    },
    id,
    impactScore: toNumber(region?.impactScore),
    paperIds: asArray(region?.paperIds).map((paperId) => normalizeText(paperId)).filter(Boolean),
    summary: {
      localRelativeHeat: toNumber(region?.summary?.localRelativeHeat),
      maxCitations: toInteger(region?.summary?.maxCitations),
      meanCitations: toNumber(region?.summary?.meanCitations),
      regionPaperCount: toInteger(region?.summary?.regionPaperCount),
    },
    topicMix,
    vertexCount: toInteger(region?.vertexCount),
    vertexIndices: normalizeStrictNumericArray(region?.vertexIndices, { integer: true }),
  };
}

export function buildOpenAlexFullPaperImpactShellPath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_IMPACT_SHELL_ENDPOINT}`;
}

export function normalizeOpenAlexFullPaperImpactShellBundle(bundle) {
  const regions = asArray(bundle?.regions).map((region, index) => normalizeRegion(region, index));
  const regionById = {};

  regions.forEach((region) => {
    if (region.id) {
      regionById[region.id] = region;
    }
  });

  return {
    meta: bundle?.meta || {},
    mesh: {
      indices: normalizeStrictNumericArray(bundle?.mesh?.indices, { groupSize: 3, integer: true }),
      normals: normalizeStrictNumericArray(bundle?.mesh?.normals, { groupSize: 3 }),
      positions: normalizeStrictNumericArray(bundle?.mesh?.positions, { groupSize: 3 }),
      vertexImpact: normalizeStrictNumericArray(bundle?.mesh?.vertexImpact),
      vertexLift: normalizeStrictNumericArray(bundle?.mesh?.vertexLift),
    },
    regionById,
    regions,
  };
}

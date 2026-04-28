export const OPENALEX_FULL_PAPER_FIELD_HEAT_GLOBE_ENDPOINT = '__openalex-full-paper-field-heat-globe';

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

function isSupportedColorString(value) {
  return /^#[0-9a-f]{3}$/i.test(value) || /^#[0-9a-f]{6}$/i.test(value);
}

function pickFirstValidColor(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);

    if (isSupportedColorString(normalized)) {
      return normalized;
    }
  }

  return '';
}

function normalizePatchColor(patch) {
  const canonicalColor = pickFirstValidColor(patch?.color, patch?.fillColor, patch?.fieldColor);
  const fieldColor = pickFirstValidColor(patch?.fieldColor, patch?.color, patch?.fillColor);
  const fillColor = pickFirstValidColor(patch?.fillColor, patch?.color, patch?.fieldColor);

  return {
    color: canonicalColor,
    fieldColor: fieldColor || canonicalColor,
    fillColor: fillColor || canonicalColor,
  };
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

function normalizePatch(patch, index) {
  const topicId = normalizeText(patch?.topicId) || `topic-${index}`;
  const patchId = normalizeText(patch?.patchId) || topicId || normalizeText(patch?.fieldId) || `patch-${index}`;
  const positions = normalizeStrictNumericArray(patch?.positions, { groupSize: 3 });
  const indices = validateIndicesAgainstPositions(
    normalizeStrictNumericArray(patch?.indices, { groupSize: 3, integer: true }),
    positions,
  );
  const colors = normalizePatchColor(patch);

  return {
    azimuth: toNumber(patch?.azimuth),
    color: colors.color,
    elevation: toNumber(patch?.elevation),
    fieldDisplayName: normalizeText(patch?.fieldDisplayName),
    fieldColor: colors.fieldColor,
    fieldId: normalizeText(patch?.fieldId),
    fillColor: colors.fillColor,
    height: toNumber(patch?.height),
    indices,
    patchId,
    positions,
    relativeHeat: toNumber(patch?.relativeHeat, 1),
    subfieldDisplayName: normalizeText(patch?.subfieldDisplayName),
    summary: {
      meanCitations: toNumber(patch?.summary?.meanCitations),
      paperCount: toInteger(patch?.summary?.paperCount),
    },
    topicDisplayName: normalizeText(patch?.topicDisplayName),
    topicId,
  };
}

export function buildOpenAlexFullPaperFieldHeatGlobePath(basePath = '/') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_FULL_PAPER_FIELD_HEAT_GLOBE_ENDPOINT}`;
}

export function normalizeOpenAlexFullPaperFieldHeatGlobeBundle(bundle) {
  if (!isObject(bundle) || !Array.isArray(bundle.patches) || !isObject(bundle.meta)) {
    throw new Error(
      'OpenAlex full-paper field heat globe bundle is structurally invalid: expected top-level meta object and patches array.',
    );
  }

  const patches = asArray(bundle?.patches).map((patch, index) => normalizePatch(patch, index));
  const patchById = {};

  patches.forEach((patch) => {
    if (patch.patchId) {
      patchById[patch.patchId] = patch;
    }
  });

  return {
    meta: bundle?.meta || {},
    patchById,
    patches,
  };
}

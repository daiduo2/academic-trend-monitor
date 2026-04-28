function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const FALLBACK_CAMERA_STATE = {
  azimuth: 0.65,
  elevation: 0.32,
  maxRadius: 12,
  minRadius: 1.2,
  radius: 3.35,
  target: { x: 0, y: 0, z: 0 },
};

const FAMILY_PALETTE = [
  '#1d4ed8',
  '#0f766e',
  '#b45309',
  '#be185d',
  '#4338ca',
  '#0369a1',
  '#a16207',
  '#c2410c',
];

function hasValidLength(values, groupSize) {
  return groupSize <= 1 || values.length % groupSize === 0;
}

function toStrictFloat32Array(values, options = {}) {
  const source = asArray(values);

  if (!source.length || !hasValidLength(source, options.groupSize || 1)) {
    return new Float32Array();
  }

  const normalized = [];

  for (const value of source) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return new Float32Array();
    }

    normalized.push(parsed);
  }

  return Float32Array.from(normalized);
}

function toStrictUint32Array(values, options = {}) {
  const source = asArray(values);

  if (!source.length || !hasValidLength(source, options.groupSize || 1)) {
    return new Uint32Array();
  }

  const normalized = [];

  for (const value of source) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return new Uint32Array();
    }

    normalized.push(parsed);
  }

  return Uint32Array.from(normalized);
}

function validateIndicesAgainstPositions(indices, positions) {
  if (!indices.length || !positions.length) {
    return new Uint32Array();
  }

  const vertexCount = Math.floor(positions.length / 3);

  if (vertexCount <= 0) {
    return new Uint32Array();
  }

  for (const index of indices) {
    if (index < 0 || index >= vertexCount) {
      return new Uint32Array();
    }
  }

  return indices;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashFamilyKey(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function resolveFamilyColor(topic) {
  const familyKey = [
    normalizeText(topic?.fieldDisplayName) || 'unknown-field',
    normalizeText(topic?.subfieldDisplayName) || 'unknown-subfield',
  ].join('::');
  const paletteIndex = hashFamilyKey(familyKey) % FAMILY_PALETTE.length;

  return FAMILY_PALETTE[paletteIndex];
}

export function resolveTopicFamilyColor(topic) {
  return resolveFamilyColor(topic);
}

function annotateTopicFamilyColor(topic) {
  if (!topic) {
    return null;
  }

  return {
    ...topic,
    colorHex: normalizeText(topic?.colorHex) || resolveFamilyColor(topic),
  };
}

function resolveFragmentOpacity(topic) {
  const paperCount = Number(topic?.paperCount || 0);
  const normalized = clamp(Math.log10(Math.max(paperCount, 1)) / 3, 0, 1);

  return clamp(0.28 + (normalized * 0.14), 0.28, 0.42);
}

function deriveBoundsFromFragments(fragments) {
  let bounds = null;

  fragments.forEach((fragment) => {
    if (!fragment.positions.length || !fragment.indices.length) {
      return;
    }

    for (let index = 0; index + 2 < fragment.positions.length; index += 3) {
      const x = fragment.positions[index];
      const y = fragment.positions[index + 1];
      const z = fragment.positions[index + 2];

      if (!bounds) {
        bounds = {
          maxX: x,
          maxY: y,
          maxZ: z,
          minX: x,
          minY: y,
          minZ: z,
        };
      } else {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
      }
    }
  });

  return bounds;
}

export function buildTopicStructureGeometryBuffers(bundle) {
  const fragmentMeshes = asArray(bundle?.fragments).map((fragment, index) => {
    const topicId = normalizeText(fragment?.topicId);
    const topic = annotateTopicFamilyColor(bundle?.topicById?.[topicId] || null);
    const positions = toStrictFloat32Array(fragment?.positions, { groupSize: 3 });
    const indices = validateIndicesAgainstPositions(
      toStrictUint32Array(fragment?.indices, { groupSize: 3 }),
      positions,
    );

    return {
      colorHex: topic?.colorHex || resolveFamilyColor(topic),
      fragmentId: normalizeText(fragment?.fragmentId) || `${topicId || 'topic'}-fragment-${index}`,
      indices,
      opacity: resolveFragmentOpacity(topic),
      positions,
      topic,
      topicId,
    };
  });

  return {
    fragments: fragmentMeshes,
  };
}

export function deriveTopicStructureCameraState(bundle) {
  const bounds = deriveBoundsFromFragments(buildTopicStructureGeometryBuffers(bundle).fragments);

  if (!bounds) {
    return {
      ...FALLBACK_CAMERA_STATE,
      target: { ...FALLBACK_CAMERA_STATE.target },
    };
  }

  const spanX = Math.max(bounds.maxX - bounds.minX, 0);
  const spanY = Math.max(bounds.maxY - bounds.minY, 0);
  const spanZ = Math.max(bounds.maxZ - bounds.minZ, 0);
  const largestSpan = Math.max(spanX, spanY, spanZ, 1);
  const radius = Math.max(largestSpan * 1.75, FALLBACK_CAMERA_STATE.minRadius * 2);
  const minRadius = Math.max(largestSpan * 0.6, FALLBACK_CAMERA_STATE.minRadius);
  const maxRadius = Math.max(radius * 2.4, minRadius + 1);

  return {
    azimuth: FALLBACK_CAMERA_STATE.azimuth,
    elevation: FALLBACK_CAMERA_STATE.elevation,
    maxRadius,
    minRadius,
    radius,
    target: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    },
  };
}

export function resolvePickedTopicFromFragmentPick(bundle, intersection) {
  const topicId = normalizeText(intersection?.object?.userData?.topicId);

  if (topicId && bundle?.topicById?.[topicId]) {
    return annotateTopicFamilyColor(bundle.topicById[topicId]);
  }

  const fragmentId = normalizeText(intersection?.object?.userData?.fragmentId);
  const fragmentTopicId = normalizeText(bundle?.fragmentById?.[fragmentId]?.topicId);

  if (fragmentTopicId && bundle?.topicById?.[fragmentTopicId]) {
    return annotateTopicFamilyColor(bundle.topicById[fragmentTopicId]);
  }

  return null;
}

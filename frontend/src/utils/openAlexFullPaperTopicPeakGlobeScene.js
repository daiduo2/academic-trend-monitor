function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function compareText(left, right) {
  return normalizeText(left).localeCompare(normalizeText(right));
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

function flattenVertices(vertices) {
  const flattened = [];

  for (const vertex of asArray(vertices)) {
    if (!Array.isArray(vertex) || vertex.length !== 3) {
      return [];
    }

    for (const value of vertex) {
      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return [];
      }

      flattened.push(parsed);
    }
  }

  return flattened;
}

function validateIndicesAgainstPositions(indices, positions) {
  if (!indices.length || !positions.length) {
    return new Uint32Array();
  }

  const vertexCount = Math.floor(positions.length / 3);

  for (const index of indices) {
    if (index < 0 || index >= vertexCount) {
      return new Uint32Array();
    }
  }

  return indices;
}

function hashFamilyKey(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function resolveTopicPeakColor(topic) {
  const familyKey = normalizeText(topic?.subfieldHueKey)
    || normalizeText(topic?.subfieldId)
    || normalizeText(topic?.topicId)
    || 'unknown-topic';
  return FAMILY_PALETTE[hashFamilyKey(familyKey) % FAMILY_PALETTE.length];
}

function annotateTopic(topic, fallbackTopicId = '') {
  if (!topic) {
    return null;
  }

  const topicId = normalizeText(topic?.topicId) || fallbackTopicId;

  if (!topicId) {
    return null;
  }

  return {
    ...topic,
    colorHex: topic?.colorHex || resolveTopicPeakColor({ ...topic, topicId }),
    topicId,
  };
}

function buildTopicLookup(bundle) {
  const topicLookup = {};
  const orderedTopicIds = [];

  asArray(bundle?.topicIds).forEach((topicId) => {
    const normalizedTopicId = normalizeText(topicId);
    const topic = annotateTopic(bundle?.topicById?.[normalizedTopicId], normalizedTopicId);

    if (topic && !topicLookup[topic.topicId]) {
      topicLookup[topic.topicId] = topic;
      orderedTopicIds.push(topic.topicId);
    }
  });

  asArray(bundle?.topics).forEach((topic) => {
    const annotatedTopic = annotateTopic(topic);

    if (annotatedTopic && !topicLookup[annotatedTopic.topicId]) {
      topicLookup[annotatedTopic.topicId] = annotatedTopic;
      orderedTopicIds.push(annotatedTopic.topicId);
    }
  });

  return {
    orderedTopicIds,
    topicLookup,
  };
}

function deriveBounds(positions) {
  if (!positions.length) {
    return null;
  }

  let bounds = null;

  for (let index = 0; index + 2 < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];

    if (!bounds) {
      bounds = {
        maxX: x,
        maxY: y,
        maxZ: z,
        minX: x,
        minY: y,
        minZ: z,
      };
      continue;
    }

    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }

  return bounds;
}

function readVertex(positions, vertexIndex) {
  const baseIndex = vertexIndex * 3;
  return [
    positions[baseIndex],
    positions[baseIndex + 1],
    positions[baseIndex + 2],
  ];
}

function vectorLength(vector) {
  return Math.hypot(vector[0] || 0, vector[1] || 0, vector[2] || 0);
}

function midpoint(left, right) {
  return [
    (left[0] + right[0]) / 2,
    (left[1] + right[1]) / 2,
    (left[2] + right[2]) / 2,
  ];
}

function uniqueOwnerIds(ownerIds) {
  return Array.from(new Set(asArray(ownerIds).map((ownerId) => normalizeText(ownerId)).filter(Boolean)))
    .sort(compareText);
}

function deriveSubfieldIdentity(topic) {
  return normalizeText(topic?.subfieldHueKey) || normalizeText(topic?.subfieldId) || '';
}

function buildTopicPeaks(positions, ownership, topicLookup, renderableTopicIds) {
  const bestPeakByTopicId = {};

  for (let vertexIndex = 0; vertexIndex * 3 < positions.length; vertexIndex += 1) {
    const topicId = normalizeText(ownership[vertexIndex]);

    if (!topicId || !topicLookup[topicId]) {
      continue;
    }

    const position = readVertex(positions, vertexIndex);
    const height = vectorLength(position);
    const current = bestPeakByTopicId[topicId];

    if (!current || height > current.height) {
      bestPeakByTopicId[topicId] = {
        colorHex: topicLookup[topicId].colorHex,
        height,
        position,
        topicId,
      };
    }
  }

  return asArray(renderableTopicIds)
    .map((topicId) => {
      const terrainPeak = bestPeakByTopicId[topicId];
      if (terrainPeak) {
        return terrainPeak;
      }

      const fallbackDirection = asArray(topicLookup[topicId]?.center).length === 3
        ? topicLookup[topicId].center
        : asArray(topicLookup[topicId]?.centerMetadata?.unitVector).length === 3
          ? topicLookup[topicId].centerMetadata.unitVector
          : [0, 0, 1];

      return {
        colorHex: topicLookup[topicId].colorHex,
        height: vectorLength(fallbackDirection),
        position: fallbackDirection,
        topicId,
      };
    })
    .filter(Boolean);
}

function buildImplicitSeamCandidates(indices, ownership) {
  const candidates = [];

  for (let faceIndex = 0; (faceIndex * 3) + 2 < indices.length; faceIndex += 1) {
    const triangleOffset = faceIndex * 3;
    const vertexIndices = [
      indices[triangleOffset],
      indices[triangleOffset + 1],
      indices[triangleOffset + 2],
    ];
    const ownerIds = uniqueOwnerIds(vertexIndices.map((vertexIndex) => ownership[vertexIndex]));

    if (ownerIds.length > 1) {
      candidates.push({
        faceIndex,
        owners: vertexIndices.map((vertexIndex) => ownership[vertexIndex]),
        topicId: ownerIds[0],
      });
    }
  }

  return candidates;
}

function buildSeamSegments(seams, positions, indices, ownership, topicLookup) {
  const seamCandidates = asArray(seams).length ? asArray(seams) : buildImplicitSeamCandidates(indices, ownership);

  return seamCandidates
    .map((seam) => {
      const faceIndex = Number(seam?.faceIndex);

      if (!Number.isInteger(faceIndex) || faceIndex < 0) {
        return null;
      }

      const triangleOffset = faceIndex * 3;
      if (triangleOffset + 2 >= indices.length) {
        return null;
      }

      const vertexIndices = [
        indices[triangleOffset],
        indices[triangleOffset + 1],
        indices[triangleOffset + 2],
      ];
      const seamOwners = asArray(seam?.owners).map((ownerId) => normalizeText(ownerId)).filter(Boolean);
      const faceOwners = seamOwners.length === vertexIndices.length
        ? seamOwners
        : vertexIndices.map((vertexIndex) => ownership[vertexIndex]);
      const ownerIds = uniqueOwnerIds(faceOwners);

      if (ownerIds.length < 2 || ownerIds.some((ownerId) => !topicLookup[ownerId])) {
        return null;
      }

      const segmentPoints = [];
      const edges = [
        [0, 1],
        [1, 2],
        [2, 0],
      ];

      edges.forEach(([leftSlot, rightSlot]) => {
        if (faceOwners[leftSlot] === faceOwners[rightSlot]) {
          return;
        }

        segmentPoints.push(
          midpoint(
            readVertex(positions, vertexIndices[leftSlot]),
            readVertex(positions, vertexIndices[rightSlot]),
          ),
        );
      });

      if (segmentPoints.length < 2) {
        return null;
      }

      const subfieldIdentities = new Set(
        ownerIds.map((ownerId) => deriveSubfieldIdentity(topicLookup[ownerId])).filter(Boolean),
      );

      return {
        ownerIds,
        points: [segmentPoints[0], segmentPoints[1]],
        sameSubfield: subfieldIdentities.size === 1,
        topicId: normalizeText(seam?.topicId) || ownerIds[0],
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const topicOrder = compareText(left?.topicId, right?.topicId);

      if (topicOrder !== 0) {
        return topicOrder;
      }

      return compareText((left?.ownerIds || []).join(','), (right?.ownerIds || []).join(','));
    });
}

function normalizeOwnership(ownership, vertexCount, topicLookup) {
  const normalizedOwnership = asArray(ownership)
    .map((owner) => normalizeText(owner))
    .filter(Boolean);

  if (!vertexCount || normalizedOwnership.length !== vertexCount) {
    return [];
  }

  if (normalizedOwnership.some((owner) => !topicLookup[owner])) {
    return [];
  }

  return normalizedOwnership;
}

export function buildTopicPeakGlobeGeometryBuffers(bundle) {
  const { orderedTopicIds, topicLookup } = buildTopicLookup(bundle);
  const flattenedVertices = flattenVertices(bundle?.terrain?.vertices);
  const positions = toStrictFloat32Array(flattenedVertices, { groupSize: 3 });
  const indices = validateIndicesAgainstPositions(
    toStrictUint32Array(bundle?.terrain?.indices, { groupSize: 3 }),
    positions,
  );
  const ownership = normalizeOwnership(
    bundle?.terrain?.ownership,
    positions.length ? positions.length / 3 : 0,
    topicLookup,
  );
  const terrainIsRenderable = positions.length > 0 && indices.length > 0 && ownership.length > 0;
  const topicPeaks = terrainIsRenderable
    ? buildTopicPeaks(positions, ownership, topicLookup, orderedTopicIds)
    : [];
  const seamSegments = terrainIsRenderable
    ? buildSeamSegments(asArray(bundle?.terrain?.seams), positions, indices, ownership, topicLookup)
    : [];

  return {
    renderableTopicIds: orderedTopicIds.filter((topicId) => topicLookup[topicId]),
    seamSegments,
    terrainMesh: {
      indices: terrainIsRenderable ? indices : new Uint32Array(),
      ownership: terrainIsRenderable ? ownership : [],
      seams: terrainIsRenderable ? asArray(bundle?.terrain?.seams) : [],
      positions: terrainIsRenderable ? positions : new Float32Array(),
    },
    topicPeaks,
    topicLookup,
  };
}

export function deriveTopicPeakGlobeCameraState(bundle) {
  const geometry = buildTopicPeakGlobeGeometryBuffers(bundle);
  const bounds = deriveBounds(geometry.terrainMesh.positions);

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
  const radius = Math.max(largestSpan * 1.7, FALLBACK_CAMERA_STATE.minRadius * 1.8);
  const minRadius = Math.max(largestSpan * 0.65, FALLBACK_CAMERA_STATE.minRadius);
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

export function resolvePickedTopicPeak(bundle, intersection) {
  const { topicLookup, terrainMesh } = buildTopicPeakGlobeGeometryBuffers(bundle);
  const directTopicId = normalizeText(intersection?.object?.userData?.topicId);

  if (directTopicId && topicLookup[directTopicId]) {
    return topicLookup[directTopicId];
  }

  const ownedVertexIndex = intersection?.face?.a;
  const ownedTopicId = Number.isInteger(ownedVertexIndex)
    ? normalizeText(terrainMesh.ownership[ownedVertexIndex])
    : '';

  if (ownedTopicId && topicLookup[ownedTopicId]) {
    return topicLookup[ownedTopicId];
  }

  return null;
}

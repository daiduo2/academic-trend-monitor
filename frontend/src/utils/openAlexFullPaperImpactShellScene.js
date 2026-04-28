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

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toUnsignedInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

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

  return Uint32Array.from(normalized, toUnsignedInteger);
}

function lerp(start, end, ratio) {
  return start + ((end - start) * ratio);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function sampleHeatColor(ratio) {
  const stops = [
    [0.08, 0.22, 0.43],
    [0.18, 0.62, 0.76],
    [0.96, 0.76, 0.31],
    [0.92, 0.33, 0.24],
  ];

  if (ratio <= 0) {
    return stops[0];
  }
  if (ratio >= 1) {
    return stops[stops.length - 1];
  }

  const scaled = ratio * (stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, stops.length - 1);
  const localRatio = scaled - index;

  return [
    lerp(stops[index][0], stops[nextIndex][0], localRatio),
    lerp(stops[index][1], stops[nextIndex][1], localRatio),
    lerp(stops[index][2], stops[nextIndex][2], localRatio),
  ];
}

export function buildShellGeometryBuffers(shell) {
  return {
    indices: toStrictUint32Array(shell?.mesh?.indices, { groupSize: 3 }),
    normals: toStrictFloat32Array(shell?.mesh?.normals, { groupSize: 3 }),
    positions: toStrictFloat32Array(shell?.mesh?.positions, { groupSize: 3 }),
    vertexImpact: toStrictFloat32Array(shell?.mesh?.vertexImpact),
    vertexLift: toStrictFloat32Array(shell?.mesh?.vertexLift),
  };
}

function deriveBoundsFromPositions(values) {
  const positions = asArray(values);
  const validTriples = [];

  for (let index = 0; index + 2 < positions.length; index += 3) {
    const x = Number(positions[index]);
    const y = Number(positions[index + 1]);
    const z = Number(positions[index + 2]);

    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      validTriples.push([x, y, z]);
    }
  }

  if (!validTriples.length) {
    return null;
  }

  const bounds = {
    maxX: validTriples[0][0],
    maxY: validTriples[0][1],
    maxZ: validTriples[0][2],
    minX: validTriples[0][0],
    minY: validTriples[0][1],
    minZ: validTriples[0][2],
  };

  validTriples.forEach(([x, y, z]) => {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  });

  return bounds;
}

function normalizeBounds(bounds) {
  const minX = Number(bounds?.minX);
  const maxX = Number(bounds?.maxX);
  const minY = Number(bounds?.minY);
  const maxY = Number(bounds?.maxY);
  const minZ = Number(bounds?.minZ);
  const maxZ = Number(bounds?.maxZ);

  if (
    !Number.isFinite(minX)
    || !Number.isFinite(maxX)
    || !Number.isFinite(minY)
    || !Number.isFinite(maxY)
    || !Number.isFinite(minZ)
    || !Number.isFinite(maxZ)
  ) {
    return null;
  }

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
  };
}

export function deriveShellCameraState(shell) {
  const bounds = normalizeBounds(shell?.meta?.bounds) || deriveBoundsFromPositions(shell?.mesh?.positions);

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

export function buildShellVertexColors(vertexImpact) {
  const impacts = Array.from(vertexImpact || [], (value) => toFiniteNumber(value));

  if (!impacts.length) {
    return new Float32Array();
  }

  const minImpact = Math.min(...impacts);
  const maxImpact = Math.max(...impacts);
  const span = maxImpact - minImpact || 1;
  const colors = new Float32Array(impacts.length * 3);

  impacts.forEach((impact, index) => {
    const ratio = clamp01((impact - minImpact) / span);
    const [red, green, blue] = sampleHeatColor(ratio);
    const offset = index * 3;

    colors[offset] = red;
    colors[offset + 1] = green;
    colors[offset + 2] = blue;
  });

  return colors;
}

export function findNearestShellRegion(regions, point) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y)) || !Number.isFinite(Number(point.z))) {
    return null;
  }

  let nearestRegion = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  asArray(regions).forEach((region) => {
    const centroid = region?.centroid;
    const centroidX = Number(centroid?.x);
    const centroidY = Number(centroid?.y);
    const centroidZ = Number(centroid?.z);

    if (!Number.isFinite(centroidX) || !Number.isFinite(centroidY) || !Number.isFinite(centroidZ)) {
      return;
    }

    const deltaX = centroidX - Number(point.x);
    const deltaY = centroidY - Number(point.y);
    const deltaZ = centroidZ - Number(point.z);
    const distance = (deltaX * deltaX) + (deltaY * deltaY) + (deltaZ * deltaZ);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRegion = region;
    }
  });

  return nearestRegion;
}

function getIntersectionVertexIds(intersection) {
  const face = intersection?.face;
  const candidates = [face?.a, face?.b, face?.c, ...(asArray(intersection?.vertexIndices))];

  return candidates
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0);
}

export function resolvePickedShellRegion(regions, intersection) {
  const vertexIds = getIntersectionVertexIds(intersection);

  if (vertexIds.length) {
    let bestRegion = null;
    let bestMatchCount = 0;

    asArray(regions).forEach((region) => {
      const vertexIndexSet = new Set(
        asArray(region?.vertexIndices)
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0),
      );

      if (!vertexIndexSet.size) {
        return;
      }

      const matchCount = vertexIds.filter((vertexId) => vertexIndexSet.has(vertexId)).length;

      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestRegion = region;
      }
    });

    if (bestRegion) {
      return bestRegion;
    }
  }

  return findNearestShellRegion(regions, intersection?.point || null);
}

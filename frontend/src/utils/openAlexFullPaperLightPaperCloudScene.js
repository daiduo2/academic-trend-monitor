function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

const FALLBACK_CAMERA_STATE = {
  azimuth: 0.65,
  elevation: 0.32,
  maxRadius: 12,
  minRadius: 1.2,
  radius: 3.35,
  target: { x: 0, y: 0, z: 0 },
};

const TOPIC_PALETTE = [
  '#38bdf8',
  '#f97316',
  '#22c55e',
  '#e879f9',
  '#facc15',
  '#818cf8',
  '#fb7185',
  '#2dd4bf',
  '#f472b6',
  '#84cc16',
  '#60a5fa',
  '#fb923c',
  '#a78bfa',
  '#34d399',
  '#f43f5e',
  '#06b6d4',
  '#eab308',
  '#c084fc',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#d946ef',
  '#14b8a6',
  '#f59e0b',
];

function toStrictFloat32Array(values, { groupSize = 1 } = {}) {
  const source = asArray(values);

  if (!source.length || (groupSize > 1 && source.length % groupSize !== 0)) {
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

function flattenPointPositions(sampledPoints) {
  const flattened = [];

  for (const point of asArray(sampledPoints)) {
    const coordinates3d = point?.coordinates3d || {};
    const x = Number(coordinates3d.x);
    const y = Number(coordinates3d.y);
    const z = Number(coordinates3d.z);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return [];
    }

    flattened.push(x, y, z);
  }

  return flattened;
}

function hashTopicKey(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function deriveCameraPosition(camera) {
  const horizontalRadius = camera.radius * Math.cos(camera.elevation);

  return {
    x: camera.target.x + (horizontalRadius * Math.sin(camera.azimuth)),
    y: camera.target.y + (camera.radius * Math.sin(camera.elevation)),
    z: camera.target.z + (horizontalRadius * Math.cos(camera.azimuth)),
  };
}

function subtractPoints(left, right) {
  return {
    x: Number(left?.x || 0) - Number(right?.x || 0),
    y: Number(left?.y || 0) - Number(right?.y || 0),
    z: Number(left?.z || 0) - Number(right?.z || 0),
  };
}

function dotPoints(left, right) {
  return (left.x * right.x) + (left.y * right.y) + (left.z * right.z);
}

function crossPoints(left, right) {
  return {
    x: (left.y * right.z) - (left.z * right.y),
    y: (left.z * right.x) - (left.x * right.z),
    z: (left.x * right.y) - (left.y * right.x),
  };
}

function normalizePoint(vector, fallback = { x: 0, y: 0, z: 1 }) {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 1e-8) {
    return fallback;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function buildCameraBasis(camera) {
  const cameraPosition = deriveCameraPosition(camera);
  const forward = normalizePoint(subtractPoints(camera.target, cameraPosition));
  const provisionalUp = Math.abs(forward.y) > 0.96
    ? { x: 0, y: 0, z: 1 }
    : { x: 0, y: 1, z: 0 };
  const right = normalizePoint(crossPoints(forward, provisionalUp), { x: 1, y: 0, z: 0 });
  const up = normalizePoint(crossPoints(right, forward), { x: 0, y: 1, z: 0 });

  return {
    cameraPosition,
    forward,
    right,
    up,
  };
}

function isVisible(projectedPoint, size) {
  return !(
    projectedPoint.screenX < -projectedPoint.radius
    || projectedPoint.screenX > size.width + projectedPoint.radius
    || projectedPoint.screenY < -projectedPoint.radius
    || projectedPoint.screenY > size.height + projectedPoint.radius
  );
}

function topicDisplayName(topic, topicId) {
  return normalizeText(topic?.topicDisplayName) || normalizeText(topicId) || 'Unknown topic';
}

export function resolveLightPaperCloudTopicColor(topic) {
  const normalizedColor = normalizeText(topic?.colorHex);

  if (normalizedColor) {
    return normalizedColor;
  }

  const familyKey = normalizeText(topic?.topicId)
    || normalizeText(topic?.topicDisplayName)
    || normalizeText(topic)
    || 'unknown-topic';
  return TOPIC_PALETTE[hashTopicKey(familyKey) % TOPIC_PALETTE.length];
}

export function buildLightPaperCloudTopicRegions(
  projectedPoints,
  bundle,
  {
    maxLabels = 12,
    minLabelDistance = 72,
  } = {},
) {
  const groupedPoints = new Map();

  asArray(projectedPoints).forEach((point) => {
    const topicId = normalizeText(point?.topicId);
    if (!topicId) {
      return;
    }
    if (!groupedPoints.has(topicId)) {
      groupedPoints.set(topicId, []);
    }
    groupedPoints.get(topicId).push(point);
  });

  const regions = Array.from(groupedPoints.entries()).map(([topicId, points]) => {
    const topic = bundle?.topicById?.[topicId] || points[0]?.topic || null;
    const pointCount = points.length;
    const centerX = points.reduce((total, point) => total + Number(point.screenX || 0), 0) / pointCount;
    const centerY = points.reduce((total, point) => total + Number(point.screenY || 0), 0) / pointCount;
    const minX = Math.min(...points.map((point) => Number(point.screenX || 0)));
    const maxX = Math.max(...points.map((point) => Number(point.screenX || 0)));
    const minY = Math.min(...points.map((point) => Number(point.screenY || 0)));
    const maxY = Math.max(...points.map((point) => Number(point.screenY || 0)));
    const spread = Math.max(
      ...points.map((point) => Math.hypot(Number(point.screenX || 0) - centerX, Number(point.screenY || 0) - centerY)),
      0,
    );

    return {
      bounds: { maxX, maxY, minX, minY },
      centerX,
      centerY,
      color: resolveLightPaperCloudTopicColor(topic || topicId),
      pointCount,
      showLabel: false,
      spreadRadius: clamp(32 + spread + (Math.sqrt(pointCount) * 13), 48, 180),
      topic,
      topicDisplayName: topicDisplayName(topic, topicId),
      topicId,
    };
  }).sort((left, right) => {
    if (right.pointCount !== left.pointCount) {
      return right.pointCount - left.pointCount;
    }
    return left.topicDisplayName.localeCompare(right.topicDisplayName);
  });

  const labeledRegions = [];
  regions.forEach((region) => {
    if (labeledRegions.length >= maxLabels) {
      return;
    }
    const overlapsExistingLabel = labeledRegions.some((labeledRegion) => (
      Math.hypot(region.centerX - labeledRegion.centerX, region.centerY - labeledRegion.centerY) < minLabelDistance
    ));

    if (!overlapsExistingLabel) {
      region.showLabel = true;
      labeledRegions.push(region);
    }
  });

  return regions;
}

function deriveBounds(pointPositions) {
  if (!pointPositions.length) {
    return null;
  }

  let bounds = null;

  for (let index = 0; index + 2 < pointPositions.length; index += 3) {
    const x = pointPositions[index];
    const y = pointPositions[index + 1];
    const z = pointPositions[index + 2];

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

export function buildLightPaperCloudGeometryBuffers(bundle) {
  const flattenedPositions = flattenPointPositions(bundle?.sampledPoints);
  const pointPositions = toStrictFloat32Array(flattenedPositions, { groupSize: 3 });
  const pointTopicIds = pointPositions.length
    ? asArray(bundle?.sampledPoints).map((point) => normalizeText(point?.topicId))
    : [];

  return {
    pointPositions,
    pointTopicIds,
  };
}

export function buildLightPaperCloudFocusOverlay(bundle, topicId) {
  const normalizedTopicId = normalizeText(topicId);
  const topic = bundle?.topicById?.[normalizedTopicId] || null;

  if (!topic) {
    return {
      positions: new Float32Array(),
      sampledPointIndices: [],
      topic: null,
    };
  }

  const sampledPointIndices = asArray(topic.sampledPointIndices)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < asArray(bundle?.sampledPoints).length);
  const flattenedPositions = [];

  sampledPointIndices.forEach((sampledIndex) => {
    const point = bundle.sampledPoints[sampledIndex];
    flattenedPositions.push(point.coordinates3d.x, point.coordinates3d.y, point.coordinates3d.z);
  });

  return {
    positions: toStrictFloat32Array(flattenedPositions, { groupSize: 3 }),
    sampledPointIndices,
    topic,
  };
}

export function deriveLightPaperCloudCameraState(bundle) {
  const geometry = buildLightPaperCloudGeometryBuffers(bundle);
  const bounds = deriveBounds(geometry.pointPositions);

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
  const radius = Math.max(largestSpan * 1.8, FALLBACK_CAMERA_STATE.minRadius * 1.8);
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

export function rotateLightPaperCloudCamera(cameraState, { deltaX = 0, deltaY = 0 } = {}) {
  if (!cameraState) {
    return {
      ...FALLBACK_CAMERA_STATE,
      target: { ...FALLBACK_CAMERA_STATE.target },
    };
  }

  return {
    ...cameraState,
    azimuth: Number(cameraState.azimuth || 0) - (Number(deltaX || 0) * 0.008),
    elevation: clamp(
      Number(cameraState.elevation || 0) + (Number(deltaY || 0) * 0.006),
      -1.1,
      1.1,
    ),
  };
}

export function zoomLightPaperCloudCamera(cameraState, deltaY = 0) {
  if (!cameraState) {
    return {
      ...FALLBACK_CAMERA_STATE,
      target: { ...FALLBACK_CAMERA_STATE.target },
    };
  }

  return {
    ...cameraState,
    radius: clamp(
      Number(cameraState.radius || 0) + (Number(deltaY || 0) * 0.0025),
      Number(cameraState.minRadius || FALLBACK_CAMERA_STATE.minRadius),
      Number(cameraState.maxRadius || FALLBACK_CAMERA_STATE.maxRadius),
    ),
  };
}

export function projectLightPaperCloudPointToScreen(point, cameraState, size) {
  if (!point?.coordinates3d || !cameraState || !size?.width || !size?.height) {
    return null;
  }

  const basis = buildCameraBasis(cameraState);
  const relative = subtractPoints(point.coordinates3d, basis.cameraPosition);
  const depth = dotPoints(relative, basis.forward);

  if (depth <= 0.05) {
    return null;
  }

  const horizontal = dotPoints(relative, basis.right);
  const vertical = dotPoints(relative, basis.up);
  const focalLength = Math.min(size.width, size.height) * 0.62;
  const perspective = focalLength / depth;

  return {
    depth,
    perspective,
    radius: clamp(2.4 + (perspective * 0.014), 2.4, 7.2),
    screenX: (size.width / 2) + (horizontal * perspective),
    screenY: (size.height / 2) - (vertical * perspective),
  };
}

export function buildProjectedLightPaperCloudPoints(
  bundle,
  cameraState,
  size,
  { focusedTopicId = '', focusedTopicIds = [], hoveredTopicId = '' } = {},
) {
  const focusedTopicSet = new Set([
    normalizeText(focusedTopicId),
    ...asArray(focusedTopicIds).map((topicId) => normalizeText(topicId)),
  ].filter(Boolean));
  const normalizedHoveredTopicId = normalizeText(hoveredTopicId);

  return asArray(bundle?.sampledPoints)
    .map((point, sampledIndex) => {
      const projectedPoint = projectLightPaperCloudPointToScreen(point, cameraState, size);

      if (!projectedPoint) {
        return null;
      }

      const topicId = normalizeText(point?.topicId);
      const topic = bundle?.topicById?.[topicId] || null;

      return {
        ...projectedPoint,
        color: resolveLightPaperCloudTopicColor(topic || topicId),
        isFocused: focusedTopicSet.size > 0 && focusedTopicSet.has(topicId),
        isHovered: Boolean(normalizedHoveredTopicId) && topicId === normalizedHoveredTopicId,
        sampledIndex,
        topic,
        topicId,
        workId: normalizeText(point?.workId) || `paper-${sampledIndex}`,
      };
    })
    .filter(Boolean);
}

export function pickProjectedLightPaperCloudPoint(projectedPoints, clientX, clientY, size) {
  let bestMatch = null;

  asArray(projectedPoints).forEach((entry) => {
    if (!isVisible(entry, size)) {
      return;
    }

    const deltaX = entry.screenX - clientX;
    const deltaY = entry.screenY - clientY;
    const distanceSquared = (deltaX ** 2) + (deltaY ** 2);
    const pickRadius = Math.max(entry.radius + 4, 10);

    if (distanceSquared > (pickRadius ** 2)) {
      return;
    }

    if (
      !bestMatch
      || distanceSquared < bestMatch.distanceSquared
      || (
        distanceSquared === bestMatch.distanceSquared
        && Number(entry.depth || 0) > Number(bestMatch.depth || 0)
      )
    ) {
      bestMatch = {
        ...entry,
        distanceSquared,
      };
    }
  });

  return bestMatch;
}

export function resolvePickedLightPaperCloudTopic(bundle, intersection) {
  const directTopicId = normalizeText(intersection?.object?.userData?.topicId);

  if (directTopicId && bundle?.topicById?.[directTopicId]) {
    return bundle.topicById[directTopicId];
  }

  const sampledIndex = intersection?.index;
  if (Number.isInteger(sampledIndex) && sampledIndex >= 0 && sampledIndex < asArray(bundle?.sampledPoints).length) {
    const pointTopicId = normalizeText(bundle.sampledPoints[sampledIndex]?.topicId);
    if (pointTopicId && bundle?.topicById?.[pointTopicId]) {
      return bundle.topicById[pointTopicId];
    }
  }

  return null;
}

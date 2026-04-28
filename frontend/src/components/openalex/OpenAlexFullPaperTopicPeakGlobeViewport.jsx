import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildTopicPeakGlobeGeometryBuffers,
  deriveTopicPeakGlobeCameraState,
} from '../../utils/openAlexFullPaperTopicPeakGlobeScene';

const FIELD_OF_VIEW_RADIANS = (42 * Math.PI) / 180;
const MIN_HOST_HEIGHT = 720;
const DRAG_SUPPRESSION_DISTANCE = 6;
const HOVER_STROKE = 'rgba(248, 250, 252, 0.9)';
const TERRAIN_STROKE = 'rgba(15, 23, 42, 0.68)';
const SELECTION_FILL = 'rgba(248, 250, 252, 0.16)';
const SELECTION_STROKE = 'rgba(248, 250, 252, 0.95)';

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolveSourceGlobe(globe, topicPeakGlobe) {
  return topicPeakGlobe || globe || null;
}

function getHostSize(host) {
  return {
    height: Math.max(host?.clientHeight || 0, MIN_HOST_HEIGHT),
    width: Math.max(host?.clientWidth || 0, 1),
  };
}

function hashNumericArray(values, multiplier = 1000) {
  let hash = 2166136261;

  for (const value of values || []) {
    const scaled = Number.isInteger(value) ? value : Math.round(Number(value || 0) * multiplier);

    hash ^= scaled;
    hash = Math.imul(hash, 16777619);
    hash >>>= 0;
  }

  return `${values?.length || 0}:${hash}`;
}

function buildGeometrySignature(terrainMesh) {
  return [
    hashNumericArray(terrainMesh?.positions, 1000),
    hashNumericArray(terrainMesh?.indices, 1),
    hashNumericArray((terrainMesh?.ownership || []).map((owner) => String(owner).length), 1),
  ].join('|');
}

function buildPeakSignature(topicPeaks) {
  return [...(topicPeaks || [])]
    .sort((left, right) => String(left?.topicId || '').localeCompare(String(right?.topicId || '')))
    .map((peak) => [
      peak.topicId,
      hashNumericArray(peak.position || [], 1000),
      Math.round(Number(peak.height || 0) * 1000),
    ].join(':'))
    .join('|');
}

function buildSaddleSignature(seamSegments) {
  return [...(seamSegments || [])]
    .sort((left, right) => {
      const leftKey = `${left?.topicId || ''}:${(left?.ownerIds || []).join(',')}`;
      const rightKey = `${right?.topicId || ''}:${(right?.ownerIds || []).join(',')}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((segment) => [
      (segment.ownerIds || []).join(','),
      segment.sameSubfield ? 'same' : 'cross',
      hashNumericArray((segment.points || []).flat(), 1000),
    ].join(':'))
    .join('|');
}

function buildColorSignature(topicLookup, renderableTopicIds) {
  return (renderableTopicIds || [])
    .map((topicId) => `${topicId}:${topicLookup?.[topicId]?.colorHex || ''}`)
    .join('|');
}

function parseHexColor(colorValue, fallback = [100, 116, 139]) {
  const normalized = String(colorValue || '').trim();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return [
      Number.parseInt(normalized.slice(1, 3), 16),
      Number.parseInt(normalized.slice(3, 5), 16),
      Number.parseInt(normalized.slice(5, 7), 16),
    ];
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return [
      Number.parseInt(`${normalized[1]}${normalized[1]}`, 16),
      Number.parseInt(`${normalized[2]}${normalized[2]}`, 16),
      Number.parseInt(`${normalized[3]}${normalized[3]}`, 16),
    ];
  }

  return fallback;
}

function tintColor(colorValue, weight = 0) {
  const [red, green, blue] = parseHexColor(colorValue);
  const clampedWeight = clamp(weight, -1, 1);

  const blendChannel = (channel) => {
    if (clampedWeight >= 0) {
      return Math.round(channel + ((255 - channel) * clampedWeight));
    }
    return Math.round(channel * (1 + clampedWeight));
  };

  return `rgb(${blendChannel(red)} ${blendChannel(green)} ${blendChannel(blue)})`;
}

function normalizeVector(x, y, z, fallback = [0, 0, 1]) {
  const length = Math.hypot(x, y, z);

  if (length <= 1e-8) {
    return fallback;
  }

  return [x / length, y / length, z / length];
}

function subtractVectors(left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}

function crossVectors(left, right) {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0]),
  ];
}

function dotVectors(left, right) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function deriveCameraPosition(state) {
  const horizontalRadius = state.radius * Math.cos(state.elevation);

  return [
    state.target.x + (horizontalRadius * Math.sin(state.azimuth)),
    state.target.y + (state.radius * Math.sin(state.elevation)),
    state.target.z + (horizontalRadius * Math.cos(state.azimuth)),
  ];
}

function buildCameraBasis(state) {
  const cameraPosition = deriveCameraPosition(state);
  const target = [state.target.x, state.target.y, state.target.z];
  const forward = normalizeVector(...subtractVectors(target, cameraPosition));
  const provisionalUp = Math.abs(forward[1]) > 0.96 ? [0, 0, 1] : [0, 1, 0];
  const right = normalizeVector(...crossVectors(forward, provisionalUp), [1, 0, 0]);
  const up = normalizeVector(...crossVectors(right, forward), [0, 1, 0]);

  return {
    cameraPosition,
    forward,
    right,
    target,
    up,
  };
}

function projectVertex(worldPoint, basis, size) {
  const relative = subtractVectors(worldPoint, basis.cameraPosition);
  const depth = dotVectors(relative, basis.forward);

  if (depth <= 0.02) {
    return null;
  }

  const x = dotVectors(relative, basis.right);
  const y = dotVectors(relative, basis.up);
  const focalLength = (size.height * 0.5) / Math.tan(FIELD_OF_VIEW_RADIANS / 2);

  return {
    depth,
    x: (size.width / 2) + ((x * focalLength) / depth),
    y: (size.height / 2) - ((y * focalLength) / depth),
  };
}

function deriveHeightRange(positions) {
  if (!positions.length) {
    return { max: 1, min: 0 };
  }

  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (let index = 0; index + 2 < positions.length; index += 3) {
    const height = Math.hypot(positions[index], positions[index + 1], positions[index + 2]);
    minimum = Math.min(minimum, height);
    maximum = Math.max(maximum, height);
  }

  return {
    max: Number.isFinite(maximum) ? maximum : 1,
    min: Number.isFinite(minimum) ? minimum : 0,
  };
}

function pointInTriangle(pointX, pointY, points) {
  const [first, second, third] = points;
  const denominator = ((second.y - third.y) * (first.x - third.x)) + ((third.x - second.x) * (first.y - third.y));

  if (Math.abs(denominator) <= 1e-8) {
    return false;
  }

  const a = (((second.y - third.y) * (pointX - third.x)) + ((third.x - second.x) * (pointY - third.y))) / denominator;
  const b = (((third.y - first.y) * (pointX - third.x)) + ((first.x - third.x) * (pointY - third.y))) / denominator;
  const c = 1 - a - b;

  return a >= 0 && b >= 0 && c >= 0;
}

function resolveTriangleTopicId(faceOwners) {
  const ownerCounts = {};

  faceOwners.forEach((ownerId) => {
    ownerCounts[ownerId] = (ownerCounts[ownerId] || 0) + 1;
  });

  return Object.keys(ownerCounts)
    .sort((left, right) => {
      if (ownerCounts[right] !== ownerCounts[left]) {
        return ownerCounts[right] - ownerCounts[left];
      }
      return faceOwners.indexOf(left) - faceOwners.indexOf(right);
    })[0];
}

function buildProjectedTriangles(terrainMesh, topicLookup, cameraState, size) {
  const basis = buildCameraBasis(cameraState);
  const triangles = [];
  const positions = terrainMesh.positions;
  const indices = terrainMesh.indices;
  const heightRange = deriveHeightRange(positions);
  const heightSpan = Math.max(heightRange.max - heightRange.min, 1e-6);

  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const a = indices[offset];
    const b = indices[offset + 1];
    const c = indices[offset + 2];
    const firstPoint = [positions[a * 3], positions[(a * 3) + 1], positions[(a * 3) + 2]];
    const secondPoint = [positions[b * 3], positions[(b * 3) + 1], positions[(b * 3) + 2]];
    const thirdPoint = [positions[c * 3], positions[(c * 3) + 1], positions[(c * 3) + 2]];
    const triangleCenter = [
      (firstPoint[0] + secondPoint[0] + thirdPoint[0]) / 3,
      (firstPoint[1] + secondPoint[1] + thirdPoint[1]) / 3,
      (firstPoint[2] + secondPoint[2] + thirdPoint[2]) / 3,
    ];
    const triangleNormal = crossVectors(
      subtractVectors(secondPoint, firstPoint),
      subtractVectors(thirdPoint, firstPoint),
    );
    const toCamera = subtractVectors(basis.cameraPosition, triangleCenter);

    if (dotVectors(triangleNormal, toCamera) <= 0) {
      continue;
    }

    const projectedFirst = projectVertex(firstPoint, basis, size);
    const projectedSecond = projectVertex(secondPoint, basis, size);
    const projectedThird = projectVertex(thirdPoint, basis, size);

    if (!projectedFirst || !projectedSecond || !projectedThird) {
      continue;
    }

    const projectedArea = (
      ((projectedSecond.x - projectedFirst.x) * (projectedThird.y - projectedFirst.y))
      - ((projectedSecond.y - projectedFirst.y) * (projectedThird.x - projectedFirst.x))
    );

    if (projectedArea >= 0) {
      continue;
    }

    const faceOwners = [terrainMesh.ownership[a], terrainMesh.ownership[b], terrainMesh.ownership[c]];
    const topicId = resolveTriangleTopicId(faceOwners);
    const firstHeight = Math.hypot(...firstPoint);
    const secondHeight = Math.hypot(...secondPoint);
    const thirdHeight = Math.hypot(...thirdPoint);
    const averageHeight = (firstHeight + secondHeight + thirdHeight) / 3;
    const heightLevel = clamp((averageHeight - heightRange.min) / heightSpan, 0, 1);
    const ridgeStrength = clamp((Math.max(firstHeight, secondHeight, thirdHeight) - Math.min(firstHeight, secondHeight, thirdHeight)) / heightSpan, 0, 1);

    triangles.push({
      centroid: {
        x: (projectedFirst.x + projectedSecond.x + projectedThird.x) / 3,
        y: (projectedFirst.y + projectedSecond.y + projectedThird.y) / 3,
      },
      color: topicLookup?.[topicId]?.colorHex || '#64748b',
      depth: (projectedFirst.depth + projectedSecond.depth + projectedThird.depth) / 3,
      heightLevel,
      pickRadius: Math.max(
        28,
        Math.hypot(projectedFirst.x - projectedSecond.x, projectedFirst.y - projectedSecond.y) * 0.45,
        Math.hypot(projectedSecond.x - projectedThird.x, projectedSecond.y - projectedThird.y) * 0.45,
        Math.hypot(projectedThird.x - projectedFirst.x, projectedThird.y - projectedFirst.y) * 0.45,
      ),
      points: [projectedFirst, projectedSecond, projectedThird],
      ridgeStrength,
      topicId,
    });
  }

  triangles.sort((left, right) => right.depth - left.depth);

  return {
    triangles,
  };
}

function buildProjectedPeaks(topicPeaks, cameraState, size) {
  const basis = buildCameraBasis(cameraState);

  return (topicPeaks || [])
    .map((peak) => {
      const projected = projectVertex(peak.position, basis, size);

      if (!projected) {
        return null;
      }

      return {
        color: peak.colorHex,
        depth: projected.depth,
        height: peak.height,
        radius: clamp(4 + ((peak.height - 1) * 22), 4, 16),
        topicId: peak.topicId,
        x: projected.x,
        y: projected.y,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.depth - left.depth);
}

function buildProjectedSaddleSegments(seamSegments, cameraState, size) {
  const basis = buildCameraBasis(cameraState);

  return (seamSegments || [])
    .map((segment) => {
      const first = projectVertex(segment.points?.[0], basis, size);
      const second = projectVertex(segment.points?.[1], basis, size);

      if (!first || !second) {
        return null;
      }

      return {
        depth: (first.depth + second.depth) / 2,
        ownerIds: segment.ownerIds,
        sameSubfield: segment.sameSubfield,
        topicId: segment.topicId,
        points: [first, second],
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.depth - left.depth);
}

function drawTrianglePath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.lineTo(points[1].x, points[1].y);
  context.lineTo(points[2].x, points[2].y);
  context.closePath();
}

function drawProjectedTriangles(context, triangles, activeTopicId, hoverTopicId) {
  triangles.forEach((triangle) => {
    drawTrianglePath(context, triangle.points);
    context.fillStyle = tintColor(
      triangle.color,
      (-0.18) + (triangle.heightLevel * 0.42) + (triangle.ridgeStrength * 0.16),
    );
    context.fill();
    context.lineWidth = 1 + (triangle.ridgeStrength * 0.55);
    context.strokeStyle = triangle.ridgeStrength > 0.22
      ? 'rgba(226, 232, 240, 0.18)'
      : TERRAIN_STROKE;
    context.stroke();
  });

  if (!activeTopicId && !hoverTopicId) {
    return;
  }

  triangles.forEach((triangle) => {
    if (triangle.topicId !== activeTopicId && triangle.topicId !== hoverTopicId) {
      return;
    }

    drawTrianglePath(context, triangle.points);
    context.fillStyle = triangle.topicId === activeTopicId ? SELECTION_FILL : 'rgba(248, 250, 252, 0.08)';
    context.fill();
    context.lineWidth = triangle.topicId === activeTopicId ? 1.8 : 1.4;
    context.strokeStyle = triangle.topicId === activeTopicId ? SELECTION_STROKE : HOVER_STROKE;
    context.stroke();
  });
}

function drawProjectedSaddles(context, seams) {
  seams.forEach((segment) => {
    context.beginPath();
    context.moveTo(segment.points[0].x, segment.points[0].y);
    context.lineTo(segment.points[1].x, segment.points[1].y);
    context.lineWidth = segment.sameSubfield ? 2.4 : 1.2;
    context.strokeStyle = segment.sameSubfield
      ? 'rgba(226, 232, 240, 0.42)'
      : 'rgba(71, 85, 105, 0.38)';
    context.stroke();
  });
}

function drawProjectedPeaks(context, peaks, activeTopicId, hoverTopicId) {
  peaks.forEach((peak) => {
    context.beginPath();
    context.arc(peak.x, peak.y, peak.radius, 0, Math.PI * 2);
    context.fillStyle = tintColor(peak.color, 0.28);
    context.fill();
    context.lineWidth = peak.topicId === activeTopicId ? 2.6 : peak.topicId === hoverTopicId ? 2.1 : 1.2;
    context.strokeStyle = peak.topicId === activeTopicId
      ? SELECTION_STROKE
      : peak.topicId === hoverTopicId
        ? HOVER_STROKE
        : 'rgba(255, 255, 255, 0.42)';
    context.stroke();

    context.beginPath();
    context.arc(peak.x, peak.y, Math.max(1.8, peak.radius * 0.28), 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.fill();
  });
}

function resolvePickedTopicId(projectedTriangles, clientX, clientY, rect) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  let nearestTriangle = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = projectedTriangles.length - 1; index >= 0; index -= 1) {
    const triangle = projectedTriangles[index];

    if (pointInTriangle(localX, localY, triangle.points)) {
      return triangle.topicId;
    }

    const distance = Math.hypot(localX - triangle.centroid.x, localY - triangle.centroid.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTriangle = triangle;
    }
  }

  if (nearestTriangle && nearestDistance <= nearestTriangle.pickRadius) {
    return nearestTriangle.topicId;
  }

  return '';
}

export default function OpenAlexFullPaperTopicPeakGlobeViewport({
  activeTopicId = null,
  globe = null,
  onHoverTopic,
  onSelectTopic,
  topicPeakGlobe = null,
}) {
  const sourceGlobe = resolveSourceGlobe(globe, topicPeakGlobe);
  const [hoverTopicId, setHoverTopicId] = useState('');
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const onHoverTopicRef = useRef(onHoverTopic);
  const onSelectTopicRef = useRef(onSelectTopic);
  const projectedTrianglesRef = useRef([]);
  const geometrySignatureRef = useRef(null);
  const colorSignatureRef = useRef(null);
  const geometryBuffers = useMemo(
    () => buildTopicPeakGlobeGeometryBuffers(sourceGlobe),
    [sourceGlobe],
  );
  const terrainMesh = geometryBuffers.terrainMesh;
  const seamSegments = geometryBuffers.seamSegments;
  const topicPeaks = geometryBuffers.topicPeaks;
  const topicLookup = geometryBuffers.topicLookup;
  const renderableTopicIds = geometryBuffers.renderableTopicIds;
  const renderableTopics = useMemo(
    () => renderableTopicIds.map((topicId) => topicLookup[topicId]).filter(Boolean),
    [renderableTopicIds, topicLookup],
  );
  const hasRenderableGeometry = Boolean(
    terrainMesh.positions.length
      && terrainMesh.indices.length
      && terrainMesh.ownership.length,
  );
  const cameraStateRef = useRef(deriveTopicPeakGlobeCameraState(sourceGlobe));
  const pointerStateRef = useRef({
    active: false,
    downX: 0,
    downY: 0,
    dragged: false,
    lastX: 0,
    lastY: 0,
    suppressClick: false,
  });

  onHoverTopicRef.current = onHoverTopic;
  onSelectTopicRef.current = onSelectTopic;

  const setHoveredTopicId = (nextTopicId) => {
    setHoverTopicId((currentTopicId) => {
      if (currentTopicId === nextTopicId) {
        return currentTopicId;
      }

      onHoverTopicRef.current?.(nextTopicId ? topicLookup[nextTopicId] || null : null);
      return nextTopicId;
    });
  };

  const renderScene = () => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas || !hasRenderableGeometry) {
      return;
    }

    const size = getHostSize(host);
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = Math.round(size.width * devicePixelRatio);
    canvas.height = Math.round(size.height * devicePixelRatio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const { triangles } = buildProjectedTriangles(
      terrainMesh,
      topicLookup,
      cameraStateRef.current,
      size,
    );
    const projectedSeams = buildProjectedSaddleSegments(
      seamSegments,
      cameraStateRef.current,
      size,
    );
    const projectedPeaks = buildProjectedPeaks(
      topicPeaks,
      cameraStateRef.current,
      size,
    );

    projectedTrianglesRef.current = triangles;

    drawProjectedTriangles(context, triangles, activeTopicId, hoverTopicId);
    drawProjectedSaddles(context, projectedSeams);
    drawProjectedPeaks(context, projectedPeaks, activeTopicId, hoverTopicId);
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas || !hasRenderableGeometry) {
      return undefined;
    }

    const syncSize = () => {
      renderScene();
    };

    const handlePointerDown = (event) => {
      pointerStateRef.current.active = true;
      pointerStateRef.current.downX = event.clientX;
      pointerStateRef.current.downY = event.clientY;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.lastX = event.clientX;
      pointerStateRef.current.lastY = event.clientY;
      pointerStateRef.current.suppressClick = false;
      canvas.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!pointerStateRef.current.active) {
        const rect = canvas.getBoundingClientRect();
        const topicId = resolvePickedTopicId(projectedTrianglesRef.current, event.clientX, event.clientY, rect);

        setHoveredTopicId(topicId);
        return;
      }

      const deltaX = event.clientX - pointerStateRef.current.lastX;
      const deltaY = event.clientY - pointerStateRef.current.lastY;
      const dragDistanceX = event.clientX - pointerStateRef.current.downX;
      const dragDistanceY = event.clientY - pointerStateRef.current.downY;

      pointerStateRef.current.lastX = event.clientX;
      pointerStateRef.current.lastY = event.clientY;

      if (
        !pointerStateRef.current.dragged
        && ((dragDistanceX * dragDistanceX) + (dragDistanceY * dragDistanceY))
          >= (DRAG_SUPPRESSION_DISTANCE * DRAG_SUPPRESSION_DISTANCE)
      ) {
        pointerStateRef.current.dragged = true;
        pointerStateRef.current.suppressClick = true;
      }

      if (!pointerStateRef.current.dragged) {
        return;
      }

      cameraStateRef.current.azimuth -= deltaX * 0.008;
      cameraStateRef.current.elevation = clamp(
        cameraStateRef.current.elevation + (deltaY * 0.006),
        -1.1,
        1.1,
      );
      renderScene();
    };

    const handlePointerUp = (event) => {
      pointerStateRef.current.active = false;
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const handlePointerCancel = (event) => {
      pointerStateRef.current.active = false;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.suppressClick = false;
      setHoveredTopicId('');
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const handlePointerLeave = (event) => {
      pointerStateRef.current.active = false;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.suppressClick = false;
      setHoveredTopicId('');
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const handleWheel = (event) => {
      event.preventDefault();
      cameraStateRef.current.radius = clamp(
        cameraStateRef.current.radius + (event.deltaY * 0.0025),
        cameraStateRef.current.minRadius,
        cameraStateRef.current.maxRadius,
      );
      renderScene();
    };

    const handleClick = (event) => {
      if (pointerStateRef.current.suppressClick) {
        pointerStateRef.current.dragged = false;
        pointerStateRef.current.suppressClick = false;
        return;
      }

      if (pointerStateRef.current.dragged) {
        pointerStateRef.current.dragged = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const topicId = resolvePickedTopicId(projectedTrianglesRef.current, event.clientX, event.clientY, rect);

      if (topicId) {
        onSelectTopicRef.current?.(topicId);
      }
    };

    const observer = new ResizeObserver(syncSize);

    observer.observe(host);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    syncSize();

    return () => {
      observer.disconnect();
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [activeTopicId, hasRenderableGeometry, hoverTopicId, renderableTopicIds, terrainMesh, topicLookup]);

  useEffect(() => {
    const nextGeometrySignature = buildGeometrySignature(terrainMesh);
    const nextPeakSignature = buildPeakSignature(topicPeaks);
    const nextSaddleSignature = buildSaddleSignature(seamSegments);
    const nextColorSignature = buildColorSignature(topicLookup, renderableTopicIds);

    if (
      geometrySignatureRef.current !== [
        nextGeometrySignature,
        nextPeakSignature,
        nextSaddleSignature,
      ].join('|')
    ) {
      cameraStateRef.current = deriveTopicPeakGlobeCameraState(sourceGlobe);
      geometrySignatureRef.current = [
        nextGeometrySignature,
        nextPeakSignature,
        nextSaddleSignature,
      ].join('|');
    }

    if (colorSignatureRef.current !== nextColorSignature) {
      colorSignatureRef.current = nextColorSignature;
    }

    if (hasRenderableGeometry) {
      renderScene();
    }
  }, [hasRenderableGeometry, renderableTopicIds, sourceGlobe, terrainMesh, topicLookup, topicPeaks, seamSegments, activeTopicId, hoverTopicId]);

  useEffect(() => {
    if (!hoverTopicId) {
      return;
    }

    if (!topicLookup[hoverTopicId]) {
      setHoveredTopicId('');
    }
  }, [hoverTopicId, topicLookup]);

  if (!hasRenderableGeometry) {
    return (
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/94 p-6 text-slate-100 shadow-[0_24px_70px_rgba(2,6,23,0.35)]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">主题山峰地形</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">主题山峰地形暂不可用</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
          当前视图缺少主题山峰几何数据。请重新生成山峰数据包，或刷新本地数据桥接后再打开该宏观视图。
        </p>
      </section>
    );
  }

  const hoveredTopic = hoverTopicId ? topicLookup[hoverTopicId] || null : null;
  const activeTopic = activeTopicId ? topicLookup[activeTopicId] || null : null;
  const focusTopic = hoveredTopic || activeTopic || renderableTopics[0] || null;

  return (
    <section
      ref={hostRef}
      data-active-topic-id={activeTopicId || ''}
      data-hover-topic-id={hoverTopicId || ''}
      data-peak-count={String(topicPeaks.length)}
      data-saddle-count={String(seamSegments.length)}
      className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_rgba(2,6,23,0.98)_46%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,1))] p-4 text-slate-100 shadow-[0_24px_70px_rgba(2,6,23,0.4)]"
    >
      <div className="flex items-start justify-between gap-4 px-2 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">主题山峰地形</p>
          <h2 className="mt-2 text-lg font-semibold text-white">按子领域聚类的主题地形</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            每个山峰代表一个主题：高度对应影响力分位分数，占地范围对应主题规模，尖锐程度对应引用质量。
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
            低鞍部连接同一子领域内的山峰，使其呈现为连续地形，而不是彼此分离的浮动球体。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/72 px-3 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">已加载主题</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{renderableTopics.length}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">山峰 {topicPeaks.length}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">鞍部连接 {seamSegments.length}</p>
        </div>
      </div>

      <div className="relative min-h-[720px] overflow-hidden rounded-[24px] border border-slate-800/90 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.12),rgba(15,23,42,0)_32%),radial-gradient(circle_at_70%_25%,rgba(99,102,241,0.1),rgba(15,23,42,0)_36%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,1))]">
        <canvas
          ref={canvasRef}
          aria-label="主题山峰地形视窗"
          className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
        />

        {focusTopic ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-slate-800 bg-slate-950/72 px-4 py-3 text-sm text-slate-200 shadow-[0_12px_30px_rgba(2,6,23,0.35)]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">聚焦山峰</p>
            <p className="mt-2 font-medium text-white">{focusTopic.topicDisplayName || focusTopic.topicId}</p>
            <p className="mt-1 text-xs text-slate-400">
              {focusTopic.subfieldDisplayName || '未知子领域'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              影响力分数 {Number(focusTopic.influenceScore || 0).toFixed(1)}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

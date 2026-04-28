import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFieldHeatGlobeGeometryBuffers,
  deriveFieldHeatGlobeCameraState,
  getRenderableFieldHeatGlobePatchMeshes,
} from '../../utils/openAlexFullPaperFieldHeatGlobeScene';

const FIELD_OF_VIEW_RADIANS = (42 * Math.PI) / 180;
const MIN_HOST_HEIGHT = 720;
const DRAG_SUPPRESSION_DISTANCE = 6;
const HOVER_STROKE = 'rgba(248, 250, 252, 0.9)';
const PATCH_STROKE = 'rgba(15, 23, 42, 0.8)';
const SELECTION_FILL = 'rgba(248, 250, 252, 0.18)';
const SELECTION_STROKE = 'rgba(248, 250, 252, 0.95)';

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
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

function buildGeometrySignature(renderablePatchMeshes) {
  return renderablePatchMeshes
    .map((patchMesh) => [
      patchMesh.patchId,
      hashNumericArray(patchMesh.indices, 1),
      hashNumericArray(patchMesh.positions, 1000),
    ].join(':'))
    .join('|');
}

function buildColorSignature(renderablePatchMeshes) {
  return renderablePatchMeshes
    .map((patchMesh) => [
      patchMesh.patchId,
      hashNumericArray(patchMesh.color, 100000),
    ].join(':'))
    .join('|');
}

function colorArrayToHex(color) {
  const channels = Array.isArray(color) ? color : [0.58, 0.64, 0.72];

  return `#${channels
    .slice(0, 3)
    .map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel || 0) * 255))).toString(16).padStart(2, '0'))
    .join('')}`;
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

function buildProjectedTriangles(renderablePatchMeshes, cameraState, size) {
  const basis = buildCameraBasis(cameraState);
  const triangles = [];

  renderablePatchMeshes.forEach((patchMesh) => {
    const positions = patchMesh.positions;
    const indices = patchMesh.indices;
    const patchColor = colorArrayToHex(patchMesh.color);

    for (let offset = 0; offset + 2 < indices.length; offset += 3) {
      const firstIndex = indices[offset] * 3;
      const secondIndex = indices[offset + 1] * 3;
      const thirdIndex = indices[offset + 2] * 3;
      const firstPoint = [positions[firstIndex], positions[firstIndex + 1], positions[firstIndex + 2]];
      const secondPoint = [positions[secondIndex], positions[secondIndex + 1], positions[secondIndex + 2]];
      const thirdPoint = [positions[thirdIndex], positions[thirdIndex + 1], positions[thirdIndex + 2]];
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

      triangles.push({
        color: patchColor,
        depth: (projectedFirst.depth + projectedSecond.depth + projectedThird.depth) / 3,
        patchId: patchMesh.patchId,
        points: [projectedFirst, projectedSecond, projectedThird],
      });
    }
  });

  triangles.sort((left, right) => right.depth - left.depth);

  const projectedOrigin = projectVertex([0, 0, 0], basis, size);
  let silhouette = null;

  if (projectedOrigin) {
    const distances = triangles
      .flatMap((triangle) => triangle.points)
      .map((point) => Math.hypot(point.x - projectedOrigin.x, point.y - projectedOrigin.y))
      .sort((left, right) => left - right);

    if (distances.length) {
      const clipIndex = Math.min(distances.length - 1, Math.floor(distances.length * 0.97));
      silhouette = {
        x: projectedOrigin.x,
        y: projectedOrigin.y,
        radius: distances[clipIndex],
      };
    }
  }

  return {
    silhouette,
    triangles,
  };
}

function drawTrianglePath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.lineTo(points[1].x, points[1].y);
  context.lineTo(points[2].x, points[2].y);
  context.closePath();
}

function drawProjectedTriangles(context, triangles, activePatchId, hoverPatchId) {
  triangles.forEach((triangle) => {
    drawTrianglePath(context, triangle.points);
    context.fillStyle = triangle.color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = PATCH_STROKE;
    context.stroke();
  });

  if (!activePatchId && !hoverPatchId) {
    return;
  }

  triangles.forEach((triangle) => {
    if (triangle.patchId !== activePatchId && triangle.patchId !== hoverPatchId) {
      return;
    }

    drawTrianglePath(context, triangle.points);
    context.fillStyle = triangle.patchId === activePatchId ? SELECTION_FILL : 'rgba(248, 250, 252, 0.08)';
    context.fill();
    context.lineWidth = triangle.patchId === activePatchId ? 1.8 : 1.4;
    context.strokeStyle = triangle.patchId === activePatchId ? SELECTION_STROKE : HOVER_STROKE;
    context.stroke();
  });
}

function resolvePickedPatchId(projectedTriangles, clientX, clientY, rect) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  for (let index = projectedTriangles.length - 1; index >= 0; index -= 1) {
    const triangle = projectedTriangles[index];

    if (pointInTriangle(localX, localY, triangle.points)) {
      return triangle.patchId;
    }
  }

  return null;
}

export default function OpenAlexFullPaperFieldHeatGlobeViewport({
  activePatchId = null,
  globe = null,
  onSelectPatch,
}) {
  const [hoverPatchId, setHoverPatchId] = useState('');
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const onSelectPatchRef = useRef(onSelectPatch);
  const globeRef = useRef(globe);
  const projectedTrianglesRef = useRef([]);
  const geometrySignatureRef = useRef(null);
  const colorSignatureRef = useRef(null);
  const cameraStateRef = useRef({
    ...deriveFieldHeatGlobeCameraState(globe),
  });
  const pointerStateRef = useRef({
    active: false,
    downX: 0,
    downY: 0,
    dragged: false,
    lastX: 0,
    lastY: 0,
    suppressClick: false,
  });
  const geometryBuffers = useMemo(() => buildFieldHeatGlobeGeometryBuffers(globe), [globe]);
  const renderablePatchMeshes = useMemo(
    () => getRenderableFieldHeatGlobePatchMeshes(geometryBuffers.patchMeshes)
      .sort((left, right) => left.patchId.localeCompare(right.patchId)),
    [geometryBuffers],
  );
  const hasRenderableGeometry = renderablePatchMeshes.length > 0;

  onSelectPatchRef.current = onSelectPatch;
  globeRef.current = globe;

  const renderScene = () => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas) {
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

    const { silhouette, triangles } = buildProjectedTriangles(renderablePatchMeshes, cameraStateRef.current, size);

    projectedTrianglesRef.current = triangles;

    if (silhouette) {
      context.save();
      context.beginPath();
      context.arc(silhouette.x, silhouette.y, silhouette.radius, 0, Math.PI * 2);
      context.clip();
      drawProjectedTriangles(context, triangles, activePatchId, hoverPatchId);
      context.restore();
      return;
    }

    drawProjectedTriangles(context, triangles, activePatchId, hoverPatchId);
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas) {
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
        const patchId = resolvePickedPatchId(projectedTrianglesRef.current, event.clientX, event.clientY, rect) || '';

        setHoverPatchId((current) => (current === patchId ? current : patchId));
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
      setHoverPatchId('');
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const handlePointerLeave = (event) => {
      pointerStateRef.current.active = false;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.suppressClick = false;
      setHoverPatchId('');
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
      const patchId = resolvePickedPatchId(projectedTrianglesRef.current, event.clientX, event.clientY, rect);

      if (patchId) {
        onSelectPatchRef.current?.(patchId);
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
  }, []);

  useEffect(() => {
    const nextGeometrySignature = buildGeometrySignature(renderablePatchMeshes);
    const nextColorSignature = buildColorSignature(renderablePatchMeshes);

    if (geometrySignatureRef.current !== nextGeometrySignature) {
      cameraStateRef.current = deriveFieldHeatGlobeCameraState(globe);
      geometrySignatureRef.current = nextGeometrySignature;
    }

    if (colorSignatureRef.current !== nextColorSignature) {
      colorSignatureRef.current = nextColorSignature;
    }

    setHoverPatchId('');
    renderScene();
  }, [globe, renderablePatchMeshes]);

  useEffect(() => {
    renderScene();
  }, [activePatchId, hoverPatchId]);

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-slate-950"
      data-active-patch-id={activePatchId || ''}
      data-hover-patch-id={hoverPatchId}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-xs leading-5 text-slate-300 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        Drag to inspect the globe, wheel to zoom, and click a topic patch to lock the selected summary.
      </div>
      {!hasRenderableGeometry ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
          Topic heat globe geometry is unavailable for this view.
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';

const PICK_RADIUS_PX = 12;
const MIN_CANVAS_HEIGHT = 720;
const VIEWPORT_FIT_MARGIN = 72;
const THREE_D_DEFAULT_DISTANCE = 3.2;
const THREE_D_MAX_SCALE = 1600;
const BASE_COLORS = Object.freeze({
  abstract: '#38bdf8',
  background: '#020617',
  grid: 'rgba(148, 163, 184, 0.08)',
  titleOnly: '#f59e0b',
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createSize(width = 0, height = 0) {
  return {
    height: Math.max(height || 0, MIN_CANVAS_HEIGHT),
    width: Math.max(width || 0, 1),
  };
}

function getCoordinateCenter(bounds) {
  return {
    x: (Number(bounds?.minX || 0) + Number(bounds?.maxX || 0)) / 2,
    y: (Number(bounds?.minY || 0) + Number(bounds?.maxY || 0)) / 2,
    z: (Number(bounds?.minZ || 0) + Number(bounds?.maxZ || 0)) / 2,
  };
}

function getCoordinateSpan(bounds, axis) {
  const minKey = `min${axis.toUpperCase()}`;
  const maxKey = `max${axis.toUpperCase()}`;
  return Math.max(Number(bounds?.[maxKey] || 0) - Number(bounds?.[minKey] || 0), 1e-6);
}

function projectRelative3dPoint(x, y, z, camera) {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const rotatedX = (x * cosYaw) + (z * sinYaw);
  const rotatedZ = (-x * sinYaw) + (z * cosYaw);
  const rotatedY = (y * cosPitch) - (rotatedZ * sinPitch);
  const depth = (y * sinPitch) + (rotatedZ * cosPitch);
  const perspective = 1 / Math.max(camera.distance - depth, 0.9);

  return {
    depth,
    projectedX: rotatedX * perspective,
    projectedY: rotatedY * perspective,
  };
}

function computeProjected3dBounds(coordinateBounds3d, camera) {
  const center = getCoordinateCenter(coordinateBounds3d);
  const cornerXs = [coordinateBounds3d.minX, coordinateBounds3d.maxX];
  const cornerYs = [coordinateBounds3d.minY, coordinateBounds3d.maxY];
  const cornerZs = [coordinateBounds3d.minZ, coordinateBounds3d.maxZ];

  const projectedCorners = [];
  cornerXs.forEach((x) => {
    cornerYs.forEach((y) => {
      cornerZs.forEach((z) => {
        projectedCorners.push(projectRelative3dPoint(
          x - center.x,
          y - center.y,
          z - center.z,
          camera,
        ));
      });
    });
  });

  return projectedCorners.reduce((bounds, point) => ({
    maxX: Math.max(bounds.maxX, point.projectedX),
    maxY: Math.max(bounds.maxY, point.projectedY),
    minX: Math.min(bounds.minX, point.projectedX),
    minY: Math.min(bounds.minY, point.projectedY),
  }), {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  });
}

function computeProjected3dPaperBounds(papers, coordinateBounds3d, camera) {
  if (!papers.length) {
    return computeProjected3dBounds(coordinateBounds3d, camera);
  }

  const center = getCoordinateCenter(coordinateBounds3d);

  return papers.reduce((bounds, paper) => {
    const point = projectRelative3dPoint(
      paper.coordinates3d.x - center.x,
      paper.coordinates3d.y - center.y,
      paper.coordinates3d.z - center.z,
      camera,
    );

    return {
      maxX: Math.max(bounds.maxX, point.projectedX),
      maxY: Math.max(bounds.maxY, point.projectedY),
      minX: Math.min(bounds.minX, point.projectedX),
      minY: Math.min(bounds.minY, point.projectedY),
    };
  }, {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  });
}

function buildDefaultCamera(viewMode, size, coordinateBounds2d, coordinateBounds3d, papers = []) {
  if (viewMode === '2d') {
    const spanX = getCoordinateSpan(coordinateBounds2d, 'x');
    const spanY = getCoordinateSpan(coordinateBounds2d, 'y');
    const baseScale = 0.86 * Math.min(
      (size.width - (VIEWPORT_FIT_MARGIN * 2)) / spanX,
      (size.height - (VIEWPORT_FIT_MARGIN * 2)) / spanY,
    );

    return {
      offsetX: 0,
      offsetY: 0,
      scale: clamp(baseScale, 100, 960),
    };
  }

  const baseCamera = {
    distance: THREE_D_DEFAULT_DISTANCE,
    offsetX: 0,
    offsetY: 0,
    pitch: 0.45,
    yaw: 0.7,
  };
  const projectedBounds = computeProjected3dPaperBounds(papers, coordinateBounds3d, baseCamera);
  const projectedSpanX = Math.max(projectedBounds.maxX - projectedBounds.minX, 1e-6);
  const projectedSpanY = Math.max(projectedBounds.maxY - projectedBounds.minY, 1e-6);
  const baseScale = 0.94 * Math.min(
    (size.width - (VIEWPORT_FIT_MARGIN * 2)) / projectedSpanX,
    (size.height - (VIEWPORT_FIT_MARGIN * 2)) / projectedSpanY,
  );

  return {
    ...baseCamera,
    offsetX: 0,
    offsetY: 0,
    scale: clamp(baseScale, 220, THREE_D_MAX_SCALE),
  };
}

function projectPaperToScreen({
  camera,
  coordinateBounds2d,
  coordinateBounds3d,
  paper,
  size,
  viewMode,
}) {
  const center2d = getCoordinateCenter(coordinateBounds2d);
  const center3d = getCoordinateCenter(coordinateBounds3d);
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;

  if (viewMode === '2d') {
    const x = paper.coordinates.x - center2d.x;
    const y = paper.coordinates.y - center2d.y;

    return {
      depth: 0,
      paper,
      radius: 4,
      screenX: halfWidth + camera.offsetX + (x * camera.scale),
      screenY: halfHeight + camera.offsetY - (y * camera.scale),
    };
  }

  const x = paper.coordinates3d.x - center3d.x;
  const y = paper.coordinates3d.y - center3d.y;
  const z = paper.coordinates3d.z - center3d.z;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  const rotatedX = (x * cosYaw) + (z * sinYaw);
  const rotatedZ = (-x * sinYaw) + (z * cosYaw);
  const rotatedY = (y * cosPitch) - (rotatedZ * sinPitch);
  const depth = (y * sinPitch) + (rotatedZ * cosPitch);
  const perspective = camera.scale / Math.max(camera.distance - depth, 0.9);

  return {
    depth,
    paper,
    radius: clamp(2.6 + (perspective * 0.07), 2.4, 8.5),
    screenX: halfWidth + camera.offsetX + (rotatedX * perspective),
    screenY: halfHeight + camera.offsetY - (rotatedY * perspective),
  };
}

function pickProjectedPaper(projectedPapers, clientX, clientY) {
  let bestMatch = null;
  let bestDistanceSquared = PICK_RADIUS_PX ** 2;

  projectedPapers.forEach((entry) => {
    const deltaX = entry.screenX - clientX;
    const deltaY = entry.screenY - clientY;
    const distanceSquared = (deltaX ** 2) + (deltaY ** 2);
    if (distanceSquared > bestDistanceSquared) {
      return;
    }

    bestMatch = entry;
    bestDistanceSquared = distanceSquared;
  });

  return bestMatch;
}

function drawScene({
  context,
  hoveredWorkId,
  projectedPapers,
  searchMatchIds,
  selectedWorkId,
  size,
  viewMode,
}) {
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = BASE_COLORS.background;
  context.fillRect(0, 0, size.width, size.height);

  context.strokeStyle = BASE_COLORS.grid;
  context.lineWidth = 1;
  const gridStep = viewMode === '3d' ? 96 : 88;
  for (let x = 0; x <= size.width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, size.height);
    context.stroke();
  }
  for (let y = 0; y <= size.height; y += gridStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size.width, y);
    context.stroke();
  }

  projectedPapers
    .slice()
    .sort((left, right) => left.depth - right.depth)
    .forEach((entry) => {
      const isSelected = entry.paper.id === selectedWorkId;
      const isHovered = entry.paper.id === hoveredWorkId;
      const isSearchMatch = searchMatchIds.has(entry.paper.id);
      const fillColor = entry.paper.abstractAvailable ? BASE_COLORS.abstract : BASE_COLORS.titleOnly;
      let alpha = entry.paper.abstractAvailable ? 0.62 : 0.46;

      if (searchMatchIds.size) {
        alpha = isSearchMatch ? 0.94 : 0.14;
      }
      if (isHovered) {
        alpha = 0.96;
      }
      if (isSelected) {
        alpha = 1;
      }

      context.beginPath();
      context.fillStyle = fillColor;
      context.globalAlpha = alpha;
      context.arc(entry.screenX, entry.screenY, entry.radius, 0, Math.PI * 2);
      context.fill();

      if (isSearchMatch || isHovered || isSelected) {
        context.beginPath();
        context.globalAlpha = isSelected ? 0.95 : 0.72;
        context.lineWidth = isSelected ? 2.6 : 1.5;
        context.strokeStyle = isSelected ? '#f8fafc' : '#7dd3fc';
        context.arc(entry.screenX, entry.screenY, entry.radius + (isSelected ? 4.5 : 3.2), 0, Math.PI * 2);
        context.stroke();
      }
    });

  context.globalAlpha = 1;
}

export default function OpenAlexPaperEmbeddingsViewport({
  papers,
  coordinateBounds2d,
  coordinateBounds3d,
  resetCameraToken,
  searchMatchIds,
  selectedWorkId,
  viewMode,
  onSelectPaper,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const dragStateRef = useRef({
    button: 0,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  });
  const previousResetTokenRef = useRef(resetCameraToken);
  const [viewportSize, setViewportSize] = useState(() => createSize());
  const [cameraByMode, setCameraByMode] = useState({
    '2d': null,
    '3d': null,
  });
  const [cameraInteractedByMode, setCameraInteractedByMode] = useState({
    '2d': false,
    '3d': false,
  });
  const [hoveredWorkId, setHoveredWorkId] = useState(null);

  const defaultCamera2d = useMemo(
    () => buildDefaultCamera('2d', viewportSize, coordinateBounds2d, coordinateBounds3d, papers),
    [coordinateBounds2d, coordinateBounds3d, papers, viewportSize],
  );
  const defaultCamera3d = useMemo(
    () => buildDefaultCamera('3d', viewportSize, coordinateBounds2d, coordinateBounds3d, papers),
    [coordinateBounds2d, coordinateBounds3d, papers, viewportSize],
  );

  const activeCamera = cameraByMode[viewMode] || (viewMode === '2d' ? defaultCamera2d : defaultCamera3d);

  const projectedPapers = useMemo(
    () => papers.map((paper) => projectPaperToScreen({
      camera: activeCamera,
      coordinateBounds2d,
      coordinateBounds3d,
      paper,
      size: viewportSize,
      viewMode,
    })),
    [activeCamera, coordinateBounds2d, coordinateBounds3d, papers, viewMode, viewportSize],
  );

  const projectedPapersById = useMemo(
    () => Object.fromEntries(projectedPapers.map((entry) => [entry.paper.id, entry])),
    [projectedPapers],
  );

  const hoveredEntry = hoveredWorkId ? projectedPapersById[hoveredWorkId] || null : null;
  const selectedEntry = selectedWorkId ? projectedPapersById[selectedWorkId] || null : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const syncSize = () => {
      setViewportSize(createSize(host.clientWidth || 0, host.clientHeight || MIN_CANVAS_HEIGHT));
    };

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(host);
    syncSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
      updateCamera((camera) => {
        if (viewMode === '2d') {
          return {
            ...camera,
            scale: clamp(camera.scale * zoomFactor, 40, 1280),
          };
        }

        return {
          ...camera,
          scale: clamp(camera.scale * zoomFactor, 80, 2200),
        };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [defaultCamera2d, defaultCamera3d, viewMode]);

  useEffect(() => {
    setCameraByMode((currentState) => {
      const next2d = cameraInteractedByMode['2d'] ? currentState['2d'] || defaultCamera2d : defaultCamera2d;
      const next3d = cameraInteractedByMode['3d'] ? currentState['3d'] || defaultCamera3d : defaultCamera3d;

      if (next2d === currentState['2d'] && next3d === currentState['3d']) {
        return currentState;
      }

      return {
        '2d': next2d,
        '3d': next3d,
      };
    });
  }, [cameraInteractedByMode, defaultCamera2d, defaultCamera3d]);

  useEffect(() => {
    if (resetCameraToken === previousResetTokenRef.current) {
      return;
    }

    previousResetTokenRef.current = resetCameraToken;
    setCameraInteractedByMode((currentState) => ({
      ...currentState,
      [viewMode]: false,
    }));
    setCameraByMode((currentState) => ({
      ...currentState,
      [viewMode]: viewMode === '2d' ? defaultCamera2d : defaultCamera3d,
    }));
  }, [defaultCamera2d, defaultCamera3d, resetCameraToken, viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = viewportSize.width * ratio;
    canvas.height = viewportSize.height * ratio;
    canvas.style.width = `${viewportSize.width}px`;
    canvas.style.height = `${viewportSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScene({
      context,
      hoveredWorkId,
      projectedPapers,
      searchMatchIds,
      selectedWorkId,
      size: viewportSize,
      viewMode,
    });
  }, [hoveredWorkId, projectedPapers, searchMatchIds, selectedWorkId, viewMode, viewportSize]);

  useEffect(() => {
    if (hoveredWorkId && !projectedPapersById[hoveredWorkId]) {
      setHoveredWorkId(null);
    }
  }, [hoveredWorkId, projectedPapersById]);

  const updateCamera = (updater) => {
    setCameraInteractedByMode((currentState) => {
      if (currentState[viewMode]) {
        return currentState;
      }

      return {
        ...currentState,
        [viewMode]: true,
      };
    });
    setCameraByMode((currentState) => ({
      ...currentState,
      [viewMode]: updater(currentState[viewMode] || (viewMode === '2d' ? defaultCamera2d : defaultCamera3d)),
    }));
  };

  const handlePointerDown = (event) => {
    if (!(event.currentTarget instanceof HTMLCanvasElement)) {
      return;
    }

    dragStateRef.current = {
      button: event.button,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;

    if (dragState.pointerId === event.pointerId) {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        dragState.moved = true;
      }

      if (dragState.moved) {
        updateCamera((camera) => {
          if (viewMode === '2d') {
            return {
              ...camera,
              offsetX: camera.offsetX + deltaX,
              offsetY: camera.offsetY + deltaY,
            };
          }

          if (event.shiftKey || dragState.button === 2) {
            return {
              ...camera,
              offsetX: camera.offsetX + deltaX,
              offsetY: camera.offsetY + deltaY,
            };
          }

          return {
            ...camera,
            pitch: clamp(camera.pitch + (deltaY * 0.008), -1.2, 1.2),
            yaw: camera.yaw + (deltaX * 0.008),
          };
        });

        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        setHoveredWorkId(null);
        return;
      }
    }

    const canvasRect = event.currentTarget.getBoundingClientRect();
    const hit = pickProjectedPaper(
      projectedPapers,
      event.clientX - canvasRect.left,
      event.clientY - canvasRect.top,
    );
    setHoveredWorkId(hit?.paper.id || null);
  };

  const handlePointerUp = (event) => {
    const dragState = dragStateRef.current;
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!dragState.moved) {
      const canvasRect = event.currentTarget.getBoundingClientRect();
      const hit = pickProjectedPaper(
        projectedPapers,
        event.clientX - canvasRect.left,
        event.clientY - canvasRect.top,
      );
      onSelectPaper(hit?.paper.id || null);
    }

    dragStateRef.current = {
      button: 0,
      moved: false,
      pointerId: null,
      startX: 0,
      startY: 0,
    };
    if (event.currentTarget instanceof HTMLCanvasElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div ref={hostRef} className="relative h-full min-h-[720px] overflow-hidden overscroll-none bg-slate-950">
      <canvas
        ref={canvasRef}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setHoveredWorkId(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="block h-full min-h-[720px] w-full cursor-crosshair overscroll-none touch-none"
      />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
          {viewMode === '3d' ? '3D orbit' : '2D pan'}
        </span>
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
          Abstract-present papers
        </span>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
          Title-only papers
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-[20px] border border-slate-800 bg-slate-950/85 px-4 py-3 text-sm leading-6 text-slate-300 backdrop-blur">
        Drag to {viewMode === '3d' ? 'orbit' : 'pan'}, wheel to zoom, shift-drag in 3D to pan, and use the explicit reset control when you want to refit the cohort.
      </div>

      {hoveredEntry ? (
        <div
          className="pointer-events-none absolute z-10 max-w-sm rounded-2xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-xl"
          style={{
            left: clamp(hoveredEntry.screenX + 14, 12, viewportSize.width - 280),
            top: clamp(hoveredEntry.screenY - 16, 12, viewportSize.height - 96),
          }}
        >
          <p className="font-medium text-white">{hoveredEntry.paper.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {hoveredEntry.paper.publicationYear || 'Unknown year'} · cited by {hoveredEntry.paper.citedByCount}
          </p>
        </div>
      ) : null}

      {selectedEntry ? (
        <div
          className="pointer-events-none absolute z-10 max-w-sm rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-100 shadow-lg"
          style={{
            left: clamp(selectedEntry.screenX + 10, 12, viewportSize.width - 280),
            top: clamp(selectedEntry.screenY + 10, 12, viewportSize.height - 40),
          }}
        >
          {selectedEntry.paper.title}
        </div>
      ) : null}
    </div>
  );
}

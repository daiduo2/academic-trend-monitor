import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFullPaperHoverCard,
  pickProjectedFullPaper,
  projectFullPaperToScreen,
} from '../../utils/openAlexFullPaperViewport';

const MIN_CANVAS_HEIGHT = 720;
const SELECTED_RING_BASE = 6;
const VIEWPORT_FIT_MARGIN = 72;
const THREE_D_DEFAULT_DISTANCE = 3.2;
const THREE_D_MAX_SCALE = 1800;

const BASE_COLORS = Object.freeze({
  background: '#020617',
  grid: 'rgba(148, 163, 184, 0.08)',
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

function computeProjected3dPaperBounds(paperGroups, coordinateBounds3d, camera) {
  if (!paperGroups.length) {
    return {
      maxX: 1,
      maxY: 1,
      minX: -1,
      minY: -1,
    };
  }

  const center = getCoordinateCenter(coordinateBounds3d);
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  paperGroups.forEach((group) => {
    for (let index = 0; index < group.papers.length; index += 1) {
      const paper = group.papers[index];
      const point = projectRelative3dPoint(
        paper.coordinates3d.x - center.x,
        paper.coordinates3d.y - center.y,
        paper.coordinates3d.z - center.z,
        camera,
      );
      maxX = Math.max(maxX, point.projectedX);
      maxY = Math.max(maxY, point.projectedY);
      minX = Math.min(minX, point.projectedX);
      minY = Math.min(minY, point.projectedY);
    }
  });

  return { maxX, maxY, minX, minY };
}

function buildDefaultCamera(viewMode, size, coordinateBounds2d, coordinateBounds3d, paperGroups) {
  if (viewMode === '2d') {
    const spanX = getCoordinateSpan(coordinateBounds2d, 'x');
    const spanY = getCoordinateSpan(coordinateBounds2d, 'y');
    const baseScale = 0.9 * Math.min(
      (size.width - (VIEWPORT_FIT_MARGIN * 2)) / spanX,
      (size.height - (VIEWPORT_FIT_MARGIN * 2)) / spanY,
    );

    return {
      offsetX: 0,
      offsetY: 0,
      scale: clamp(baseScale, 22, 1400),
    };
  }

  const baseCamera = {
    distance: THREE_D_DEFAULT_DISTANCE,
    offsetX: 0,
    offsetY: 0,
    pitch: 0.45,
    yaw: 0.7,
  };
  const projectedBounds = computeProjected3dPaperBounds(paperGroups, coordinateBounds3d, baseCamera);
  const projectedSpanX = Math.max(projectedBounds.maxX - projectedBounds.minX, 1e-6);
  const projectedSpanY = Math.max(projectedBounds.maxY - projectedBounds.minY, 1e-6);
  const baseScale = 0.94 * Math.min(
    (size.width - (VIEWPORT_FIT_MARGIN * 2)) / projectedSpanX,
    (size.height - (VIEWPORT_FIT_MARGIN * 2)) / projectedSpanY,
  );

  return {
    ...baseCamera,
    scale: clamp(baseScale, 90, THREE_D_MAX_SCALE),
  };
}

function isProjectedPointVisible(projectedPaper, size) {
  return !(
    projectedPaper.screenX < -projectedPaper.radius
    || projectedPaper.screenX > size.width + projectedPaper.radius
    || projectedPaper.screenY < -projectedPaper.radius
    || projectedPaper.screenY > size.height + projectedPaper.radius
  );
}

function buildFocusedCamera(
  viewMode,
  camera,
  targetPaper,
  coordinateBounds2d,
  coordinateBounds3d,
  size,
) {
  if (!camera || !targetPaper) {
    return camera;
  }

  const projectedPaper = projectFullPaperToScreen({
    camera,
    coordinateBounds2d,
    coordinateBounds3d,
    paper: targetPaper,
    size,
    viewMode,
  });
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;

  return {
    ...camera,
    offsetX: camera.offsetX - (projectedPaper.screenX - halfWidth),
    offsetY: camera.offsetY - (projectedPaper.screenY - halfHeight),
  };
}

function drawScene({
  context,
  hoveredPaperId,
  projectedPapers,
  selectedPaper,
  selectedPaperColor,
  size,
  viewMode,
}) {
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = BASE_COLORS.background;
  context.fillRect(0, 0, size.width, size.height);

  context.strokeStyle = BASE_COLORS.grid;
  context.lineWidth = 1;
  const gridStep = 96;
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
      if (!isProjectedPointVisible(entry, size)) {
        return;
      }

      const isHovered = entry.paper.id === hoveredPaperId;
      const isSelected = entry.paper.id === selectedPaper?.id;
      let alpha = viewMode === '3d' ? 0.42 : 0.56;

      if (isHovered) {
        alpha = 0.96;
      }
      if (isSelected) {
        alpha = 1;
      }

      context.beginPath();
      context.fillStyle = entry.color;
      context.globalAlpha = alpha;
      context.arc(entry.screenX, entry.screenY, entry.radius, 0, Math.PI * 2);
      context.fill();

      if (isHovered || isSelected) {
        context.beginPath();
        context.globalAlpha = isSelected ? 0.95 : 0.72;
        context.lineWidth = isSelected ? 2.6 : 1.5;
        context.strokeStyle = isSelected ? '#f8fafc' : '#7dd3fc';
        context.arc(entry.screenX, entry.screenY, entry.radius + (isSelected ? 4.5 : 3.2), 0, Math.PI * 2);
        context.stroke();
      }
    });

  context.globalAlpha = 1;

  if (!selectedPaper) {
    return;
  }

  const selectedPoint = projectedPapers.find((entry) => entry.paper.id === selectedPaper.id);

  if (!selectedPoint || !isProjectedPointVisible(selectedPoint, size)) {
    return;
  }

  const ringRadius = clamp(SELECTED_RING_BASE + (selectedPoint.radius * 1.4), 8, 22);

  context.save();
  context.globalAlpha = 1;
  context.beginPath();
  context.fillStyle = 'rgba(56, 189, 248, 0.16)';
  context.arc(selectedPoint.screenX, selectedPoint.screenY, ringRadius + 7, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.fillStyle = 'rgba(248, 250, 252, 0.16)';
  context.arc(selectedPoint.screenX, selectedPoint.screenY, ringRadius + 3, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.lineWidth = 2;
  context.strokeStyle = '#f8fafc';
  context.arc(selectedPoint.screenX, selectedPoint.screenY, ringRadius, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.fillStyle = selectedPaperColor || '#38bdf8';
  context.arc(selectedPoint.screenX, selectedPoint.screenY, Math.max(selectedPoint.radius, 4.2), 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.fillStyle = '#f8fafc';
  context.arc(selectedPoint.screenX, selectedPoint.screenY, Math.max(selectedPoint.radius * 0.28, 1.4), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export default function OpenAlexFullPaperEmbeddingsViewport({
  activePaperCount,
  activeTopicLabel,
  coordinateBounds2d,
  coordinateBounds3d,
  focusRequestPaperId = null,
  focusRequestToken = 0,
  onSelectPaper,
  paperGroups,
  resetCameraToken,
  selectedPaper,
  selectedPaperColor,
  viewMode,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const dragStateRef = useRef({
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  });
  const previousDataKeyRef = useRef('');
  const previousFocusSignatureRef = useRef('');
  const previousResetTokenRef = useRef(resetCameraToken);
  const [cameraByMode, setCameraByMode] = useState({
    '2d': null,
    '3d': null,
  });
  const [cameraInteractedByMode, setCameraInteractedByMode] = useState({
    '2d': false,
    '3d': false,
  });
  const [hoveredPaperId, setHoveredPaperId] = useState(null);
  const [viewportSize, setViewportSize] = useState(() => createSize());

  const defaultCamera2d = useMemo(
    () => buildDefaultCamera('2d', viewportSize, coordinateBounds2d, coordinateBounds3d, paperGroups),
    [coordinateBounds2d, coordinateBounds3d, paperGroups, viewportSize],
  );
  const defaultCamera3d = useMemo(
    () => buildDefaultCamera('3d', viewportSize, coordinateBounds2d, coordinateBounds3d, paperGroups),
    [coordinateBounds2d, coordinateBounds3d, paperGroups, viewportSize],
  );
  const activeCamera = cameraByMode[viewMode] || (viewMode === '2d' ? defaultCamera2d : defaultCamera3d);
  const projectedPapers = useMemo(
    () => paperGroups.flatMap((group) => group.papers.map((paper) => ({
      ...projectFullPaperToScreen({
        camera: activeCamera,
        coordinateBounds2d,
        coordinateBounds3d,
        paper,
        size: viewportSize,
        viewMode,
      }),
      color: group.color,
      topicId: group.topicId,
    }))),
    [activeCamera, coordinateBounds2d, coordinateBounds3d, paperGroups, viewportSize, viewMode],
  );
  const projectedPapersById = useMemo(
    () => Object.fromEntries(projectedPapers.map((entry) => [entry.paper.id, entry])),
    [projectedPapers],
  );
  const hoveredEntry = hoveredPaperId ? projectedPapersById[hoveredPaperId] || null : null;
  const dataKey = useMemo(
    () => [
      paperGroups.length,
      activePaperCount,
      Number(coordinateBounds2d?.minX || 0).toFixed(6),
      Number(coordinateBounds2d?.maxX || 0).toFixed(6),
      Number(coordinateBounds2d?.minY || 0).toFixed(6),
      Number(coordinateBounds2d?.maxY || 0).toFixed(6),
      Number(coordinateBounds3d?.minX || 0).toFixed(6),
      Number(coordinateBounds3d?.maxX || 0).toFixed(6),
      Number(coordinateBounds3d?.minY || 0).toFixed(6),
      Number(coordinateBounds3d?.maxY || 0).toFixed(6),
      Number(coordinateBounds3d?.minZ || 0).toFixed(6),
      Number(coordinateBounds3d?.maxZ || 0).toFixed(6),
    ].join('|'),
    [activePaperCount, coordinateBounds2d, coordinateBounds3d, paperGroups.length],
  );

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
    if (previousDataKeyRef.current !== dataKey) {
      previousDataKeyRef.current = dataKey;
      setCameraByMode({
        '2d': defaultCamera2d,
        '3d': defaultCamera3d,
      });
      setCameraInteractedByMode({
        '2d': false,
        '3d': false,
      });
      return;
    }

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
  }, [cameraInteractedByMode, dataKey, defaultCamera2d, defaultCamera3d]);

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
    if (!selectedPaper || !focusRequestToken || selectedPaper.id !== focusRequestPaperId) {
      return;
    }

    const focusSignature = [
      focusRequestToken,
      selectedPaper.id,
      viewMode,
      dataKey,
    ].join('|');

    if (previousFocusSignatureRef.current === focusSignature) {
      return;
    }

    previousFocusSignatureRef.current = focusSignature;
    setCameraInteractedByMode((currentState) => ({
      ...currentState,
      [viewMode]: true,
    }));
    setCameraByMode((currentState) => {
      const baseCamera = currentState[viewMode] || (viewMode === '2d' ? defaultCamera2d : defaultCamera3d);
      return {
        ...currentState,
        [viewMode]: buildFocusedCamera(
          viewMode,
          baseCamera,
          selectedPaper,
          coordinateBounds2d,
          coordinateBounds3d,
          viewportSize,
        ),
      };
    });
  }, [
    coordinateBounds2d,
    coordinateBounds3d,
    dataKey,
    defaultCamera2d,
    defaultCamera3d,
    focusRequestPaperId,
    focusRequestToken,
    selectedPaper,
    viewMode,
    viewportSize,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
      setCameraInteractedByMode((currentState) => ({
        ...currentState,
        [viewMode]: true,
      }));
      setCameraByMode((currentState) => {
        const nextCamera = currentState[viewMode] || (viewMode === '2d' ? defaultCamera2d : defaultCamera3d);

        return {
          ...currentState,
          [viewMode]: {
            ...nextCamera,
            scale: clamp(nextCamera.scale * zoomFactor, viewMode === '2d' ? 12 : 28, viewMode === '2d' ? 2000 : 2400),
          },
        };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [defaultCamera2d, defaultCamera3d, viewMode]);

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
      hoveredPaperId,
      projectedPapers,
      selectedPaper,
      selectedPaperColor,
      size: viewportSize,
      viewMode,
    });
  }, [
    activeCamera,
    hoveredPaperId,
    projectedPapers,
    selectedPaper,
    selectedPaperColor,
    viewMode,
    viewportSize,
  ]);

  useEffect(() => {
    if (hoveredPaperId && !projectedPapersById[hoveredPaperId]) {
      setHoveredPaperId(null);
    }
  }, [hoveredPaperId, projectedPapersById]);

  const updateCamera = (updater) => {
    setCameraInteractedByMode((currentState) => ({
      ...currentState,
      [viewMode]: true,
    }));
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
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (dragState.pointerId !== event.pointerId) {
      return false;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      dragState.moved = true;
    }

    if (!dragState.moved) {
      return false;
    }

    setHoveredPaperId(null);
    updateCamera((currentCamera) => {
      if (viewMode === '2d') {
        return {
          ...currentCamera,
          offsetX: currentCamera.offsetX + deltaX,
          offsetY: currentCamera.offsetY + deltaY,
        };
      }

      if (event.shiftKey) {
        return {
          ...currentCamera,
          offsetX: currentCamera.offsetX + deltaX,
          offsetY: currentCamera.offsetY + deltaY,
        };
      }

      return {
        ...currentCamera,
        pitch: clamp(currentCamera.pitch + (deltaY * 0.008), -1.2, 1.2),
        yaw: currentCamera.yaw + (deltaX * 0.008),
      };
    });

    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    return true;
  };

  const updateHoveredPaper = (event) => {
    if (!(event.currentTarget instanceof HTMLCanvasElement)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const hit = pickProjectedFullPaper(
      projectedPapers,
      event.clientX - rect.left,
      event.clientY - rect.top,
      viewportSize,
    );
    setHoveredPaperId(hit?.paper.id || null);
  };

  const handlePointerUp = (event) => {
    const dragState = dragStateRef.current;
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!dragState.moved && event.currentTarget instanceof HTMLCanvasElement) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pickedPaper = pickProjectedFullPaper(
        projectedPapers,
        event.clientX - rect.left,
        event.clientY - rect.top,
        viewportSize,
      );
      onSelectPaper?.(pickedPaper?.paper || null);
    }

    dragStateRef.current = {
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
        onPointerLeave={() => setHoveredPaperId(null)}
        onPointerMove={(event) => {
          const dragging = handlePointerMove(event);
          if (!dragging) {
            updateHoveredPaper(event);
          }
        }}
        onPointerUp={handlePointerUp}
        className="block h-full min-h-[720px] w-full cursor-grab overscroll-none touch-none active:cursor-grabbing"
      />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
          {viewMode === '3d' ? '3D orbit' : '2D pan'}
        </span>
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
          {activeTopicLabel}
        </span>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100">
          {activePaperCount.toLocaleString()} papers
        </span>
        {selectedPaper ? (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
            Selection active
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-[20px] border border-slate-800 bg-slate-950/85 px-4 py-3 text-sm leading-6 text-slate-300 backdrop-blur">
        Search or click to focus one paper, drag to {viewMode === '3d' ? 'orbit' : 'pan'}, wheel to zoom, {viewMode === '3d' ? 'shift-drag to pan, ' : ''}and use the explicit reset control to refit the active cohort. This surface is a title-only global-shape probe, not cluster truth.
      </div>

      {hoveredEntry ? (
        <div
          className="pointer-events-none absolute z-10 max-w-sm rounded-2xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-xl"
          style={{
            left: clamp(hoveredEntry.screenX + 14, 12, viewportSize.width - 280),
            top: clamp(hoveredEntry.screenY - 16, 12, viewportSize.height - 96),
          }}
        >
          <p className="font-medium text-white">{buildFullPaperHoverCard(hoveredEntry.paper).title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {buildFullPaperHoverCard(hoveredEntry.paper).meta}
          </p>
        </div>
      ) : null}
    </div>
  );
}

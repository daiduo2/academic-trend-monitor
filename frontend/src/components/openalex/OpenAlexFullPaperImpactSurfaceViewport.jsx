import { useEffect, useMemo, useRef, useState } from 'react';
import {
  findNearestImpactCell,
  projectImpactCellsToCanvas,
} from '../../utils/openAlexFullPaperImpactSurface';

const MIN_CANVAS_HEIGHT = 720;

function createSize(width = 0, height = 0) {
  return {
    height: Math.max(height || 0, MIN_CANVAS_HEIGHT),
    width: Math.max(width || 0, 1),
  };
}

function getImpactColor(value, maxValue) {
  const ratio = maxValue > 0 ? value / maxValue : 0;

  if (ratio >= 0.82) {
    return 'rgba(248, 113, 113, 0.92)';
  }
  if (ratio >= 0.58) {
    return 'rgba(251, 191, 36, 0.8)';
  }
  if (ratio >= 0.28) {
    return 'rgba(56, 189, 248, 0.62)';
  }
  return 'rgba(59, 130, 246, 0.16)';
}

export default function OpenAlexFullPaperImpactSurfaceViewport({
  activeRegionId = null,
  cells = [],
  coordinateBounds,
  onSelectRegion,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [size, setSize] = useState(() => createSize());

  const projectedCells = useMemo(
    () => projectImpactCellsToCanvas(cells, coordinateBounds, size),
    [cells, coordinateBounds, size],
  );
  const maxImpact = useMemo(
    () => Math.max(...projectedCells.map((cell) => Number(cell.smoothedImpact || 0)), 0),
    [projectedCells],
  );

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const syncSize = () => {
      setSize(createSize(host.clientWidth, host.clientHeight));
    };

    const observer = new ResizeObserver(syncSize);
    observer.observe(host);
    syncSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * ratio;
    canvas.height = size.height * ratio;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = '#020617';
    context.fillRect(0, 0, size.width, size.height);

    context.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    context.lineWidth = 1;

    for (let x = 0; x <= size.width; x += 96) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size.height);
      context.stroke();
    }

    for (let y = 0; y <= size.height; y += 96) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size.width, y);
      context.stroke();
    }

    projectedCells.forEach((cell) => {
      const isActive = cell.id === activeRegionId;
      const isHovered = cell.id === hoveredRegionId;
      const fillColor = getImpactColor(cell.smoothedImpact, maxImpact);

      context.beginPath();
      context.fillStyle = fillColor;
      context.ellipse(
        cell.renderX,
        cell.renderY,
        Math.max(cell.renderWidth * 0.54, 10),
        Math.max(cell.renderHeight * 0.44, 10),
        0,
        0,
        Math.PI * 2,
      );
      context.fill();

      if (isActive || isHovered) {
        context.beginPath();
        context.strokeStyle = isActive ? '#f8fafc' : '#7dd3fc';
        context.lineWidth = isActive ? 2.5 : 1.5;
        context.ellipse(
          cell.renderX,
          cell.renderY,
          Math.max(cell.renderWidth * 0.6, 12),
          Math.max(cell.renderHeight * 0.5, 12),
          0,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
    });
  }, [activeRegionId, hoveredRegionId, maxImpact, projectedCells, size]);

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextRegion = findNearestImpactCell(
      projectedCells,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );

    setHoveredRegionId(nextRegion?.id || null);
  };

  return (
    <div ref={hostRef} className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-slate-950">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const nearest = findNearestImpactCell(
            projectedCells,
            event.clientX - rect.left,
            event.clientY - rect.top,
          );

          if (nearest?.id) {
            onSelectRegion?.(nearest.id);
          }
        }}
        onMouseLeave={() => setHoveredRegionId(null)}
        onMouseMove={handlePointerMove}
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-xs leading-5 text-slate-300 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        Region heat uses smoothed mean citations over the 2D embedding layout. Click a region for ranked paper evidence.
      </div>
    </div>
  );
}

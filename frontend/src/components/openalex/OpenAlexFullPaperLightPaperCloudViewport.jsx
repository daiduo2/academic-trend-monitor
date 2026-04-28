import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildLightPaperCloudTopicRegions,
  buildProjectedLightPaperCloudPoints,
  deriveLightPaperCloudCameraState,
  pickProjectedLightPaperCloudPoint,
  rotateLightPaperCloudCamera,
  zoomLightPaperCloudCamera,
} from '../../utils/openAlexFullPaperLightPaperCloudScene';

const MIN_CANVAS_HEIGHT = 720;
const DRAG_SUPPRESSION_DISTANCE = 6;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function createSize(width = 0, height = 0) {
  return {
    height: MIN_CANVAS_HEIGHT,
    width: Math.max(width || 0, 1),
  };
}

function normalizeTopicMap(bundle) {
  if (bundle?.topicById && typeof bundle.topicById === 'object' && !Array.isArray(bundle.topicById)) {
    return bundle.topicById;
  }

  if (Array.isArray(bundle?.topics)) {
    return bundle.topics.reduce((topicMap, topic, index) => {
      const topicId = String(topic?.topicId || `topic-${index}`);
      topicMap[topicId] = {
        ...topic,
        topicDisplayName: topic?.topicDisplayName || topicId,
        topicId,
      };
      return topicMap;
    }, {});
  }

  return {};
}

function getFocusedPaperCount(topic) {
  const sampledCount = asArray(topic?.sampledPointIndices).length;

  if (sampledCount > 0) {
    return sampledCount;
  }

  return asArray(topic?.paperIndices).length;
}

function normalizeTopicIds(topicIds) {
  return Array.from(new Set(asArray(topicIds).map((topicId) => String(topicId || '').trim()).filter(Boolean)));
}

function roundedRectPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
}

function drawTopicLabels(context, topicRegions) {
  context.font = '12px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textBaseline = 'middle';

  topicRegions.filter((region) => region.showLabel).forEach((region) => {
    const label = region.topicDisplayName;
    const textWidth = Math.min(context.measureText(label).width, 210);
    const width = textWidth + 22;
    const height = 26;
    const x = region.centerX - (width / 2);
    const y = region.centerY - (height / 2);

    roundedRectPath(context, x, y, width, height, 13);
    context.globalAlpha = 0.86;
    context.fillStyle = 'rgba(2, 6, 23, 0.84)';
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = '#e2e8f0';
    context.fillText(label, x + 11, region.centerY, textWidth);
  });
}

function drawCloudScene({
  context,
  hideUnselectedTopics,
  projectedPoints,
  selectedTopicId,
  selectedTopicIds,
  size,
  topicRegions,
}) {
  const selectedTopicSet = new Set(normalizeTopicIds([
    selectedTopicId,
    ...asArray(selectedTopicIds),
  ]));
  const hasFocus = selectedTopicSet.size > 0;

  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = '#020617';
  context.fillRect(0, 0, size.width, size.height);

  const gridStep = 96;
  context.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  context.lineWidth = 1;

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

  projectedPoints
    .slice()
    .sort((left, right) => left.depth - right.depth)
    .forEach((point) => {
      const isSelected = selectedTopicSet.has(point.topicId);
      const isEmphasized = point.isFocused || point.isHovered || isSelected;

      context.beginPath();
      context.globalAlpha = isEmphasized ? 1 : (hasFocus && hideUnselectedTopics ? 0 : (hasFocus ? 0.38 : 0.86));
      context.fillStyle = point.color;
      context.arc(point.screenX, point.screenY, point.radius + (isEmphasized ? 1.2 : 0.35), 0, Math.PI * 2);
      context.fill();

      if (isEmphasized) {
        context.beginPath();
        context.globalAlpha = point.isHovered ? 0.92 : 0.64;
        context.lineWidth = point.isHovered ? 2.2 : 1.4;
        context.strokeStyle = point.isHovered ? '#f8fafc' : 'rgba(125, 211, 252, 0.9)';
        context.arc(point.screenX, point.screenY, point.radius + 3.2, 0, Math.PI * 2);
        context.stroke();
      }
    });

  drawTopicLabels(context, topicRegions);

  context.globalAlpha = 1;
}

export default function OpenAlexFullPaperLightPaperCloudViewport({
  bundle = null,
  hideUnselectedTopics = false,
  onHoverTopic,
  onSelectTopic,
  selectedTopicId = null,
  selectedTopicIds = [],
}) {
  const sampledPoints = asArray(bundle?.sampledPoints);
  const topicMap = useMemo(() => normalizeTopicMap(bundle), [bundle]);
  const focusedTopicIds = useMemo(() => normalizeTopicIds([
    selectedTopicId,
    ...asArray(selectedTopicIds),
  ]), [selectedTopicId, selectedTopicIds]);
  const selectedTopic = (selectedTopicId && topicMap[selectedTopicId]) || topicMap[focusedTopicIds[0]] || null;
  const focusedPaperCount = focusedTopicIds.length
    ? focusedTopicIds.reduce((total, topicId) => total + getFocusedPaperCount(topicMap[topicId]), 0)
    : 0;
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const pointerStateRef = useRef({
    active: false,
    downX: 0,
    downY: 0,
    dragged: false,
    lastX: 0,
    lastY: 0,
    suppressClick: false,
  });
  const [viewportSize, setViewportSize] = useState(() => createSize());
  const [hoverTopicId, setHoverTopicId] = useState(null);
  const defaultCameraState = useMemo(() => deriveLightPaperCloudCameraState(bundle), [bundle]);
  const [cameraState, setCameraState] = useState(defaultCameraState);
  const projectedPoints = useMemo(
    () => buildProjectedLightPaperCloudPoints(
      bundle,
      cameraState,
      viewportSize,
      {
        focusedTopicIds,
        hoveredTopicId: hoverTopicId,
      },
    ),
    [bundle, cameraState, focusedTopicIds, hoverTopicId, viewportSize],
  );
  const topicRegions = useMemo(
    () => buildLightPaperCloudTopicRegions(projectedPoints, bundle, {
      maxLabels: viewportSize.width >= 1100 ? 14 : 10,
      minLabelDistance: viewportSize.width >= 1100 ? 92 : 78,
    }),
    [bundle, projectedPoints, viewportSize.width],
  );
  const hoveredTopic = hoverTopicId ? topicMap[hoverTopicId] || null : null;
  const displayTopic = hoveredTopic || selectedTopic || null;
  const displayTopicCount = getFocusedPaperCount(displayTopic);
  const handleViewportWheel = (event) => {
    event.preventDefault();
    setCameraState((currentCamera) => zoomLightPaperCloudCamera(currentCamera, event.deltaY));
  };

  useEffect(() => {
    setCameraState(defaultCameraState);
  }, [defaultCameraState]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const syncSize = () => {
      setViewportSize(createSize(host.clientWidth || 0, host.clientHeight || MIN_CANVAS_HEIGHT));
    };

    const observer = new ResizeObserver(syncSize);

    observer.observe(host);
    syncSize();

    return () => {
      observer.disconnect();
    };
  }, []);

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
    drawCloudScene({
      context,
      hideUnselectedTopics,
      projectedPoints,
      selectedTopicId,
      selectedTopicIds: focusedTopicIds,
      size: viewportSize,
      topicRegions,
    });
  }, [focusedTopicIds, hideUnselectedTopics, projectedPoints, selectedTopicId, topicRegions, viewportSize]);

  useEffect(() => {
    if (hoverTopicId && !topicMap[hoverTopicId]) {
      setHoverTopicId(null);
      onHoverTopic?.(null);
    }
  }, [hoverTopicId, onHoverTopic, topicMap]);

  const updateHoveredTopicFromPoint = (pickedPoint) => {
    const nextTopic = pickedPoint?.topicId ? topicMap[pickedPoint.topicId] || null : null;
    const nextTopicId = nextTopic?.topicId || null;

    setHoverTopicId(nextTopicId);
    onHoverTopic?.(nextTopic);
  };

  return (
    <section
      aria-label="文献点云视窗"
      data-camera-azimuth={cameraState?.azimuth ?? ''}
      data-camera-elevation={cameraState?.elevation ?? ''}
      data-camera-max-radius={cameraState?.maxRadius ?? ''}
      data-camera-min-radius={cameraState?.minRadius ?? ''}
      data-camera-radius={cameraState?.radius ?? ''}
      data-atlas-region-count={topicRegions.length}
      data-hover-topic-id={hoverTopicId || ''}
      data-selected-topic-count={focusedTopicIds.length}
      className="rounded-[28px] border border-slate-800 bg-slate-950/80 p-4 text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.4)]"
      onWheel={handleViewportWheel}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">宏观视图</p>
          <h2 className="mt-2 text-lg font-semibold text-white">文献点云</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            用高区分度主题颜色和质心标签展示抽样论文空间，不再叠加雾状密度层。
          </p>
        </div>
        <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
          <div
            aria-label={`抽样论文：${sampledPoints.length}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">抽样论文</p>
            <p className="mt-2 text-lg font-semibold text-white">{sampledPoints.length}</p>
          </div>
          <div
            aria-label={`聚焦论文：${focusedPaperCount}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">聚焦论文</p>
            <p className="mt-2 text-lg font-semibold text-white">{focusedPaperCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div
          ref={hostRef}
          className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_rgba(2,6,23,0.08)_42%,_rgba(2,6,23,0.96)_100%)]"
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="block h-[720px] w-full"
            onClick={(event) => {
              if (pointerStateRef.current.suppressClick) {
                pointerStateRef.current.suppressClick = false;
                return;
              }

              const rect = event.currentTarget.getBoundingClientRect();
              const pickedPoint = pickProjectedLightPaperCloudPoint(
                projectedPoints,
                event.clientX - rect.left,
                event.clientY - rect.top,
                viewportSize,
              );

              if (!pickedPoint?.topicId) {
                return;
              }

              const topic = topicMap[pickedPoint.topicId] || null;

              if (topic) {
                onSelectTopic?.(topic);
              }
            }}
            onMouseLeave={() => updateHoveredTopicFromPoint(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const pickedPoint = pickProjectedLightPaperCloudPoint(
                projectedPoints,
                event.clientX - rect.left,
                event.clientY - rect.top,
                viewportSize,
              );

              updateHoveredTopicFromPoint(pickedPoint);
            }}
            onPointerDown={(event) => {
              pointerStateRef.current.active = true;
              pointerStateRef.current.downX = event.clientX;
              pointerStateRef.current.downY = event.clientY;
              pointerStateRef.current.dragged = false;
              pointerStateRef.current.lastX = event.clientX;
              pointerStateRef.current.lastY = event.clientY;
              pointerStateRef.current.suppressClick = false;
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!pointerStateRef.current.active) {
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

              setCameraState((currentCamera) => rotateLightPaperCloudCamera(currentCamera, { deltaX, deltaY }));
            }}
            onPointerUp={(event) => {
              pointerStateRef.current.active = false;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={(event) => {
              pointerStateRef.current.active = false;
              pointerStateRef.current.dragged = false;
              pointerStateRef.current.suppressClick = false;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
          />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-slate-700/70 bg-slate-950/85 px-4 py-3 backdrop-blur">
            <p className="text-xs font-medium text-slate-200">
              {displayTopic?.topicDisplayName || '未选择主题'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {displayTopic
                ? `${displayTopicCount} 个聚焦抽样点 · ${displayTopic.subfieldDisplayName || '当前子领域'}。`
                : '悬停或选择一个论文邻域以突出主题，同时保留全局点云的颜色结构。'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

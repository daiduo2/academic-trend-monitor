import { quadtree } from 'd3-quadtree';
import { Application, Graphics } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OPENALEX_EMBEDDINGS_WORLD_LAYOUT,
  projectOpenAlexEmbeddingPoint,
} from '../../utils/openAlexEmbeddingsBundle';

const GRID_STEP = 80;
const PICK_RADIUS_PX = 18;
const FOCUS_WORLD_WIDTH = 420;
const FOCUS_WORLD_HEIGHT = 280;
const FIT_WORLD_MARGIN = 84;
const MAX_SCALE = 7.5;
const MIN_SCALE = 0.55;
const FALLBACK_POINT_COLOR = '#cbd5e1';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToNumber(color) {
  const normalized = String(color || FALLBACK_POINT_COLOR).replace('#', '');
  return Number.parseInt(normalized, 16);
}

function buildProjectedTopics(topics, coordinateBounds) {
  return topics.map((topic) => {
    const point = projectOpenAlexEmbeddingPoint(topic, coordinateBounds, OPENALEX_EMBEDDINGS_WORLD_LAYOUT);
    return {
      topic,
      worldX: point.x,
      worldY: point.y,
    };
  });
}

function computeProjectedBounds(projectedTopics) {
  if (!projectedTopics.length) {
    const { width, height, padding } = OPENALEX_EMBEDDINGS_WORLD_LAYOUT;
    return {
      minX: padding,
      maxX: width - padding,
      minY: padding,
      maxY: height - padding,
    };
  }

  return projectedTopics.reduce((bounds, entry) => ({
    minX: Math.min(bounds.minX, entry.worldX),
    maxX: Math.max(bounds.maxX, entry.worldX),
    minY: Math.min(bounds.minY, entry.worldY),
    maxY: Math.max(bounds.maxY, entry.worldY),
  }), {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function createScreenBounds(screenWidth, screenHeight) {
  return {
    width: Math.max(screenWidth || 0, 1),
    height: Math.max(screenHeight || 0, 1),
  };
}

function getPickRadiusInWorld(viewport, screenX, screenY) {
  const center = viewport.toWorld(screenX, screenY);
  const edge = viewport.toWorld(screenX + PICK_RADIUS_PX, screenY);
  return {
    center,
    radius: Math.max(Math.abs(edge.x - center.x), 1),
  };
}

function fitViewportToTopics(viewport, projectedTopics, animate = true) {
  if (!viewport || !projectedTopics.length) {
    return;
  }

  const bounds = computeProjectedBounds(projectedTopics);
  const width = clamp(
    (bounds.maxX - bounds.minX) + (FIT_WORLD_MARGIN * 2),
    220,
    OPENALEX_EMBEDDINGS_WORLD_LAYOUT.width,
  );
  const height = clamp(
    (bounds.maxY - bounds.minY) + (FIT_WORLD_MARGIN * 2),
    220,
    OPENALEX_EMBEDDINGS_WORLD_LAYOUT.height,
  );
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  if (animate) {
    viewport.animate({
      position: center,
      width,
      height,
      ease: 'easeInOutSine',
      removeOnInterrupt: true,
      time: 480,
    });
    return;
  }

  viewport.fit(false, width, height);
  viewport.moveCenter(center);
}

function focusViewportOnTopic(viewport, projectedTopic) {
  if (!viewport || !projectedTopic) {
    return;
  }

  viewport.animate({
    position: {
      x: projectedTopic.worldX,
      y: projectedTopic.worldY,
    },
    width: projectedTopic.topic.isTrunk ? FOCUS_WORLD_WIDTH * 1.15 : FOCUS_WORLD_WIDTH,
    height: projectedTopic.topic.isTrunk ? FOCUS_WORLD_HEIGHT * 1.15 : FOCUS_WORLD_HEIGHT,
    ease: 'easeInOutSine',
    removeOnInterrupt: true,
    time: 420,
  });
}

function buildRenderOrder(projectedTopics, selectedTopicId, hoveredTopicId, searchMatchIds, neighborIds) {
  return [...projectedTopics].sort((left, right) => {
    const leftPriority = left.topic.id === selectedTopicId
      ? 5
      : left.topic.id === hoveredTopicId
        ? 4
        : neighborIds.has(left.topic.id)
          ? 3
          : searchMatchIds.has(left.topic.id)
            ? 2
            : left.topic.isTrunk
              ? 1
              : 0;
    const rightPriority = right.topic.id === selectedTopicId
      ? 5
      : right.topic.id === hoveredTopicId
        ? 4
        : neighborIds.has(right.topic.id)
          ? 3
          : searchMatchIds.has(right.topic.id)
            ? 2
            : right.topic.isTrunk
              ? 1
              : 0;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.topic.label.localeCompare(right.topic.label);
  });
}

function drawGridLayer(graphics) {
  const { width, height } = OPENALEX_EMBEDDINGS_WORLD_LAYOUT;

  graphics.clear();
  graphics.beginFill(0x020617, 1);
  graphics.drawRect(0, 0, width, height);
  graphics.endFill();

  graphics.lineStyle(1, 0xffffff, 0.05);
  for (let x = 0; x <= width; x += GRID_STEP) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, height);
  }

  for (let y = 0; y <= height; y += GRID_STEP) {
    graphics.moveTo(0, y);
    graphics.lineTo(width, y);
  }
}

function drawPointLayers({
  projectedTopics,
  pointLayer,
  emphasisLayer,
  fieldColorMap,
  selectedTopicId,
  hoveredTopicId,
  searchMatchIds,
  neighborIds,
}) {
  pointLayer.clear();
  emphasisLayer.clear();

  const orderedTopics = buildRenderOrder(
    projectedTopics,
    selectedTopicId,
    hoveredTopicId,
    searchMatchIds,
    neighborIds,
  );

  orderedTopics.forEach(({ topic, worldX, worldY }) => {
    const isSelected = topic.id === selectedTopicId;
    const isHovered = topic.id === hoveredTopicId;
    const isNeighbor = neighborIds.has(topic.id);
    const isMatch = searchMatchIds.has(topic.id);
    const pointColor = hexToNumber(fieldColorMap[topic.fieldLabel] || FALLBACK_POINT_COLOR);

    let opacity = topic.isTrunk ? 0.7 : 0.3;
    if (searchMatchIds.size) {
      opacity = isMatch ? 0.96 : topic.isTrunk ? 0.16 : 0.08;
    }
    if (isNeighbor) {
      opacity = 0.88;
    }
    if (isHovered) {
      opacity = 0.96;
    }
    if (isSelected) {
      opacity = 1;
    }

    const radius = isSelected ? 7.6 : isHovered ? 6.4 : topic.isTrunk ? 4.8 : 3.2;

    pointLayer.beginFill(pointColor, opacity);
    pointLayer.drawCircle(worldX, worldY, radius);
    pointLayer.endFill();

    if (isMatch || isNeighbor || isHovered || isSelected) {
      emphasisLayer.lineStyle(isSelected ? 2.4 : 1.6, isSelected ? 0xf8fafc : 0x7dd3fc, isSelected ? 0.95 : 0.72);
      emphasisLayer.drawCircle(worldX, worldY, radius + (isSelected ? 4.4 : 3.2));
      emphasisLayer.lineStyle(0);
    }

    if (isSelected) {
      emphasisLayer.beginFill(0xffffff, 0.12);
      emphasisLayer.drawCircle(worldX, worldY, radius + 10);
      emphasisLayer.endFill();
    }
  });
}

export default function OpenAlexEmbeddingsViewport({
  topics,
  coordinateBounds,
  fieldColorMap,
  stats,
  selectedTopicId,
  selectedEdgeId,
  searchMatchIds,
  neighborIds,
  labelTopicIds,
  resetCameraToken,
  localOverlay,
  onSelectTopic,
  onSelectEdge,
}) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const viewportRef = useRef(null);
  const layersRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const animationFrameRef = useRef(null);
  const projectedTopicsRef = useRef([]);
  const quadtreeRef = useRef(null);
  const previousSelectedTopicIdRef = useRef(null);
  const previousTopicsKeyRef = useRef(null);
  const previousResetTokenRef = useRef(resetCameraToken);
  const [hoverState, setHoverState] = useState({
    topicId: null,
    screenX: 0,
    screenY: 0,
  });
  const [viewportFrame, setViewportFrame] = useState(0);
  const [screenBounds, setScreenBounds] = useState(() => createScreenBounds(0, 0));
  const [rendererReady, setRendererReady] = useState(false);
  const [rendererError, setRendererError] = useState(null);

  const projectedTopics = useMemo(
    () => buildProjectedTopics(topics, coordinateBounds),
    [coordinateBounds, topics],
  );
  const projectedTopicsById = useMemo(
    () => Object.fromEntries(projectedTopics.map((entry) => [entry.topic.id, entry])),
    [projectedTopics],
  );
  const hoveredTopic = hoverState.topicId ? projectedTopicsById[hoverState.topicId]?.topic || null : null;
  const topicsKey = useMemo(
    () => topics.map((topic) => topic.id).join('|'),
    [topics],
  );

  const scheduleViewportFrame = () => {
    if (animationFrameRef.current) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setViewportFrame((frame) => frame + 1);
    });
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let destroyed = false;

    try {
      const app = new Application({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        height: host.clientHeight || 620,
        powerPreference: 'high-performance',
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        width: host.clientWidth || 960,
      });

      app.view.className = 'block h-full w-full';
      host.appendChild(app.view);

      const viewport = new Viewport({
        events: app.renderer.events,
        passiveWheel: false,
        screenHeight: host.clientHeight || 620,
        screenWidth: host.clientWidth || 960,
        stopPropagation: true,
        worldHeight: OPENALEX_EMBEDDINGS_WORLD_LAYOUT.height,
        worldWidth: OPENALEX_EMBEDDINGS_WORLD_LAYOUT.width,
      });

      viewport.drag();
      viewport.wheel({
        percent: 0.16,
        smooth: 6,
      });
      viewport.decelerate();
      viewport.clamp({
        direction: 'all',
        underflow: 'center',
      });
      viewport.clampZoom({
        maxScale: MAX_SCALE,
        minScale: MIN_SCALE,
      });

      app.stage.addChild(viewport);

      const gridLayer = new Graphics();
      const pointLayer = new Graphics();
      const emphasisLayer = new Graphics();
      viewport.addChild(gridLayer);
      viewport.addChild(pointLayer);
      viewport.addChild(emphasisLayer);
      drawGridLayer(gridLayer);

      appRef.current = app;
      viewportRef.current = viewport;
      layersRef.current = {
        emphasisLayer,
        pointLayer,
      };

      const syncScreenBounds = () => {
        const width = Math.max(host.clientWidth || 0, 1);
        const height = Math.max(host.clientHeight || 0, 1);

        app.renderer.resize(width, height);
        viewport.resize(
          width,
          height,
          OPENALEX_EMBEDDINGS_WORLD_LAYOUT.width,
          OPENALEX_EMBEDDINGS_WORLD_LAYOUT.height,
        );
        setScreenBounds(createScreenBounds(width, height));
        scheduleViewportFrame();
      };

      const handleClicked = ({ screen }) => {
        const worldPick = getPickRadiusInWorld(viewport, screen.x, screen.y);
        const hit = quadtreeRef.current?.find(worldPick.center.x, worldPick.center.y, worldPick.radius) || null;
        onSelectTopic(hit ? hit.topic.id : null);
      };

      const updateHoverFromPointer = (event) => {
        const canvasRect = app.view.getBoundingClientRect();
        const screenX = event.clientX - canvasRect.left;
        const screenY = event.clientY - canvasRect.top;
        const worldPick = getPickRadiusInWorld(viewport, screenX, screenY);
        const hit = quadtreeRef.current?.find(worldPick.center.x, worldPick.center.y, worldPick.radius) || null;

        setHoverState((currentState) => {
          const nextTopicId = hit?.topic.id || null;
          if (
            currentState.topicId === nextTopicId
            && Math.abs(currentState.screenX - screenX) < 2
            && Math.abs(currentState.screenY - screenY) < 2
          ) {
            return currentState;
          }

          return {
            topicId: nextTopicId,
            screenX,
            screenY,
          };
        });
      };

      const clearHover = () => {
        setHoverState((currentState) => (
          currentState.topicId
            ? {
              topicId: null,
              screenX: 0,
              screenY: 0,
            }
            : currentState
        ));
      };

      viewport.on('clicked', handleClicked);
      viewport.on('moved', scheduleViewportFrame);
      viewport.on('zoomed', scheduleViewportFrame);
      viewport.on('moved-end', scheduleViewportFrame);
      viewport.on('zoomed-end', scheduleViewportFrame);
      app.view.addEventListener('pointermove', updateHoverFromPointer);
      app.view.addEventListener('pointerleave', clearHover);

      const resizeObserver = new ResizeObserver(syncScreenBounds);
      resizeObserver.observe(host);
      resizeObserverRef.current = resizeObserver;

      syncScreenBounds();
      setRendererReady(true);
      setRendererError(null);

      return () => {
        viewport.off('clicked', handleClicked);
        viewport.off('moved', scheduleViewportFrame);
        viewport.off('zoomed', scheduleViewportFrame);
        viewport.off('moved-end', scheduleViewportFrame);
        viewport.off('zoomed-end', scheduleViewportFrame);
        app.view.removeEventListener('pointermove', updateHoverFromPointer);
        app.view.removeEventListener('pointerleave', clearHover);
        resizeObserver.disconnect();
        resizeObserverRef.current = null;
        app.destroy(true, {
          children: true,
        });
      };
    } catch (error) {
      if (!destroyed) {
        setRendererReady(false);
        setRendererError(error instanceof Error ? error : new Error(String(error)));
      }
      return undefined;
    }
  }, [onSelectTopic]);

  useEffect(() => {
    projectedTopicsRef.current = projectedTopics;
    quadtreeRef.current = quadtree()
      .x((entry) => entry.worldX)
      .y((entry) => entry.worldY)
      .addAll(projectedTopics);
  }, [projectedTopics]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) {
      return;
    }

    drawPointLayers({
      emphasisLayer: layers.emphasisLayer,
      fieldColorMap,
      hoveredTopicId: hoverState.topicId,
      neighborIds,
      pointLayer: layers.pointLayer,
      projectedTopics,
      searchMatchIds,
      selectedTopicId,
    });
  }, [
    fieldColorMap,
    hoverState.topicId,
    neighborIds,
    projectedTopics,
    searchMatchIds,
    selectedTopicId,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !projectedTopics.length) {
      return;
    }

    if (resetCameraToken !== previousResetTokenRef.current) {
      fitViewportToTopics(viewport, projectedTopics, true);
      previousResetTokenRef.current = resetCameraToken;
      return;
    }

    if (selectedTopicId && projectedTopicsById[selectedTopicId]) {
      if (previousSelectedTopicIdRef.current !== selectedTopicId) {
        focusViewportOnTopic(viewport, projectedTopicsById[selectedTopicId]);
        previousSelectedTopicIdRef.current = selectedTopicId;
      }
      return;
    }

    previousSelectedTopicIdRef.current = null;

    if (previousTopicsKeyRef.current !== topicsKey) {
      fitViewportToTopics(
        viewport,
        projectedTopics,
        Boolean(previousTopicsKeyRef.current),
      );
      previousTopicsKeyRef.current = topicsKey;
    }
  }, [projectedTopics, projectedTopicsById, resetCameraToken, selectedTopicId, topicsKey]);

  const overlayLabels = useMemo(() => {
    const viewport = viewportRef.current;
    if (!viewport || !rendererReady) {
      return [];
    }

    return [...labelTopicIds]
      .map((topicId) => {
        const projectedTopic = projectedTopicsById[topicId];
        if (!projectedTopic) {
          return null;
        }

        const screenPoint = viewport.toScreen(projectedTopic.worldX, projectedTopic.worldY);
        const margin = 28;
        if (
          screenPoint.x < -margin
          || screenPoint.y < -margin
          || screenPoint.x > screenBounds.width + margin
          || screenPoint.y > screenBounds.height + margin
        ) {
          return null;
        }

        return {
          screenPoint,
          topic: projectedTopic.topic,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.topic.id === selectedTopicId) {
          return 1;
        }
        if (right.topic.id === selectedTopicId) {
          return -1;
        }
        if (searchMatchIds.has(left.topic.id) !== searchMatchIds.has(right.topic.id)) {
          return searchMatchIds.has(left.topic.id) ? 1 : -1;
        }
        if (left.topic.isTrunk !== right.topic.isTrunk) {
          return left.topic.isTrunk ? 1 : -1;
        }
        return right.screenPoint.y - left.screenPoint.y;
      });
  }, [
    labelTopicIds,
    localOverlay,
    projectedTopicsById,
    rendererReady,
    screenBounds.height,
    screenBounds.width,
    searchMatchIds,
    selectedTopicId,
    viewportFrame,
  ]);

  const overlaySegments = useMemo(() => {
    const viewport = viewportRef.current;
    if (!viewport || !rendererReady || !localOverlay?.visible) {
      return {
        attachments: [],
        backbone: [],
        bridge: [],
      };
    }

    const buildSegments = (edges) => edges
      .map((edge) => {
        const sourceTopic = projectedTopicsById[edge.source];
        const targetTopic = projectedTopicsById[edge.target];
        if (!sourceTopic || !targetTopic) {
          return null;
        }

        const sourcePoint = viewport.toScreen(sourceTopic.worldX, sourceTopic.worldY);
        const targetPoint = viewport.toScreen(targetTopic.worldX, targetTopic.worldY);

        return {
          edge,
          sourcePoint,
          targetPoint,
        };
      })
      .filter(Boolean);

    return {
      attachments: buildSegments(localOverlay.leafAttachments || []),
      backbone: buildSegments(localOverlay.backboneEdges || []),
      bridge: buildSegments(localOverlay.bridgeEdges || []),
    };
  }, [localOverlay, projectedTopicsById, rendererReady, viewportFrame]);

  const resetCamera = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    fitViewportToTopics(viewport, projectedTopicsRef.current, true);
  };

  const focusSelection = () => {
    const viewport = viewportRef.current;
    if (!viewport || !selectedTopicId) {
      return;
    }
    focusViewportOnTopic(viewport, projectedTopicsById[selectedTopicId]);
  };

  if (!topics.length) {
    return (
      <section className="rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex min-h-[620px] items-center justify-center rounded-[24px] border border-dashed border-slate-700 bg-slate-900/70">
          <div className="text-center max-w-md">
            <p className="text-sm font-semibold text-white">No topics are visible under the current filter.</p>
            <p className="mt-2 text-sm text-slate-400">
              Reset the field filter or clear the current search to reopen the full 2D explorer surface.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.3)]">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-950">
                Dominant viewport
              </span>
              <span className="inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100">
                Point-first
              </span>
              <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100">
                Local overlay only
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">PixiJS topic viewport</h2>
              <p className="text-sm leading-6 text-slate-300">
                GPU-backed 2D navigation over math-primary works. First load samples sparse labels from the Mathematics
                trunk of {stats?.trunk_topic_count || 0} topics, while the {stats?.leaf_topic_count || 0} cross-field
                leaves stay as local context on those same works instead of opening a global backbone or bridge mesh.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              {topics.length} visible topics
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              {searchMatchIds.size} search hits
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              Drag to pan. Wheel to zoom.
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs leading-5 text-slate-400">
            The center stays a large-space navigator first. Topic selection opens the right panel and only then reveals
            local candidate overlays; cross-field leaves do not widen the corpus beyond the accepted math-primary slice.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={focusSelection}
              disabled={!selectedTopicId}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Focus selection
            </button>
            <button
              type="button"
              onClick={resetCamera}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Reset camera
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/95">
          <div
            ref={hostRef}
            className="relative h-[520px] w-full md:h-[620px] xl:h-[640px] 2xl:h-[680px]"
          />

          {rendererError && (
            <div className="absolute inset-x-4 top-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Pixi renderer failed to initialize: {rendererError.message}
            </div>
          )}

          {rendererReady && (
            <>
              {localOverlay?.visible && (
                <svg className="absolute inset-0 h-full w-full" aria-hidden="true" pointerEvents="none">
                  {overlaySegments.attachments.map(({ edge, sourcePoint, targetPoint }) => (
                    <line
                      key={edge.id}
                      x1={sourcePoint.x}
                      y1={sourcePoint.y}
                      x2={targetPoint.x}
                      y2={targetPoint.y}
                      stroke="#10b981"
                      strokeOpacity="0.36"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  ))}

                  {overlaySegments.backbone.map(({ edge, sourcePoint, targetPoint }) => (
                    <line
                      key={edge.id}
                      x1={sourcePoint.x}
                      y1={sourcePoint.y}
                      x2={targetPoint.x}
                      y2={targetPoint.y}
                      stroke={selectedEdgeId === edge.id ? '#f8fafc' : '#7dd3fc'}
                      strokeOpacity={selectedEdgeId === edge.id ? '0.96' : '0.64'}
                      strokeWidth={selectedEdgeId === edge.id ? '2.8' : '1.8'}
                      strokeLinecap="round"
                      pointerEvents="stroke"
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectEdge(edge.id);
                      }}
                    />
                  ))}

                  {overlaySegments.bridge.map(({ edge, sourcePoint, targetPoint }) => (
                    <line
                      key={edge.id}
                      x1={sourcePoint.x}
                      y1={sourcePoint.y}
                      x2={targetPoint.x}
                      y2={targetPoint.y}
                      stroke={selectedEdgeId === edge.id ? '#facc15' : '#f59e0b'}
                      strokeOpacity={selectedEdgeId === edge.id ? '0.92' : '0.54'}
                      strokeWidth={selectedEdgeId === edge.id ? '2.4' : '1.6'}
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      pointerEvents="stroke"
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectEdge(edge.id);
                      }}
                    />
                  ))}
                </svg>
              )}

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {overlayLabels.map(({ topic, screenPoint }) => {
                  const isSelected = topic.id === selectedTopicId;
                  const isMatch = searchMatchIds.has(topic.id);

                  return (
                    <div
                      key={`label-${topic.id}`}
                      className={`absolute whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium shadow-sm ${
                        isSelected
                          ? 'border-sky-300 bg-sky-50/95 text-sky-950'
                          : isMatch
                            ? 'border-white/10 bg-slate-950/85 text-slate-50'
                            : 'border-white/10 bg-slate-900/80 text-slate-100'
                      }`}
                      style={{
                        left: `${screenPoint.x + 10}px`,
                        top: `${screenPoint.y - 12}px`,
                        transform: 'translate(0, -100%)',
                      }}
                    >
                      {topic.label}
                    </div>
                  );
                })}

                {hoveredTopic && (
                  <div
                    className="absolute max-w-[240px] rounded-lg border border-slate-200 bg-white/96 px-3 py-2 shadow-lg backdrop-blur"
                    style={{
                      left: `${clamp(hoverState.screenX + 14, 12, Math.max(screenBounds.width - 252, 12))}px`,
                      top: `${clamp(hoverState.screenY + 14, 12, Math.max(screenBounds.height - 96, 12))}px`,
                    }}
                  >
                    <p className="text-sm font-semibold text-slate-900">{hoveredTopic.label}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {hoveredTopic.fieldLabel} / {hoveredTopic.subfieldLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {hoveredTopic.isTrunk ? 'Trunk topic' : 'Leaf topic'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

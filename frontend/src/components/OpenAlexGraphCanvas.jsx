import { useMemo } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 760;
const SUBFIELD_PALETTE = [
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#c026d3',
  '#7c3aed',
  '#4f46e5',
  '#0f766e',
  '#475569',
];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSubfieldKey(node) {
  return (
    node?.taxonomy?.subfield?.id
    || node?.taxonomy?.subfield?.label
    || node?.taxonomy?.field?.id
    || node?.taxonomy?.field?.label
    || node?.id
  );
}

function getNodeColor(node) {
  const key = String(getSubfieldKey(node));
  return SUBFIELD_PALETTE[hashString(key) % SUBFIELD_PALETTE.length];
}

function getTrunkNodeRadius(node) {
  const primaryWorkCount = node?.metrics?.primary_work_count || 0;
  return 7 + Math.min(18, Math.log10(primaryWorkCount + 1) * 4.5);
}

function getLeafNodeRadius(node) {
  const leafWorkCount = node?.metrics?.leaf_work_count || 0;
  return 4 + Math.min(7, Math.log10(leafWorkCount + 1) * 2.2);
}

function buildClusterCenters(nodes) {
  const subfieldKeys = [...new Set(nodes.map((node) => getSubfieldKey(node)))];
  const outerRadius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.29;
  const centers = {};

  if (subfieldKeys.length <= 1) {
    centers[subfieldKeys[0] || 'default'] = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
    };
    return centers;
  }

  subfieldKeys.forEach((key, index) => {
    const angle = (index / subfieldKeys.length) * Math.PI * 2;
    centers[key] = {
      x: CANVAS_WIDTH / 2 + Math.cos(angle) * outerRadius,
      y: CANVAS_HEIGHT / 2 + Math.sin(angle) * outerRadius,
    };
  });

  return centers;
}

function buildTrunkLayout(trunkNodes, visibleEdges) {
  const clusterCenters = buildClusterCenters(trunkNodes);
  const groupedNodeCounts = {};

  const layoutNodes = trunkNodes.map((node) => {
    const subfieldKey = getSubfieldKey(node);
    const subfieldIndex = groupedNodeCounts[subfieldKey] || 0;
    groupedNodeCounts[subfieldKey] = subfieldIndex + 1;
    const clusterCenter = clusterCenters[subfieldKey];
    const localAngle = (subfieldIndex % 10) * (Math.PI / 5);
    const localRadius = 18 + Math.floor(subfieldIndex / 10) * 18;

    return {
      ...node,
      x: clusterCenter.x + Math.cos(localAngle) * localRadius,
      y: clusterCenter.y + Math.sin(localAngle) * localRadius,
    };
  });

  const layoutEdges = visibleEdges.map((edge) => ({
    ...edge,
    source: edge.source,
    target: edge.target,
  }));

  const simulation = forceSimulation(layoutNodes)
    .force(
      'link',
      forceLink(layoutEdges)
        .id((node) => node.id)
        .distance((edge) => (edge.kind === 'BRIDGE_QUEUE_EDGE' ? 84 : 70))
        .strength((edge) => (edge.kind === 'BRIDGE_QUEUE_EDGE' ? 0.08 : 0.16)),
    )
    .force('charge', forceManyBody().strength(-86))
    .force('center', forceCenter(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2))
    .force('x', forceX((node) => clusterCenters[getSubfieldKey(node)].x).strength(0.16))
    .force('y', forceY((node) => clusterCenters[getSubfieldKey(node)].y).strength(0.16))
    .force('collision', forceCollide().radius((node) => getTrunkNodeRadius(node) + 10))
    .stop();

  for (let tick = 0; tick < 220; tick += 1) {
    simulation.tick();
  }

  return Object.fromEntries(layoutNodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

function buildLeafLayout(focusLeaves, trunkPositions) {
  const groupedAttachments = {};
  const leafPositions = {};

  focusLeaves.attachments.forEach((attachment) => {
    if (!groupedAttachments[attachment.focusTrunkId]) {
      groupedAttachments[attachment.focusTrunkId] = [];
    }
    groupedAttachments[attachment.focusTrunkId].push(attachment);
  });

  Object.entries(groupedAttachments).forEach(([trunkId, attachments], trunkIndex) => {
    const trunkPosition = trunkPositions[trunkId];
    if (!trunkPosition) {
      return;
    }

    attachments.forEach((attachment, index) => {
      if (leafPositions[attachment.source]) {
        return;
      }

      const angle = ((index % 8) / Math.max(Math.min(attachments.length, 8), 1)) * Math.PI * 2 + trunkIndex * 0.35;
      const radius = 54 + Math.floor(index / 8) * 22;
      leafPositions[attachment.source] = {
        x: trunkPosition.x + Math.cos(angle) * radius,
        y: trunkPosition.y + Math.sin(angle) * radius,
      };
    });
  });

  return leafPositions;
}

function createLabelSet({
  trunkNodes,
  visibleBackboneEdges,
  visibleBridgeEdges,
  focusLeaves,
  labelMode,
  selectedNodeId,
  selectedEdgeId,
}) {
  if (labelMode === 'off') {
    return new Set();
  }

  if (labelMode === 'all') {
    return new Set([
      ...trunkNodes.map((node) => node.id),
      ...focusLeaves.leafNodes.map((node) => node.id),
    ]);
  }

  const labelIds = new Set();

  if (selectedNodeId) {
    labelIds.add(selectedNodeId);
  }

  if (selectedEdgeId) {
    const selectedEdge = [...visibleBackboneEdges, ...visibleBridgeEdges].find((edge) => edge.id === selectedEdgeId);
    if (selectedEdge) {
      labelIds.add(selectedEdge.source);
      labelIds.add(selectedEdge.target);
    }
  }

  if (!selectedNodeId && !selectedEdgeId) {
    [...trunkNodes]
      .sort((left, right) => (right.backboneDegree || 0) - (left.backboneDegree || 0))
      .slice(0, 12)
      .forEach((node) => labelIds.add(node.id));
  }

  visibleBackboneEdges.forEach((edge) => {
    if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
      labelIds.add(edge.source);
      labelIds.add(edge.target);
    }
  });

  visibleBridgeEdges.forEach((edge) => {
    if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
      labelIds.add(edge.source);
      labelIds.add(edge.target);
    }
  });

  focusLeaves.leafNodes.forEach((node) => labelIds.add(node.id));
  return labelIds;
}

function EdgeLine({
  edge,
  positions,
  selected,
  onSelectEdge,
  stroke,
  dashArray = '',
  opacity = 1,
  strokeWidth = 1.2,
}) {
  const sourcePosition = positions[edge.source];
  const targetPosition = positions[edge.target];

  if (!sourcePosition || !targetPosition) {
    return null;
  }

  return (
    <line
      x1={sourcePosition.x}
      y1={sourcePosition.y}
      x2={targetPosition.x}
      y2={targetPosition.y}
      stroke={stroke}
      strokeDasharray={dashArray}
      strokeOpacity={selected ? 0.95 : opacity}
      strokeWidth={selected ? strokeWidth + 1.6 : strokeWidth}
      strokeLinecap="round"
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onSelectEdge(edge.id);
      }}
    >
      <title>{`${edge.labels?.source || edge.source} -> ${edge.labels?.target || edge.target}`}</title>
    </line>
  );
}

export function OpenAlexGraphCanvas({
  graph,
  showBridgeQueue,
  labelMode,
  selectedNodeId,
  selectedEdgeId,
  focusLeaves,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
}) {
  const visibleBridgeEdges = showBridgeQueue ? graph.bridgeQueueEdges : [];

  const trunkPositions = useMemo(
    () => buildTrunkLayout(graph.trunkNodes, [...graph.backboneEdges, ...visibleBridgeEdges]),
    [graph.backboneEdges, graph.trunkNodes, visibleBridgeEdges],
  );

  const leafPositions = useMemo(
    () => buildLeafLayout(focusLeaves, trunkPositions),
    [focusLeaves, trunkPositions],
  );

  const positions = useMemo(
    () => ({ ...trunkPositions, ...leafPositions }),
    [trunkPositions, leafPositions],
  );

  const labelIds = useMemo(
    () => createLabelSet({
      trunkNodes: graph.trunkNodes,
      visibleBackboneEdges: graph.backboneEdges,
      visibleBridgeEdges,
      focusLeaves,
      labelMode,
      selectedNodeId,
      selectedEdgeId,
    }),
    [focusLeaves, graph.backboneEdges, graph.trunkNodes, labelMode, selectedEdgeId, selectedNodeId, visibleBridgeEdges],
  );

  const selectedTrunkIds = useMemo(() => {
    const ids = new Set();
    if (selectedNodeId) {
      ids.add(selectedNodeId);
    }
    if (selectedEdgeId) {
      const selectedEdge = [...graph.backboneEdges, ...visibleBridgeEdges].find((edge) => edge.id === selectedEdgeId);
      if (selectedEdge) {
        ids.add(selectedEdge.source);
        ids.add(selectedEdge.target);
      }
    }
    return ids;
  }, [graph.backboneEdges, selectedEdgeId, selectedNodeId, visibleBridgeEdges]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">OpenAlex candidate graph canvas</p>
            <p className="text-xs text-slate-500 leading-5">
              默认视图展示 trunk topics 与 candidate backbone。bridge queue 只有显式开启后才会进入全局画布。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              trunk {graph.stats.trunk_node_count}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
              backbone {graph.stats.backbone_edge_count}
            </span>
            {showBridgeQueue && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                bridge {graph.stats.bridge_queue_edge_count}
              </span>
            )}
            {focusLeaves.attachments.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                local leaves {focusLeaves.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative bg-slate-950/[0.02]">
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="h-[720px] w-full"
          role="img"
          aria-label="OpenAlex candidate graph canvas"
          onClick={onClearSelection}
        >
          <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8fafc" />

          <g>
            {graph.backboneEdges.map((edge) => (
              <EdgeLine
                key={edge.id}
                edge={edge}
                positions={positions}
                selected={selectedEdgeId === edge.id}
                onSelectEdge={onSelectEdge}
                stroke={selectedEdgeId === edge.id ? '#0f172a' : '#475569'}
                opacity={selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId ? 0.22 : 0.38}
                strokeWidth={1.25}
              />
            ))}

            {visibleBridgeEdges.map((edge) => (
              <EdgeLine
                key={edge.id}
                edge={edge}
                positions={positions}
                selected={selectedEdgeId === edge.id}
                onSelectEdge={onSelectEdge}
                stroke={selectedEdgeId === edge.id ? '#b45309' : '#f59e0b'}
                dashArray="5 4"
                opacity={selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId ? 0.18 : 0.35}
                strokeWidth={1.1}
              />
            ))}

            {focusLeaves.attachments.map((attachment) => (
              <EdgeLine
                key={attachment.id}
                edge={attachment}
                positions={positions}
                selected={false}
                onSelectEdge={() => {}}
                stroke="#10b981"
                opacity={0.32}
                strokeWidth={1}
              />
            ))}
          </g>

          <g>
            {graph.trunkNodes.map((node) => {
              const position = positions[node.id];
              if (!position) {
                return null;
              }

              const selected = selectedTrunkIds.has(node.id);
              const muted = selectedNodeId && !selected && node.backboneDegree === 0;
              const nodeColor = getNodeColor(node);
              const radius = getTrunkNodeRadius(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x}, ${position.y})`}
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectNode(node.id);
                  }}
                >
                  <circle
                    r={selected ? radius + 4 : radius + 1.5}
                    fill={selected ? '#f8fafc' : '#ffffff'}
                    fillOpacity={selected ? 0.96 : 0.78}
                    stroke={selected ? '#0f172a' : 'transparent'}
                    strokeWidth={selected ? 2 : 0}
                  />
                  <circle
                    r={radius}
                    fill={nodeColor}
                    fillOpacity={muted ? 0.6 : 0.9}
                    stroke={selected ? '#ffffff' : '#f8fafc'}
                    strokeWidth={selected ? 1.5 : 1}
                  />

                  {labelIds.has(node.id) && (
                    <text
                      x={radius + 7}
                      y="4"
                      fontSize="11"
                      fontWeight={selected ? '700' : '500'}
                      fill="#0f172a"
                    >
                      {node.label}
                    </text>
                  )}

                  <title>{`${node.label} | backbone degree ${node.backboneDegree} | bridge degree ${node.bridgeDegree}`}</title>
                </g>
              );
            })}

            {focusLeaves.leafNodes.map((node) => {
              const position = positions[node.id];
              if (!position) {
                return null;
              }

              const radius = getLeafNodeRadius(node);

              return (
                <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
                  <circle
                    r={radius + 1}
                    fill="#ffffff"
                    fillOpacity={0.9}
                    stroke="#10b981"
                    strokeWidth={1}
                  />
                  <circle
                    r={radius}
                    fill="#34d399"
                    fillOpacity={0.72}
                  />

                  {labelIds.has(node.id) && (
                    <text
                      x={radius + 6}
                      y="4"
                      fontSize="10"
                      fontWeight="500"
                      fill="#065f46"
                    >
                      {node.label}
                    </text>
                  )}

                  <title>{`${node.label} | leaf work count ${node.metrics?.leaf_work_count || 0}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default OpenAlexGraphCanvas;

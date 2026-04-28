const OPENALEX_GRAPH_BUNDLE_ROOT = 'data/output/openalex_graph_v1_visualization/openalex_topic_graph_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full';
const DEFAULT_LEAF_FOCUS_LIMIT = 12;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function createEmptyNeighborBuckets() {
  return {};
}

function appendNeighbor(bucket, nodeId, entry) {
  if (!bucket[nodeId]) {
    bucket[nodeId] = [];
  }
  bucket[nodeId].push(entry);
}

function sortNeighborEntries(entries) {
  return [...entries].sort((left, right) => {
    if ((right.score || 0) !== (left.score || 0)) {
      return (right.score || 0) - (left.score || 0);
    }

    return (left.label || '').localeCompare(right.label || '');
  });
}

function sortAttachmentEntries(entries) {
  return [...entries].sort((left, right) => {
    if ((right.weight?.work_count || 0) !== (left.weight?.work_count || 0)) {
      return (right.weight?.work_count || 0) - (left.weight?.work_count || 0);
    }
    if ((right.weight?.share_within_leaf || 0) !== (left.weight?.share_within_leaf || 0)) {
      return (right.weight?.share_within_leaf || 0) - (left.weight?.share_within_leaf || 0);
    }
    return (left.leaf?.label || '').localeCompare(right.leaf?.label || '');
  });
}

export function buildOpenAlexGraphAssetPath(basePath = '/', fileName = 'graph_bundle.json') {
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${OPENALEX_GRAPH_BUNDLE_ROOT}/${fileName}`;
}

export function normalizeOpenAlexGraphBundle(bundle, legend = {}) {
  const trunkNodes = asArray(bundle?.nodes?.trunk);
  const leafNodes = asArray(bundle?.nodes?.leaves);
  const backboneEdges = asArray(bundle?.edges?.backbone);
  const bridgeQueueEdges = asArray(bundle?.edges?.bridge_queue);
  const leafAttachments = asArray(bundle?.edges?.leaf_attachments);

  const nodesById = Object.fromEntries([...trunkNodes, ...leafNodes].map((node) => [node.id, node]));
  const leafNodesById = Object.fromEntries(leafNodes.map((node) => [node.id, node]));
  const trunkNodesById = Object.fromEntries(trunkNodes.map((node) => [node.id, node]));
  const backboneDegreeByNodeId = {};
  const bridgeDegreeByNodeId = {};
  const leafAttachmentCountByTrunkId = {};
  const backboneNeighborsByNodeId = createEmptyNeighborBuckets();
  const bridgeNeighborsByNodeId = createEmptyNeighborBuckets();
  const leafAttachmentsByTrunkId = {};
  const edgesById = Object.fromEntries(
    [...backboneEdges, ...bridgeQueueEdges].map((edge) => [edge.id, edge]),
  );

  backboneEdges.forEach((edge) => {
    backboneDegreeByNodeId[edge.source] = (backboneDegreeByNodeId[edge.source] || 0) + 1;
    backboneDegreeByNodeId[edge.target] = (backboneDegreeByNodeId[edge.target] || 0) + 1;
    appendNeighbor(backboneNeighborsByNodeId, edge.source, {
      edgeId: edge.id,
      nodeId: edge.target,
      label: nodesById[edge.target]?.label || edge.labels?.target || edge.target,
      score: edge.score,
      kind: edge.kind,
      edge,
    });
    appendNeighbor(backboneNeighborsByNodeId, edge.target, {
      edgeId: edge.id,
      nodeId: edge.source,
      label: nodesById[edge.source]?.label || edge.labels?.source || edge.source,
      score: edge.score,
      kind: edge.kind,
      edge,
    });
  });

  bridgeQueueEdges.forEach((edge) => {
    bridgeDegreeByNodeId[edge.source] = (bridgeDegreeByNodeId[edge.source] || 0) + 1;
    bridgeDegreeByNodeId[edge.target] = (bridgeDegreeByNodeId[edge.target] || 0) + 1;
    appendNeighbor(bridgeNeighborsByNodeId, edge.source, {
      edgeId: edge.id,
      nodeId: edge.target,
      label: nodesById[edge.target]?.label || edge.labels?.target || edge.target,
      score: edge.score,
      kind: edge.kind,
      edge,
    });
    appendNeighbor(bridgeNeighborsByNodeId, edge.target, {
      edgeId: edge.id,
      nodeId: edge.source,
      label: nodesById[edge.source]?.label || edge.labels?.source || edge.source,
      score: edge.score,
      kind: edge.kind,
      edge,
    });
  });

  leafAttachments.forEach((attachment) => {
    const enrichedAttachment = {
      ...attachment,
      leaf: leafNodesById[attachment.source] || null,
      trunk: trunkNodesById[attachment.target] || null,
    };
    if (!leafAttachmentsByTrunkId[attachment.target]) {
      leafAttachmentsByTrunkId[attachment.target] = [];
    }
    leafAttachmentsByTrunkId[attachment.target].push(enrichedAttachment);
    leafAttachmentCountByTrunkId[attachment.target] = (leafAttachmentCountByTrunkId[attachment.target] || 0) + 1;
  });

  const normalizedBackboneNeighbors = Object.fromEntries(
    Object.entries(backboneNeighborsByNodeId).map(([nodeId, entries]) => [nodeId, sortNeighborEntries(entries)]),
  );
  const normalizedBridgeNeighbors = Object.fromEntries(
    Object.entries(bridgeNeighborsByNodeId).map(([nodeId, entries]) => [nodeId, sortNeighborEntries(entries)]),
  );
  const normalizedLeafAttachmentsByTrunkId = Object.fromEntries(
    Object.entries(leafAttachmentsByTrunkId).map(([nodeId, entries]) => [nodeId, sortAttachmentEntries(entries)]),
  );

  const enrichedTrunkNodes = trunkNodes.map((node) => ({
    ...node,
    backboneDegree: backboneDegreeByNodeId[node.id] || 0,
    bridgeDegree: bridgeDegreeByNodeId[node.id] || 0,
    leafAttachmentCount: leafAttachmentCountByTrunkId[node.id] || 0,
  }));

  const disclaimer =
    bundle?.meta?.candidate_disclaimer?.text
    || legend?.candidate_only?.text
    || '';

  return {
    source: bundle?.source || {},
    meta: bundle?.meta || {},
    stats: bundle?.stats || {},
    filters: bundle?.filters || {},
    legend,
    disclaimer,
    trunkNodes: enrichedTrunkNodes,
    trunkNodesById,
    leafNodes,
    leafNodesById,
    nodesById,
    backboneEdges,
    bridgeQueueEdges,
    leafAttachments,
    edgesById,
    backboneNeighborsByNodeId: normalizedBackboneNeighbors,
    bridgeNeighborsByNodeId: normalizedBridgeNeighbors,
    leafAttachmentsByTrunkId: normalizedLeafAttachmentsByTrunkId,
  };
}

export function getOpenAlexGraphFocusLeaves(
  graph,
  {
    selectedNodeId = null,
    selectedEdgeId = null,
    limit = DEFAULT_LEAF_FOCUS_LIMIT,
  } = {},
) {
  if (!graph) {
    return {
      focusTrunkIds: [],
      attachments: [],
      leafNodes: [],
    };
  }

  const focusTrunkIds = [];
  const seenTrunkIds = new Set();
  const pushTrunkId = (nodeId) => {
    if (!nodeId || seenTrunkIds.has(nodeId) || !graph.trunkNodesById[nodeId]) {
      return;
    }
    seenTrunkIds.add(nodeId);
    focusTrunkIds.push(nodeId);
  };

  pushTrunkId(selectedNodeId);

  const selectedEdge = selectedEdgeId ? graph.edgesById[selectedEdgeId] : null;
  if (selectedEdge) {
    pushTrunkId(selectedEdge.source);
    pushTrunkId(selectedEdge.target);
  }

  const attachments = focusTrunkIds.flatMap((trunkId) => {
    const trunkAttachments = graph.leafAttachmentsByTrunkId[trunkId] || [];
    return trunkAttachments.slice(0, limit).map((attachment) => ({
      ...attachment,
      focusTrunkId: trunkId,
    }));
  });

  const dedupedLeafNodes = [];
  const seenLeafIds = new Set();
  attachments.forEach((attachment) => {
    if (attachment.leaf && !seenLeafIds.has(attachment.leaf.id)) {
      seenLeafIds.add(attachment.leaf.id);
      dedupedLeafNodes.push(attachment.leaf);
    }
  });

  return {
    focusTrunkIds,
    attachments,
    leafNodes: dedupedLeafNodes,
  };
}

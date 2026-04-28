import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import OpenAlexEmbeddingsDetailPanel from '../components/openalex/OpenAlexEmbeddingsDetailPanel';
import OpenAlexEmbeddingsExplorerRail from '../components/openalex/OpenAlexEmbeddingsExplorerRail';
import OpenAlexEmbeddingsViewport from '../components/openalex/OpenAlexEmbeddingsViewport';
import { useOpenAlexEmbeddings } from '../hooks/useOpenAlexEmbeddings';
import { useOpenAlexGraph } from '../hooks/useOpenAlexGraph';
import { useOpenAlexSemanticSearch } from '../hooks/useOpenAlexSemanticSearch';
import {
  getOpenAlexEmbeddingNeighbors,
  rankOpenAlexEmbeddingMatches,
} from '../utils/openAlexEmbeddingsBundle';

const FIELD_COLORS = [
  '#0f766e',
  '#0369a1',
  '#b45309',
  '#7c3aed',
  '#dc2626',
  '#4d7c0f',
  '#4338ca',
  '#be123c',
  '#0f172a',
  '#a16207',
  '#166534',
  '#1d4ed8',
];
const LOCAL_BACKBONE_LIMIT = 8;
const LOCAL_BRIDGE_LIMIT = 6;
const LOCAL_TRUNK_LEAF_LIMIT = 8;
const LOCAL_LEAF_ATTACHMENT_LIMIT = 5;
const LOCAL_LABEL_LIMITS = Object.freeze({
  dense: {
    backbone: 8,
    bridge: 6,
    nearestNeighbors: 8,
    searchMatches: 14,
    trunkLeaves: 8,
  },
  focus: {
    backbone: 4,
    bridge: 3,
    nearestNeighbors: 6,
    searchMatches: 8,
    trunkLeaves: 3,
  },
  sparse: {
    backbone: 3,
    bridge: 2,
    nearestNeighbors: 3,
    searchMatches: 5,
    trunkLeaves: 2,
  },
});

function buildFieldColorMap(fieldOptions) {
  return Object.fromEntries(
    fieldOptions.map((option, index) => [option.value, FIELD_COLORS[index % FIELD_COLORS.length]]),
  );
}

function sortLeafSelectionAttachments(entries) {
  return [...entries].sort((left, right) => {
    if ((right.weight?.work_count || 0) !== (left.weight?.work_count || 0)) {
      return (right.weight?.work_count || 0) - (left.weight?.work_count || 0);
    }
    if ((right.weight?.share_within_leaf || 0) !== (left.weight?.share_within_leaf || 0)) {
      return (right.weight?.share_within_leaf || 0) - (left.weight?.share_within_leaf || 0);
    }
    return (left.labels?.target || '').localeCompare(right.labels?.target || '');
  });
}

export default function OpenAlexEmbeddings() {
  const {
    embeddings,
    loading,
    error,
  } = useOpenAlexEmbeddings();
  const {
    graph,
    evidenceLookup,
    loading: graphLoading,
    error: graphError,
    evidenceLoading,
    evidenceError,
    requestEdgeEvidence,
  } = useOpenAlexGraph();

  const [searchQuery, setSearchQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [labelMode, setLabelMode] = useState('sparse');
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedLocalEdgeId, setSelectedLocalEdgeId] = useState(null);
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [showLocalOverlay, setShowLocalOverlay] = useState(true);
  const [showBridgeQueue, setShowBridgeQueue] = useState(false);
  const [requestedEvidenceEdgeIds, setRequestedEvidenceEdgeIds] = useState(() => new Set());
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const clearSelectionState = useCallback(() => {
    setSelectedTopicId(null);
    setSelectedLocalEdgeId(null);
    setShowBridgeQueue(false);
  }, []);

  const fieldColorMap = useMemo(
    () => buildFieldColorMap(embeddings?.fieldOptions || []),
    [embeddings?.fieldOptions],
  );

  const visibleTopics = useMemo(() => {
    if (!embeddings) {
      return [];
    }

    return embeddings.topics.filter((topic) => fieldFilter === 'all' || topic.fieldLabel === fieldFilter);
  }, [embeddings, fieldFilter]);

  const searchMatches = useMemo(
    () => rankOpenAlexEmbeddingMatches(embeddings, deferredSearchQuery, {
      fieldLabel: fieldFilter,
      limit: 8,
    }),
    [deferredSearchQuery, embeddings, fieldFilter],
  );
  const semanticAssist = useOpenAlexSemanticSearch(deferredSearchQuery, {
    enabled: Boolean(embeddings),
    fieldLabel: fieldFilter,
  });

  const handleSelectTopic = useCallback((topicId) => {
    if (!embeddings) {
      setSelectedTopicId(topicId);
      setSelectedLocalEdgeId(null);
      return;
    }

    if (!topicId) {
      clearSelectionState();
      return;
    }

    const nextTopic = embeddings.topicsById?.[topicId] || null;
    if (nextTopic && fieldFilter !== 'all' && nextTopic.fieldLabel !== fieldFilter) {
      setFieldFilter('all');
    }

    setSelectedTopicId(topicId);
    setSelectedLocalEdgeId(null);
  }, [clearSelectionState, embeddings, fieldFilter]);

  const selectedTopic = selectedTopicId ? embeddings?.topicsById?.[selectedTopicId] || null : null;
  const nearestNeighbors = useMemo(
    () => getOpenAlexEmbeddingNeighbors(embeddings, selectedTopicId, { limit: 6 }),
    [embeddings, selectedTopicId],
  );

  const selectedGraphLeaf = selectedTopicId ? graph?.leafNodesById?.[selectedTopicId] || null : null;

  const localGraph = useMemo(() => {
    if (!graph || !selectedTopic || !embeddings) {
      return null;
    }

    if (selectedTopic.isTrunk) {
      const fullBackboneNeighbors = graph.backboneNeighborsByNodeId[selectedTopic.id] || [];
      const fullBridgeNeighbors = graph.bridgeNeighborsByNodeId[selectedTopic.id] || [];
      const fullLeafAttachments = graph.leafAttachmentsByTrunkId[selectedTopic.id] || [];
      const selectedTrunkNode = graph.trunkNodes.find((node) => node.id === selectedTopic.id)
        || graph.trunkNodesById[selectedTopic.id]
        || null;
      const backboneNeighbors = fullBackboneNeighbors
        .slice(0, LOCAL_BACKBONE_LIMIT)
        .map((entry) => ({
          ...entry,
          topic: embeddings.topicsById?.[entry.nodeId] || null,
        }));
      const bridgeNeighbors = fullBridgeNeighbors
        .slice(0, LOCAL_BRIDGE_LIMIT)
        .map((entry) => ({
          ...entry,
          topic: embeddings.topicsById?.[entry.nodeId] || null,
        }));
      const bridgeFocusIds = new Set([selectedTopic.id, ...backboneNeighbors.map((entry) => entry.nodeId)]);
      if (showBridgeQueue) {
        bridgeNeighbors.forEach((entry) => bridgeFocusIds.add(entry.nodeId));
      }
      const overlayBackboneEdges = graph.backboneEdges.filter(
        (edge) => bridgeFocusIds.has(edge.source) && bridgeFocusIds.has(edge.target),
      );
      const overlayBridgeEdges = showBridgeQueue
        ? graph.bridgeQueueEdges.filter(
          (edge) => bridgeFocusIds.has(edge.source) && bridgeFocusIds.has(edge.target),
        )
        : [];
      const trunkLeafAttachments = fullLeafAttachments
        .slice(0, LOCAL_TRUNK_LEAF_LIMIT)
        .map((attachment) => ({
          ...attachment,
          leafTopic: embeddings.topicsById?.[attachment.source] || attachment.leaf || null,
          trunkTopic: embeddings.topicsById?.[attachment.target] || attachment.trunk || null,
        }));
      const focusTopicIds = new Set([selectedTopic.id]);
      backboneNeighbors.forEach((entry) => focusTopicIds.add(entry.nodeId));
      trunkLeafAttachments.forEach((attachment) => focusTopicIds.add(attachment.source));
      if (showBridgeQueue) {
        bridgeNeighbors.forEach((entry) => focusTopicIds.add(entry.nodeId));
      }

      return {
        kind: 'trunk',
        trunkNode: selectedTrunkNode,
        trunkStats: {
          primaryWorkCount: selectedTrunkNode?.metrics?.primary_work_count || 0,
          backboneDegree: fullBackboneNeighbors.length,
          bridgeDegree: fullBridgeNeighbors.length,
          leafAttachmentCount: fullLeafAttachments.length,
        },
        backboneNeighbors,
        bridgeNeighbors,
        trunkLeafAttachments,
        leafSelectionAttachments: [],
        owningTrunkTopic: null,
        focusTopicIds,
        overlayBackboneEdges,
        overlayBridgeEdges,
        overlayLeafAttachments: trunkLeafAttachments,
        selectableEdgeIds: new Set([
          ...overlayBackboneEdges.map((edge) => edge.id),
          ...overlayBridgeEdges.map((edge) => edge.id),
        ]),
      };
    }

    const leafSelectionAttachments = sortLeafSelectionAttachments(
      (graph.leafAttachments || []).filter((attachment) => attachment.source === selectedTopic.id),
    )
      .slice(0, LOCAL_LEAF_ATTACHMENT_LIMIT)
      .map((attachment) => ({
        ...attachment,
        leafTopic: embeddings.topicsById?.[attachment.source] || selectedGraphLeaf || null,
        trunkTopic: embeddings.topicsById?.[attachment.target] || graph.trunkNodesById?.[attachment.target] || null,
      }));
    const owningTrunkTopic = selectedTopic.dominantTrunkTopicId
      ? embeddings.topicsById?.[selectedTopic.dominantTrunkTopicId] || null
      : leafSelectionAttachments[0]?.trunkTopic || null;
    const focusTopicIds = new Set([selectedTopic.id]);
    leafSelectionAttachments.forEach((attachment) => focusTopicIds.add(attachment.target));
    if (owningTrunkTopic?.id) {
      focusTopicIds.add(owningTrunkTopic.id);
    }

    return {
      kind: 'leaf',
      trunkNode: null,
      trunkStats: null,
      backboneNeighbors: [],
      bridgeNeighbors: [],
      trunkLeafAttachments: [],
      leafSelectionAttachments,
      owningTrunkTopic,
      focusTopicIds,
      overlayBackboneEdges: [],
      overlayBridgeEdges: [],
      overlayLeafAttachments: leafSelectionAttachments,
      selectableEdgeIds: new Set(),
    };
  }, [embeddings, graph, selectedGraphLeaf, selectedTopic, showBridgeQueue]);

  useEffect(() => {
    if (!selectedTopic) {
      setSelectedLocalEdgeId(null);
      setShowBridgeQueue(false);
      return;
    }

    if (!selectedTopic.isTrunk) {
      setShowBridgeQueue(false);
    }
  }, [selectedTopic]);

  useEffect(() => {
    if (!selectedLocalEdgeId || !localGraph) {
      return;
    }

    if (!localGraph.selectableEdgeIds.has(selectedLocalEdgeId)) {
      setSelectedLocalEdgeId(null);
    }
  }, [localGraph, selectedLocalEdgeId]);

  const handleFieldFilterChange = useCallback((nextFieldFilter) => {
    setFieldFilter(nextFieldFilter);

    if (!selectedTopicId || nextFieldFilter === 'all' || !embeddings) {
      return;
    }

    const nextSelectedTopic = embeddings.topicsById?.[selectedTopicId] || null;
    if (nextSelectedTopic && nextSelectedTopic.fieldLabel !== nextFieldFilter) {
      clearSelectionState();
    }
  }, [clearSelectionState, embeddings, selectedTopicId]);

  const selectedLocalEdge = selectedLocalEdgeId ? graph?.edgesById?.[selectedLocalEdgeId] || null : null;
  const hasRequestedEvidence = selectedLocalEdge ? requestedEvidenceEdgeIds.has(selectedLocalEdge.id) : false;
  const evidenceItems = selectedLocalEdge && hasRequestedEvidence
    ? evidenceLookup?.by_edge_id?.[selectedLocalEdge.id]?.items || []
    : [];

  const handleRequestEvidence = useCallback(async (edgeId) => {
    setRequestedEvidenceEdgeIds((previous) => {
      const next = new Set(previous);
      next.add(edgeId);
      return next;
    });
    await requestEdgeEvidence(edgeId).catch(() => null);
  }, [requestEdgeEvidence]);

  const handleSelectLocalEdge = useCallback((edgeId) => {
    setSelectedLocalEdgeId(edgeId);
    setShowLocalOverlay(true);
  }, []);

  const handleSubmitSearch = useCallback(() => {
    if (searchMatches[0]) {
      handleSelectTopic(searchMatches[0].id);
    }
  }, [handleSelectTopic, searchMatches]);

  const handleResetView = useCallback(() => {
    setSearchQuery('');
    setFieldFilter('all');
    setLabelMode('sparse');
    clearSelectionState();
    setShowLocalOverlay(true);
    setCameraResetToken((token) => token + 1);
  }, [clearSelectionState]);

  const overlayFocusIds = useMemo(() => {
    const ids = new Set(nearestNeighbors.map((topic) => topic.id));
    if (selectedTopicId) {
      ids.add(selectedTopicId);
    }
    if (showLocalOverlay && localGraph) {
      localGraph.focusTopicIds.forEach((topicId) => ids.add(topicId));
    }
    if (selectedLocalEdge) {
      ids.add(selectedLocalEdge.source);
      ids.add(selectedLocalEdge.target);
    }
    return ids;
  }, [localGraph, nearestNeighbors, selectedLocalEdge, selectedTopicId, showLocalOverlay]);

  const labelTopicIds = useMemo(() => {
    if (!embeddings) {
      return new Set();
    }

    const labelLimits = LOCAL_LABEL_LIMITS[labelMode] || LOCAL_LABEL_LIMITS.sparse;
    const ids = new Set();
    const addTopics = (topics, limit) => {
      topics.slice(0, limit).forEach((topic) => {
        if (topic) {
          ids.add(topic.id);
        }
      });
    };

    const anchorTopics = embeddings.anchorTopicIds
      .map((topicId) => embeddings.topicsById[topicId])
      .filter(Boolean);

    addTopics(anchorTopics, labelMode === 'dense' ? 20 : 12);
    addTopics(searchMatches, labelLimits.searchMatches);
    addTopics(nearestNeighbors, labelLimits.nearestNeighbors);

    if (selectedTopic) {
      ids.add(selectedTopic.id);
    }

    if (selectedLocalEdge) {
      ids.add(selectedLocalEdge.source);
      ids.add(selectedLocalEdge.target);
    }

    if (showLocalOverlay && localGraph) {
      if (localGraph.kind === 'trunk') {
        addTopics(
          localGraph.backboneNeighbors
            .map((entry) => entry.topic)
            .filter(Boolean),
          labelLimits.backbone,
        );
        addTopics(
          localGraph.trunkLeafAttachments
            .map((attachment) => attachment.leafTopic)
            .filter(Boolean),
          labelLimits.trunkLeaves,
        );
        if (showBridgeQueue) {
          addTopics(
            localGraph.bridgeNeighbors
              .map((entry) => entry.topic)
              .filter(Boolean),
            labelLimits.bridge,
          );
        }
      } else {
        addTopics(
          localGraph.leafSelectionAttachments
            .map((attachment) => attachment.trunkTopic)
            .filter(Boolean),
          4,
        );
        if (localGraph.owningTrunkTopic) {
          ids.add(localGraph.owningTrunkTopic.id);
        }
      }
    }

    if (labelMode === 'dense') {
      addTopics(visibleTopics.filter((topic) => topic.isTrunk), 42);
      addTopics(visibleTopics.filter((topic) => !topic.isTrunk), 36);
    }

    return ids;
  }, [
    embeddings,
    labelMode,
    localGraph,
    nearestNeighbors,
    searchMatches,
    selectedLocalEdge,
    selectedTopic,
    showBridgeQueue,
    showLocalOverlay,
    visibleTopics,
  ]);

  const localOverlay = useMemo(() => ({
    visible: Boolean(showLocalOverlay && selectedTopic && localGraph),
    backboneEdges: showLocalOverlay && localGraph ? localGraph.overlayBackboneEdges : [],
    bridgeEdges: showLocalOverlay && localGraph ? localGraph.overlayBridgeEdges : [],
    leafAttachments: showLocalOverlay && localGraph ? localGraph.overlayLeafAttachments : [],
    selectableEdges: showLocalOverlay && localGraph
      ? [...localGraph.overlayBackboneEdges, ...localGraph.overlayBridgeEdges]
      : [],
    focusTopicIds: localGraph?.focusTopicIds || new Set(),
  }), [localGraph, selectedTopic, showLocalOverlay]);

  const searchMatchIds = useMemo(
    () => new Set(searchMatches.map((topic) => topic.id)),
    [searchMatches],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[640px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载 OpenAlex topic embeddings...</p>
        </div>
      </div>
    );
  }

  if (error || !embeddings) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-900">OpenAlex embeddings page failed to load.</p>
        <p className="text-sm text-red-700 mt-2">{error?.message || 'Unknown error.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OpenAlexEmbeddingsExplorerRail
        embeddings={embeddings}
        searchQuery={searchQuery}
        fieldFilter={fieldFilter}
        labelMode={labelMode}
        searchMatches={searchMatches}
        semanticAssist={semanticAssist}
        selectedTopic={selectedTopic}
        selectedTopicId={selectedTopicId}
        visibleTopicCount={visibleTopics.length}
        onSearchChange={setSearchQuery}
        onFieldFilterChange={handleFieldFilterChange}
        onLabelModeChange={setLabelMode}
        onSelectTopic={handleSelectTopic}
        onSubmitSearch={handleSubmitSearch}
        onResetView={handleResetView}
        onClearSelection={clearSelectionState}
      />

      <div className="space-y-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start 2xl:gap-4 2xl:space-y-0">
        <div className="min-w-0">
          <OpenAlexEmbeddingsViewport
            topics={visibleTopics}
            coordinateBounds={embeddings.coordinateBounds}
            fieldColorMap={fieldColorMap}
            stats={embeddings.stats}
            selectedTopicId={selectedTopicId}
            selectedEdgeId={selectedLocalEdgeId}
            searchMatchIds={searchMatchIds}
            neighborIds={overlayFocusIds}
            labelTopicIds={labelTopicIds}
            resetCameraToken={cameraResetToken}
            localOverlay={localOverlay}
            onSelectTopic={handleSelectTopic}
            onSelectEdge={handleSelectLocalEdge}
          />
        </div>

        <div className="2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-2rem)] 2xl:overflow-y-auto 2xl:pl-1">
          <OpenAlexEmbeddingsDetailPanel
            selectedTopic={selectedTopic}
            nearestNeighbors={nearestNeighbors}
            topicsById={embeddings.topicsById}
            graph={graph}
            graphLoading={graphLoading}
            graphError={graphError}
            localGraph={localGraph}
            selectedLocalEdge={selectedLocalEdge}
            hasRequestedEvidence={hasRequestedEvidence}
            evidenceItems={evidenceItems}
            evidenceLoading={evidenceLoading}
            evidenceError={evidenceError}
            showLocalOverlay={showLocalOverlay}
            showBridgeQueue={showBridgeQueue}
            onToggleLocalOverlay={() => {
              setShowLocalOverlay((previous) => {
                const next = !previous;
                if (!next) {
                  setSelectedLocalEdgeId(null);
                  setShowBridgeQueue(false);
                }
                return next;
              });
            }}
            onToggleBridgeQueue={() => {
              setShowBridgeQueue((previous) => {
                const next = !previous;
                if (!next && selectedLocalEdge?.kind === 'BRIDGE_QUEUE_EDGE') {
                  setSelectedLocalEdgeId(null);
                }
                return next;
              });
            }}
            onRequestEvidence={handleRequestEvidence}
            onSelectLocalEdge={handleSelectLocalEdge}
            onSelectTopic={handleSelectTopic}
          />
        </div>
      </div>
    </div>
  );
}

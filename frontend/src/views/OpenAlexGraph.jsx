import { useCallback, useEffect, useMemo, useState } from 'react';
import { OpenAlexGraphCanvas } from '../components/OpenAlexGraphCanvas';
import { OpenAlexGraphControls } from '../components/OpenAlexGraphControls';
import { OpenAlexGraphDetailPanel } from '../components/OpenAlexGraphDetailPanel';
import { useOpenAlexGraph } from '../hooks/useOpenAlexGraph';
import { getOpenAlexGraphFocusLeaves } from '../utils/openAlexGraphBundle';

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-xl font-semibold mt-1">{new Intl.NumberFormat('en-US').format(value || 0)}</p>
    </div>
  );
}

export default function OpenAlexGraph() {
  const {
    graph,
    evidenceLookup,
    loading,
    error,
    evidenceLoading,
    evidenceError,
    requestEdgeEvidence,
  } = useOpenAlexGraph();

  const [showBridgeQueue, setShowBridgeQueue] = useState(false);
  const [labelMode, setLabelMode] = useState('focus');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [requestedEvidenceEdgeIds, setRequestedEvidenceEdgeIds] = useState(() => new Set());

  useEffect(() => {
    if (!graph) {
      return;
    }

    setShowBridgeQueue(Boolean(graph.meta?.layer_defaults?.bridge_queue));
  }, [graph]);

  const selectedNode = selectedNodeId ? graph?.trunkNodesById?.[selectedNodeId] || null : null;
  const selectedEdge = selectedEdgeId ? graph?.edgesById?.[selectedEdgeId] || null : null;

  const focusLeaves = useMemo(
    () => getOpenAlexGraphFocusLeaves(graph, {
      selectedNodeId,
      selectedEdgeId,
      limit: selectedEdgeId ? 6 : 8,
    }),
    [graph, selectedEdgeId, selectedNodeId],
  );

  const hasRequestedEvidence = selectedEdge ? requestedEvidenceEdgeIds.has(selectedEdge.id) : false;
  const evidenceItems = selectedEdge && hasRequestedEvidence
    ? evidenceLookup?.by_edge_id?.[selectedEdge.id]?.items || []
    : [];

  const handleSelectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, []);

  const handleSelectEdge = useCallback((edgeId) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleResetView = useCallback(() => {
    setShowBridgeQueue(Boolean(graph?.meta?.layer_defaults?.bridge_queue));
    setLabelMode('focus');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [graph]);

  const handleRequestEvidence = useCallback(async (edgeId) => {
    setRequestedEvidenceEdgeIds((previous) => {
      const next = new Set(previous);
      next.add(edgeId);
      return next;
    });
    await requestEdgeEvidence(edgeId).catch(() => null);
  }, [requestEdgeEvidence]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载 OpenAlex candidate graph...</p>
        </div>
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-900">OpenAlex graph page failed to load.</p>
        <p className="text-sm text-red-700 mt-2">{error?.message || 'Unknown error.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                OpenAlex Candidate Graph
              </span>
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                Candidate Backbone
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">OpenAlex trunk-first graph inspector</h1>
              <p className="text-sm text-slate-600 mt-2 leading-6">
                This page opens directly on the accepted OpenAlex graph-v1 visualization bundle. It keeps the first surface
                graph-first, candidate-only, trunk-overview-first, and avoids preview or timeline framing from the older
                knowledge-graph demo shell.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-6">
              {graph.disclaimer}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-0 xl:w-[360px]">
            <StatCard label="Trunk topics" value={graph.stats.trunk_node_count} tone="slate" />
            <StatCard label="Backbone edges" value={graph.stats.backbone_edge_count} tone="blue" />
            <StatCard label="Bridge queue" value={graph.stats.bridge_queue_edge_count} tone="amber" />
            <StatCard label="Leaf inventory" value={graph.stats.leaf_inventory_count} tone="emerald" />
          </div>
        </div>
      </section>

      <OpenAlexGraphControls
        showBridgeQueue={showBridgeQueue}
        onToggleBridgeQueue={setShowBridgeQueue}
        labelMode={labelMode}
        onLabelModeChange={setLabelMode}
        onResetView={handleResetView}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OpenAlexGraphCanvas
          graph={graph}
          showBridgeQueue={showBridgeQueue}
          labelMode={labelMode}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          focusLeaves={focusLeaves}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onClearSelection={handleClearSelection}
        />

        <OpenAlexGraphDetailPanel
          graph={graph}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          hasRequestedEvidence={hasRequestedEvidence}
          evidenceItems={evidenceItems}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          onRequestEvidence={handleRequestEvidence}
          onSelectNode={handleSelectNode}
        />
      </div>
    </div>
  );
}

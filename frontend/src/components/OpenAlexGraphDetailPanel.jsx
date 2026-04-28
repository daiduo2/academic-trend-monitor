import OpenAlexGraphEmptyState from './OpenAlexGraphEmptyState';

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatTaxonomy(taxonomy) {
  return [
    taxonomy?.field?.label,
    taxonomy?.subfield?.label,
    taxonomy?.domain?.label,
  ].filter(Boolean).join(' / ');
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function TagList({ title, items, tone = 'slate', emptyText = 'None' }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items?.length ? items.map((item) => (
          <Badge key={item} tone={tone}>{item}</Badge>
        )) : <span className="text-xs text-slate-500">{emptyText}</span>}
      </div>
    </div>
  );
}

function NeighborList({ title, items, onSelectNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      {items?.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.edgeId}
              type="button"
              onClick={() => onSelectNode(item.nodeId)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-slate-300 hover:bg-white"
            >
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500 mt-1">score {item.score?.toFixed?.(2) ?? item.score}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No related nodes in this layer.</p>
      )}
    </div>
  );
}

function RelatedLeavesList({ attachments }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Related Leaves</p>
      {attachments?.length ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-sm font-medium text-emerald-900">{attachment.leaf?.label || attachment.labels?.source}</p>
              <p className="text-xs text-emerald-700 mt-1">
                work count {formatCount(attachment.weight?.work_count)} · share {(attachment.weight?.share_within_leaf || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No local leaf attachments in the current focus.</p>
      )}
    </div>
  );
}

function EvidenceSection({
  edge,
  hasRequestedEvidence,
  evidenceItems,
  evidenceLoading,
  evidenceError,
  onRequestEvidence,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Evidence</p>
          <p className="text-xs text-slate-500 mt-1">
            Evidence rows remain sidecar-only and are loaded on demand.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRequestEvidence(edge.id)}
          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900"
        >
          {evidenceLoading && hasRequestedEvidence ? '加载中...' : '加载证据'}
        </button>
      </div>

      {evidenceError && hasRequestedEvidence && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {evidenceError.message}
        </div>
      )}

      {hasRequestedEvidence && !evidenceLoading && !evidenceItems?.length && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {edge.kind === 'BRIDGE_QUEUE_EDGE'
            ? 'This bridge candidate has no separate evidence sidecar rows in the first visualization bundle.'
            : 'No evidence rows were found for this edge in the current sidecar.'}
        </div>
      )}

      {evidenceItems?.length > 0 && (
        <div className="space-y-2">
          {evidenceItems.slice(0, 5).map((item) => (
            <div key={`${edge.id}-${item.rank}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-slate-900">#{item.rank} · {item.signal_family}</p>
                <p className="text-[11px] text-slate-500">normalized {item.normalized_support_value}</p>
              </div>
              <p className="text-sm font-medium text-slate-900 mt-2">{item.source_work_title}</p>
              <p className="text-xs text-slate-500 mt-1">paired with {item.target_work_title}</p>
              <p className="text-xs text-slate-600 mt-2 leading-5">{item.evidence_note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpenAlexGraphDetailPanel({
  graph,
  selectedNode,
  selectedEdge,
  hasRequestedEvidence,
  evidenceItems,
  evidenceLoading,
  evidenceError,
  onRequestEvidence,
  onSelectNode,
}) {
  if (!selectedNode && !selectedEdge) {
    return <OpenAlexGraphEmptyState />;
  }

  if (selectedNode) {
    const backboneNeighbors = (graph.backboneNeighborsByNodeId[selectedNode.id] || []).slice(0, 8);
    const bridgeNeighbors = (graph.bridgeNeighborsByNodeId[selectedNode.id] || []).slice(0, 6);
    const leafAttachments = (graph.leafAttachmentsByTrunkId[selectedNode.id] || []).slice(0, 8);

    return (
      <aside className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 min-h-[420px]">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">Trunk Topic</Badge>
              <Badge tone="amber">{graph.legend?.candidate_only?.badge_key || 'candidate_only'}</Badge>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selectedNode.label}</h2>
              <p className="text-sm text-slate-500 mt-1">{formatTaxonomy(selectedNode.taxonomy)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <StatRow label="Primary work count" value={formatCount(selectedNode.metrics?.primary_work_count)} />
            <StatRow label="Backbone degree" value={formatCount(selectedNode.backboneDegree)} />
            <StatRow label="Bridge adjacency" value={formatCount(selectedNode.bridgeDegree)} />
            <StatRow label="Leaf attachments" value={formatCount(selectedNode.leafAttachmentCount)} />
          </div>

          <NeighborList
            title="Backbone Neighbors"
            items={backboneNeighbors}
            onSelectNode={onSelectNode}
          />

          <NeighborList
            title="Bridge Queue Neighbors"
            items={bridgeNeighbors}
            onSelectNode={onSelectNode}
          />

          <RelatedLeavesList attachments={leafAttachments} />

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 leading-5">
            Leaves are local attachment context around the selected trunk topic. They do not promote leaf topics into peer-level backbone claims.
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 min-h-[420px]">
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={selectedEdge.kind === 'BACKBONE_EDGE' ? 'blue' : 'emerald'}>
              {selectedEdge.kind === 'BACKBONE_EDGE' ? 'Backbone Edge' : 'Bridge Queue Edge'}
            </Badge>
            <Badge tone="amber">{graph.legend?.candidate_only?.badge_key || 'candidate_only'}</Badge>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedEdge.labels?.source} → {selectedEdge.labels?.target}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {selectedEdge.kind === 'BACKBONE_EDGE'
                ? 'This edge is part of the default candidate backbone.'
                : 'This edge is withheld from the default backbone and shown only as optional review context.'}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <StatRow label="Candidate score" value={selectedEdge.score?.toFixed?.(2) ?? selectedEdge.score} />
          <StatRow label="Reference support" value={formatCount(selectedEdge.support?.reference_count)} />
          <StatRow label="Support families" value={formatCount(selectedEdge.support?.family_count)} />
          <StatRow label="Shared authors" value={formatCount(selectedEdge.support?.shared_author_count)} />
          <StatRow label="Coassignment" value={formatCount(selectedEdge.support?.coassignment_count)} />
        </div>

        <TagList title="Reason tags" items={selectedEdge.support?.reason_tags || []} tone="blue" />
        <TagList title="Risk tags" items={selectedEdge.risk_tags || []} tone="slate" />

        {selectedEdge.kind === 'BACKBONE_EDGE' ? (
          <TagList title="Keep reasons" items={selectedEdge.keep_reasons || []} tone="emerald" />
        ) : (
          <TagList title="Bridge reasons" items={selectedEdge.bridge_reasons || []} tone="amber" />
        )}

        <EvidenceSection
          edge={selectedEdge}
          hasRequestedEvidence={hasRequestedEvidence}
          evidenceItems={evidenceItems}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          onRequestEvidence={onRequestEvidence}
        />
      </div>
    </aside>
  );
}

export default OpenAlexGraphDetailPanel;

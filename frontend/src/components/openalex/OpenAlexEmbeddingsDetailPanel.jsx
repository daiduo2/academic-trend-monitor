function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatShare(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    rose: 'bg-rose-100 text-rose-800',
    sky: 'bg-sky-100 text-sky-800',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{children}</p>
  );
}

function OverlayToggleRow({
  showLocalOverlay,
  showBridgeQueue,
  bridgeDisabled,
  onToggleLocalOverlay,
  onToggleBridgeQueue,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onToggleLocalOverlay}
        className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-medium ${
          showLocalOverlay
            ? 'border-sky-300 bg-sky-50 text-sky-800'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {showLocalOverlay ? 'Canvas overlay on' : 'Canvas overlay off'}
      </button>
      <button
        type="button"
        onClick={onToggleBridgeQueue}
        disabled={bridgeDisabled}
        className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-medium ${
          showBridgeQueue
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {showBridgeQueue ? 'Bridge queue on' : 'Bridge queue off'}
      </button>
    </div>
  );
}

function SearchAliasList({ aliases }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Search Aliases</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {aliases.map((alias) => (
          <span
            key={alias}
            className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {alias}
          </span>
        ))}
      </div>
    </div>
  );
}

function NearestNeighborsSection({ neighbors, onSelectTopic }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Nearest Embedding Neighbors</SectionTitle>
      <div className="space-y-2">
        {neighbors.map((neighbor) => (
          <button
            key={neighbor.id}
            type="button"
            onClick={() => onSelectTopic(neighbor.id)}
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{neighbor.label}</p>
              <span className="text-xs font-medium text-slate-500">{neighbor.distance.toFixed(3)}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {neighbor.fieldLabel} / {neighbor.subfieldLabel}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalNeighborRows({
  title,
  entries,
  emptyText,
  inspectTone = 'sky',
  onSelectTopic,
  onInspectEdge,
}) {
  return (
    <div className="space-y-2">
      <SectionTitle>{title}</SectionTitle>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.edgeId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    score {entry.score?.toFixed?.(2) ?? entry.score}
                  </p>
                </div>
                <Badge tone={inspectTone}>{entry.edge?.kind === 'BRIDGE_QUEUE_EDGE' ? 'Bridge' : 'Backbone'}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onSelectTopic(entry.nodeId)}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Focus topic
                </button>
                <button
                  type="button"
                  onClick={() => onInspectEdge(entry.edgeId)}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Inspect edge
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function TrunkLeafAttachmentRows({ attachments, onSelectTopic }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Local Leaves</SectionTitle>
      {attachments.length ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {attachment.leafTopic?.label || attachment.leaf?.label || attachment.labels?.source}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    work count {formatCount(attachment.weight?.work_count)} · share {formatShare(attachment.weight?.share_within_leaf)}
                  </p>
                </div>
                <Badge tone="emerald">Leaf attachment</Badge>
              </div>
              <button
                type="button"
                onClick={() => onSelectTopic(attachment.source)}
                className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 mt-3"
              >
                Select leaf topic
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No local leaf attachments are available for this selected trunk topic.</p>
      )}
    </div>
  );
}

function LeafAttachmentContextRows({ attachments, owningTrunkTopic, onSelectTopic }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Attachment Context</SectionTitle>
      {owningTrunkTopic && (
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-900">{owningTrunkTopic.label}</p>
              <p className="text-xs text-sky-700 mt-1">
                Dominant trunk / owning-trunk context from the accepted local graph sidecar.
              </p>
            </div>
            <Badge tone="sky">Owning trunk</Badge>
          </div>
          <button
            type="button"
            onClick={() => onSelectTopic(owningTrunkTopic.id)}
            className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-50 mt-3"
          >
            Focus trunk topic
          </button>
        </div>
      )}

      {attachments.length ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {attachment.trunkTopic?.label || attachment.trunk?.label || attachment.labels?.target}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    work count {formatCount(attachment.weight?.work_count)} · share {formatShare(attachment.weight?.share_within_leaf)}
                  </p>
                </div>
                <Badge tone={owningTrunkTopic?.id === attachment.target ? 'sky' : 'slate'}>
                  {owningTrunkTopic?.id === attachment.target ? 'Owning trunk' : 'Attachment'}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => onSelectTopic(attachment.target)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 mt-3"
              >
                Focus trunk topic
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No local attachment rows were found for this selected leaf topic.</p>
      )}
    </div>
  );
}

function TagList({ title, items, tone = 'slate' }) {
  return (
    <div className="space-y-2">
      <SectionTitle>{title}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <Badge key={item} tone={tone}>{item}</Badge>
        )) : <span className="text-xs text-slate-500">None</span>}
      </div>
    </div>
  );
}

function EvidenceSection({
  selectedLocalEdge,
  hasRequestedEvidence,
  evidenceItems,
  evidenceLoading,
  evidenceError,
  onRequestEvidence,
}) {
  if (!selectedLocalEdge) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-5">
        Select one local backbone or bridge edge from the neighbor lists to inspect support summary and load evidence on demand.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'blue' : 'amber'}>
            {selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'Backbone edge' : 'Bridge queue edge'}
          </Badge>
          <Badge tone="slate">Candidate only</Badge>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {selectedLocalEdge.labels?.source} → {selectedLocalEdge.labels?.target}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {selectedLocalEdge.kind === 'BACKBONE_EDGE'
              ? 'This edge is part of the accepted candidate backbone sidecar.'
              : 'This bridge candidate stays secondary review context and is never default-visible at full-canvas scale.'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <StatRow label="Candidate score" value={selectedLocalEdge.score?.toFixed?.(2) ?? selectedLocalEdge.score} />
        <StatRow label="Reference support" value={formatCount(selectedLocalEdge.support?.reference_count)} />
        <StatRow label="Support families" value={formatCount(selectedLocalEdge.support?.family_count)} />
        <StatRow label="Shared authors" value={formatCount(selectedLocalEdge.support?.shared_author_count)} />
        <StatRow label="Coassignment" value={formatCount(selectedLocalEdge.support?.coassignment_count)} />
      </div>

      <TagList title="Reason tags" items={selectedLocalEdge.support?.reason_tags || []} tone="blue" />
      <TagList title="Risk tags" items={selectedLocalEdge.risk_tags || []} tone="slate" />
      <TagList
        title={selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'Keep reasons' : 'Bridge reasons'}
        items={selectedLocalEdge.kind === 'BACKBONE_EDGE'
          ? selectedLocalEdge.keep_reasons || []
          : selectedLocalEdge.bridge_reasons || []}
        tone={selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'emerald' : 'amber'}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SectionTitle>Evidence</SectionTitle>
            <p className="text-xs text-slate-500 mt-1">
              Evidence remains sidecar-only and is loaded on demand. `evidence_lookup.json` is never fetched on first page load.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestEvidence(selectedLocalEdge.id)}
            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900"
          >
            {evidenceLoading && hasRequestedEvidence ? 'Loading...' : 'Load evidence'}
          </button>
        </div>

        {evidenceError && hasRequestedEvidence && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {evidenceError.message}
          </div>
        )}

        {hasRequestedEvidence && !evidenceLoading && !evidenceItems.length && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {selectedLocalEdge.kind === 'BRIDGE_QUEUE_EDGE'
              ? 'This bridge candidate has no separate evidence sidecar rows in the current visualization bundle.'
              : 'No evidence rows were found for this edge in the current sidecar.'}
          </div>
        )}

        {evidenceItems.length > 0 && (
          <div className="space-y-2">
            {evidenceItems.slice(0, 5).map((item) => (
              <div key={`${selectedLocalEdge.id}-${item.rank}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
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
    </div>
  );
}

export default function OpenAlexEmbeddingsDetailPanel({
  selectedTopic,
  nearestNeighbors,
  topicsById,
  graph,
  graphLoading,
  graphError,
  localGraph,
  selectedLocalEdge,
  hasRequestedEvidence,
  evidenceItems,
  evidenceLoading,
  evidenceError,
  showLocalOverlay,
  showBridgeQueue,
  onToggleLocalOverlay,
  onToggleBridgeQueue,
  onRequestEvidence,
  onSelectLocalEdge,
  onSelectTopic,
}) {
  if (!selectedTopic) {
    return (
      <aside className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
        <div className="space-y-4">
          <div>
            <SectionTitle>Selection</SectionTitle>
            <h2 className="text-lg font-semibold text-slate-900 mt-1">Topic Detail Panel</h2>
          </div>
          <p className="text-sm text-slate-600 leading-6">
            搜索一个 topic，或在 Pixi 点场中选择一个局部点簇。右侧面板会显示 embedding 邻域、taxonomy，以及选中 topic 对应的局部 graph sidecar context。
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-6">
            Coordinates are exploratory navigation aids. Local graph overlays stay selection-driven, bridge queue remains opt-in,
            and evidence remains on demand only.
          </div>
        </div>
      </aside>
    );
  }

  const dominantTrunk = selectedTopic.dominantTrunkTopicId
    ? topicsById[selectedTopic.dominantTrunkTopicId] || null
    : null;
  const isTrunkSelection = localGraph?.kind === 'trunk';

  return (
    <aside className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={selectedTopic.isTrunk ? 'blue' : 'emerald'}>
              {selectedTopic.isTrunk ? 'Trunk topic' : 'Leaf topic'}
            </Badge>
            <Badge tone="sky">{selectedTopic.fieldLabel}</Badge>
            {selectedLocalEdge && (
              <Badge tone={selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'blue' : 'amber'}>
                {selectedLocalEdge.kind === 'BACKBONE_EDGE' ? 'Local backbone edge' : 'Local bridge edge'}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{selectedTopic.label}</h2>
            <p className="text-sm text-slate-600 mt-1">
              {selectedTopic.subfieldLabel} / {selectedTopic.candidateState || 'candidate_statistical'}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-6">
            This topic stays inside the accepted candidate-only posture. Spatial proximity and local overlay links are exploratory
            context, not reviewed truth or directional evolution claims.
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Taxonomy</SectionTitle>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
            <p><span className="font-medium text-slate-900">Domain:</span> {selectedTopic.domainLabel}</p>
            <p><span className="font-medium text-slate-900">Field:</span> {selectedTopic.fieldLabel}</p>
            <p><span className="font-medium text-slate-900">Subfield:</span> {selectedTopic.subfieldLabel}</p>
            {dominantTrunk && (
              <p>
                <span className="font-medium text-slate-900">Dominant trunk hint:</span>{' '}
                <button
                  type="button"
                  onClick={() => onSelectTopic(dominantTrunk.id)}
                  className="text-sky-700 hover:text-sky-900 underline underline-offset-2"
                >
                  {dominantTrunk.label}
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Bundle Hints</SectionTitle>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 space-y-1">
            <p><span className="font-medium text-slate-900">Coordinates:</span> {selectedTopic.coordinates.x.toFixed(3)}, {selectedTopic.coordinates.y.toFixed(3)}</p>
            <p><span className="font-medium text-slate-900">Retained endpoint:</span> {selectedTopic.graphFlags?.retainedEndpoint ? 'yes' : 'no / n.a.'}</p>
            <p><span className="font-medium text-slate-900">Isolated trunk:</span> {selectedTopic.graphFlags?.isolatedTrunk ? 'yes' : 'no / n.a.'}</p>
          </div>
        </div>

        <SearchAliasList aliases={selectedTopic.searchAliases} />
        <NearestNeighborsSection neighbors={nearestNeighbors} onSelectTopic={onSelectTopic} />

        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            <div>
              <SectionTitle>Local Graph Context</SectionTitle>
              <p className="text-xs text-slate-500 mt-1">
                The accepted graph-v1 bundle stays sidecar-only here. The global view remains point-first, and bridge queue stays secondary.
              </p>
            </div>

            <OverlayToggleRow
              showLocalOverlay={showLocalOverlay}
              showBridgeQueue={showBridgeQueue}
              bridgeDisabled={!isTrunkSelection || !localGraph?.bridgeNeighbors?.length}
              onToggleLocalOverlay={onToggleLocalOverlay}
              onToggleBridgeQueue={onToggleBridgeQueue}
            />
          </div>

          {graphLoading && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Loading the accepted local graph sidecar for this selection...
            </div>
          )}

          {graphError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              Failed to load the accepted local graph sidecar: {graphError.message}
            </div>
          )}

          {!graphLoading && !graphError && graph && (
            <>
              {graph.disclaimer && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-5">
                  {graph.disclaimer}
                </div>
              )}

              {isTrunkSelection ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <StatRow label="Primary work count" value={formatCount(localGraph?.trunkStats?.primaryWorkCount)} />
                    <StatRow label="Backbone degree" value={formatCount(localGraph?.trunkStats?.backboneDegree)} />
                    <StatRow label="Bridge adjacency" value={formatCount(localGraph?.trunkStats?.bridgeDegree)} />
                    <StatRow label="Leaf attachments" value={formatCount(localGraph?.trunkStats?.leafAttachmentCount)} />
                  </div>

                  <LocalNeighborRows
                    title="Backbone Neighbors"
                    entries={localGraph?.backboneNeighbors || []}
                    emptyText="No local backbone neighbors are available in the current focused set."
                    inspectTone="blue"
                    onSelectTopic={onSelectTopic}
                    onInspectEdge={onSelectLocalEdge}
                  />

                  {showBridgeQueue ? (
                    <LocalNeighborRows
                      title="Bridge Queue"
                      entries={localGraph?.bridgeNeighbors || []}
                      emptyText="No bridge candidates are available in the current local focus."
                      inspectTone="amber"
                      onSelectTopic={onSelectTopic}
                      onInspectEdge={onSelectLocalEdge}
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-5">
                      Bridge queue remains hidden by default. Turn it on only when you want secondary review context for this selected trunk topic.
                    </div>
                  )}

                  <TrunkLeafAttachmentRows
                    attachments={localGraph?.trunkLeafAttachments || []}
                    onSelectTopic={onSelectTopic}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-5">
                    Leaf selections stay subordinate local context. The panel shows owning-trunk and attachment information without promoting the leaf into a peer-level backbone claim.
                  </div>

                  <LeafAttachmentContextRows
                    attachments={localGraph?.leafSelectionAttachments || []}
                    owningTrunkTopic={localGraph?.owningTrunkTopic || dominantTrunk}
                    onSelectTopic={onSelectTopic}
                  />
                </div>
              )}

              <EvidenceSection
                selectedLocalEdge={selectedLocalEdge}
                hasRequestedEvidence={hasRequestedEvidence}
                evidenceItems={evidenceItems}
                evidenceLoading={evidenceLoading}
                evidenceError={evidenceError}
                onRequestEvidence={onRequestEvidence}
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

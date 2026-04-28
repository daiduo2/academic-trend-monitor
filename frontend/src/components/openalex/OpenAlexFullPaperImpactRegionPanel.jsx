function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

export default function OpenAlexFullPaperImpactRegionPanel({
  activeTopicLabel = 'All topics',
  regionSummary = null,
}) {
  if (!regionSummary) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Region evidence</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Impact-first panel</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Select a projected region to inspect regional paper counts, citation intensity, topic mix, and representative papers.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Region evidence</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Impact-first panel</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Active topic scope: {activeTopicLabel}. Read this as regional evidence over the current filter, not as cluster truth.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile
          label="Smoothed impact"
          value={Number(regionSummary.smoothedImpact || 0).toFixed(1)}
        />
        <SummaryTile
          label="Mean citations"
          value={Number(regionSummary.meanCitations || 0).toFixed(1)}
        />
        <SummaryTile
          label="Max citations"
          value={Number(regionSummary.maxCitations || 0).toLocaleString()}
        />
        <SummaryTile
          label="Region papers"
          value={Number(regionSummary.regionPaperCount || 0).toLocaleString()}
        />
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Topic mix</p>
        <div className="mt-3 space-y-2">
          {regionSummary.topicMix.length ? regionSummary.topicMix.map((topic) => (
            <div
              key={topic.topicId || topic.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{topic.label || 'Unknown topic'}</p>
                <span className="shrink-0 text-xs text-slate-400">{topic.count.toLocaleString()}</span>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-400">
              No topic evidence is available for this region.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Representative papers</p>
        <div className="mt-3 space-y-2">
          {regionSummary.representatives.length ? regionSummary.representatives.map((paper) => (
            <div key={paper.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3">
              <p className="text-sm font-medium text-white">{paper.title || 'Untitled work'}</p>
              <p className="mt-1 text-xs text-slate-400">
                {paper.publicationYear || 'Unknown year'} · cited by {Number(paper.citedByCount || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{paper.primaryTopicDisplayName || 'Unknown topic'}</p>
            </div>
          )) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-400">
              No representative papers were available for this region.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

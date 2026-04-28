function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function formatShare(share) {
  return `${Math.round(Number(share || 0) * 100)}% of region papers`;
}

export default function OpenAlexFullPaperImpactShellRegionPanel({
  activeTopicLabel = 'All topics',
  regionSummary = null,
}) {
  if (!regionSummary) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Region evidence</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Shell region evidence</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Select a shell patch to inspect its regional citation evidence, density heat, and topic mix inside the current filter scope.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Representative papers stay secondary in this first shell view. Use this panel to read the region before dropping to paper-level inspection.
        </p>
      </aside>
    );
  }

  const summary = regionSummary.summary || {};
  const topicMix = Array.isArray(regionSummary.topicMix) ? regionSummary.topicMix : [];

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Region evidence</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Shell region evidence</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Active topic scope: {activeTopicLabel}. Read the shell as regional evidence over the current filter, not as a canonical cluster boundary.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Impact score" value={Number(regionSummary.impactScore || 0).toFixed(2)} />
        <SummaryTile label="Relative heat" value={Number(summary.localRelativeHeat || 0).toFixed(2)} />
        <SummaryTile label="Mean citations" value={Number(summary.meanCitations || 0).toFixed(1)} />
        <SummaryTile label="Max citations" value={Number(summary.maxCitations || 0).toLocaleString()} />
        <SummaryTile label="Region papers" value={Number(summary.regionPaperCount || 0).toLocaleString()} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Topic mix</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Regional evidence first</p>
        </div>
        <div className="mt-3 space-y-2">
          {topicMix.length ? topicMix.map((topic) => (
            <div
              key={topic.topicId || topic.topicDisplayName}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{topic.topicDisplayName || 'Unknown topic'}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatShare(topic.share)}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {Number(topic.paperCount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-400">
              No topic-mix evidence is available for this shell region.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

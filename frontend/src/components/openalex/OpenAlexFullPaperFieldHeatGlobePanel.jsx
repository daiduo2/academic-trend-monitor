function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function getPreferredPatchColorValue(patch) {
  return patch?.fieldColor || patch?.color || patch?.fillColor || '#94a3b8';
}

export default function OpenAlexFullPaperFieldHeatGlobePanel({
  patch = null,
}) {
  if (!patch) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Topic overview</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Topic heat globe</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Select a topic patch to inspect its paper volume, mean citations, and relative heat inside the current macro view.
        </p>
      </aside>
    );
  }

  const summary = patch.summary || {};
  const topicLabel = patch.topicDisplayName || patch.topicId || 'Unknown topic';

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Topic overview</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Topic heat globe</h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-white/20"
          style={{ backgroundColor: getPreferredPatchColorValue(patch) }}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-white">{topicLabel}</p>
          <p className="truncate text-xs text-slate-400">
            {patch.fieldDisplayName || 'Unknown field'}
            {patch.subfieldDisplayName ? ` · ${patch.subfieldDisplayName}` : ''}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Mean citations" value={Number(summary.meanCitations || 0).toFixed(1)} />
        <SummaryTile label="Paper count" value={Number(summary.paperCount || 0).toLocaleString()} />
        <SummaryTile label="Relative heat" value={Number(patch.relativeHeat || 0).toFixed(2)} />
        <SummaryTile label="Topic id" value={patch.topicId || patch.patchId || 'Unknown'} />
      </div>
    </aside>
  );
}

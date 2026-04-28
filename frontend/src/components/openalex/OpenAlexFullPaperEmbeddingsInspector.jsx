export default function OpenAlexFullPaperEmbeddingsInspector({
  onClear,
  paper,
  paperColor = '#f8fafc',
}) {
  if (!paper) {
    return null;
  }

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: paperColor }}
            />
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Selected paper</p>
          </div>
          <h2 className="text-sm font-semibold leading-6 text-white">{paper.title || 'Untitled work'}</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Clear
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Work ID</p>
          <p className="mt-2 break-all font-mono text-[12px] text-slate-100">{paper.workId}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Primary Topic</p>
          <p className="mt-2 text-slate-100">{paper.primaryTopicDisplayName}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Publication Year</p>
          <p className="mt-2 text-slate-100">{paper.publicationYear || 'Unknown'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Cited By</p>
          <p className="mt-2 text-slate-100">{paper.citedByCount.toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        This selection surface exposes local paper metadata only. It does not turn the
        <code className="mx-1 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-200">title_only_baseline</code>
        route into a semantic-neighborhood or cluster-truth claim.
      </p>
    </aside>
  );
}

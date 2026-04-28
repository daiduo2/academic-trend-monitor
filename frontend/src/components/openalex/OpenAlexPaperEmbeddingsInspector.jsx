function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

export default function OpenAlexPaperEmbeddingsInspector({
  paper,
  topicDisplayName,
  onClearSelection,
}) {
  if (!paper) {
    return null;
  }

  return (
    <aside className="w-full border-l border-slate-800 bg-slate-950/95 xl:max-w-[360px]">
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Paper Inspector</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{paper.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Selected inside <span className="text-slate-200">{topicDisplayName}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Clear
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard label="Publication Year" value={paper.publicationYear || 'Unknown'} />
          <StatCard label="Cited By" value={paper.citedByCount} />
          <StatCard label="Abstract" value={paper.abstractAvailable ? 'Available' : 'Title only'} />
          <StatCard label="Work ID" value={paper.workId} />
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Search Text</p>
          {paper.abstractAvailable && paper.abstractText ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">{paper.abstractText}</p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-amber-100">
              This paper is currently title-only inside the accepted pilot bundle, so the inspector does not have a reconstructed abstract excerpt yet.
            </p>
          )}
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
          The viewport remains point-cloud-first: selecting a paper opens local metadata only and does not imply citation or cluster truth.
        </div>
      </div>
    </aside>
  );
}

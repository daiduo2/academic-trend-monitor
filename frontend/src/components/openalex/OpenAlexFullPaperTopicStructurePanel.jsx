import { resolveTopicFamilyColor } from '../../utils/openAlexFullPaperTopicStructureScene';

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function getTopicColor(topic) {
  return topic?.colorHex || resolveTopicFamilyColor(topic);
}

export default function OpenAlexFullPaperTopicStructurePanel({
  topic = null,
}) {
  if (!topic) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Topic structure</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Topic structure</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Hover or select a topic fragment to inspect the topic family, paper count, and citation profile inside the structure view.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Disconnected fragments still resolve to one topic identity, so the panel stays topic-level instead of dropping to raw geometry pieces.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Topic structure</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Topic structure</h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-white/20"
          style={{ backgroundColor: getTopicColor(topic) }}
        />
        <div>
          <p className="text-base font-medium text-white">{topic.topicDisplayName || topic.topicId || 'Unknown topic'}</p>
          <p className="mt-1 text-xs text-slate-400">{topic.fieldDisplayName || 'Unknown field'}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Subfield" value={topic.subfieldDisplayName || 'Unknown'} />
        <SummaryTile label="Topic id" value={topic.topicId || 'Unknown'} />
        <SummaryTile label="Paper count" value={Number(topic.paperCount || 0).toLocaleString()} />
        <SummaryTile label="Mean citations" value={Number(topic.meanCitations || 0).toFixed(1)} />
      </div>
    </aside>
  );
}

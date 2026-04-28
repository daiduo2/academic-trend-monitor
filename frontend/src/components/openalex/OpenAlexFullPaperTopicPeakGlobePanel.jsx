import { resolveTopicPeakColor } from '../../utils/openAlexFullPaperTopicPeakGlobeScene';

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export default function OpenAlexFullPaperTopicPeakGlobePanel({
  topic = null,
}) {
  if (!topic) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">主题山峰地形</p>
        <h2 className="mt-2 text-lg font-semibold text-white">主题山峰地形</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          旋转或选择地形上的主题山峰，查看它所属子领域附近的热度结构和当前影响力画像。
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          高度表示影响力分位分数，山体范围随主题规模扩大，峰形越尖锐表示引用质量越突出。
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">主题山峰地形</p>
      <h2 className="mt-2 text-lg font-semibold text-white">主题山峰地形</h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-white/20"
          style={{ backgroundColor: topic?.subfieldColor || topic?.colorHex || resolveTopicPeakColor(topic) }}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-white">{topic.topicDisplayName || topic.topicId || '未知主题'}</p>
          <p className="truncate text-xs text-slate-400">{topic.subfieldDisplayName || '未知子领域'}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="论文数" value={Number(topic.paperCount || 0).toLocaleString()} />
        <SummaryTile label="总引用数" value={Number(topic.totalCitations || 0).toLocaleString()} />
        <SummaryTile label="平均引用数" value={Number(topic.averageCitations || 0).toFixed(1)} />
        <SummaryTile label="影响力分数" value={formatScore(topic.influenceScore)} />
        <SummaryTile label="规模分位" value={formatPercent(topic.volumeScore)} />
        <SummaryTile label="质量分位" value={formatPercent(topic.citationQualityScore)} />
        <SummaryTile label="子领域" value={topic.subfieldDisplayName || '未知'} />
        <SummaryTile label="主题 ID" value={topic.topicId || '未知'} />
      </div>
    </aside>
  );
}

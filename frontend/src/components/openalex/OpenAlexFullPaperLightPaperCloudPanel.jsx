function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function formatAverageCitations(value) {
  const numericValue = Number(value || 0);
  return numericValue.toFixed(2);
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getTopicColor(topic) {
  return topic?.colorHex || topic?.subfieldColor || '#38bdf8';
}

function TopicCandidateList({
  hideUnselectedTopics,
  onClearTopics,
  onToggleHideUnselected,
  onToggleTopic,
  selectedTopicIds,
  topics,
}) {
  const selectedTopicSet = new Set(asArray(selectedTopicIds));
  const candidateTopics = asArray(topics).slice().sort((left, right) => (
    Number(right?.paperCount || 0) - Number(left?.paperCount || 0)
  ));

  if (!candidateTopics.length) {
    return null;
  }

  return (
    <section className="mt-5 border-t border-slate-800 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">候选领域</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            多选领域后，点云会保留语义邻近关系，并弱化未选领域。
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          onClick={() => onClearTopics?.()}
        >
          清空选择
        </button>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
        <span>隐藏其他领域</span>
        <input
          type="checkbox"
          checked={Boolean(hideUnselectedTopics)}
          className="h-4 w-4 accent-sky-400"
          onChange={(event) => onToggleHideUnselected?.(event.target.checked)}
        />
      </label>

      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1" data-testid="paper-cloud-topic-candidates">
        {candidateTopics.map((candidateTopic) => {
          const topicId = candidateTopic?.topicId || '';
          const topicName = candidateTopic?.topicDisplayName || topicId || '未知主题';
          const sampledCount = asArray(candidateTopic?.sampledPointIndices).length;

          return (
            <label
              key={topicId || topicName}
              className="flex cursor-pointer gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-3 transition hover:border-slate-600 hover:bg-slate-900"
            >
              <input
                type="checkbox"
                checked={selectedTopicSet.has(topicId)}
                className="mt-1 h-4 w-4 shrink-0 accent-sky-400"
                onChange={() => onToggleTopic?.(topicId)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: getTopicColor(candidateTopic) }}
                  />
                  <span className="truncate text-sm font-medium text-slate-100">{topicName}</span>
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {candidateTopic?.subfieldDisplayName || '未知子领域'} · {formatInteger(candidateTopic?.paperCount)} 篇论文
                  {sampledCount ? ` · ${sampledCount} 个抽样点` : ''}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function OpenAlexFullPaperLightPaperCloudPanel({
  hideUnselectedTopics = false,
  onClearTopics,
  onToggleHideUnselected,
  onToggleTopic,
  selectedTopicIds = [],
  topic = null,
  topics = [],
}) {
  if (!topic) {
    return (
      <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">文献点云详情</p>
        <h2 className="mt-2 text-lg font-semibold text-white">文献点云详情</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          在点云中悬停或选择一个主题，查看它附近的语义邻域。
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          高区分度主题颜色和标签用于保持全局可读性；多选候选领域后，可对比它们之间的语义距离。
        </p>
        <TopicCandidateList
          hideUnselectedTopics={hideUnselectedTopics}
          onClearTopics={onClearTopics}
          onToggleHideUnselected={onToggleHideUnselected}
          onToggleTopic={onToggleTopic}
          selectedTopicIds={selectedTopicIds}
          topics={topics}
        />
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-slate-700/80 bg-slate-950/94 p-4 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">文献点云详情</p>
      <h2 className="mt-2 text-lg font-semibold text-white">文献点云详情</h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border border-white/20"
          style={{ backgroundColor: getTopicColor(topic) }}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-white">
            {topic.topicDisplayName || topic.topicId || '未知主题'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {topic.subfieldDisplayName || '未知子领域'}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="子领域" value={topic.subfieldDisplayName || '未知'} />
        <SummaryTile label="主题 ID" value={topic.topicId || '未知'} />
        <SummaryTile label="论文数" value={formatInteger(topic.paperCount)} />
        <SummaryTile label="总引用数" value={formatInteger(topic.totalCitations)} />
        <SummaryTile label="平均引用数" value={formatAverageCitations(topic.averageCitations)} />
      </div>
      <TopicCandidateList
        hideUnselectedTopics={hideUnselectedTopics}
        onClearTopics={onClearTopics}
        onToggleHideUnselected={onToggleHideUnselected}
        onToggleTopic={onToggleTopic}
        selectedTopicIds={selectedTopicIds}
        topics={topics}
      />
    </aside>
  );
}

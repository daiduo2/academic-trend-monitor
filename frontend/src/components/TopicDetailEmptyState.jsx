export function TopicDetailEmptyState({ sourceMode = 'baseline', loading = false }) {
  const steps = sourceMode === 'pr_conditional'
    ? [
        '先从 Demo 导览或稳定基线开始，再决定要不要切到 Research Preview。',
        '紫色关系只代表 preview 候选，不代表默认 baseline。',
      ]
    : [
        '先点一条粗的演化主线两端主题，再打开右侧讲述卡。',
        '绿色是 confirmed baseline，黄色是待复核，细线和虚线都只是背景结构。',
      ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 h-full min-h-[400px]">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {loading ? '正在打开讲述卡' : '选择一个主题开始讲解'}
          </p>
          <p className="text-xs text-gray-500 leading-6">
            {loading
              ? '右侧会切到更完整的 topic 讲述卡，并与图中的高亮状态保持同步。'
              : sourceMode === 'pr_conditional'
                ? '当前是 preview bundle，但默认 baseline 没变。先点一个主题，再看它属于 confirmed 还是 preview 候选。'
                : '当前是默认 baseline 入口。先点一个主题，右侧会按讲述口径解释它。'}
          </p>
        </div>
        {!loading && (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-900">Step {index + 1}</p>
                <p className="text-xs text-slate-600 leading-5 mt-1">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TopicDetailEmptyState;

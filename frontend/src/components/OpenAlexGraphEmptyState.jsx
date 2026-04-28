export function OpenAlexGraphEmptyState() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 min-h-[420px]">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-1">选择一个 trunk topic 或 candidate edge</p>
          <p className="text-xs text-slate-600 leading-6">
            默认视图只显示 trunk topics 和 candidate backbone。bridge queue 保持关闭，叶子主题只在局部上下文里出现。
          </p>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-900">Step 1</p>
            <p className="text-xs text-slate-600 leading-5 mt-1">
              先点一个 trunk topic，右侧会显示它的主干邻居、bridge 邻接数和局部叶子挂载。
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-900">Step 2</p>
            <p className="text-xs text-slate-600 leading-5 mt-1">
              再点一条 edge 看 support summary。只有明确请求后，页面才会加载 `evidence_lookup.json`。
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium text-amber-900">Candidate-only</p>
            <p className="text-xs text-amber-700 leading-5 mt-1">
              这里展示的是 candidate graph structure，不是 reviewed truth，也不是演化箭头语义。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpenAlexGraphEmptyState;

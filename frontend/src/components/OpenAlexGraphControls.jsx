const LABEL_MODE_OPTIONS = [
  { value: 'focus', label: '聚焦标签' },
  { value: 'all', label: '全部标签' },
  { value: 'off', label: '隐藏标签' },
];

export function OpenAlexGraphControls({
  showBridgeQueue,
  onToggleBridgeQueue,
  labelMode,
  onLabelModeChange,
  onResetView,
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={showBridgeQueue}
              onChange={(event) => onToggleBridgeQueue(event.target.checked)}
            />
            <span>显示 bridge queue</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">标签密度</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {LABEL_MODE_OPTIONS.map((option) => {
                const active = labelMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onLabelModeChange(option.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetView}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900"
        >
          重置视图
        </button>
      </div>
    </div>
  );
}

export default OpenAlexGraphControls;

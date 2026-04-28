import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { resolveHierarchyNodeDetail } from '../utils/topicResolution';

export default function TopicDetailModal({ topic, trends, onClose, onViewTrend }) {
  if (!topic) return null;

  const fullTopic = resolveHierarchyNodeDetail(topic, trends);
  const history = fullTopic.history || [];
  const keywords = fullTopic.keywords || [];

  const chartData = history.map(h => ({
    period: h.period,
    count: h.paper_count
  }));

  const totalPapers = history.reduce((sum, h) => sum + h.paper_count, 0);
  const avgPapers = history.length > 0 ? Math.round(totalPapers / history.length) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[24px] border border-slate-700 bg-slate-950 text-slate-100 shadow-[0_28px_90px_rgba(2,6,23,0.58)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{topic.name}</h3>
            {topic.hierarchy_path && (
              <p className="text-sm text-slate-500 mt-1">
                {topic.hierarchy_path.join(' > ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-100 text-2xl"
            aria-label="关闭"
          >
            &times;
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-sky-300">{topic.paper_count || topic.latest_paper_count}</p>
            <p className="text-sm text-slate-500">最新论文数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-300">{totalPapers}</p>
            <p className="text-sm text-slate-500">累计论文数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-300">{avgPapers}</p>
            <p className="text-sm text-slate-500">月均论文</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="p-6 border-b border-slate-800">
          <h4 className="text-sm font-medium text-slate-300 mb-4">论文数量趋势</h4>
          {chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(2, 6, 23, 0.96)',
                      border: '1px solid #334155',
                      borderRadius: '14px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">暂无趋势数据</p>
          )}
        </div>

        {/* Keywords */}
        <div className="p-6 border-b border-slate-800">
          <h4 className="text-sm font-medium text-slate-300 mb-3">关键词</h4>
          <div className="flex flex-wrap gap-2">
            {keywords.slice(0, 10).map((kw, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full bg-slate-900 text-slate-300 text-sm ring-1 ring-slate-800">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white"
          >
            关闭
          </button>
          <button
            onClick={() => onViewTrend && onViewTrend(fullTopic)}
            className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-medium hover:bg-sky-400"
          >
            {fullTopic.isAggregate ? '查看聚合趋势' : '在趋势追踪中查看'}
          </button>
        </div>
      </div>
    </div>
  );
}

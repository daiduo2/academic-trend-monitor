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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
            {topic.hierarchy_path && (
              <p className="text-sm text-gray-500 mt-1">
                {topic.hierarchy_path.join(' > ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="关闭"
          >
            &times;
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{topic.paper_count || topic.latest_paper_count}</p>
            <p className="text-sm text-gray-500">最新论文数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalPapers}</p>
            <p className="text-sm text-gray-500">累计论文数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{avgPapers}</p>
            <p className="text-sm text-gray-500">月均论文</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">论文数量趋势</h4>
          {chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无趋势数据</p>
          )}
        </div>

        {/* Keywords */}
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">关键词</h4>
          <div className="flex flex-wrap gap-2">
            {keywords.slice(0, 10).map((kw, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            关闭
          </button>
          <button
            onClick={() => onViewTrend && onViewTrend(fullTopic)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {fullTopic.isAggregate ? '查看聚合趋势' : '在趋势追踪中查看'}
          </button>
        </div>
      </div>
    </div>
  );
}

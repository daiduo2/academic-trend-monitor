import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * TimelineSummary Component
 *
 * Displays a bar chart showing active topic count and benchmark edge count
 * over time periods from the knowledge graph timeline data.
 *
 * @param {Object} props
 * @param {Object} props.data - Timeline data object with { version, timeline: [...] }
 * @param {number} props.height - Chart height in pixels (default: 200)
 */
export function TimelineSummary({ data, height = 200 }) {
  if (!data || !data.timeline || data.timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No timeline data available</p>
      </div>
    );
  }

  const { timeline } = data;

  // Compute trend insight
  const firstPeriod = timeline[0];
  const lastPeriod = timeline[timeline.length - 1];
  const topicTrend = lastPeriod.active_topic_count - firstPeriod.active_topic_count;
  const peakTopics = Math.max(...timeline.map(t => t.active_topic_count));
  const peakPeriod = timeline.find(t => t.active_topic_count === peakTopics)?.period;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">主题活跃趋势</h3>
        {data.version && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            v{data.version}
          </span>
        )}
      </div>

      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={timeline}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [value, name === 'active_topic_count' ? '活跃主题' : '基准边']}
              labelFormatter={(label) => `时间段: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="active_topic_count"
              name="Active Topics"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="benchmark_edge_count"
              name="Benchmark Edges"
              fill="#f59e0b"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {lastPeriod?.active_topic_count || 0}
          </p>
          <p className="text-xs text-gray-500">最新活跃主题</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-500">
            {lastPeriod?.benchmark_edge_count || 0}
          </p>
          <p className="text-xs text-gray-500">最新基准边</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700">
            {timeline.length}
          </p>
          <p className="text-xs text-gray-500">时间段总数</p>
          <p className="text-xs text-gray-400">{timeline[0]?.period} – {lastPeriod?.period}</p>
        </div>
      </div>

      {/* Trend Insight */}
      <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <span className="font-medium">趋势分析：</span>
        主题规模从 {firstPeriod.active_topic_count} 增长到 {lastPeriod.active_topic_count}（
        <span className={topicTrend >= 0 ? 'text-green-600' : 'text-red-500'}>
          {topicTrend >= 0 ? '+' : ''}{topicTrend}
        </span>
        ），峰值出现在 {peakPeriod}（{peakTopics} 个主题）。
      </div>
    </div>
  );
}

export default TimelineSummary;

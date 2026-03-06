import { useState } from 'react';
import { useData } from '../hooks/useData';
import { TrendChart } from '../components/TrendChart';

export default function TrendView() {
  const { data, loading, error } = useData();
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;

  // Get disciplines
  const disciplines = ['all', ...new Set(
    Object.values(data.topics).map(t => {
      const cat = t.representative_docs?.[0]?.primary_category || '';
      return cat.split('.')[0];
    }).filter(Boolean)
  )];

  // Filter and sort trends
  const trendData = Object.entries(data.trends)
    .filter(([id, trend]) => {
      if (selectedDiscipline === 'all') return true;
      const topic = data.topics[id];
      const cat = topic?.representative_docs?.[0]?.primary_category || '';
      return cat.startsWith(selectedDiscipline);
    })
    .sort((a, b) => {
      const countA = a[1].history?.[a[1].history.length - 1]?.paper_count || 0;
      const countB = b[1].history?.[b[1].history.length - 1]?.paper_count || 0;
      return countB - countA;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium">学科筛选:</label>
        <select
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="all">全部</option>
          {disciplines.filter(d => d !== 'all').map(d => (
            <option key={d} value={d}>{d.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Trend List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trendData.map(([topicId, trend]) => (
          <div key={topicId} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">
              {trend.name || topicId}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              关键词: {trend.keywords?.slice(0, 5).join(', ')}
            </p>
            {trend.history && (
              <TrendChart
                data={trend.history}
                width={400}
                height={200}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

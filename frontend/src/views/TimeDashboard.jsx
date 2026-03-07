import { useState, useMemo, useEffect } from 'react';
import { useDomainData, getLayer1List, getLayer2List, getTopicsWithTrends } from '../hooks/useDomainData';
import { TAXONOMY } from '../data/taxonomy';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { resolveGlobalTopicsDetail } from '../utils/topicResolution';

export default function TimeDashboard() {
  const { data, loading, error } = useDomainData();
  const [selectedLayer1, setSelectedLayer1] = useState('');
  const [selectedLayer2, setSelectedLayer2] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [selectedTopicLabel, setSelectedTopicLabel] = useState('');

  // Read URL query params on mount (from DomainDashboard navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topic');
    const topicIds = params.get('topicIds');
    const label = params.get('label');
    const layer1 = params.get('layer1');
    const layer2 = params.get('layer2');

    if (layer1) {
      setSelectedLayer1(layer1);
    }

    if (layer2) {
      setSelectedLayer2(layer2);
    }

    if (topicIds) {
      setSelectedTopicIds(topicIds.split(',').filter(Boolean));
    }

    if (topicId) {
      setSelectedTopicId(topicId);
    }

    if (label) {
      setSelectedTopicLabel(label);
    }
  }, []);

  // Compute all values first (before any conditional returns)
  const layer1List = useMemo(() => {
    return data?.structure ? getLayer1List(data.structure) : [];
  }, [data]);

  const layer2List = useMemo(() => {
    return data?.structure && selectedLayer1
      ? getLayer2List(data.structure, selectedLayer1)
      : [];
  }, [data, selectedLayer1]);

  const topicsWithTrends = useMemo(() => {
    return data?.structure && selectedLayer1 && selectedLayer2
      ? getTopicsWithTrends(data.structure, data.trends, selectedLayer1, selectedLayer2)
      : [];
  }, [data, selectedLayer1, selectedLayer2]);

  const aggregatedSelectedTopic = useMemo(() => {
    if (!selectedTopicIds.length || !data?.trends?.trends) return null;

    return resolveGlobalTopicsDetail(selectedTopicIds, data.trends.trends, {
      id: selectedTopicIds[0],
      name: selectedTopicLabel || '聚合主题'
    });
  }, [selectedTopicIds, selectedTopicLabel, data?.trends?.trends]);

  const selectedTopic = useMemo(() => {
    if (aggregatedSelectedTopic) {
      return aggregatedSelectedTopic;
    }

    return topicsWithTrends.find(t => t.id === selectedTopicId);
  }, [aggregatedSelectedTopic, topicsWithTrends, selectedTopicId]);

  const selectedTopicTrend = useMemo(() => {
    return selectedTopic?.trend || selectedTopic?.history || [];
  }, [selectedTopic]);

  const trendChartData = useMemo(() => {
    if (!selectedTopic || !data?.periods) return [];
    const periodMap = new Map(data.periods.map(p => [p, 0]));
    selectedTopicTrend.forEach(h => {
      periodMap.set(h.period, h.paper_count);
    });
    return Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));
  }, [selectedTopic, selectedTopicTrend, data?.periods]);

  const trendStats = useMemo(() => {
    if (!selectedTopic || selectedTopicTrend.length < 2) return null;
    const counts = selectedTopicTrend.map(h => h.paper_count);
    const first = counts[0];
    const last = counts[counts.length - 1];
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    const growth = ((last - first) / first * 100).toFixed(1);
    return { first, last, max, min, avg, growth };
  }, [selectedTopic, selectedTopicTrend]);

  const layer1Options = useMemo(() => {
    return layer1List.map(l1 => ({
      value: l1,
      label: TAXONOMY.getLayer1Display(l1)
    }));
  }, [layer1List]);

  const layer2Options = useMemo(() => {
    return layer2List.map(l2 => ({
      value: l2,
      label: TAXONOMY.getLayer2Display(selectedLayer1, l2)
    }));
  }, [layer2List, selectedLayer1]);

  const sortedTopics = useMemo(() => {
    return [...topicsWithTrends].sort((a, b) => {
      const aTotal = a.trend.reduce((sum, h) => sum + h.paper_count, 0);
      const bTotal = b.trend.reduce((sum, h) => sum + h.paper_count, 0);
      return bTotal - aTotal;
    });
  }, [topicsWithTrends]);

  // Effects for initialization
  useEffect(() => {
    if (data && layer1List.length > 0 && !selectedLayer1) {
      setSelectedLayer1(layer1List[0]);
    }
  }, [data, layer1List, selectedLayer1]);

  useEffect(() => {
    if (layer2List.length > 0) {
      setSelectedLayer2(prev => prev || layer2List[0]);
    }
  }, [layer2List]);

  // When topic is selected via URL, find and set its layer1/layer2
  useEffect(() => {
    if (!data || !selectedTopicId || !data.structure) return;

    // Find topic in structure: data.structure[layer1][layer2] = topics array
    for (const [l1, l1Data] of Object.entries(data.structure)) {
      if (!l1Data || typeof l1Data !== 'object') continue;
      for (const [l2, topics] of Object.entries(l1Data)) {
        if (!Array.isArray(topics)) continue;
        const topic = topics.find(t => t.id === selectedTopicId);
        if (topic) {
          setSelectedLayer1(l1);
          setSelectedLayer2(l2);
          return;
        }
      }
    }
  }, [data, selectedTopicId]);

  // Now conditional returns
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">加载失败: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">趋势追踪分析</h2>
        <p className="text-gray-500">选择研究主题，查看其在连续时间内的热度变化趋势</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">学科 (Layer 1)</label>
            <select
              value={selectedLayer1}
              onChange={(e) => {
                setSelectedLayer1(e.target.value);
                setSelectedLayer2('');
                setSelectedTopicId('');
                setSelectedTopicIds([]);
                setSelectedTopicLabel('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {layer1Options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">子类 (Layer 2)</label>
            <select
              value={selectedLayer2}
              onChange={(e) => {
                setSelectedLayer2(e.target.value);
                setSelectedTopicId('');
                setSelectedTopicIds([]);
                setSelectedTopicLabel('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {layer2Options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">研究主题</label>
            <select
              value={selectedTopicId}
              onChange={(e) => {
                setSelectedTopicId(e.target.value);
                setSelectedTopicIds([]);
                setSelectedTopicLabel('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择主题</option>
              {sortedTopics.map(topic => {
                const total = topic.trend.reduce((sum, h) => sum + h.paper_count, 0);
                return (
                  <option key={topic.id} value={topic.id}>
                    {topic.name} ({total}篇)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Topic Info */}
      {selectedTopic && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{selectedTopic.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            关键词: {selectedTopic.keywords?.slice(0, 8).join(', ')}
          </p>
        </div>
      )}

      {/* Trend Stats */}
      {trendStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">初期热度</p>
            <p className="text-2xl font-bold text-blue-600">{trendStats.first}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">最新热度</p>
            <p className="text-2xl font-bold text-green-600">{trendStats.last}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">峰值</p>
            <p className="text-2xl font-bold text-purple-600">{trendStats.max}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">平均值</p>
            <p className="text-2xl font-bold text-orange-600">{trendStats.avg}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">增长率</p>
            <p className={`text-2xl font-bold ${parseFloat(trendStats.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trendStats.growth > 0 ? '+' : ''}{trendStats.growth}%
            </p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          热度趋势变化
          {selectedTopic && ` - ${selectedTopic.name}`}
        </h3>
        {selectedTopic ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-blue-600">论文数: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            请选择一个研究主题查看趋势
          </div>
        )}
      </div>

      {/* All Topics Trend Comparison */}
      {sortedTopics.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            该领域所有主题趋势对比
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                {sortedTopics.slice(0, 5).map((topic, index) => {
                  const chartData = data.periods.map(p => {
                    const historyItem = topic.trend.find(h => h.period === p);
                    return {
                      period: p,
                      count: historyItem ? historyItem.paper_count : 0
                    };
                  });

                  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

                  return (
                    <Line
                      key={topic.id}
                      data={chartData}
                      type="monotone"
                      dataKey="count"
                      name={topic.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {sortedTopics.slice(0, 5).map((topic, index) => {
              const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
              return (
                <div key={topic.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                  <span className="text-sm text-gray-600">{topic.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

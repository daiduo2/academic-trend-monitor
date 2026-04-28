import { useState, useMemo, useEffect } from 'react';
import { useDomainData, getLayer1List, getLayer2List, getTopicsWithTrends } from '../hooks/useDomainData';
import { TAXONOMY } from '../data/taxonomy';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import {
  DashboardPanel,
  DashboardSelect,
  DashboardShell,
  MetricCard,
} from '../components/dashboard/DashboardShell';
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
      <DashboardPanel className="flex h-64 items-center justify-center text-slate-400">
        加载中...
      </DashboardPanel>
    );
  }

  if (error) {
    return (
      <DashboardPanel className="border-rose-500/40 bg-rose-950/30 text-rose-200">
        加载失败: {error}
      </DashboardPanel>
    );
  }

  return (
    <DashboardShell
      eyebrow="arXiv · trend tracker"
      title="趋势追踪分析"
      description="选择研究主题，查看其在连续时间内的热度变化趋势。"
      metrics={[
        { label: '可选主题', value: sortedTopics.length.toLocaleString(), tone: 'sky' },
        { label: '时间段', value: (data?.periods?.length || 0).toLocaleString(), tone: 'violet' },
      ]}
    >
      <div className="space-y-5">
      {/* Controls */}
      <DashboardPanel title="筛选条件" description="先选学科和子类，再选一个研究主题查看连续时间热度。">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardSelect
            label="学科 (Layer 1)"
            value={selectedLayer1}
            onChange={(e) => {
              setSelectedLayer1(e.target.value);
              setSelectedLayer2('');
              setSelectedTopicId('');
              setSelectedTopicIds([]);
              setSelectedTopicLabel('');
            }}
            options={layer1Options}
          />

          <DashboardSelect
            label="子类 (Layer 2)"
            value={selectedLayer2}
            onChange={(e) => {
              setSelectedLayer2(e.target.value);
              setSelectedTopicId('');
              setSelectedTopicIds([]);
              setSelectedTopicLabel('');
            }}
            options={layer2Options}
          />

          <DashboardSelect
            label="研究主题"
            value={selectedTopicId}
            onChange={(e) => {
              setSelectedTopicId(e.target.value);
              setSelectedTopicIds([]);
              setSelectedTopicLabel('');
            }}
            options={[
              { label: '请选择主题', value: '' },
              ...sortedTopics.map(topic => {
                const total = topic.trend.reduce((sum, h) => sum + h.paper_count, 0);
                return {
                  label: `${topic.name} (${total}篇)`,
                  value: topic.id,
                };
              }),
            ]}
          />
        </div>
      </DashboardPanel>

      {/* Topic Info */}
      {selectedTopic && (
        <DashboardPanel>
          <h3 className="text-lg font-semibold text-white">{selectedTopic.name}</h3>
          <p className="text-sm text-slate-500 mt-1">
            关键词: {selectedTopic.keywords?.slice(0, 8).join(', ')}
          </p>
        </DashboardPanel>
      )}

      {/* Trend Stats */}
      {trendStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="初期热度" value={trendStats.first} tone="sky" />
          <MetricCard label="最新热度" value={trendStats.last} tone="emerald" />
          <MetricCard label="峰值" value={trendStats.max} tone="violet" />
          <MetricCard label="平均值" value={trendStats.avg} tone="amber" />
          <MetricCard
            label="增长率"
            value={`${trendStats.growth > 0 ? '+' : ''}${trendStats.growth}%`}
            tone={parseFloat(trendStats.growth) >= 0 ? 'emerald' : 'rose'}
          />
        </div>
      )}

      {/* Trend Chart */}
      <DashboardPanel title={`热度趋势变化${selectedTopic ? ` - ${selectedTopic.name}` : ''}`}>
        {selectedTopic ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.36}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl">
                          <p className="font-medium text-slate-100">{label}</p>
                          <p className="text-sky-300">论文数: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            请选择一个研究主题查看趋势
          </div>
        )}
      </DashboardPanel>

      {/* All Topics Trend Comparison */}
      {sortedTopics.length > 0 && (
        <DashboardPanel title="该领域所有主题趋势对比">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis dataKey="period" type="category" allowDuplicatedCategory={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(2, 6, 23, 0.96)',
                    border: '1px solid #334155',
                    borderRadius: '14px',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                {sortedTopics.slice(0, 5).map((topic, index) => {
                  const chartData = data.periods.map(p => {
                    const historyItem = topic.trend.find(h => h.period === p);
                    return {
                      period: p,
                      count: historyItem ? historyItem.paper_count : 0
                    };
                  });

                  const colors = ['#38bdf8', '#fb7185', '#34d399', '#f59e0b', '#a78bfa'];

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
              const colors = ['bg-sky-400', 'bg-rose-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400'];
              return (
                <div key={topic.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                  <span className="text-sm text-slate-400">{topic.name}</span>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}
      </div>
    </DashboardShell>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useDomainData, getLayer1List, getLayer2List, getTopicsForLayer2 } from '../hooks/useDomainData';
import { TAXONOMY } from '../data/taxonomy';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import HierarchyTree from '../components/HierarchyTree';
import BreadcrumbNav from '../components/BreadcrumbNav';
import TopicDetailModal from '../components/TopicDetailModal';
import {
  DashboardPanel,
  DashboardSelect,
  DashboardShell,
} from '../components/dashboard/DashboardShell';
import { getNodesAtDepth, findNodeByPath, enrichTreeWithPaperCounts } from '../utils/hierarchyUtils';
import { resolveHierarchyNodeDetail } from '../utils/topicResolution';

export default function DomainDashboard() {
  const { data, loading, error } = useDomainData();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedLayer1, setSelectedLayer1] = useState('');
  const [selectedLayer2, setSelectedLayer2] = useState('');
  const [drillPath, setDrillPath] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Initialize selections when data loads
  useEffect(() => {
    if (data && !selectedPeriod) {
      const periods = data.periods || [];
      const latest = periods[periods.length - 1];
      setSelectedPeriod(latest);

      const layer1List = getLayer1List(data.structure);
      if (layer1List.length > 0) {
        setSelectedLayer1(layer1List[0]);
      }
    }
  }, [data, selectedPeriod]);

  // Update Layer 2 when Layer 1 changes
  useEffect(() => {
    if (data && selectedLayer1) {
      const layer2List = getLayer2List(data.structure, selectedLayer1);
      if (layer2List.length > 0) {
        setSelectedLayer2(layer2List[0]);
      }
    }
  }, [selectedLayer1, data]);

  // Compute layer lists and topics
  const layer1List = useMemo(() => {
    if (!data?.structure) return [];
    return getLayer1List(data.structure);
  }, [data]);

  const layer2List = useMemo(() => {
    if (!data?.structure || !selectedLayer1) return [];
    return getLayer2List(data.structure, selectedLayer1);
  }, [data, selectedLayer1]);

  const topics = useMemo(() => {
    if (!data?.structure || !selectedLayer1 || !selectedLayer2) return [];
    return getTopicsForLayer2(data.structure, selectedLayer1, selectedLayer2);
  }, [data, selectedLayer1, selectedLayer2]);

  const sortedTopics = useMemo(() => {
    return [...topics]
      .map(topic => {
        // 根据 selectedPeriod 获取对应月份的论文数
        const trend = data?.trends?.trends?.[topic.id];
        const periodData = trend?.history?.find(h => h.period === selectedPeriod);
        const paper_count = periodData?.paper_count ?? topic.latest_paper_count;
        return { ...topic, paper_count };
      })
      .sort((a, b) => b.paper_count - a.paper_count);
  }, [topics, data?.trends?.trends, selectedPeriod]);

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

  // Get hierarchy for selected Layer 2
  const hierarchy = useMemo(() => {
    if (!data?.hierarchies || !selectedLayer2) return null;
    const layer2Key = selectedLayer2 === '_direct' ? selectedLayer1 : `${selectedLayer1}.${selectedLayer2}`;
    return data.hierarchies[layer2Key];
  }, [data, selectedLayer1, selectedLayer2]);

  // Use hierarchy.tree as the hierarchy tree (from API data)
  const hierarchyTree = useMemo(() => {
    if (!hierarchy?.tree) return null;
    return enrichTreeWithPaperCounts(hierarchy.tree, data.trends?.trends, selectedPeriod);
  }, [hierarchy, data, selectedPeriod]);

  // Get nodes for current drill-down level
  const currentLevelNodes = useMemo(() => {
    if (!hierarchyTree) return [];

    if (drillPath.length === 0) {
      // Default show Layer 3 (direct children of root, depth = 0)
      return hierarchyTree.children || [];
    }

    // Find current node by path and show its children
    const currentNode = findNodeByPath(hierarchyTree, drillPath);
    return currentNode?.children || [];
  }, [hierarchyTree, drillPath]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return currentLevelNodes.map((node, index) => ({
      name: node.name.length > 12 ? node.name.slice(0, 12) + '...' : node.name,
      fullName: node.name,
      count: node.paper_count,
      node: node,
      hasChildren: !!node.children && node.children.length > 0,
      index: index
    }));
  }, [currentLevelNodes]);
  const currentPaperTotal = currentLevelNodes.reduce((sum, n) => sum + (n.paper_count || 0), 0);
  const averagePapersPerTopic = currentLevelNodes.length > 0
    ? Math.round(currentPaperTotal / currentLevelNodes.length)
    : 0;

  // Handle chart bar click - drill down or show modal
  const handleBarClick = (data) => {
    if (!data?.node) return;

    if (data.hasChildren) {
      // Has children, drill down - use functional update to avoid stale closure
      setDrillPath(prev => [...prev, data.node.name]);
    } else {
      // Leaf node, show detail modal
      setSelectedTopic(data.node);
    }
  };

  const handleBreadcrumbNavigate = (level) => {
    // Click breadcrumb to go back to specific level
    setDrillPath(drillPath.slice(0, level));
  };

  const handleLayerChange = () => {
    // Reset drill state when Layer 1/2 changes
    setDrillPath([]);
    setSelectedTopic(null);
  };

  // Loading state - use conditional rendering instead of early return
  if (loading) {
    return (
      <DashboardPanel className="flex h-64 items-center justify-center text-slate-400">
        加载中...
      </DashboardPanel>
    );
  }

  // Error state - use conditional rendering instead of early return
  if (error) {
    return (
      <DashboardPanel className="border-rose-500/40 bg-rose-950/30 text-rose-200">
        加载失败: {error}
      </DashboardPanel>
    );
  }

  return (
    <DashboardShell
      eyebrow="arXiv · domain heat"
      title="领域热度分析"
      description="选择月份和领域，查看该细分领域下的研究主题热度对比。"
      metrics={[
        { label: drillPath.length === 0 ? 'Layer 3 主题数' : '子主题数', value: currentLevelNodes.length.toLocaleString(), tone: 'sky' },
        { label: '论文总数', value: currentPaperTotal.toLocaleString(), tone: 'emerald' },
        { label: '平均每主题论文', value: averagePapersPerTopic.toLocaleString(), tone: 'violet' },
      ]}
    >
      <div className="space-y-5">
      {/* Controls */}
      <DashboardPanel title="筛选条件" description="按时间、学科和 arXiv 子类切换主题热度切片。">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardSelect
            label="月份"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            options={(data.periods || []).map(p => ({ label: p, value: p }))}
          />

          <DashboardSelect
            label="学科 (Layer 1)"
            value={selectedLayer1}
            onChange={(e) => {
              setSelectedLayer1(e.target.value);
              handleLayerChange();
            }}
            options={layer1Options}
          />

          <DashboardSelect
            label="子类 (Layer 2)"
            value={selectedLayer2}
            onChange={(e) => {
              setSelectedLayer2(e.target.value);
              handleLayerChange();
            }}
            options={layer2Options}
          />
        </div>
      </DashboardPanel>

      {/* Breadcrumb */}
      {drillPath.length > 0 && (
        <DashboardPanel className="p-4">
          <BreadcrumbNav
            path={[TAXONOMY.getLayer2Display(selectedLayer1, selectedLayer2), ...drillPath]}
            onNavigate={(level) => handleBreadcrumbNavigate(level)}
          />
        </DashboardPanel>
      )}

      {/* Chart */}
      <DashboardPanel title={drillPath.length === 0 ? 'Layer 3 主题热度' : `${drillPath[drillPath.length - 1]} 子主题热度`}>
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl">
                          <p className="font-medium text-slate-100">{data.fullName}</p>
                          <p className="text-sky-300">论文数: {data.count}</p>
                          {data.hasChildren && <p className="text-xs text-slate-500">点击查看子主题</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" onClick={handleBarClick}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hasChildren ? `hsl(${198 + index * 17}, 82%, ${58 + (index % 4) * 3}%)` : '#64748b'}
                      cursor={entry.hasChildren ? 'pointer' : 'default'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            该领域暂无数据
          </div>
        )}
      </DashboardPanel>

      {/* Hierarchy Tree */}
      {hierarchy && <HierarchyTree hierarchy={hierarchy} topics={topics} />}

      {/* Topic List */}
      <DashboardPanel title="主题详情" className="overflow-hidden p-0">
        <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
          {sortedTopics.map(topic => (
            <div key={topic.id} className="px-6 py-4 transition hover:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-100">{topic.name}</h4>
                  {topic.hierarchy_path && topic.hierarchy_path.length > 0 && (
                    <p className="text-xs text-sky-300 mt-1">
                      {topic.hierarchy_path.join(' > ')}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    关键词: {topic.keywords?.slice(0, 5).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sky-400/10 text-sky-200 ring-1 ring-sky-300/20">
                    {topic.paper_count} 篇
                  </span>
                  <p className="text-xs text-slate-500 mt-1">活跃 {topic.active_months} 个月</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>

      {/* Topic Detail Modal */}
      {selectedTopic && (
        <TopicDetailModal
          topic={{
            ...selectedTopic,
            hierarchy_path: [TAXONOMY.getLayer2Display(selectedLayer1, selectedLayer2), ...drillPath, selectedTopic.name]
          }}
          trends={data?.trends?.trends}
          onClose={() => setSelectedTopic(null)}
          onViewTrend={(topic) => {
            const resolvedTopic = resolveHierarchyNodeDetail(topic, data?.trends?.trends);
            const params = new URLSearchParams({
              layer1: selectedLayer1,
              layer2: selectedLayer2,
              label: resolvedTopic.name
            });

            if (resolvedTopic.globalTopicIds?.length > 1) {
              params.set('topicIds', resolvedTopic.globalTopicIds.join(','));
            } else if (resolvedTopic.representativeTopicId) {
              params.set('topic', resolvedTopic.representativeTopicId);
            }

            navigate(`/trends?${params.toString()}`);
          }}
        />
      )}
      </div>
    </DashboardShell>
  );
}

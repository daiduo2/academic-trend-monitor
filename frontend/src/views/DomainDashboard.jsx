import { useState, useMemo, useEffect } from 'react';
import { useDomainData, getLayer1List, getLayer2List, getTopicsForLayer2 } from '../hooks/useDomainData';
import { TAXONOMY } from '../data/taxonomy';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import HierarchyTree from '../components/HierarchyTree';
import BreadcrumbNav from '../components/BreadcrumbNav';
import TopicDetailModal from '../components/TopicDetailModal';
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // Error state - use conditional rendering instead of early return
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
        <h2 className="text-2xl font-bold text-gray-900">领域热度分析</h2>
        <p className="text-gray-500">选择月份和领域，查看该细分领域下的研究主题热度对比</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">月份</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {data.periods?.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">学科 (Layer 1)</label>
            <select
              value={selectedLayer1}
              onChange={(e) => {
                setSelectedLayer1(e.target.value);
                handleLayerChange();
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
                handleLayerChange();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {layer2Options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats - based on current drill level */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">{drillPath.length === 0 ? 'Layer 3 主题数' : '子主题数'}</p>
          <p className="text-2xl font-bold text-blue-600">{currentLevelNodes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">论文总数</p>
          <p className="text-2xl font-bold text-green-600">
            {currentLevelNodes.reduce((sum, n) => sum + (n.paper_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">平均每主题论文</p>
          <p className="text-2xl font-bold text-purple-600">
            {currentLevelNodes.length > 0
              ? Math.round(currentLevelNodes.reduce((sum, n) => sum + (n.paper_count || 0), 0) / currentLevelNodes.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      {drillPath.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <BreadcrumbNav
            path={[TAXONOMY.getLayer2Display(selectedLayer1, selectedLayer2), ...drillPath]}
            onNavigate={(level) => handleBreadcrumbNavigate(level)}
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {drillPath.length === 0 ? 'Layer 3 主题热度' : `${drillPath[drillPath.length - 1]} 子主题热度`}
        </h3>
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                          <p className="font-medium text-gray-900">{data.fullName}</p>
                          <p className="text-blue-600">论文数: {data.count}</p>
                          {data.hasChildren && <p className="text-xs text-gray-500">点击查看子主题</p>}
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
                      fill={entry.hasChildren ? `hsl(${210 + index * 5}, 70%, ${50 + index * 2}%)` : '#9ca3af'}
                      cursor={entry.hasChildren ? 'pointer' : 'default'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            该领域暂无数据
          </div>
        )}
      </div>

      {/* Hierarchy Tree */}
      {hierarchy && <HierarchyTree hierarchy={hierarchy} topics={topics} />}

      {/* Topic List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">主题详情</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {sortedTopics.map(topic => (
            <div key={topic.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{topic.name}</h4>
                  {topic.hierarchy_path && topic.hierarchy_path.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-1">
                      {topic.hierarchy_path.join(' > ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    关键词: {topic.keywords?.slice(0, 5).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {topic.paper_count} 篇
                  </span>
                  <p className="text-xs text-gray-400 mt-1">活跃 {topic.active_months} 个月</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
  );
}

# 动态层级钻取功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 DomainDashboard 添加 Layer 3/4 动态钻取能力，支持点击柱状图钻取、面包屑导航、主题详情弹窗。

**Architecture:** 基于现有的 hierarchy_path 数据结构，构建层级树并计算聚合统计。使用 React state 管理当前钻取层级，通过 Recharts 点击事件触发层级切换。

**Tech Stack:** React 18, Recharts, Tailwind CSS, 现有数据格式 aligned_topics_hierarchy.json

---

## 前置条件

- 数据文件 `frontend/public/data/aligned_topics.json` 已存在且包含 hierarchy_path
- DomainDashboard.jsx 当前只显示 Layer 2 级别的主题

---

### Task 1: 创建层级数据处理工具函数

**Files:**
- Create: `frontend/src/utils/hierarchyUtils.js`
- Test: `frontend/src/utils/hierarchyUtils.test.js` (可选，手动测试)

**Step 1: 编写层级树构建函数**

```javascript
// frontend/src/utils/hierarchyUtils.js

/**
 * 从主题列表构建层级树
 * @param {Array} topics - 主题列表，每个主题包含 hierarchy_path
 * @returns {Object} 层级树根节点
 */
export function buildHierarchyTree(topics) {
  const root = { name: 'root', children: {}, paper_count: 0, topic_ids: [] };

  topics.forEach(topic => {
    const path = topic.hierarchy_path || [topic.name];
    let current = root;

    path.forEach((nodeName, index) => {
      if (!current.children[nodeName]) {
        current.children[nodeName] = {
          name: nodeName,
          children: {},
          paper_count: 0,
          topic_ids: [],
          depth: index
        };
      }
      current = current.children[nodeName];
    });

    // 叶子节点添加论文数
    current.paper_count += topic.latest_paper_count || 0;
    current.topic_ids.push(topic.id);
  });

  // 计算中间节点的聚合论文数
  aggregatePaperCounts(root);

  // 将 children 对象转为数组
  return normalizeTree(root);
}

function aggregatePaperCounts(node) {
  let total = node.paper_count;
  Object.values(node.children).forEach(child => {
    total += aggregatePaperCounts(child);
  });
  node.paper_count = total;
  return total;
}

function normalizeTree(node) {
  const result = {
    name: node.name,
    paper_count: node.paper_count,
    topic_ids: node.topic_ids,
    depth: node.depth
  };

  const children = Object.values(node.children);
  if (children.length > 0) {
    result.children = children.map(normalizeTree).sort((a, b) => b.paper_count - a.paper_count);
  }

  return result;
}

/**
 * 获取指定层级的节点列表
 * @param {Object} tree - 层级树根节点
 * @param {number} targetDepth - 目标深度（Layer 3 = 2, Layer 4 = 3）
 * @returns {Array} 该层级的所有节点
 */
export function getNodesAtDepth(tree, targetDepth) {
  const result = [];

  function traverse(node, currentDepth) {
    if (currentDepth === targetDepth) {
      result.push(node);
      return;
    }
    if (node.children) {
      node.children.forEach(child => traverse(child, currentDepth + 1));
    }
  }

  if (tree.children) {
    tree.children.forEach(child => traverse(child, 0));
  }

  return result.sort((a, b) => b.paper_count - a.paper_count);
}

/**
 * 根据路径查找节点
 * @param {Object} tree - 层级树根节点
 * @param {Array} path - 路径数组
 * @returns {Object|null} 找到的节点
 */
export function findNodeByPath(tree, path) {
  let current = tree;

  for (const name of path) {
    if (!current.children) return null;
    const found = current.children.find(c => c.name === name);
    if (!found) return null;
    current = found;
  }

  return current;
}
```

**Step 2: 手动测试函数**

创建测试文件并运行：

```bash
cd /Users/daiduo2/academic-trend-monitor/frontend
npm test -- hierarchyUtils.test.js
```

**Step 3: Commit**

```bash
git add frontend/src/utils/hierarchyUtils.js
git commit -m "feat: add hierarchy tree building utilities"
```

---

### Task 2: 创建面包屑导航组件

**Files:**
- Create: `frontend/src/components/BreadcrumbNav.jsx`

**Step 1: 实现面包屑组件**

```jsx
// frontend/src/components/BreadcrumbNav.jsx

export default function BreadcrumbNav({ path, onNavigate }) {
  if (!path || path.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {path.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">&gt;</span>}
          {index < path.length - 1 ? (
            <button
              onClick={() => onNavigate(index)}
              className="hover:text-blue-600 hover:underline transition-colors"
            >
              {item}
            </button>
          ) : (
            <span className="font-medium text-gray-900">{item}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/BreadcrumbNav.jsx
git commit -m "feat: add breadcrumb navigation component"
```

---

### Task 3: 创建主题详情弹窗组件

**Files:**
- Create: `frontend/src/components/TopicDetailModal.jsx`

**Step 1: 实现弹窗组件**

```jsx
// frontend/src/components/TopicDetailModal.jsx
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TopicDetailModal({ topic, topics, onClose, onViewTrend }) {
  if (!topic) return null;

  // 获取主题详细信息
  const fullTopic = topics.find(t => t.id === topic.topic_ids?.[0]) || topic;
  const history = fullTopic.history || [];

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
            {fullTopic.keywords?.slice(0, 10).map((kw, idx) => (
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
            在趋势追踪中查看
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/TopicDetailModal.jsx
git commit -m "feat: add topic detail modal component"
```

---

### Task 4: 重构 DomainDashboard 添加钻取功能

**Files:**
- Modify: `frontend/src/views/DomainDashboard.jsx`

**Step 1: 添加必要的导入**

```javascript
import { useState, useMemo } from 'react';
import { useDomainData, getLayer1List, getLayer2List, getTopicsForLayer2 } from '../hooks/useDomainData';
import { TAXONOMY } from '../data/taxonomy';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import HierarchyTree from '../components/HierarchyTree';
import BreadcrumbNav from '../components/BreadcrumbNav';  // 新增
import TopicDetailModal from '../components/TopicDetailModal';  // 新增
import { buildHierarchyTree, getNodesAtDepth, findNodeByPath } from '../utils/hierarchyUtils';  // 新增
```

**Step 2: 添加钻取状态**

```javascript
export default function DomainDashboard() {
  const { data, loading, error } = useDomainData();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedLayer1, setSelectedLayer1] = useState('');
  const [selectedLayer2, setSelectedLayer2] = useState('');
  const [drillPath, setDrillPath] = useState([]);  // 新增：钻取路径
  const [selectedTopic, setSelectedTopic] = useState(null);  // 新增：选中的主题（用于弹窗）
```

**Step 3: 构建层级树并计算当前显示数据**

```javascript
  // 获取当前 Layer 2 的所有主题
  const topics = getTopicsForLayer2(data.structure, selectedLayer1, selectedLayer2);

  // 构建层级树
  const hierarchyTree = useMemo(() => {
    if (topics.length === 0) return null;
    return buildHierarchyTree(topics);
  }, [topics]);

  // 根据钻取路径获取当前显示的节点
  const currentLevelNodes = useMemo(() => {
    if (!hierarchyTree) return [];

    if (drillPath.length === 0) {
      // 默认显示 Layer 3（depth = 2）
      return getNodesAtDepth(hierarchyTree, 2);
    }

    // 根据路径找到当前节点，显示其子节点
    const currentNode = findNodeByPath(hierarchyTree, drillPath);
    return currentNode?.children || [];
  }, [hierarchyTree, drillPath]);

  // 准备图表数据
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
```

**Step 4: 处理图表点击事件**

```javascript
  const handleBarClick = (data) => {
    if (!data || !data.node) return;

    if (data.hasChildren) {
      // 有子节点，继续钻取
      setDrillPath([...drillPath, data.node.name]);
    } else {
      // 叶子节点，显示详情弹窗
      setSelectedTopic(data.node);
    }
  };

  const handleBreadcrumbNavigate = (level) => {
    // 点击面包屑，返回到指定层级
    setDrillPath(drillPath.slice(0, level));
  };

  const handleLayerChange = () => {
    // Layer 1/2 改变时，重置钻取状态
    setDrillPath([]);
    setSelectedTopic(null);
  };
```

**Step 5: 更新下拉选单 onChange 处理**

```javascript
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
```

**Step 6: 添加面包屑和更新图表区域**

```javascript
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
```

**Step 7: 添加弹窗**

```javascript
      {/* Topic Detail Modal */}
      {selectedTopic && (
        <TopicDetailModal
          topic={{
            ...selectedTopic,
            hierarchy_path: [TAXONOMY.getLayer2Display(selectedLayer1, selectedLayer2), ...drillPath, selectedTopic.name]
          }}
          topics={topics}
          onClose={() => setSelectedTopic(null)}
          onViewTrend={(topic) => {
            // TODO: 导航到趋势追踪仪表盘
            console.log('View trend for:', topic);
          }}
        />
      )}
```

**Step 8: 测试并 Commit**

```bash
cd /Users/daiduo2/academic-trend-monitor/frontend
npm run build
```

确保无编译错误。

```bash
git add frontend/src/views/DomainDashboard.jsx
git commit -m "feat: add drill-down navigation to DomainDashboard"
```

---

### Task 5: 更新统计卡片为动态层级

**Files:**
- Modify: `frontend/src/views/DomainDashboard.jsx` (Stats 部分)

**Step 1: 更新统计卡片使用当前层级数据**

```javascript
      {/* Stats - 基于当前层级 */}
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
```

**Step 2: Commit**

```bash
git add frontend/src/views/DomainDashboard.jsx
git commit -m "feat: update stats cards to reflect current drill-down level"
```

---

### Task 6: 构建并验证

**Step 1: 构建项目**

```bash
cd /Users/daiduo2/academic-trend-monitor/frontend
npm run build
```

**期望输出:**
```
vite v6.x.x building for production...
dist/                     0.50 kB │ gzip: 0.30 kB
✓ built in 2.34s
```

**Step 2: 本地验证**

```bash
npm run preview
```

打开浏览器访问 `http://localhost:4173`，验证：
- [ ] 选择 Layer 2 后，默认显示 Layer 3 柱状图
- [ ] 点击有子节点的柱子，图表切换为对应的 Layer 4
- [ ] 面包屑正确显示当前路径
- [ ] 点击面包屑可返回上级
- [ ] 点击叶子节点打开详情弹窗
- [ ] 弹窗显示关键词、趋势图等信息
- [ ] 统计卡片随当前层级动态更新

**Step 3: Commit**

```bash
git commit -m "chore: verify drill-down feature works correctly"
```

---

## 验收清单

- [ ] `hierarchyUtils.js` 创建并测试通过
- [ ] `BreadcrumbNav.jsx` 组件创建
- [ ] `TopicDetailModal.jsx` 组件创建
- [ ] `DomainDashboard.jsx` 添加钻取功能
- [ ] 统计卡片动态更新
- [ ] 构建成功无错误
- [ ] 手动验证所有交互正常

## 注意事项

1. 数据文件必须包含 `hierarchy_path` 字段
2. 如果某 Layer 3 下没有 Layer 4，点击直接显示详情弹窗
3. 面包屑的第一项是 Layer 2 的显示名称
4. 弹窗中的趋势图使用第一个主题的 history 数据

# 演化图可视化实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现清晰架构的演化图可视化系统，采用三栏式布局（左侧分类导航、中间时间轴画布、右侧详情面板）

**Architecture:** React + D3.js 实现时间轴视图，参考 Graphiti 的清晰信息架构，支持主题演化追踪和来源追溯

**Tech Stack:** React, D3.js, Vite, TypeScript (可选)

---

## 文件结构

### 新建文件

```
frontend/src/
├── components/
│   ├── evolution/
│   │   ├── EvolutionGraphContainer.tsx    # 三栏布局容器
│   │   ├── LeftSidebar.tsx                # 左侧分类导航
│   │   ├── TimelineCanvas.tsx             # 中间时间轴画布（D3.js）
│   │   ├── RightPanel.tsx                 # 右侧详情面板
│   │   ├── TimelineSlider.tsx             # 底部时间滑块
│   │   ├── BreadcrumbNav.tsx              # 面包屑导航
│   │   ├── CanvasToolbar.tsx              # 画布工具栏
│   │   └── TopicCard.tsx                  # 主题卡片节点
├── hooks/
│   └── useEvolutionData.ts                # 数据加载 hook
├── utils/
│   ├── colorSchemes.ts                    # 模式颜色定义
│   └── layoutEngine.ts                    # 节点布局计算
└── types/
    └── evolution.ts                       # TypeScript 类型定义

pipeline/
└── evolution_viz_prep.py                  # 数据预处理脚本

data/output/evolution_graphs/
├── math_visualization.json                # 预处理后的可视化数据
└── manifest.json                          # 多域配置文件
```

### 修改文件

```
frontend/src/
├── App.tsx                                # 添加 /evolution 路由
├── pages/
│   └── EvolutionPage.tsx                  # 演化图页面（如不存在则创建）
```

---

## Chunk 1: 数据预处理

### Task 1: Python 数据转换脚本

**Files:**
- Create: `pipeline/evolution_viz_prep.py`
- Modify: `Makefile` (添加 viz 目标)

**Purpose:** 将 evolution_graph.json 转换为前端友好的可视化数据格式

- [ ] **Step 1: 创建脚本框架**

```python
#!/usr/bin/env python3
"""
演化图可视化数据预处理脚本
将 evolution_graph.json 转换为前端友好的格式
"""
import json
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class VisualizationNode:
    id: str
    topic_id: str
    name: str
    period: str
    category: str
    mode: str
    paper_count: int
    x: float = 0
    y: float = 0

@dataclass
class VisualizationEdge:
    source: str
    target: str
    type: str  # 'continued' | 'diffused'
    confidence: float

def load_evolution_graph(path: str) -> Dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def process_nodes(nodes: List[Dict]) -> List[VisualizationNode]:
    """处理节点数据，添加显示属性"""
    result = []
    for node in nodes:
        result.append(VisualizationNode(
            id=node['id'],
            topic_id=node['topic_id'],
            name=node['name'],
            period=node['period'],
            category=node['category'],
            mode=node['mode'],
            paper_count=node.get('paper_count', 0)
        ))
    return result

def process_edges(edges: List[Dict]) -> List[VisualizationEdge]:
    """处理边数据"""
    result = []
    for edge in edges:
        result.append(VisualizationEdge(
            source=edge['source'],
            target=edge['target'],
            type=edge['relation_type'],
            confidence=edge['confidence']
        ))
    return result

def calculate_layout(nodes: List[VisualizationNode], edges: List[VisualizationEdge]) -> None:
    """计算节点布局位置（时间轴布局）"""
    periods = sorted(set(n.period for n in nodes))
    nodes_by_period: Dict[str, List[VisualizationNode]] = {}

    for period in periods:
        nodes_by_period[period] = [n for n in nodes if n.period == period]

    # 为每个时间段的节点分配垂直位置
    for period_idx, (period, period_nodes) in enumerate(nodes_by_period.items()):
        period_nodes.sort(key=lambda n: n.category)
        for i, node in enumerate(period_nodes):
            node.x = period_idx * 200 + 100  # 水平间距
            node.y = (i + 1) * 70 + 50       # 垂直间距

def build_category_tree(nodes: List[VisualizationNode]) -> Dict[str, Any]:
    """构建分类树结构"""
    tree = {}
    for node in nodes:
        cat = node.category
        if cat not in tree:
            tree[cat] = {'count': 0, 'modes': set(), 'subcategories': {}}
        tree[cat]['count'] += 1
        tree[cat]['modes'].add(node.mode)
    return tree

def main():
    input_path = Path('data/output/evolution_graphs/math_graph.json')
    output_path = Path('data/output/evolution_graphs/math_visualization.json')

    print(f'Loading evolution graph from {input_path}...')
    data = load_evolution_graph(str(input_path))

    print(f'Processing {len(data["nodes"])} nodes and {len(data["edges"])} edges...')
    nodes = process_nodes(data['nodes'])
    edges = process_edges(data['edges'])

    print('Calculating layout...')
    calculate_layout(nodes, edges)

    print('Building category tree...')
    category_tree = build_category_tree(nodes)

    output = {
        'version': '1.0',
        'generated_at': data.get('generated_at', ''),
        'domain': data.get('domain', 'math'),
        'metadata': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'periods': sorted(set(n.period for n in nodes)),
            'categories': list(category_tree.keys())
        },
        'nodes': [
            {
                'id': n.id,
                'topic_id': n.topic_id,
                'name': n.name,
                'period': n.period,
                'category': n.category,
                'mode': n.mode,
                'paper_count': n.paper_count,
                'x': n.x,
                'y': n.y
            }
            for n in nodes
        ],
        'edges': [
            {
                'source': e.source,
                'target': e.target,
                'type': e.type,
                'confidence': e.confidence
            }
            for e in edges
        ],
        'category_tree': {
            k: {'count': v['count'], 'modes': list(v['modes'])}
            for k, v in category_tree.items()
        }
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Output written to {output_path}')

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 运行脚本验证**

```bash
cd /Users/daiduo2/claude-code-offline/academic-trend-monitor
python3 pipeline/evolution_viz_prep.py
```

Expected output:
```
Loading evolution graph from data/output/evolution_graphs/math_graph.json...
Processing 4302 nodes and 1066541 edges...
Calculating layout...
Building category tree...
Output written to data/output/evolution_graphs/math_visualization.json
```

- [ ] **Step 3: 验证输出文件结构**

```bash
head -c 2000 data/output/evolution_graphs/math_visualization.json
```

Expected: 包含 nodes, edges, metadata, category_tree 字段的 JSON

- [ ] **Step 4: 创建多域 manifest 文件**

```python
# Add to pipeline/evolution_viz_prep.py

def create_manifest():
    """创建可视化配置文件"""
    manifest = {
        "version": "1.0",
        "domains": [
            {
                "id": "math",
                "name": "Mathematics",
                "available": True,
                "data_file": "math_visualization.json"
            },
            {
                "id": "cs",
                "name": "Computer Science",
                "available": False,
                "data_file": None
            },
            {
                "id": "physics",
                "name": "Physics",
                "available": False,
                "data_file": None
            }
        ],
        "default_domain": "math"
    }

    manifest_path = Path('data/output/evolution_graphs/manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'Manifest written to {manifest_path}')
```

- [ ] **Step 5: 更新 Makefile**

```makefile
# Add to existing Makefile

viz-prep:
	python3 pipeline/evolution_viz_prep.py

viz: viz-prep
	@echo "Visualization data prepared"
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/evolution_viz_prep.py Makefile
git commit -m "feat: add visualization data preprocessing script"
```

---

## Chunk 2: 前端核心组件

### Task 2: 类型定义和工具函数

**Files:**
- Create: `frontend/src/types/evolution.ts`
- Create: `frontend/src/utils/colorSchemes.ts`
- Create: `frontend/src/utils/layoutEngine.ts`

**Purpose:** 定义数据结构、颜色方案和布局计算

- [ ] **Step 1: 类型定义**

```typescript
// frontend/src/types/evolution.ts

export type TopicMode = 'theory' | 'method' | 'problem' | 'hybrid';
export type EdgeType = 'continued' | 'diffused';

export interface EvolutionNode {
  id: string;
  topic_id: string;
  name: string;
  period: string;
  category: string;
  mode: TopicMode;
  paper_count: number;
  x: number;
  y: number;
}

export interface EvolutionEdge {
  source: string;
  target: string;
  type: EdgeType;
  confidence: number;
}

export interface CategoryInfo {
  count: number;
  modes: TopicMode[];
}

export interface VisualizationData {
  version: string;
  generated_at: string;
  domain: string;
  metadata: {
    total_nodes: number;
    total_edges: number;
    periods: string[];
    categories: string[];
  };
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  category_tree: Record<string, CategoryInfo>;
}

export interface DomainConfig {
  id: string;
  name: string;
  available: boolean;
  data_file: string | null;
}

export interface Manifest {
  version: string;
  domains: DomainConfig[];
  default_domain: string;
}
```

- [ ] **Step 2: 颜色方案**

```typescript
// frontend/src/utils/colorSchemes.ts

import { TopicMode } from '../types/evolution';

export const MODE_COLORS: Record<TopicMode, string> = {
  theory: '#3b82f6',   // blue-500
  method: '#10b981',   // emerald-500
  problem: '#f59e0b',  // amber-500
  hybrid: '#8b5cf6'    // violet-500
};

export const MODE_LABELS: Record<TopicMode, string> = {
  theory: '理论',
  method: '方法',
  problem: '问题',
  hybrid: '混合'
};

export const CATEGORY_COLORS: Record<string, string> = {
  'math.OA': '#3b82f6',
  'math.NT': '#10b981',
  'math.CO': '#f59e0b',
  'math.AG': '#8b5cf6',
  'math.PR': '#ec4899'
};

export function getNodeColor(mode: TopicMode): string {
  return MODE_COLORS[mode] || '#64748b';
}

export function getModeLabel(mode: TopicMode): string {
  return MODE_LABELS[mode] || mode;
}
```

- [ ] **Step 3: 布局引擎**

```typescript
// frontend/src/utils/layoutEngine.ts

import { EvolutionNode, EvolutionEdge } from '../types/evolution';

interface LayoutConfig {
  periodWidth: number;
  nodeHeight: number;
  marginX: number;
  marginY: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  periodWidth: 200,
  nodeHeight: 70,
  marginX: 100,
  marginY: 50
};

export function calculateTimelineLayout(
  nodes: EvolutionNode[],
  edges: EvolutionEdge[],
  config: LayoutConfig = DEFAULT_LAYOUT
): EvolutionNode[] {
  const periods = [...new Set(nodes.map(n => n.period))].sort();
  const nodesByPeriod = new Map<string, EvolutionNode[]>();

  // Group nodes by period
  periods.forEach(period => {
    nodesByPeriod.set(
      period,
      nodes.filter(n => n.period === period).sort((a, b) =>
        a.category.localeCompare(b.category)
      )
    );
  });

  // Calculate positions
  periods.forEach((period, periodIdx) => {
    const periodNodes = nodesByPeriod.get(period) || [];
    periodNodes.forEach((node, idx) => {
      node.x = config.marginX + periodIdx * config.periodWidth;
      node.y = config.marginY + idx * config.nodeHeight;
    });
  });

  return nodes;
}

export function getConnectedNodes(
  nodeId: string,
  edges: EvolutionEdge[]
): string[] {
  const connected = new Set<string>();
  edges.forEach(edge => {
    if (edge.source === nodeId) connected.add(edge.target);
    if (edge.target === nodeId) connected.add(edge.source);
  });
  return Array.from(connected);
}

export function filterNodesByCategory(
  nodes: EvolutionNode[],
  category: string | null
): EvolutionNode[] {
  if (!category || category === 'all') return nodes;
  return nodes.filter(n => n.category === category || n.category.endsWith(`.${category}`));
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/evolution.ts frontend/src/utils/colorSchemes.ts frontend/src/utils/layoutEngine.ts
git commit -m "feat: add evolution graph types and utilities"
```

---

### Task 3: 数据 Hook

**Files:**
- Create: `frontend/src/hooks/useEvolutionData.ts`

**Purpose:** 加载和管理演化图数据

- [ ] **Step 1: 实现数据加载 Hook**

```typescript
// frontend/src/hooks/useEvolutionData.ts

import { useState, useEffect, useCallback } from 'react';
import { VisualizationData, Manifest, DomainConfig } from '../types/evolution';

interface UseEvolutionDataReturn {
  data: VisualizationData | null;
  manifest: Manifest | null;
  loading: boolean;
  error: string | null;
  currentDomain: string;
  availableDomains: DomainConfig[];
  loadDomain: (domain: string) => Promise<void>;
}

const BASE_URL = '/data/output/evolution_graphs';

export function useEvolutionData(): UseEvolutionDataReturn {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('math');

  // Load manifest on mount
  useEffect(() => {
    async function loadManifest() {
      try {
        const response = await fetch(`${BASE_URL}/manifest.json`);
        if (!response.ok) throw new Error('Failed to load manifest');
        const manifestData: Manifest = await response.json();
        setManifest(manifestData);
        setCurrentDomain(manifestData.default_domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    loadManifest();
  }, []);

  // Load domain data
  const loadDomain = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);

    try {
      const domainConfig = manifest?.domains.find(d => d.id === domain);
      if (!domainConfig?.available) {
        throw new Error(`Domain ${domain} is not available`);
      }

      const response = await fetch(`${BASE_URL}/${domainConfig.data_file}`);
      if (!response.ok) throw new Error(`Failed to load data for ${domain}`);

      const domainData: VisualizationData = await response.json();
      setData(domainData);
      setCurrentDomain(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [manifest]);

  // Auto-load default domain when manifest loads
  useEffect(() => {
    if (manifest && currentDomain) {
      loadDomain(currentDomain);
    }
  }, [manifest, currentDomain, loadDomain]);

  return {
    data,
    manifest,
    loading,
    error,
    currentDomain,
    availableDomains: manifest?.domains || [],
    loadDomain
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useEvolutionData.ts
git commit -m "feat: add evolution data loading hook"
```

---

### Task 4: 侧边栏组件

**Files:**
- Create: `frontend/src/components/evolution/LeftSidebar.tsx`
- Create: `frontend/src/components/evolution/RightPanel.tsx`

**Purpose:** 左侧分类导航和右侧详情面板

- [ ] **Step 1: 左侧边栏**

```tsx
// frontend/src/components/evolution/LeftSidebar.tsx

import React from 'react';
import { CategoryInfo } from '../../types/evolution';
import { MODE_COLORS } from '../../utils/colorSchemes';

interface LeftSidebarProps {
  categories: Record<string, CategoryInfo>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  viewMode: 'timeline' | 'network';
  onSwitchView: (mode: 'timeline' | 'network') => void;
}

export function LeftSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  viewMode,
  onSwitchView
}: LeftSidebarProps) {
  const totalCount = Object.values(categories).reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            视图模式
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => onSwitchView('timeline')}
            >
              时间轴
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                viewMode === 'network'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => onSwitchView('network')}
            >
              关系网
            </button>
          </div>
        </div>

        {/* Category Tree */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            学科分类
          </div>
          <div className="space-y-1">
            {/* All Categories */}
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectCategory('all')}
            >
              <span className="text-lg">📚</span>
              <span className="flex-1 text-sm font-medium">全部学科</span>
              <span className="text-xs text-gray-400">{totalCount}</span>
            </div>

            {/* Individual Categories */}
            <div className="pl-2 space-y-1">
              {Object.entries(categories).map(([category, info]) => (
                <div key={category}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => onSelectCategory(category)}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MODE_COLORS[info.modes[0]] }}
                    />
                    <span className="flex-1 text-sm">{category}</span>
                    <span className="text-xs text-gray-400">{info.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            图例说明
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span>理论导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span>方法导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span>问题导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span>混合导向</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-500" />
                <span className="text-xs">主题演化（时间连续）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t border-dashed border-gray-400" />
                <span className="text-xs">主题关联（同时间段）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 右侧面板**

```tsx
// frontend/src/components/evolution/RightPanel.tsx

import React from 'react';
import { EvolutionNode } from '../../types/evolution';
import { MODE_COLORS, MODE_LABELS } from '../../utils/colorSchemes';

interface RightPanelProps {
  selectedNode: EvolutionNode | null;
}

interface TimelineEvent {
  period: string;
  status: '起始' | '持续' | '结束' | '当前';
  paperCount: number;
  citations: number;
  trend: '上升' | '稳定' | '下降';
}

export function RightPanel({ selectedNode }: RightPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-[320px] bg-white border-l border-gray-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm">点击节点查看详情</div>
        </div>
      </div>
    );
  }

  // Mock timeline events - in real app, fetch from API
  const timelineEvents: TimelineEvent[] = [
    { period: '2025-02', status: '起始', paperCount: 12, citations: 45, trend: '上升' },
    { period: '2025-03', status: '持续', paperCount: 18, citations: 62, trend: '稳定' },
    { period: '2025-04', status: '当前', paperCount: 15, citations: 58, trend: '下降' }
  ];

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          {selectedNode.name}
        </h2>
        <p className="text-sm text-gray-500">Topic ID: {selectedNode.topic_id}</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Basic Info */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            基本信息
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-sm font-medium">
              {selectedNode.category}
            </span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `${MODE_COLORS[selectedNode.mode]}20`,
                color: MODE_COLORS[selectedNode.mode]
              }}
            >
              {MODE_LABELS[selectedNode.mode]}
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
              {selectedNode.paper_count} 论文
            </span>
          </div>
        </section>

        {/* Timeline Events */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            演化路径
          </h3>
          <div className="space-y-3">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {event.period}
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                    {event.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  论文: {event.paperCount} · 引用: {event.citations} · 热度: {event.trend}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related Topics */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            关联主题
          </h3>
          <div className="space-y-2">
            {['迹态代数结构', '非交换几何', 'C*-代数分类'].map((name, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{name}</div>
                  <div className="text-xs text-gray-400">
                    {idx === 0 ? '同类别' : '跨类别'} · 相似度 {(0.85 - idx * 0.07).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Source Tracking */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            来源追踪
          </h3>
          <div className="text-sm text-gray-500 space-y-1">
            <div>📄 生成时间: 2026-03-17</div>
            <div>🔧 数据来源: evolution_cases.json</div>
            <div>📊 算法版本: v2.1</div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/evolution/LeftSidebar.tsx frontend/src/components/evolution/RightPanel.tsx
git commit -m "feat: add left sidebar and right panel components"
```

---

### Task 5: 时间轴画布组件

**Files:**
- Create: `frontend/src/components/evolution/TimelineCanvas.tsx`
- Create: `frontend/src/components/evolution/TopicCard.tsx`
- Create: `frontend/src/components/evolution/TimelineSlider.tsx`
- Create: `frontend/src/components/evolution/BreadcrumbNav.tsx`

**Purpose:** 核心的 D3.js 时间轴可视化

- [ ] **Step 1: TopicCard 组件（SVG 节点）**

```tsx
// frontend/src/components/evolution/TopicCard.tsx

import React from 'react';
import { EvolutionNode } from '../../types/evolution';
import { MODE_COLORS } from '../../utils/colorSchemes';

interface TopicCardProps {
  node: EvolutionNode;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (node: EvolutionNode) => void;
}

export function TopicCard({ node, isSelected, isHighlighted, onClick }: TopicCardProps) {
  const cardWidth = 120;
  const cardHeight = 50;
  const indicatorWidth = 4;

  return (
    <g
      className="topic-node cursor-pointer"
      transform={`translate(${node.x - cardWidth / 2}, ${node.y})`}
      onClick={() => onClick(node)}
      opacity={isHighlighted || !isSelected ? 1 : 0.3}
    >
      {/* Card background */}
      <rect
        x={0}
        y={0}
        width={cardWidth}
        height={cardHeight}
        rx={8}
        fill="white"
        stroke={isSelected ? '#2563eb' : '#e2e8f0'}
        strokeWidth={isSelected ? 2 : 1}
        filter={isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined}
      />

      {/* Mode indicator */}
      <rect
        x={4}
        y={5}
        width={indicatorWidth}
        height={cardHeight - 10}
        rx={2}
        fill={MODE_COLORS[node.mode]}
      />

      {/* Title */}
      <text
        x={14}
        y={18}
        className="text-xs font-semibold fill-gray-900"
        style={{ fontSize: '11px' }}
      >
        {node.name.length > 8 ? node.name.slice(0, 8) + '...' : node.name}
      </text>

      {/* Category */}
      <text
        x={14}
        y={32}
        className="text-xs fill-gray-500"
        style={{ fontSize: '10px' }}
      >
        {node.category}
      </text>

      {/* Meta */}
      <text
        x={14}
        y={44}
        className="text-xs fill-gray-400"
        style={{ fontSize: '9px' }}
      >
        {node.paper_count} papers
      </text>
    </g>
  );
}
```

- [ ] **Step 2: TimelineCanvas 组件**

```tsx
// frontend/src/components/evolution/TimelineCanvas.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { EvolutionNode, EvolutionEdge } from '../../types/evolution';
import { TopicCard } from './TopicCard';

interface TimelineCanvasProps {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  selectedNode: EvolutionNode | null;
  onSelectNode: (node: EvolutionNode | null) => void;
  currentPeriod: string;
}

export function TimelineCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  currentPeriod
}: TimelineCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getConnectedNodes = useCallback((nodeId: string): Set<string> => {
    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  }, [edges]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    svg.attr('width', width).attr('height', height);

    const margin = { top: 60, right: 40, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Get unique periods
    const periods = [...new Set(nodes.map(n => n.period))].sort();
    const periodWidth = innerWidth / periods.length;

    // Draw period columns
    periods.forEach((period, i) => {
      const x = i * periodWidth;

      // Column background
      g.append('rect')
        .attr('class', 'period-column')
        .attr('x', x)
        .attr('y', -30)
        .attr('width', periodWidth - 20)
        .attr('height', innerHeight + 30)
        .attr('rx', 8)
        .attr('fill', period === currentPeriod ? 'rgba(37, 99, 235, 0.05)' : 'rgba(241, 245, 249, 0.5)')
        .attr('stroke', period === currentPeriod ? '#bfdbfe' : '#e2e8f0')
        .attr('stroke-width', 1);

      // Period label
      g.append('text')
        .attr('x', x + periodWidth / 2 - 10)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-sm font-semibold fill-gray-500')
        .text(period);
    });

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#2563eb');

    // Draw edges
    const connectedNodeIds = selectedNode ? getConnectedNodes(selectedNode.id) : new Set();

    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      const path = d3.path();

      if (edge.type === 'continued') {
        // Curved bezier for continued edges
        path.moveTo(source.x + 55, source.y + 25);
        path.bezierCurveTo(
          source.x + periodWidth / 2, source.y + 25,
          target.x - periodWidth / 2, target.y + 25,
          target.x - 55, target.y + 25
        );

        const isHighlighted = selectedNode &&
          (edge.source === selectedNode.id || edge.target === selectedNode.id);

        g.append('path')
          .attr('d', path.toString())
          .attr('fill', 'none')
          .attr('stroke', isHighlighted ? '#2563eb' : '#cbd5e1')
          .attr('stroke-width', isHighlighted ? 3 : 2)
          .attr('marker-end', 'url(#arrowhead)')
          .attr('opacity', selectedNode && !isHighlighted ? 0.2 : 0.8);
      } else {
        // Quadratic curve for diffused edges
        const midX = (source.x + target.x) / 2;
        const midY = Math.min(source.y, target.y) - 40;
        path.moveTo(source.x, source.y + 25);
        path.quadraticCurveTo(midX, midY, target.x, target.y + 25);

        g.append('path')
          .attr('d', path.toString())
          .attr('fill', 'none')
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.5);
      }
    });

    // Draw nodes using React components (simplified as D3 elements here)
    nodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = !selectedNode || isSelected || connectedNodeIds.has(node.id);

      // Card background
      g.append('rect')
        .attr('x', node.x - 60)
        .attr('y', node.y)
        .attr('width', 120)
        .attr('height', 50)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('stroke', isSelected ? '#2563eb' : '#e2e8f0')
        .attr('stroke-width', isSelected ? 2 : 1)
        .attr('opacity', isHighlighted ? 1 : 0.3)
        .attr('cursor', 'pointer')
        .on('click', () => onSelectNode(isSelected ? null : node));

      // Mode indicator
      g.append('rect')
        .attr('x', node.x - 56)
        .attr('y', node.y + 5)
        .attr('width', 4)
        .attr('height', 40)
        .attr('rx', 2)
        .attr('fill', getModeColor(node.mode))
        .attr('opacity', isHighlighted ? 1 : 0.3);

      // Title
      g.append('text')
        .attr('x', node.x - 46)
        .attr('y', node.y + 18)
        .attr('class', 'text-xs font-semibold')
        .style('font-size', '11px')
        .style('fill', '#0f172a')
        .text(node.name.length > 8 ? node.name.slice(0, 8) + '...' : node.name)
        .attr('opacity', isHighlighted ? 1 : 0.3);

      // Category
      g.append('text')
        .attr('x', node.x - 46)
        .attr('y', node.y + 32)
        .style('font-size', '10px')
        .style('fill', '#64748b')
        .text(node.category)
        .attr('opacity', isHighlighted ? 1 : 0.3);
    });

  }, [nodes, edges, selectedNode, onSelectNode, currentPeriod, getConnectedNodes]);

  return (
    <div ref={containerRef} className="flex-1 h-full bg-slate-50 relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

function getModeColor(mode: string): string {
  const colors: Record<string, string> = {
    theory: '#3b82f6',
    method: '#10b981',
    problem: '#f59e0b',
    hybrid: '#8b5cf6'
  };
  return colors[mode] || '#64748b';
}
```

- [ ] **Step 3: TimelineSlider 组件**

```tsx
// frontend/src/components/evolution/TimelineSlider.tsx

import React from 'react';

interface TimelineSliderProps {
  periods: string[];
  currentPeriod: string;
  onSelectPeriod: (period: string) => void;
}

export function TimelineSlider({ periods, currentPeriod, onSelectPeriod }: TimelineSliderProps) {
  const currentIndex = periods.indexOf(currentPeriod);
  const progress = ((currentIndex + 1) / periods.length) * 100;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-xl border border-gray-200 shadow-lg">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        {periods.map(p => (
          <span key={p} className={p === currentPeriod ? 'text-blue-600 font-semibold' : ''}>
            {p}
          </span>
        ))}
      </div>
      <div className="w-[400px] h-1 bg-gray-200 rounded-full relative">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between">
          {periods.map(p => (
            <button
              key={p}
              className={`w-3 h-3 rounded-full border-2 transition-all ${
                p === currentPeriod
                  ? 'bg-blue-500 border-blue-500 scale-125'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => onSelectPeriod(p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: BreadcrumbNav 组件**

```tsx
// frontend/src/components/evolution/BreadcrumbNav.tsx

import React from 'react';

interface BreadcrumbNavProps {
  path: string[];
}

export function BreadcrumbNav({ path }: BreadcrumbNavProps) {
  return (
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm">
      {path.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-300">/</span>}
          <span className={index === path.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {item}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/evolution/TimelineCanvas.tsx \
       frontend/src/components/evolution/TopicCard.tsx \
       frontend/src/components/evolution/TimelineSlider.tsx \
       frontend/src/components/evolution/BreadcrumbNav.tsx
git commit -m "feat: add timeline canvas and related components"
```

---

### Task 6: 容器组件和页面集成

**Files:**
- Create: `frontend/src/components/evolution/EvolutionGraphContainer.tsx`
- Modify: `frontend/src/App.tsx`
- Create/Modify: `frontend/src/pages/EvolutionPage.tsx`

**Purpose:** 整合所有组件，完成页面集成

- [ ] **Step 1: 容器组件**

```tsx
// frontend/src/components/evolution/EvolutionGraphContainer.tsx

import React, { useState, useMemo } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineSlider } from './TimelineSlider';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CanvasToolbar } from './CanvasToolbar';
import { useEvolutionData } from '../../hooks/useEvolutionData';
import { EvolutionNode, EvolutionEdge } from '../../types/evolution';
import { filterNodesByCategory } from '../../utils/layoutEngine';

export function EvolutionGraphContainer() {
  const { data, loading, error, currentDomain, availableDomains, loadDomain } = useEvolutionData();

  const [viewMode, setViewMode] = useState<'timeline' | 'network'>('timeline');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<EvolutionNode | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<string>('2025-04');

  // Filter nodes by category
  const filteredNodes = useMemo(() => {
    if (!data) return [];
    return filterNodesByCategory(data.nodes, selectedCategory);
  }, [data, selectedCategory]);

  // Filter edges to only include visible nodes
  const filteredEdges = useMemo(() => {
    if (!data) return [];
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [data, filteredNodes]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">加载演化图谱...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <p className="text-lg font-medium mb-2">加载失败</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">暂无数据</p>
          <p className="text-sm">请先运行数据预处理脚本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">主题演化图谱</h1>
        <p className="text-sm text-gray-500 mt-1">
          基于时间切片的学术主题演化分析 · {currentDomain.toUpperCase()} 2025
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          categories={data.category_tree}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          viewMode={viewMode}
          onSwitchView={setViewMode}
        />

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col relative">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <BreadcrumbNav path={['Mathematics', selectedCategory === 'all' ? '全部学科' : selectedCategory]} />
            <CanvasToolbar />
          </div>

          {/* Timeline Canvas */}
          <TimelineCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            currentPeriod={currentPeriod}
          />

          {/* Timeline Slider */}
          <TimelineSlider
            periods={data.metadata.periods}
            currentPeriod={currentPeriod}
            onSelectPeriod={setCurrentPeriod}
          />
        </div>

        {/* Right Panel */}
        <RightPanel selectedNode={selectedNode} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CanvasToolbar 组件**

```tsx
// frontend/src/components/evolution/CanvasToolbar.tsx

import React from 'react';

export function CanvasToolbar() {
  return (
    <div className="flex gap-2">
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="放大">
        +
      </button>
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="缩小">
        −
      </button>
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="适应屏幕">
        ⟲
      </button>
    </div>
  );
}
```

- [ ] **Step 3: EvolutionPage 页面**

```tsx
// frontend/src/pages/EvolutionPage.tsx

import React from 'react';
import { EvolutionGraphContainer } from '../components/evolution/EvolutionGraphContainer';

export function EvolutionPage() {
  return <EvolutionGraphContainer />;
}
```

- [ ] **Step 4: 更新 App.tsx**

```tsx
// Add to frontend/src/App.tsx

import { EvolutionPage } from './pages/EvolutionPage';

// Add to Routes:
<Route path="/evolution" element={<EvolutionPage />} />

// Add to Navigation:
<NavLink to="/evolution" className={...}>
  演化分析
</NavLink>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/evolution/EvolutionGraphContainer.tsx \
       frontend/src/components/evolution/CanvasToolbar.tsx \
       frontend/src/pages/EvolutionPage.tsx \
       frontend/src/App.tsx
git commit -m "feat: integrate all components into evolution graph page"
```

---

## Chunk 3: 测试与部署

### Task 7: 验证与测试

- [ ] **Step 1: 运行开发服务器验证**

```bash
cd frontend
npm run dev
```

Expected: 访问 http://localhost:5173/evolution 能看到完整界面

- [ ] **Step 2: 功能测试清单**

- [ ] 左侧边栏显示学科分类
- [ ] 点击分类筛选节点
- [ ] 时间轴视图显示主题卡片
- [ ] 点击节点显示详情面板
- [ ] 时间滑块切换当前时间段
- [ ] 视图模式切换（时间轴/关系网）

- [ ] **Step 3: Build 测试**

```bash
cd frontend
npm run build
```

Expected: 无错误，生成 dist 目录

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: complete evolution graph visualization implementation"
```

---

## 验收标准

- [ ] 访问 `/evolution` 显示三栏式布局（左导航、中画布、右详情）
- [ ] 左侧显示学科分类树，点击可筛选节点
- [ ] 中间时间轴视图显示主题卡片，卡片包含名称、类别、论文数、模式指示条
- [ ] 点击节点右侧显示详情面板（演化路径、关联主题、来源追踪）
- [ ] 底部时间滑块可切换时间段，高亮当前时间段
- [ ] 节点按模式着色（理论=蓝、方法=绿、问题=橙、混合=紫）
- [ ] 演化边为实线箭头，关联边为虚线
- [ ] 页面加载时间 < 3 秒
- [ ] 成功部署到 GitHub Pages

---

## 参考资料

- 设计预览: `docs/superpowers/specs/evolution-graph-clear.html`
- 数据规格: `docs/superpowers/specs/2026-03-17-evolution-graph-visualization-design.md`

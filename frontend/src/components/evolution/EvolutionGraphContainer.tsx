// frontend/src/components/evolution/EvolutionGraphContainer.tsx

import React, { useState, useMemo } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineSlider } from './TimelineSlider';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CanvasToolbar } from './CanvasToolbar';
import { useEvolutionData } from '../../hooks/useEvolutionData';
import type { EvolutionNode, EvolutionEdge } from '../../types/evolution';
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

// frontend/src/components/evolution/EvolutionGraphContainer.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineSlider } from './TimelineSlider';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CanvasToolbar } from './CanvasToolbar';
import { ConfidenceSlider } from './ConfidenceSlider';
import { NetworkView } from './NetworkView';
import { TopicTooltip } from './TopicTooltip';
import { ErrorBoundary } from './ErrorBoundary';
import { useEvolutionData } from '../../hooks/useEvolutionData';
import type { EvolutionNode, EvolutionEdge } from '../../types/evolution';
import { filterNodesByCategory } from '../../utils/layoutEngine';

// Wrapper component with Error Boundary
export function EvolutionGraphContainer() {
  const handleReset = () => {
    // Reset any state if needed
    window.location.reload();
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <EvolutionGraphContent />
    </ErrorBoundary>
  );
}

function EvolutionGraphContent() {
  const { data, loading, error, currentDomain, availableDomains, loadDomain } = useEvolutionData();

  // Load viewMode from localStorage
  const [viewMode, setViewMode] = useState<'timeline' | 'network'>(() => {
    const saved = localStorage.getItem('evolutionViewMode');
    return saved === 'network' ? 'network' : 'timeline';
  });

  // Persist viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('evolutionViewMode', viewMode);
  }, [viewMode]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<EvolutionNode | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<string>('2025-04');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<EvolutionNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter nodes by category
  const filteredNodes = useMemo(() => {
    if (!data) return [];
    return filterNodesByCategory(data.nodes, selectedCategory);
  }, [data, selectedCategory]);

  // Filter edges to only include visible nodes and apply confidence threshold
  const filteredEdges = useMemo(() => {
    if (!data) return [];
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return data.edges.filter(e => {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
      // Always show continued edges
      if (e.type === 'continued') return true;
      // Filter diffused edges by confidence
      return e.confidence >= confidenceThreshold;
    });
  }, [data, filteredNodes, confidenceThreshold]);

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
            <div className="flex items-center gap-4">
              <ConfidenceSlider
                value={confidenceThreshold}
                onChange={setConfidenceThreshold}
              />
              <CanvasToolbar />
            </div>
          </div>

          {/* View Content */}
          {viewMode === 'timeline' ? (
            <TimelineCanvas
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              currentPeriod={currentPeriod}
              onNodeHover={setHoveredNode}
              onTooltipPositionChange={setTooltipPosition}
            />
          ) : (
            <NetworkView
              period={currentPeriod}
              nodes={filteredNodes}
              edges={filteredEdges}
              confidenceThreshold={confidenceThreshold}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {/* Tooltip */}
          <TopicTooltip
            node={hoveredNode}
            position={tooltipPosition}
            visible={!!hoveredNode}
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

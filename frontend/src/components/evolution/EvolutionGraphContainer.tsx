// frontend/src/components/evolution/EvolutionGraphContainer.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { ForceGraphView } from './ForceGraphView';
import { TimelineSlider } from './TimelineSlider';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CanvasToolbar } from './CanvasToolbar';
import { ConfidenceSlider } from './ConfidenceSlider';
import { TopicTooltip } from './TopicTooltip';
import { ErrorBoundary } from './ErrorBoundary';
import { useGraphData } from '../../hooks/useGraphData';
import type { Node } from '../../hooks/useGraphData';

// Wrapper component with Error Boundary
export function EvolutionGraphContainer() {
  const handleReset = () => {
    window.location.reload();
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <EvolutionGraphContent />
    </ErrorBoundary>
  );
}

function EvolutionGraphContent() {
  const { data, rawData, loading, error } = useGraphData('math');

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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<string>('2025-04');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter edges by confidence threshold
  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const filteredEdges = data.edges.filter(e => {
      if (e.type === 'continued') return true;
      return e.confidence >= confidenceThreshold;
    });

    return {
      nodes: data.nodes,
      edges: filteredEdges,
    };
  }, [data, confidenceThreshold]);

  // Handle node click
  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  // Handle node hover with tooltip position
  const handleNodeHover = useCallback((node: Node | null) => {
    setHoveredNode(node);
    // Tooltip position will be handled by the ForceGraphView's mouse events
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">加载演化图谱...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center text-red-400">
          <p className="text-lg font-medium mb-2">加载失败</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !rawData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center text-slate-400">
          <p className="text-lg mb-2">暂无数据</p>
          <p className="text-sm">请先运行数据预处理脚本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">主题演化图谱</h1>
        <p className="text-sm text-slate-400 mt-1">
          基于时间切片的学术主题演化分析 · MATH 2025
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          categories={rawData.category_tree}
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

          {/* Force Graph View */}
          <ForceGraphView
            data={filteredData}
            mode={viewMode}
            selectedPeriod={currentPeriod}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            selectedCategory={selectedCategory}
            selectedNode={selectedNode}
          />

          {/* Tooltip */}
          {hoveredNode && (
            <TopicTooltip
              node={{
                id: hoveredNode.id,
                topic_id: hoveredNode.topic_id,
                name: hoveredNode.name,
                period: hoveredNode.period,
                category: hoveredNode.category,
                mode: hoveredNode.mode as any,
                paper_count: hoveredNode.paper_count,
                x: hoveredNode.x ?? 0,
                y: hoveredNode.y ?? 0,
              }}
              position={tooltipPosition}
              visible={!!hoveredNode}
            />
          )}

          {/* Timeline Slider */}
          <TimelineSlider
            periods={rawData.metadata.periods}
            currentPeriod={currentPeriod}
            onSelectPeriod={setCurrentPeriod}
          />
        </div>

        {/* Right Panel */}
        <RightPanel
          selectedNode={selectedNode ? {
            id: selectedNode.id,
            topic_id: selectedNode.topic_id,
            name: selectedNode.name,
            period: selectedNode.period,
            category: selectedNode.category,
            mode: selectedNode.mode as any,
            paper_count: selectedNode.paper_count,
            x: selectedNode.x ?? 0,
            y: selectedNode.y ?? 0,
          } : null}
        />
      </div>
    </div>
  );
}

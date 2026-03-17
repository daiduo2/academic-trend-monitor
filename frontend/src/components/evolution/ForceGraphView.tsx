import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { Node, Edge } from '../../hooks/useGraphData';
import { MODE_COLORS } from '../../utils/colorSchemes';

interface ForceGraphViewProps {
  data: { nodes: Node[]; edges: Edge[] };
  mode: 'timeline' | 'network';
  selectedPeriod?: string;
  onNodeClick: (node: Node) => void;
  onNodeHover: (node: Node | null) => void;
  selectedCategory?: string;
  selectedNode?: Node | null;
}

const NODE_SIZE_BASE = 4;
const NODE_SIZE_MULTIPLIER = 0.5;

export function ForceGraphView({
  data,
  mode,
  selectedPeriod,
  onNodeClick,
  onNodeHover,
  selectedCategory = 'all',
  selectedNode,
}: ForceGraphViewProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filter nodes by category
  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return data.nodes;
    return data.nodes.filter(node => node.category === selectedCategory);
  }, [data.nodes, selectedCategory]);

  // Filter edges to only include visible nodes
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return data.edges.filter(
      edge => nodeIds.has(edge.source as string) && nodeIds.has(edge.target as string)
    );
  }, [data.edges, filteredNodes]);

  // For network mode, filter to selected period only
  const periodNodes = useMemo(() => {
    if (mode === 'timeline') return filteredNodes;
    if (!selectedPeriod) return filteredNodes;
    return filteredNodes.filter(node => node.period === selectedPeriod);
  }, [filteredNodes, mode, selectedPeriod]);

  const periodEdges = useMemo(() => {
    if (mode === 'timeline') return filteredEdges;
    const nodeIds = new Set(periodNodes.map(n => n.id));
    return filteredEdges.filter(
      edge => nodeIds.has(edge.source as string) && nodeIds.has(edge.target as string)
    );
  }, [filteredEdges, mode, periodNodes]);

  // Timeline layout: position nodes by period
  const timelineNodes = useMemo(() => {
    if (mode !== 'timeline') return periodNodes;

    const periods = [...new Set(periodNodes.map(n => n.period))].sort();
    const periodWidth = dimensions.width / Math.max(periods.length, 1);

    return periodNodes.map(node => {
      const periodIndex = periods.indexOf(node.period);
      const x = periodIndex * periodWidth + periodWidth / 2;
      // Use existing y if available, otherwise distribute evenly
      const y = node.y ?? Math.random() * dimensions.height * 0.8 + dimensions.height * 0.1;

      return {
        ...node,
        fx: x, // Fixed x position for timeline
        fy: undefined, // Allow y to be determined by force simulation
        x,
        y,
      };
    });
  }, [periodNodes, mode, dimensions]);

  // Graph data for force-graph
  const graphData = useMemo(() => ({
    nodes: timelineNodes,
    links: periodEdges,
  }), [timelineNodes, periodEdges]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Center camera on initial load
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 100);
    }
  }, [mode, selectedPeriod]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    onNodeClick(node as Node);
  }, [onNodeClick]);

  // Track mouse position for tooltip
  const mousePosRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [handleMouseMove]);

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (node) {
      onNodeHover({
        ...(node as Node),
        x: mousePosRef.current.x,
        y: mousePosRef.current.y,
      });
    } else {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  // Get node color
  const getNodeColor = useCallback((node: any) => {
    const n = node as Node;
    return MODE_COLORS[n.mode as keyof typeof MODE_COLORS] ?? '#64748b';
  }, []);

  // Get node size based on paper count
  const getNodeSize = useCallback((node: any) => {
    const n = node as Node;
    return NODE_SIZE_BASE + Math.log(n.paper_count + 1) * NODE_SIZE_MULTIPLIER;
  }, []);

  // Get link color based on type
  const getLinkColor = useCallback((link: any) => {
    const edge = link as Edge;
    if (edge.type === 'continued') {
      return '#3b82f6';
    }
    return '#94a3b8';
  }, []);

  // Get link width based on confidence
  const getLinkWidth = useCallback((link: any) => {
    const edge = link as Edge;
    return edge.type === 'continued' ? 2 : 1;
  }, []);

  // Custom node canvas drawing
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as Node;
    const size = getNodeSize(node);
    const color = getNodeColor(node);
    const isSelected = selectedNode?.id === n.id;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(n.x ?? 0, n.y ?? 0, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border if selected
    if (isSelected) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }

    // Draw label if zoomed in enough
    if (globalScale > 1.5) {
      ctx.font = `${isSelected ? 'bold' : 'normal'} 12px sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = n.name.length > 15 ? n.name.slice(0, 15) + '...' : n.name;
      ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + size + 12);
    }
  }, [getNodeSize, getNodeColor, selectedNode]);

  // Custom link canvas drawing
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const edge = link as Edge;
    const source = link.source as Node;
    const target = link.target as Node;

    if (!source.x || !source.y || !target.x || !target.y) return;

    const isContinued = edge.type === 'continued';

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);

    if (isContinued && mode === 'timeline') {
      // Curved line for continued edges in timeline mode
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2 - 50;
      ctx.quadraticCurveTo(midX, midY, target.x, target.y);
    } else {
      ctx.lineTo(target.x, target.y);
    }

    ctx.strokeStyle = isContinued ? '#3b82f6' : '#64748b';
    ctx.lineWidth = isContinued ? 2 : 1;
    if (!isContinued) {
      ctx.setLineDash([5, 5]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow for continued edges
    if (isContinued) {
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowLength = 8;
      const arrowAngle = Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(
        target.x - arrowLength * Math.cos(angle - arrowAngle),
        target.y - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(
        target.x - arrowLength * Math.cos(angle + arrowAngle),
        target.y - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
  }, [mode]);

  // Physics configuration
  const physicsConfig = useMemo(() => {
    if (mode === 'timeline') {
      return {
        linkDistance: 100,
        charge: -300,
        x: 0.1, // Weak x force to allow fx to dominate
        y: 0.1,
      };
    }
    return {
      linkDistance: 80,
      charge: -400,
      x: 0.05,
      y: 0.05,
    };
  }, [mode]);

  if (graphData.nodes.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 h-full flex items-center justify-center bg-slate-900">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium mb-2">No data available</p>
          <p className="text-sm">
            {mode === 'network' && selectedPeriod
              ? `No nodes found for period ${selectedPeriod}`
              : 'No nodes to display'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 h-full bg-slate-900 relative">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkDirectionalArrowLength={0}
        linkDirectionalArrowRelPos={1}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={mode === 'network'}
        warmupTicks={100}
        cooldownTicks={50}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        linkDistance={physicsConfig.linkDistance}
        d3Force={(forceName: string, force: any) => {
          if (forceName === 'charge') {
            force.strength(physicsConfig.charge);
          }
          if (forceName === 'x' && mode === 'timeline') {
            // In timeline mode, x force is weaker to respect fx
            force.strength(physicsConfig.x);
          }
          if (forceName === 'y') {
            force.strength(physicsConfig.y);
          }
        }}
        backgroundColor="#0f172a"
      />

      {/* Period labels for timeline mode */}
      {mode === 'timeline' && (
        <div className="absolute top-4 left-0 right-0 flex justify-around pointer-events-none">
          {[...new Set(data.nodes.map(n => n.period))].sort().map(period => (
            <div
              key={period}
              className={`text-sm font-semibold ${
                period === selectedPeriod ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              {period}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

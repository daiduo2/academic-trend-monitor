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

const NODE_SIZE_BASE = 3;
const NODE_SIZE_MULTIPLIER = 0.3;

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
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  // Filter nodes by category
  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return data.nodes;
    return data.nodes.filter(node => node.category === selectedCategory);
  }, [data.nodes, selectedCategory]);

  // Build node id set for filtering
  const nodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Build adjacency map for quick lookup
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Edge[]>();
    data.edges.forEach(edge => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
      if (!map.has(edge.source)) map.set(edge.source, []);
      if (!map.has(edge.target)) map.set(edge.target, []);
      map.get(edge.source)!.push(edge);
      map.get(edge.target)!.push(edge);
    });
    return map;
  }, [data.edges, nodeIds]);

  // Show all edges, but highlight those connected to selected/hovered node
  const visibleEdges = useMemo(() => {
    return data.edges.filter(edge => {
      // Only show edges between nodes in our filtered set
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false;
      return true;
    });
  }, [data.edges, nodeIds]);

  // For network mode, filter to selected period only
  const periodNodes = useMemo(() => {
    if (mode === 'timeline') return filteredNodes;
    if (!selectedPeriod) return filteredNodes;
    return filteredNodes.filter(node => node.period === selectedPeriod);
  }, [filteredNodes, mode, selectedPeriod]);

  // Filter edges by selected period in network mode
  const periodEdges = useMemo(() => {
    if (mode === 'timeline') return visibleEdges;
    const nodeIds = new Set(periodNodes.map(n => n.id));
    return visibleEdges.filter(
      edge => nodeIds.has(edge.source as string) && nodeIds.has(edge.target as string)
    );
  }, [visibleEdges, mode, periodNodes]);

  // Timeline layout: natural force-directed with period-based x bias
  const timelineNodes = useMemo(() => {
    if (mode !== 'timeline') return periodNodes;

    const periods = [...new Set(periodNodes.map(n => n.period))].sort();
    const periodWidth = dimensions.width / Math.max(periods.length, 1);

    // Group nodes by period for initial positioning
    const nodesByPeriod: Record<string, Node[]> = {};
    periodNodes.forEach(node => {
      if (!nodesByPeriod[node.period]) nodesByPeriod[node.period] = [];
      nodesByPeriod[node.period].push(node);
    });

    // Assign initial positions with organic distribution
    const nodesWithPositions: Node[] = [];
    periods.forEach((period, periodIndex) => {
      const columnNodes = nodesByPeriod[period] || [];
      const targetX = periodIndex * periodWidth + periodWidth / 2;

      columnNodes.forEach((node, index) => {
        // Add jitter to prevent perfect vertical alignment
        const jitterX = (Math.random() - 0.5) * periodWidth * 0.3;
        const jitterY = (Math.random() - 0.5) * 100;

        // Distribute vertically with some randomness
        const baseY = dimensions.height * 0.5 + (index - columnNodes.length / 2) * 60;

        nodesWithPositions.push({
          ...node,
          // fx: only weakly constrain x, allow some movement
          x: targetX + jitterX,
          y: baseY + jitterY,
          // Store target x for force simulation
          __targetX: targetX,
          __periodIndex: periodIndex,
        } as Node);
      });
    });

    return nodesWithPositions;
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
    setHoveredNode(node ? (node as Node) : null);
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
    const isHovered = hoveredNode?.id === n.id;

    // Glow effect for selected/hovered nodes
    if (isSelected || isHovered) {
      const gradient = ctx.createRadialGradient(n.x ?? 0, n.y ?? 0, size, n.x ?? 0, n.y ?? 0, size * 3);
      gradient.addColorStop(0, color + '80'); // 50% opacity
      gradient.addColorStop(1, color + '00'); // 0% opacity
      ctx.beginPath();
      ctx.arc(n.x ?? 0, n.y ?? 0, size * 3, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

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
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();
    } else if (isHovered) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
    }

    // Draw label if zoomed in enough or if selected
    if (globalScale > 1.2 || isSelected) {
      ctx.font = `${isSelected ? 'bold' : 'normal'} 11px sans-serif`;
      ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = n.name.length > 12 ? n.name.slice(0, 12) + '...' : n.name;
      ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + size + 10);
    }
  }, [getNodeSize, getNodeColor, selectedNode, hoveredNode]);

  // Custom link canvas drawing
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const edge = link as Edge;
    const source = link.source as Node;
    const target = link.target as Node;

    if (!source.x || !source.y || !target.x || !target.y) return;

    const isContinued = edge.type === 'continued';
    const isHovered = hoveredNode && (source.id === hoveredNode.id || target.id === hoveredNode.id);
    const isSelected = selectedNode && (source.id === selectedNode.id || target.id === selectedNode.id);
    const isHighlighted = isSelected || isHovered;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);

    if (isContinued && mode === 'timeline') {
      // Curved line for continued edges in timeline mode
      const midX = (source.x + target.x) / 2;
      const midY = Math.min(source.y, target.y) - 30 - Math.abs(source.x - target.x) * 0.1;
      ctx.quadraticCurveTo(midX, midY, target.x, target.y);
    } else {
      ctx.lineTo(target.x, target.y);
    }

    // Edge styling based on state
    if (isHighlighted) {
      // Bright highlight for connected edges
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = isContinued ? 4 : 3;
      ctx.globalAlpha = 1;
    } else if (hoveredNode || selectedNode) {
      // Dimmed when something else is highlighted
      ctx.strokeStyle = isContinued ? '#3b82f6' : '#64748b';
      ctx.lineWidth = isContinued ? 2 : 1;
      ctx.globalAlpha = 0.15;
    } else {
      // Normal visibility
      ctx.strokeStyle = isContinued ? '#3b82f6' : '#94a3b8';
      ctx.lineWidth = isContinued ? 2.5 : 1.5;
      ctx.globalAlpha = isContinued ? 0.7 : 0.4;
    }

    if (!isContinued) {
      ctx.setLineDash([4, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Arrow for continued edges
    if (isContinued && (isHighlighted || (!hoveredNode && !selectedNode))) {
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowLength = isHighlighted ? 10 : 8;
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
      ctx.strokeStyle = isHighlighted ? '#60a5fa' : '#3b82f6';
      ctx.lineWidth = isHighlighted ? 3 : 2;
      ctx.globalAlpha = isHighlighted ? 1 : 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [mode, selectedNode, hoveredNode]);

  // Physics configuration
  const physicsConfig = useMemo(() => {
    if (mode === 'timeline') {
      return {
        linkDistance: 120,
        charge: -300, // Gentle repulsion for organic layout
        x: 0.1, // Weak x force to keep periods roughly aligned
        y: 0.01, // Minimal y force
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
        warmupTicks={mode === 'timeline' ? 200 : 100}
        cooldownTicks={mode === 'timeline' ? 100 : 50}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        linkDistance={physicsConfig.linkDistance}
        d3Force={(forceName: string, force: any) => {
          if (forceName === 'charge') {
            force.strength(physicsConfig.charge);
          }
          if (forceName === 'x' && mode === 'timeline') {
            // Custom x force that pulls nodes toward their period column
            force.x((d: any) => d.__targetX || 0).strength(0.08);
          } else if (forceName === 'x') {
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

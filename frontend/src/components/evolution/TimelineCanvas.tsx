import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { EvolutionNode, EvolutionEdge } from '../../types/evolution';
import { getNodeColor } from '../../utils/colorSchemes';

interface TimelineCanvasProps {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  selectedNode: EvolutionNode | null;
  onSelectNode: (node: EvolutionNode | null) => void;
  currentPeriod: string;
  onNodeHover?: (node: EvolutionNode | null) => void;
  onTooltipPositionChange?: (position: { x: number; y: number }) => void;
}

export function TimelineCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  currentPeriod,
  onNodeHover,
  onTooltipPositionChange
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
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#64748b')
        .text(period);
    });

    // Arrow marker for continued edges
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

    // Draw nodes
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
        .style('filter', isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none')
        .on('click', () => onSelectNode(isSelected ? null : node))
        .on('mouseenter', (event) => {
          if (onNodeHover) onNodeHover(node);
          if (onTooltipPositionChange) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              onTooltipPositionChange({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
              });
            }
          }
        })
        .on('mouseleave', () => {
          if (onNodeHover) onNodeHover(null);
        });

      // Mode indicator
      g.append('rect')
        .attr('x', node.x - 56)
        .attr('y', node.y + 5)
        .attr('width', 4)
        .attr('height', 40)
        .attr('rx', 2)
        .attr('fill', getNodeColor(node.mode))
        .attr('opacity', isHighlighted ? 1 : 0.3);

      // Title
      g.append('text')
        .attr('x', node.x - 46)
        .attr('y', node.y + 18)
        .attr('class', 'text-xs font-semibold')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#0f172a')
        .text(node.name.length > 8 ? node.name.slice(0, 8) + '...' : node.name)
        .attr('opacity', isHighlighted ? 1 : 0.3)
        .style('pointer-events', 'none');

      // Category
      g.append('text')
        .attr('x', node.x - 46)
        .attr('y', node.y + 32)
        .style('font-size', '10px')
        .style('fill', '#64748b')
        .text(node.category)
        .attr('opacity', isHighlighted ? 1 : 0.3)
        .style('pointer-events', 'none');

      // Paper count
      g.append('text')
        .attr('x', node.x - 46)
        .attr('y', node.y + 44)
        .style('font-size', '9px')
        .style('fill', '#94a3b8')
        .text(`${node.paper_count} papers`)
        .attr('opacity', isHighlighted ? 1 : 0.3)
        .style('pointer-events', 'none');
    });

  }, [nodes, edges, selectedNode, onSelectNode, currentPeriod, getConnectedNodes, onNodeHover, onTooltipPositionChange]);

  return (
    <div ref={containerRef} className="flex-1 h-full bg-slate-50 relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  drag,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  select,
  zoom,
  zoomIdentity,
} from 'd3';
import { normalizeSubcategoryCode } from '../utils/knowledgeGraphConfig';

/**
 * GraphVisualization - D3-based force-directed graph for Knowledge Graph
 *
 * Props:
 * - topics: Array of topic nodes
 * - edges: Object with { neighbor_of, parent_of, evolves_to } arrays
 * - filters: Current filter state { subcategory, edgeKinds, confidence }
 * - selectedTopic: Currently selected topic ID
 * - onTopicClick: Callback when a topic is clicked
 */

const SUBCATEGORY_COLORS = {
  LO: '#3b82f6', // Blue for Logic
  AG: '#10b981', // Green for Algebraic Geometry
  CO: '#f97316', // Orange for Combinatorics
  DS: '#14b8a6', // Teal for Dynamical Systems
  NA: '#eab308', // Amber for Numerical Analysis
  QA: '#f59e0b', // Amber for Quantitative Algebra
  RA: '#8b5cf6', // Purple for Rings and Algebras
  NT: '#ec4899', // Pink for Number Theory
  OA: '#06b6d4', // Cyan for Operator Algebras
  PR: '#a855f7', // Purple for conditional preview
  CS: '#f97316', // Orange for Computer Science
  default: '#64748b',
};

const CONFIDENCE_COLORS = {
  confirmed: '#22c55e',
  ambiguous: '#f59e0b',
  negative: '#ef4444',
  inferred: '#a855f7',
  'data-derived': '#94a3b8',
  default: '#94a3b8',
};

const CONFIDENCE_LABELS = {
  confirmed: '已确认关系',
  ambiguous: '待复核',
  inferred: 'preview 候选',
  'data-derived': '结构背景',
  negative: '已排除',
  default: '结构背景',
};

const EDGE_KIND_STYLES = {
  NEIGHBOR_OF: { width: 1, dash: '4,4', opacity: 0.4 },
  PARENT_OF: { width: 2, dash: '', opacity: 0.6 },
  EVOLVES_TO: { width: 3, dash: '', opacity: 0.8 },
};

const SUBCATEGORY_LABELS = {
  LO: 'LO',
  AG: 'AG',
  CO: 'CO',
  DS: 'DS',
  NA: 'NA',
  PR: 'PR',
};

function getEdgeDash(edge) {
  if (edge.graph_export_status === 'narrative_subgraph_only') {
    return '10,5';
  }
  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'inferred') {
    return '8,4';
  }
  return EDGE_KIND_STYLES[edge.kind]?.dash || '';
}

function getEdgeOpacity(edge) {
  if (edge.graph_export_status === 'narrative_subgraph_only') {
    return 0.68;
  }
  if (edge.kind === 'EVOLVES_TO' && edge.confidence === 'inferred') {
    return 0.9;
  }
  return EDGE_KIND_STYLES[edge.kind]?.opacity || 0.4;
}

export function GraphVisualization({
  topics,
  edges,
  filters,
  selectedTopic,
  selectedTopicLabel = null,
  selectedTopicEdgeCount = 0,
  onTopicClick,
  sourceMode = 'baseline',
  activePresetKey = null,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const positionsRef = useRef(new Map());

  // Filter topics based on subcategory
  const filteredTopics = useMemo(() => {
    if (!filters?.subcategory || filters.subcategory === 'all') {
      return topics;
    }
    const normalizedSubcategory = normalizeSubcategoryCode(filters.subcategory);
    return topics.filter((t) => t.subcategory === normalizedSubcategory);
  }, [topics, filters?.subcategory]);

  // Get filtered topic IDs for edge filtering
  const filteredTopicIds = useMemo(() => {
    return new Set(filteredTopics.map((t) => t.id));
  }, [filteredTopics]);

  // Filter edges based on filters
  const filteredEdges = useMemo(() => {
    const result = [];
    const edgeKinds = filters?.edgeKinds || ['NEIGHBOR_OF', 'PARENT_OF', 'EVOLVES_TO'];
    const confidenceLevels = filters?.confidence || ['confirmed', 'ambiguous'];

    // Process each edge kind
    edgeKinds.forEach((kind) => {
      const edgesOfKind = edges[kind] || [];
      edgesOfKind.forEach((edge) => {
        // Only include edges between filtered topics
        if (!filteredTopicIds.has(edge.source) || !filteredTopicIds.has(edge.target)) {
          return;
        }

        // Filter by confidence
        const confidence = edge.confidence || 'confirmed';
        if (!confidenceLevels.includes(confidence)) {
          return;
        }

        result.push({
          ...edge,
          kind,
          confidence,
        });
      });
    });

    return result;
  }, [edges, filteredTopicIds, filters?.edgeKinds, filters?.confidence]);
  const storyHint = useMemo(() => {
    if (selectedTopic && selectedTopicLabel) {
      return `当前聚焦 ${selectedTopicLabel}。图中会优先提亮它的直连关系，右侧卡片会同步解释这条线为什么值得讲。`;
    }

    if (sourceMode === 'pr_conditional' && activePresetKey === 'research-preview') {
      return '当前只看 math.PR conditional layer。紫色演化边只能当作研究候选，不能讲成默认结论。';
    }

    if (sourceMode === 'pr_conditional') {
      return '当前是 preview bundle。先看绿色/黄色主线，再把紫色关系理解为候选增量。';
    }

    return '先看粗的演化主线，再点节点打开右侧讲述卡；细线和虚线都只是背景结构。';
  }, [sourceMode, activePresetKey, selectedTopic, selectedTopicLabel]);
  const focusEdgeCount = useMemo(() => {
    if (!selectedTopic) return 0;

    return filteredEdges.filter((edge) => edge.source === selectedTopic || edge.target === selectedTopic).length;
  }, [filteredEdges, selectedTopic]);
  const visibleSubcategories = useMemo(() => {
    const codes = [...new Set(filteredTopics.map((topic) => topic.subcategory))];
    return codes
      .filter((code) => SUBCATEGORY_COLORS[code] && code !== 'default' && code !== 'CS')
      .sort((left, right) => left.localeCompare(right));
  }, [filteredTopics]);

  // Initialize D3 simulation
  const initSimulation = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    // Clear previous
    select(svgRef.current).selectAll('*').remove();

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Add arrowhead markers for EVOLVES_TO edges
    const defs = svg.append('defs');
    ['confirmed', 'ambiguous', 'negative', 'inferred', 'data-derived', 'default'].forEach((conf) => {
      defs.append('marker')
        .attr('id', `arrow-${conf}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', CONFIDENCE_COLORS[conf] || CONFIDENCE_COLORS.default);
    });

    // Add zoom behavior
    const g = svg.append('g');

    const zoomBehavior = zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    const currentNodeIds = new Set(filteredTopics.map((t) => t.id));
    positionsRef.current.forEach((_, id) => {
      if (!currentNodeIds.has(id)) {
        positionsRef.current.delete(id);
      }
    });

    // Create nodes with initial positions
    const nodes = filteredTopics.map((t) => ({
      ...t,
      x: positionsRef.current.get(t.id)?.x ?? width / 2 + (Math.random() - 0.5) * 200,
      y: positionsRef.current.get(t.id)?.y ?? height / 2 + (Math.random() - 0.5) * 200,
    }));

    // Create links
    const links = filteredEdges.map((e) => ({ ...e }));

    // Create simulation
    const simulation = forceSimulation(nodes)
      .force('link', forceLink(links)
        .id((d) => d.id)
        .distance((d) => {
          if (d.kind === 'EVOLVES_TO') return 150;
          if (d.kind === 'PARENT_OF') return 100;
          return 80;
        })
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius((d) => d.display_size || 20));
    simulation.alpha(0.35);

    simulationRef.current = simulation;

    // Draw edges
    const linkGroup = g.append('g').attr('class', 'links');

    const link = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => CONFIDENCE_COLORS[d.confidence] || CONFIDENCE_COLORS.default)
      .attr('stroke-width', (d) => EDGE_KIND_STYLES[d.kind]?.width || 1)
      .attr('stroke-dasharray', (d) => getEdgeDash(d))
      .attr('stroke-opacity', (d) => getEdgeOpacity(d))
      .attr('marker-end', (d) => d.kind === 'EVOLVES_TO' ? `url(#arrow-${d.confidence || 'default'})` : null);

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Selection ring (rendered behind main nodes)
    const node = nodeGroup.selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => d.display_size || 20)
      .attr('fill', (d) => SUBCATEGORY_COLORS[d.subcategory] || SUBCATEGORY_COLORS.default)
      .attr('stroke', 'rgba(255,255,255,0.25)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .call(drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onTopicClick?.(d);
      })
      .on('mouseover', (event, d) => {
        applyFocusState(d.id);
      })
      .on('mouseout', () => {
        applyFocusState(selectedTopic);
      });

    // Add labels for larger nodes or selected node
    const label = nodeGroup.selectAll('text')
      .data(nodes.filter((d) => d.display_size > 25 || d.id === selectedTopic))
      .enter()
      .append('text')
      .text((d) => d.label?.length > 15 ? d.label.slice(0, 15) + '...' : d.label)
      .attr('font-size', '10px')
      .attr('fill', '#e2e8f0')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.display_size || 20) + 12)
      .style('pointer-events', 'none');

    function applyFocusState(focusId) {
      if (!focusId) {
        node
          .attr('opacity', 1)
          .attr('stroke', (d) => d.id === selectedTopic ? '#f8fafc' : 'rgba(255,255,255,0.25)')
          .attr('stroke-width', (d) => d.id === selectedTopic ? 3 : 1)
          .style('filter', null);
        link.attr('stroke-opacity', (l) => getEdgeOpacity(l));
        label
          .attr('opacity', 1)
          .attr('fill', '#e2e8f0')
          .style('font-weight', 400);
        return;
      }

      const neighborIds = new Set([focusId]);
      links.forEach((l) => {
        const srcId = l.source.id !== undefined ? l.source.id : l.source;
        const tgtId = l.target.id !== undefined ? l.target.id : l.target;
        if (srcId === focusId) neighborIds.add(tgtId);
        if (tgtId === focusId) neighborIds.add(srcId);
      });

      node
        .attr('opacity', (n) => neighborIds.has(n.id) ? 1 : 0.18)
        .attr('stroke', (n) => {
          if (n.id === focusId) return '#ffffff';
          if (neighborIds.has(n.id)) return 'rgba(255,255,255,0.5)';
          return 'rgba(255,255,255,0.12)';
        })
        .attr('stroke-width', (n) => {
          if (n.id === focusId) return 3;
          return neighborIds.has(n.id) ? 1.5 : 1;
        })
        .style('filter', (n) => (n.id === focusId ? 'drop-shadow(0 0 10px rgba(255,255,255,0.45))' : null));

      link.attr('stroke-opacity', (l) => {
        const src = l.source.id !== undefined ? l.source.id : l.source;
        const tgt = l.target.id !== undefined ? l.target.id : l.target;

        if (src === focusId || tgt === focusId) {
          return Math.min(getEdgeOpacity(l) + 0.2, 1);
        }

        if (neighborIds.has(src) && neighborIds.has(tgt)) {
          return Math.max(getEdgeOpacity(l) * 0.55, 0.15);
        }

        return 0.05;
      });

      label
        .attr('opacity', (n) => (neighborIds.has(n.id) ? 1 : 0.18))
        .attr('fill', (n) => (n.id === focusId ? '#ffffff' : '#e2e8f0'))
        .style('font-weight', (n) => (n.id === focusId ? 700 : 400));
    }

    applyFocusState(selectedTopic);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);

      label
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y);

      nodes.forEach((n) => {
        positionsRef.current.set(n.id, { x: n.x, y: n.y });
      });
    });

    // Background click to deselect
    svg.on('click', () => {
      onTopicClick?.(null);
    });

  }, [filteredTopics, filteredEdges, selectedTopic, onTopicClick]);

  // Initialize or update simulation
  useEffect(() => {
    initSimulation();

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [initSimulation]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && svgRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight || 600;
        select(svgRef.current)
          .attr('width', width)
          .attr('height', height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[600px] bg-slate-900 relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />

      <div className="absolute top-4 left-4 max-w-xs bg-slate-800/90 px-3 py-2 rounded-lg text-xs text-slate-200 leading-5">
        <div className="font-medium text-white mb-1">{selectedTopic ? '当前聚焦' : '怎么看这张图'}</div>
        <p>{storyHint}</p>
        {selectedTopic && (focusEdgeCount || selectedTopicEdgeCount) > 0 && (
          <p className="mt-1 text-[11px] text-slate-300">
            直连关系 {focusEdgeCount || selectedTopicEdgeCount} 条
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg text-xs space-y-2">
        <div className="font-medium text-slate-300 mb-2">图例</div>

        {/* Subcategory colors */}
        <div className="space-y-1">
          <div className="text-slate-400">子类别</div>
          {visibleSubcategories.map((code) => (
            <div key={code} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBCATEGORY_COLORS[code] }} />
              <span className="text-slate-300">{SUBCATEGORY_LABELS[code] || code}</span>
            </div>
          ))}
        </div>

        {/* Edge confidence */}
        <div className="space-y-1 mt-2">
          <div className="text-slate-400">置信度</div>
          {['confirmed', 'ambiguous', 'inferred', 'data-derived', 'negative'].map((level) => (
            <div key={level} className="flex items-center gap-2">
              <span className="w-6 h-0.5" style={{ backgroundColor: CONFIDENCE_COLORS[level] }} />
              <span className="text-slate-300">{CONFIDENCE_LABELS[level]}</span>
            </div>
          ))}
        </div>

        {/* Edge kinds */}
        <div className="space-y-1 mt-2">
          <div className="text-slate-400">边类型</div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">→ 演化主线</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 border-t-2 border-dashed border-slate-300" />
            <span className="text-slate-300">叙事叠层</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-slate-400" />
            <span className="text-slate-300">层级背景</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 border-t border-dashed border-slate-400" />
            <span className="text-slate-300">结构近邻</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-slate-800/90 px-3 py-2 rounded-lg text-xs space-y-1">
        <div className="text-slate-300">
          节点: <span className="text-white font-medium">{filteredTopics.length}</span>
        </div>
        <div className="text-slate-300">
          边: <span className="text-white font-medium">{filteredEdges.length}</span>
        </div>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              select(svgRef.current)
                .transition()
                .duration(500)
                .call(zoomRef.current.transform, zoomIdentity);
            }
          }}
          className="mt-1 w-full px-2 py-1 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          重置视图
        </button>
      </div>
    </div>
  );
}

export default GraphVisualization;

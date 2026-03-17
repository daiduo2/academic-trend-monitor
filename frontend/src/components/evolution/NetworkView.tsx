import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import type { EvolutionNode, EvolutionEdge } from '../../types/evolution';
import { MODE_COLORS } from '../../utils/colorSchemes';

interface NetworkViewProps {
  period: string;
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  confidenceThreshold: number;
  selectedNode: EvolutionNode | null;
  onSelectNode: (node: EvolutionNode | null) => void;
}

interface VisNode {
  id: string;
  label: string;
  title: string;
  color: {
    background: string;
    border: string;
    highlight: {
      background: string;
      border: string;
    };
  };
  size: number;
  font: {
    size: number;
    color: string;
  };
  shape: string;
  mass: number;
}

interface VisEdge {
  from: string;
  to: string;
  width: number;
  color: {
    color: string;
    opacity: number;
  };
  dashes: boolean;
  arrows: {
    to: {
      enabled: boolean;
      scaleFactor: number;
    };
  };
  smooth: {
    type: string;
  };
}

const MIN_NODE_SIZE = 10;
const MAX_NODE_SIZE = 50;
const LOG_SCALE_FACTOR = 5;

function calculateNodeSize(paperCount: number): number {
  const logSize = Math.log(paperCount + 1) * LOG_SCALE_FACTOR;
  return Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, logSize));
}

function getNodeColor(mode: string): string {
  return MODE_COLORS[mode as keyof typeof MODE_COLORS] ?? '#64748b';
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPhysicsOptions(nodeCount: number): object {
  if (nodeCount <= 300) {
    return {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.1,
      },
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 50,
      },
    };
  }

  if (nodeCount <= 800) {
    return {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -1000,
        centralGravity: 0.2,
        springLength: 150,
        springConstant: 0.02,
        damping: 0.1,
        avoidOverlap: 0.2,
      },
      stabilization: {
        enabled: true,
        iterations: 500,
        updateInterval: 100,
      },
    };
  }

  return {
    enabled: false,
  };
}

function getLayoutOptions(nodeCount: number): object {
  if (nodeCount > 800) {
    return {
      hierarchical: {
        enabled: true,
        direction: 'UD',
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 200,
      },
    };
  }

  return {
    hierarchical: {
      enabled: false,
    },
  };
}

export function NetworkView({
  period,
  nodes,
  edges,
  confidenceThreshold,
  selectedNode,
  onSelectNode,
}: NetworkViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  const filteredEdges = useMemo(() => {
    return edges.filter((edge) => edge.confidence >= confidenceThreshold);
  }, [edges, confidenceThreshold]);

  const periodNodes = useMemo(() => {
    return nodes.filter((node) => node.period === period);
  }, [nodes, period]);

  const periodNodeIds = useMemo(() => {
    return new Set(periodNodes.map((n) => n.id));
  }, [periodNodes]);

  const periodEdges = useMemo(() => {
    return filteredEdges.filter(
      (edge) => periodNodeIds.has(edge.source) && periodNodeIds.has(edge.target)
    );
  }, [filteredEdges, periodNodeIds]);

  const visNodes = useMemo((): VisNode[] => {
    return periodNodes.map((node) => {
      const baseColor = getNodeColor(node.mode);
      const size = calculateNodeSize(node.paper_count);

      return {
        id: node.id,
        label: node.name,
        title: `${escapeHtml(node.name)}<br/>Category: ${escapeHtml(node.category)}<br/>Mode: ${escapeHtml(node.mode)}<br/>Papers: ${node.paper_count}`,
        color: {
          background: baseColor,
          border: baseColor,
          highlight: {
            background: '#ffffff',
            border: baseColor,
          },
        },
        size,
        font: {
          size: 12,
          color: '#1f2937',
        },
        shape: 'dot',
        mass: size / 10,
      };
    });
  }, [periodNodes]);

  const visEdges = useMemo((): VisEdge[] => {
    return periodEdges.map((edge) => {
      const isContinued = edge.type === 'continued';

      return {
        from: edge.source,
        to: edge.target,
        width: isContinued ? 2 : 1,
        color: {
          color: isContinued ? '#3b82f6' : '#94a3b8',
          opacity: isContinued ? 0.8 : 0.5,
        },
        dashes: !isContinued,
        arrows: {
          to: {
            enabled: isContinued,
            scaleFactor: 0.5,
          },
        },
        smooth: {
          type: 'continuous',
        },
      };
    });
  }, [periodEdges]);

  const handleSelect = useCallback(
    (params: { nodes: string[] }) => {
      if (params.nodes.length === 0) {
        onSelectNode(null);
        return;
      }

      const selectedId = params.nodes[0];
      const node = periodNodes.find((n) => n.id === selectedId);
      if (node) {
        onSelectNode(node);
      }
    },
    [periodNodes, onSelectNode]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const data = {
      nodes: new DataSet<VisNode>(visNodes),
      edges: new DataSet<VisEdge>(visEdges),
    };

    const nodeCount = visNodes.length;
    const physicsOptions = getPhysicsOptions(nodeCount);
    const layoutOptions = getLayoutOptions(nodeCount);

    const options = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 3,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.1)',
          size: 10,
          x: 0,
          y: 0,
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'dynamic',
        },
        selectionWidth: 3,
        hoverWidth: 2,
      },
      physics: physicsOptions,
      layout: layoutOptions,
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: nodeCount > 500,
        navigationButtons: true,
        keyboard: true,
      },
      configure: {
        enabled: false,
      },
    };

    networkRef.current = new Network(containerRef.current, data, options);

    networkRef.current.on('selectNode', handleSelect);
    networkRef.current.on('deselectNode', () => onSelectNode(null));
    networkRef.current.on('click', (params: { nodes: string[] }) => {
      if (params.nodes.length === 0) {
        onSelectNode(null);
      }
    });

    if (selectedNode) {
      networkRef.current.selectNodes([selectedNode.id]);
      networkRef.current.focus(selectedNode.id, {
        scale: 1.2,
        animation: {
          duration: 500,
          easingFunction: 'easeInOutQuad',
        },
      });
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [visNodes, visEdges, handleSelect, onSelectNode, selectedNode, period]);

  useEffect(() => {
    if (!networkRef.current) return;

    if (selectedNode) {
      networkRef.current.selectNodes([selectedNode.id]);
    } else {
      networkRef.current.unselectAll();
    }
  }, [selectedNode]);

  if (periodNodes.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No data available</p>
          <p className="text-sm">No nodes found for period {period}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full bg-gray-50"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

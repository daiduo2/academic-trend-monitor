import type { EvolutionNode, EvolutionEdge } from '../types/evolution';

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

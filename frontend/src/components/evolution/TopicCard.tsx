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

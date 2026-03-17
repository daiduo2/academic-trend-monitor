import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EvolutionNode, TopicMode } from '../../types/evolution';
import { MODE_COLORS, MODE_LABELS } from '../../utils/colorSchemes';

interface TopicTooltipProps {
  node: EvolutionNode | null;
  position: { x: number; y: number };
  visible: boolean;
}

interface TooltipStyle {
  left: number;
  top: number;
  opacity: number;
  transform: string;
}

const TOOLTIP_OFFSET = { x: 15, y: -10 };
const ARROW_SIZE = 8;

export function TopicTooltip({ node, position, visible }: TopicTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<TooltipStyle>({
    left: 0,
    top: 0,
    opacity: 0,
    transform: 'translateY(4px)'
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Note: createPortal automatically removes children when component unmounts
  useLayoutEffect(() => {
    if (!visible || !node) {
      setStyle(prev => ({
        ...prev,
        opacity: 0,
        transform: 'translateY(4px)'
      }));
      return;
    }

    // Estimated dimensions based on CSS classes (min-w-[180px] + padding)
    const TOOLTIP_ESTIMATED_WIDTH = 200;
    const TOOLTIP_ESTIMATED_HEIGHT = 120; // Approximate for 5 content rows
    const VIEWPORT_PADDING = 16;

    let left = position.x + TOOLTIP_OFFSET.x;
    let top = position.y + TOOLTIP_OFFSET.y - TOOLTIP_ESTIMATED_HEIGHT;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Prevent overflow on right edge
    if (left + TOOLTIP_ESTIMATED_WIDTH + VIEWPORT_PADDING > viewportWidth) {
      left = position.x - TOOLTIP_ESTIMATED_WIDTH - TOOLTIP_OFFSET.x;
    }

    // Prevent overflow on top edge
    if (top < VIEWPORT_PADDING) {
      top = position.y + TOOLTIP_OFFSET.y + 20;
    }

    setStyle({
      left,
      top,
      opacity: 1,
      transform: 'translateY(0)'
    });
  }, [visible, position, node]);

  if (!mounted || !node) {
    return null;
  }

  const tooltipContent = (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: style.left,
        top: style.top,
        opacity: style.opacity,
        transform: style.transform,
        transition: 'opacity 150ms ease-out, transform 150ms ease-out'
      }}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[180px]">
        <div
          className="absolute w-0 h-0"
          style={{
            left: position.x > style.left ? '20px' : 'auto',
            right: position.x <= style.left ? '20px' : 'auto',
            top: position.y > style.top ? -ARROW_SIZE : 'auto',
            bottom: position.y <= style.top ? -ARROW_SIZE : 'auto',
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderTop: position.y > style.top ? `${ARROW_SIZE}px solid white` : 'none',
            borderBottom: position.y <= style.top ? `${ARROW_SIZE}px solid white` : 'none',
            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.05))'
          }}
        />

        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight">
            {node.name}
          </h4>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">类别:</span>
            <span className="text-xs font-medium text-gray-700">{node.category}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">模式:</span>
            <ModeBadge mode={node.mode} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">时间段:</span>
            <span className="text-xs font-medium text-gray-700">{node.period}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">论文数:</span>
            <span className="text-xs font-medium text-gray-700">{node.paper_count}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}

interface ModeBadgeProps {
  mode: TopicMode;
}

function ModeBadge({ mode }: ModeBadgeProps) {
  const color = MODE_COLORS[mode];
  const label = MODE_LABELS[mode];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </span>
  );
}

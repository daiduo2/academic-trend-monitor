import type { TopicMode } from '../types/evolution';

export const MODE_COLORS: Record<TopicMode, string> = {
  theory: '#4A90D9',   // Blue
  method: '#5CB85C',   // Green
  problem: '#F0AD4E',  // Orange
  hybrid: '#9B59B6'    // Purple
};

export const MODE_LABELS: Record<TopicMode, string> = {
  theory: '理论',
  method: '方法',
  problem: '问题',
  hybrid: '混合'
};

export const CATEGORY_COLORS: Record<string, string> = {
  'math.OA': '#3b82f6',
  'math.NT': '#10b981',
  'math.CO': '#f59e0b',
  'math.AG': '#8b5cf6',
  'math.PR': '#ec4899'
};

export function getNodeColor(mode: TopicMode): string {
  return MODE_COLORS[mode] || '#64748b';
}

export function getModeLabel(mode: TopicMode): string {
  return MODE_LABELS[mode] || mode;
}

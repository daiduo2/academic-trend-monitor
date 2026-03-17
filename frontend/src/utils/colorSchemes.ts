import type { TopicMode } from '../types/evolution';

export const MODE_COLORS: Record<TopicMode, string> = {
  theory: '#3b82f6',   // blue-500
  method: '#10b981',   // emerald-500
  problem: '#f59e0b',  // amber-500
  hybrid: '#8b5cf6'    // violet-500
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

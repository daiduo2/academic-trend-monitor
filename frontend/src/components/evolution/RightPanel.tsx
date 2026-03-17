import React from 'react';
import type { EvolutionNode } from '../../types/evolution';
import { MODE_COLORS, MODE_LABELS } from '../../utils/colorSchemes';

interface RightPanelProps {
  selectedNode: EvolutionNode | null;
}

interface TimelineEvent {
  period: string;
  status: '起始' | '持续' | '结束' | '当前';
  paperCount: number;
  citations: number;
  trend: '上升' | '稳定' | '下降';
}

export function RightPanel({ selectedNode }: RightPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-[320px] bg-white border-l border-gray-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm">点击节点查看详情</div>
        </div>
      </div>
    );
  }

  // Mock timeline events - in real app, fetch from API
  const timelineEvents: TimelineEvent[] = [
    { period: '2025-02', status: '起始', paperCount: 12, citations: 45, trend: '上升' },
    { period: '2025-03', status: '持续', paperCount: 18, citations: 62, trend: '稳定' },
    { period: '2025-04', status: '当前', paperCount: 15, citations: 58, trend: '下降' }
  ];

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          {selectedNode.name}
        </h2>
        <p className="text-sm text-gray-500">Topic ID: {selectedNode.topic_id}</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Basic Info */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            基本信息
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-sm font-medium">
              {selectedNode.category}
            </span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `${MODE_COLORS[selectedNode.mode]}20`,
                color: MODE_COLORS[selectedNode.mode]
              }}
            >
              {MODE_LABELS[selectedNode.mode]}
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
              {selectedNode.paper_count} 论文
            </span>
          </div>
        </section>

        {/* Timeline Events */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            演化路径
          </h3>
          <div className="space-y-3">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {event.period}
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                    {event.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  论文: {event.paperCount} · 引用: {event.citations} · 热度: {event.trend}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related Topics */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            关联主题
          </h3>
          <div className="space-y-2">
            {['迹态代数结构', '非交换几何', 'C*-代数分类'].map((name, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{name}</div>
                  <div className="text-xs text-gray-400">
                    {idx === 0 ? '同类别' : '跨类别'} · 相似度 {(0.85 - idx * 0.07).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Source Tracking */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            来源追踪
          </h3>
          <div className="text-sm text-gray-500 space-y-1">
            <div>📄 生成时间: 2026-03-17</div>
            <div>🔧 数据来源: evolution_cases.json</div>
            <div>📊 算法版本: v2.1</div>
          </div>
        </section>
      </div>
    </div>
  );
}

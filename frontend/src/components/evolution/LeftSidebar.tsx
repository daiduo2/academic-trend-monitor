import React from 'react';
import type { CategoryInfo } from '../../types/evolution';
import { MODE_COLORS } from '../../utils/colorSchemes';

interface LeftSidebarProps {
  categories: Record<string, CategoryInfo>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  viewMode: 'timeline' | 'network';
  onSwitchView: (mode: 'timeline' | 'network') => void;
}

export function LeftSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  viewMode,
  onSwitchView
}: LeftSidebarProps) {
  const totalCount = Object.values(categories).reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            视图模式
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => onSwitchView('timeline')}
            >
              时间轴
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                viewMode === 'network'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => onSwitchView('network')}
            >
              关系网
            </button>
          </div>
        </div>

        {/* Category Tree */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            学科分类
          </div>
          <div className="space-y-1">
            {/* All Categories */}
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectCategory('all')}
            >
              <span className="text-lg">📚</span>
              <span className="flex-1 text-sm font-medium">全部学科</span>
              <span className="text-xs text-gray-400">{totalCount}</span>
            </div>

            {/* Individual Categories */}
            <div className="pl-2 space-y-1">
              {Object.entries(categories).map(([category, info]) => (
                <div key={category}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => onSelectCategory(category)}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MODE_COLORS[info.modes[0]] }}
                    />
                    <span className="flex-1 text-sm">{category}</span>
                    <span className="text-xs text-gray-400">{info.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            图例说明
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span>理论导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span>方法导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span>问题导向</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span>混合导向</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-500" />
                <span className="text-xs">主题演化（时间连续）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t border-dashed border-gray-400" />
                <span className="text-xs">主题关联（同时间段）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

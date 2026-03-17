// frontend/src/components/evolution/CanvasToolbar.tsx

import React from 'react';

export function CanvasToolbar() {
  return (
    <div className="flex gap-2">
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="放大">
        +
      </button>
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="缩小">
        −
      </button>
      <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors" title="适应屏幕">
        ⟲
      </button>
    </div>
  );
}

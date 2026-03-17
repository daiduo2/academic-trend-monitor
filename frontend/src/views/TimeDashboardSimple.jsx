import { useState } from 'react';

export default function TimeDashboardSimple() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">趋势追踪分析</h2>
      <p className="text-gray-500 mt-2">这是一个测试页面</p>
      <button
        onClick={() => setCount(c => c + 1)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        点击次数: {count}
      </button>
    </div>
  );
}

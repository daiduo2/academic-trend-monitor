import { useState, useEffect } from 'react';

export default function TimeDashboardTest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${basePath}data/domain_structure.json`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8">加载中...</div>;
  if (error) return <div className="p-8 text-red-600">错误: {error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold">趋势追踪分析 (测试版)</h2>
      <p className="mt-4">数据版本: {data?.version}</p>
      <p>时间段: {data?.periods?.join(', ')}</p>
      <p>学科数: {Object.keys(data?.taxonomy || {}).length}</p>
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { useTopic } from '../hooks/useData';
import { TrendChart } from '../components/TrendChart';

export default function TopicDetail() {
  const { topicId } = useParams();
  const { topic, trend, loading, error } = useTopic(topicId);

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;
  if (!topic) return <div className="p-8 text-center">主题未找到</div>;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/tree"
        className="text-blue-500 hover:text-blue-700"
      >
        ← 返回领域浏览
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2">{topic.name || topicId}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>论文数: {topic.paper_count}</span>
          <span>月份: {topic.period}</span>
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">关键词</h2>
        <div className="flex flex-wrap gap-2">
          {topic.keywords?.map((kw, i) => (
            <span
              key={i}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      {trend?.history && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">趋势分析</h2>
          <TrendChart data={trend.history} width={700} height={300} />
        </div>
      )}

      {/* Representative Papers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">代表性论文</h2>
        <div className="space-y-3">
          {topic.representative_docs?.map((doc, i) => (
            <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-medium">{doc.title}</p>
              <p className="text-sm text-gray-500">ID: {doc.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

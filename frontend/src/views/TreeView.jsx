import { useData } from '../hooks/useData';
import { TreeNode } from '../components/TreeNode';

export default function TreeView() {
  const { data, loading, error } = useData();

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">领域层次浏览</h2>
      <p className="text-gray-500 mb-6">
        点击节点展开/折叠，点击"详情"查看主题详情
      </p>

      {data.tree && (
        <TreeNode node={data.tree} />
      )}
    </div>
  );
}

import { useState } from 'react';

function TreeNode({ node, topics, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  // Find topics that belong to this node
  const nodeTopics = topics.filter(t =>
    t.hierarchy_path && t.hierarchy_path.includes(node.name)
  );

  const totalPapers = nodeTopics.reduce((sum, t) => sum + (t.latest_paper_count || 0), 0);

  return (
    <div className={level > 0 ? "ml-4" : ""}>
      <div
        className="flex items-center py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="mr-2 text-gray-400 w-4">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-2 w-4" />}

        <span className={`font-medium ${level === 0 ? 'text-lg text-gray-900' : 'text-gray-700'}`}>
          {node.name}
        </span>

        {nodeTopics.length > 0 && (
          <span className="ml-2 text-sm text-gray-500">
            ({nodeTopics.length}主题, {totalPapers}篇)
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-gray-200 ml-2">
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} topics={topics} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyTree({ hierarchy, topics }) {
  if (!hierarchy || !hierarchy.tree) {
    return (
      <div className="text-gray-500 text-center py-8">
        暂无层次结构数据
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">研究主题层次结构</h3>
      <div className="max-h-[500px] overflow-y-auto">
        <TreeNode node={hierarchy.tree} topics={topics} level={0} />
      </div>
    </div>
  );
}

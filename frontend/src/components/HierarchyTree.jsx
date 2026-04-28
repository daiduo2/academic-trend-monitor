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
        className="flex items-center py-2 cursor-pointer hover:bg-slate-900/80 rounded px-2 transition"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="mr-2 text-slate-500 w-4">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-2 w-4" />}

        <span className={`font-medium ${level === 0 ? 'text-lg text-slate-100' : 'text-slate-300'}`}>
          {node.name}
        </span>

        {nodeTopics.length > 0 && (
          <span className="ml-2 text-sm text-slate-500">
            ({nodeTopics.length}主题, {totalPapers}篇)
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-slate-800 ml-2">
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
      <div className="text-slate-500 text-center py-8">
        暂无层次结构数据
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-950/88 p-5 text-slate-100 shadow-[0_18px_52px_rgba(2,6,23,0.28)]">
      <h3 className="text-base font-semibold text-white mb-4">研究主题层次结构</h3>
      <div className="max-h-[500px] overflow-y-auto">
        <TreeNode node={hierarchy.tree} topics={topics} level={0} />
      </div>
    </div>
  );
}

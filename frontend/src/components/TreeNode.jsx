import { useState } from 'react';
import { Link } from 'react-router-dom';

export function TreeNode({ node, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        className="flex items-center py-2 cursor-pointer hover:bg-gray-50 rounded"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="mr-2 text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-2 w-4" />}

        <span className="font-medium">{node.name}</span>

        {node.paper_count && (
          <span className="ml-2 text-sm text-gray-500">
            ({node.paper_count}篇)
          </span>
        )}

        {!hasChildren && (
          <Link
            to={`/topic/${node.id}`}
            className="ml-4 text-blue-500 hover:text-blue-700 text-sm"
          >
            详情 →
          </Link>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="border-l border-gray-200 ml-2">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

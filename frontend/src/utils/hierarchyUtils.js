/**
 * 从 trend history 获取指定周期的论文数
 * @param {Object} trend - 趋势数据
 * @param {string} period - 指定周期，不传则获取最新周期
 * @returns {number} 论文数
 */
function getPaperCountForPeriod(trend, period = null) {
  if (!trend?.history || trend.history.length === 0) return 0;

  if (period) {
    // 查找指定周期的数据
    const entry = trend.history.find(h => h.period === period);
    return entry?.paper_count || 0;
  }

  // 不传 period 则返回最新周期
  const lastEntry = trend.history[trend.history.length - 1];
  return lastEntry?.paper_count || 0;
}

/**
 * 为树节点添加论文数量（根据 topic_ids 从 trends 中计算）
 * @param {Object} node - 树节点
 * @param {Object} trends - 趋势数据对象
 * @param {string} period - 指定周期，不传则获取最新周期
 * @returns {Object} 处理后的节点
 */
export function enrichTreeWithPaperCounts(node, trends, period = null) {
  if (!node) return null;

  const result = {
    name: node.name,
    topic_ids: node.topic_ids || [],
    depth: node.depth || 0
  };

  // Calculate paper count from topic_ids
  // Note: topic_ids are '1', '2', etc., but trends keys are 'global_1', 'global_2', etc.
  if (result.topic_ids.length > 0 && trends) {
    result.paper_count = result.topic_ids.reduce((sum, id) => {
      const trendKey = `global_${id}`;
      const trend = trends[trendKey];
      return sum + getPaperCountForPeriod(trend, period);
    }, 0);
  } else {
    result.paper_count = 0;
  }

  // Process children recursively
  if (node.children && node.children.length > 0) {
    result.children = node.children.map(child =>
      enrichTreeWithPaperCounts(child, trends, period)
    ).sort((a, b) => b.paper_count - a.paper_count);

    // Sum children's paper counts for intermediate nodes
    if (result.topic_ids.length === 0) {
      result.paper_count = result.children.reduce((sum, child) =>
        sum + (child.paper_count || 0), 0
      );
    }
  }

  return result;
}

/**
 * 获取指定层级的节点列表
 * @param {Object} tree - 层级树根节点
 * @param {number} targetDepth - 目标深度（Layer 3 = 2, Layer 4 = 3）
 * @returns {Array} 该层级的所有节点
 */
export function getNodesAtDepth(tree, targetDepth) {
  const result = [];

  function traverse(node, currentDepth) {
    if (currentDepth === targetDepth) {
      result.push(node);
      return;
    }
    if (node.children) {
      node.children.forEach(child => traverse(child, currentDepth + 1));
    }
  }

  if (tree.children) {
    tree.children.forEach(child => traverse(child, 0));
  }

  return result.sort((a, b) => b.paper_count - a.paper_count);
}

/**
 * 根据路径查找节点
 * @param {Object} tree - 层级树根节点
 * @param {Array} path - 路径数组
 * @returns {Object|null} 找到的节点
 */
export function findNodeByPath(tree, path) {
  let current = tree;

  for (const name of path) {
    if (!current.children) return null;
    const found = current.children.find(c => c.name === name);
    if (!found) return null;
    current = found;
  }

  return current;
}

/**
 * 根据 topic_id 查找主题信息
 * @param {Array} topics - 主题列表
 * @param {string} topicId - 主题ID
 * @returns {Object|null} 主题信息
 */
export function findTopicById(topics, topicId) {
  return topics.find(t => t.id === topicId) || null;
}

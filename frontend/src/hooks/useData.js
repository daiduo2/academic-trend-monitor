import { useState, useEffect } from 'react';

async function fetchJsonWithFallback(paths) {
  for (const path of paths) {
    const response = await fetch(path);
    if (response.ok) {
      return response.json();
    }
  }

  throw new Error('Failed to load data');
}

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const basePath = import.meta.env.BASE_URL || '/';
        const [treeData, trendsData] = await Promise.all([
          fetchJsonWithFallback([
            `${basePath}data/output/topics_tree.json`,
            `${basePath}data/topics_tree.json`
          ]),
          fetchJsonWithFallback([
            `${basePath}data/output/trend_stats.json`,
            `${basePath}data/trend_stats.json`
          ])
        ]);

        setData({
          topics: treeData.topics,
          tree: treeData.tree,
          trends: trendsData.trends,
          version: treeData.version
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}

export function useTopic(topicId) {
  const { data, loading, error } = useData();

  if (!data || loading) {
    return { topic: null, trend: null, loading, error };
  }

  const topic = data.topics[topicId];
  const trend = data.trends[topicId];

  return { topic, trend, loading, error };
}

import { useState, useEffect } from 'react';

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const basePath = import.meta.env.BASE_URL || '/';
        const [treeResponse, trendsResponse] = await Promise.all([
          fetch(`${basePath}data/topics_tree.json`),
          fetch(`${basePath}data/trend_stats.json`)
        ]);

        if (!treeResponse.ok || !trendsResponse.ok) {
          throw new Error('Failed to load data');
        }

        const treeData = await treeResponse.json();
        const trendsData = await trendsResponse.json();

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

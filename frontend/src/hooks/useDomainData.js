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

export function useDomainData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const basePath = import.meta.env.BASE_URL || '/';
        const alignedData = await fetchJsonWithFallback([
          `${basePath}data/output/aligned_topics_hierarchy.json`,
          `${basePath}data/aligned_topics_hierarchy.json`
        ]);

        setData({
          structure: alignedData,
          trends: { trends: alignedData.trends },
          hierarchies: alignedData.hierarchies,
          version: alignedData.version,
          periods: alignedData.periods
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

// Get list of Layer 1 categories
export function getLayer1List(structure) {
  // structure is now the alignedData object directly
  if (!structure?.structure) return [];
  return Object.keys(structure.structure).sort();
}

// Get list of Layer 2 categories for a Layer 1
export function getLayer2List(structure, layer1) {
  if (!structure?.structure?.[layer1]) return [];
  return Object.keys(structure.structure[layer1]).sort();
}

// Get topics for a specific Layer 2
export function getTopicsForLayer2(structure, layer1, layer2) {
  if (!structure?.structure?.[layer1]?.[layer2]) return [];
  return structure.structure[layer1][layer2] || [];
}

// Get all topics with their trends for a Layer 2 (for TimeDashboard)
export function getTopicsWithTrends(structure, trends, layer1, layer2) {
  const topics = structure?.structure?.[layer1]?.[layer2] || [];

  return topics.map(topic => {
    const trend = trends?.trends?.[topic.id];
    return {
      ...topic,
      trend: trend?.history || []
    };
  });
}

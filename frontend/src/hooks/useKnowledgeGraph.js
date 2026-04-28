import { useState, useEffect } from 'react';
import { fetchJsonWithFallback } from '../utils/jsonFetch';
import {
  CONFIDENCE_CONFIG,
  KNOWLEDGE_GRAPH_SUBCATEGORY_META,
} from '../utils/knowledgeGraphConfig';

// Edge kind labels
const EDGE_KIND_LABELS = {
  'NEIGHBOR_OF': '相邻主题',
  'PARENT_OF': '层级关系',
  'EVOLVES_TO': '演化关系',
  'CONTAINS_TOPIC': '包含主题',
  'ACTIVE_IN': '活跃于',
};


/**
 * Hook for loading Knowledge Graph bundle data
 *
 * Data Source: data/output/kg_v1_visualization/graph_bundle.json
 * Structure: { version, nodes: {topics, subcategories, periods}, edges: {all, by_kind}, filters, stats }
 *
 * @returns {Object} Knowledge graph data and loading state
 */
export function useKnowledgeGraph({ sourceMode = 'baseline' } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const basePath = import.meta.env.BASE_URL || '/';
        const bundlePaths = sourceMode === 'pr_conditional'
          ? [
              `${basePath}data/output/kg_v1_pr_conditional_visualization/graph_bundle.json`,
              `${basePath}data/kg_v1_pr_conditional_visualization/graph_bundle.json`,
            ]
          : [
              `${basePath}data/output/kg_v1_visualization/graph_bundle.json`,
              `${basePath}data/kg_v1_visualization/graph_bundle.json`,
            ];
        const bundle = await fetchJsonWithFallback(bundlePaths);

        // Transform and validate bundle structure
        if (!bundle.nodes || !bundle.edges) {
          throw new Error('Invalid graph bundle: missing nodes or edges');
        }

        setData(bundle);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sourceMode]);

  // Extract and return structured data
  const topics = data?.nodes?.topics || [];
  const subcategories = data?.nodes?.subcategories || [];
  const edges = data?.edges?.by_kind || {};
  const stats = data?.stats || {};
  const metadata = data?.metadata || {};
  const domainKnowledgeLayers = metadata?.domain_knowledge_layers || {};
  const narrativeSubgraphs = data?.narrative_subgraphs || {};

  // Normalize raw bundle filters into UI-friendly shape
  const rawFilters = data?.filters || {};
  const subcategoryCodes = [
    ...(rawFilters.subcategories || []),
    ...Object.keys(narrativeSubgraphs || {}),
  ];
  const uniqueSubcategoryCodes = [...new Set(subcategoryCodes)];

  const filters = {
    subcategories: uniqueSubcategoryCodes.map((code) => ({
      value: code,
      code,
      label: KNOWLEDGE_GRAPH_SUBCATEGORY_META[code]?.label || code,
      description: KNOWLEDGE_GRAPH_SUBCATEGORY_META[code]?.description || null,
    })),
    edgeKinds: (rawFilters.edge_kinds || [])
      .filter(k => ['NEIGHBOR_OF', 'PARENT_OF', 'EVOLVES_TO'].includes(k))
      .map((k) => ({
        value: k,
        label: EDGE_KIND_LABELS[k] || k,
      })),
    confidenceLevels: (rawFilters.confidence_levels || []).map((level) => ({
      value: level,
      label: CONFIDENCE_CONFIG[level]?.label || level,
      color: CONFIDENCE_CONFIG[level]?.color || '#9ca3af',
    })),
  };

  return {
    // Node arrays
    topics,
    subcategories,

    // Edge data
    edges,

    // Filter options and stats
    filters,
    stats,
    metadata,
    domainKnowledgeLayers,
    narrativeSubgraphs,

    // Loading and error states
    loading,
    error,

    // Raw bundle for advanced use cases
    bundle: data,
  };
}

/**
 * Hook for accessing a specific subcategory by code
 *
 * @param {string} code - Subcategory code (e.g., 'math.LO', 'math.AG')
 * @returns {Object} Subcategory data and related topics
 */
export function useSubcategory(code) {
  const { subcategories, topics, loading, error } = useKnowledgeGraph();

  const subcategory = subcategories.find((s) => s.code === code) || null;

  // Normalize canonical code to short form: "math.LO" -> "LO"
  const shortCode = code.includes('.') ? code.split('.').pop() : code;

  const subcategoryTopics = subcategory
    ? topics.filter((t) => t.subcategory === shortCode)
    : [];

  return {
    subcategory,
    topics: subcategoryTopics,
    loading,
    error,
  };
}

/**
 * Hook for accessing a specific topic by ID
 *
 * @param {string} topicId - Topic ID
 * @returns {Object} Topic data
 */
export function useTopic(topicId) {
  const { topics, edges, loading, error } = useKnowledgeGraph();

  const topic = topics.find((t) => t.id === topicId) || null;

  // Find related edges for this topic
  const topicEdges = topic
    ? {
        incoming: Object.values(edges)
          .flat()
          .filter((e) => e.target === topicId),
        outgoing: Object.values(edges)
          .flat()
          .filter((e) => e.source === topicId),
      }
    : { incoming: [], outgoing: [] };

  return {
    topic,
    edges: topicEdges,
    loading,
    error,
  };
}

export default useKnowledgeGraph;

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EvolutionNode, EvolutionEdge, VisualizationData } from '../types/evolution';

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface Node {
  id: string;
  topic_id: string;
  name: string;
  period: string;
  category: string;
  mode: string;
  paper_count: number;
  val?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface Edge {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

interface UseGraphDataReturn {
  data: GraphData | null;
  rawData: VisualizationData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_GRAPHITI_API_URL;
const BASE_URL = import.meta.env.BASE_URL + 'data/output/evolution_graphs';

export function useGraphData(domain: string = 'math'): UseGraphDataReturn {
  const [rawData, setRawData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromAPI = useCallback(async (): Promise<VisualizationData> => {
    const response = await fetch(`${API_URL}/api/evolution/network?domain=${domain}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }, [domain]);

  const fetchFromStatic = useCallback(async (): Promise<VisualizationData> => {
    const response = await fetch(`${BASE_URL}/${domain}_visualization.json`);
    if (!response.ok) {
      throw new Error(`Failed to load static data: ${response.status}`);
    }
    return response.json();
  }, [domain]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = API_URL ? await fetchFromAPI() : await fetchFromStatic();
      setRawData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRawData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchFromAPI, fetchFromStatic]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const graphData = useMemo((): GraphData | null => {
    if (!rawData) return null;

    const nodes: Node[] = rawData.nodes.map(node => ({
      id: node.id,
      topic_id: node.topic_id,
      name: node.name,
      period: node.period,
      category: node.category,
      mode: node.mode,
      paper_count: node.paper_count,
      val: Math.log(node.paper_count + 1) * 2,
      x: node.x,
      y: node.y,
    }));

    const edges: Edge[] = rawData.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      confidence: edge.confidence,
    }));

    return { nodes, edges };
  }, [rawData]);

  return {
    data: graphData,
    rawData,
    loading,
    error,
    refetch: fetchData,
  };
}

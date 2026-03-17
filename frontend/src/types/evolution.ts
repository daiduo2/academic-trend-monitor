export type TopicMode = 'theory' | 'method' | 'problem' | 'hybrid';
export type EdgeType = 'continued' | 'diffused_to_neighbor';

export interface EvolutionNode {
  id: string;
  topic_id: string;
  name: string;
  period: string;
  category: string;
  mode: TopicMode;
  paper_count: number;
  x: number;
  y: number;
}

export interface EvolutionEdge {
  source: string;
  target: string;
  type: EdgeType;
  confidence: number;
}

export interface CategoryInfo {
  count: number;
  modes: TopicMode[];
}

export interface VisualizationData {
  version: string;
  generated_at: string;
  domain: string;
  metadata: {
    total_nodes: number;
    total_edges: number;
    periods: string[];
    categories: string[];
  };
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  category_tree: Record<string, CategoryInfo>;
}

export interface DomainConfig {
  id: string;
  name: string;
  available: boolean;
  data_file: string | null;
}

export interface Manifest {
  version: string;
  domains: DomainConfig[];
  default_domain: string;
}

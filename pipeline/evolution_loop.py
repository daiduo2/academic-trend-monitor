"""
Topic Evolution Autonomous Analysis Loop

Usage:
    python -m pipeline.evolution_loop --domain=math
"""
import argparse
import json
from pathlib import Path
from typing import Optional

from pipeline.evolution_models import EvolutionGraph, GraphMetrics
from pipeline.evolution_graph_builder import load_evolution_cases, build_topic_nodes, build_edges
from pipeline.evolution_graph_analytics import detect_isolated_clusters
from pipeline.evolution_state_manager import StateManager


def build_graph(cases_path: str, domain: str, periods: list) -> EvolutionGraph:
    """Build evolution graph from cases."""
    import networkx as nx

    cases = load_evolution_cases(cases_path)
    nodes = build_topic_nodes(cases, periods)
    edges = build_edges(nodes)

    # Calculate metrics using NetworkX
    G = nx.Graph()
    for node in nodes:
        G.add_node(node.id)
    for edge in edges:
        G.add_edge(edge.source, edge.target)

    connected_components = nx.number_connected_components(G)

    # Calculate largest component ratio
    if len(nodes) > 0:
        largest_cc = max(nx.connected_components(G), key=len)
        largest_component_ratio = len(largest_cc) / len(nodes)
    else:
        largest_component_ratio = 0.0

    # Calculate temporal consistency (cross-period edges / total edges)
    temporal_edges = sum(1 for e in edges if e.evidence.temporal_gap > 0)
    temporal_consistency = temporal_edges / len(edges) if edges else 0.0

    # Calculate clustering coefficient
    clustering_coefficient = nx.average_clustering(G) if len(nodes) > 0 else 0.0

    # Calculate average path length (for largest component)
    try:
        largest_cc_subgraph = G.subgraph(largest_cc)
        average_path_length = nx.average_shortest_path_length(largest_cc_subgraph)
    except:
        average_path_length = 0.0

    metrics = GraphMetrics(
        total_nodes=len(nodes),
        total_edges=len(edges),
        connected_components=connected_components,
        largest_component_ratio=largest_component_ratio,
        average_path_length=average_path_length,
        clustering_coefficient=clustering_coefficient,
        temporal_consistency=temporal_consistency
    )

    from datetime import datetime
    return EvolutionGraph(
        version="1.0",
        generated_at=datetime.now().isoformat(),
        domain=domain,
        nodes=nodes,
        edges=edges,
        metrics=metrics
    )


def main():
    parser = argparse.ArgumentParser(description="Evolution Analysis Loop")
    parser.add_argument("--domain", required=True, help="Domain to analyze")
    parser.add_argument("--config", help="Domain config file")
    parser.add_argument("--cases", default="data/output/evolution_cases.json",
                        help="Path to evolution cases")
    parser.add_argument("--periods", nargs="+",
                        default=["2025-02", "2025-03", "2025-04", "2025-05"],
                        help="Time periods to analyze")

    args = parser.parse_args()

    # Build graph
    graph = build_graph(args.cases, args.domain, args.periods)

    # Save graph
    output_dir = Path("data/output/evolution_graphs")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"{args.domain}_graph.json"
    with open(output_path, 'w') as f:
        f.write(graph.model_dump_json(indent=2))

    print(f"Graph built: {len(graph.nodes)} nodes, {len(graph.edges)} edges")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()

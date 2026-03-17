#!/usr/bin/env python3
"""
Rebuild evolution graph with proper edge generation.

This script regenerates the evolution graph using the improved edge generation
logic in evolution_graph_builder.py.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.evolution_graph_builder import build_graph
from pipeline.evolution_models import EvolutionGraph, GraphMetrics


def rebuild_evolution_graph(
    cases_path: Path,
    output_path: Path,
    periods: list[str],
    domain: str = "math",
    similarity_threshold: float = 0.5,
) -> dict[str, Any]:
    """Rebuild evolution graph with edge generation.

    Args:
        cases_path: Path to evolution_cases.json
        output_path: Path to save the evolution graph
        periods: List of periods to include
        domain: Domain identifier
        similarity_threshold: Minimum similarity for semantic edges

    Returns:
        Statistics about the generated graph
    """
    print(f"Building evolution graph for domain: {domain}")
    print(f"Periods: {periods}")
    print(f"Similarity threshold: {similarity_threshold}")

    # Build the graph with edges
    graph_data = build_graph(
        cases_path=str(cases_path),
        periods=periods,
        similarity_threshold=similarity_threshold,
        max_cross_topic_edges=5,
    )

    nodes = graph_data["nodes"]
    edges = graph_data["edges"]

    print(f"\nGenerated {len(nodes)} nodes and {len(edges)} edges")

    # Calculate basic metrics
    # Count edge types
    edge_type_counts: dict[str, int] = {}
    for edge in edges:
        edge_type = edge.relation_type.value
        edge_type_counts[edge_type] = edge_type_counts.get(edge_type, 0) + 1

    print("\nEdge type distribution:")
    for edge_type, count in sorted(edge_type_counts.items()):
        print(f"  {edge_type}: {count}")

    # Build the evolution graph model
    metrics = GraphMetrics(
        total_nodes=len(nodes),
        total_edges=len(edges),
        connected_components=0,  # Would need graph analysis
        largest_component_ratio=0.0,
        average_path_length=0.0,
        clustering_coefficient=0.0,
        temporal_consistency=0.0,
    )

    # Convert to serializable format
    output = {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "domain": domain,
        "nodes": [
            {
                "id": n.id,
                "topic_id": n.topic_id,
                "period": n.period,
                "name": n.name,
                "category": n.category,
                "mode": n.mode,
                "paper_count": n.paper_count,
                "embedding": n.embedding,
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "relation_type": e.relation_type.value,
                "confidence": e.confidence,
                "rule_triggered": e.rule_triggered,
                "evidence": {
                    "shared_terms": e.evidence.shared_terms,
                    "cosine_similarity": e.evidence.cosine_similarity,
                    "temporal_gap": e.evidence.temporal_gap,
                },
            }
            for e in edges
        ],
        "metrics": {
            "total_nodes": metrics.total_nodes,
            "total_edges": metrics.total_edges,
            "connected_components": metrics.connected_components,
            "largest_component_ratio": metrics.largest_component_ratio,
            "average_path_length": metrics.average_path_length,
            "clustering_coefficient": metrics.clustering_coefficient,
            "temporal_consistency": metrics.temporal_consistency,
        },
    }

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nEvolution graph written to: {output_path}")

    return {
        "output_path": str(output_path),
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "edge_type_counts": edge_type_counts,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild evolution graph with edge generation"
    )
    parser.add_argument(
        "--cases",
        default="data/output/evolution_cases.json",
        help="Path to evolution_cases.json",
    )
    parser.add_argument(
        "--output",
        default="data/output/evolution_graphs/math_graph.json",
        help="Output path for evolution graph",
    )
    parser.add_argument(
        "--domain",
        default="math",
        help="Domain identifier",
    )
    parser.add_argument(
        "--periods",
        nargs="+",
        default=["2025-02", "2025-03", "2025-04", "2025-05"],
        help="Periods to include",
    )
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.5,
        help="Minimum similarity for semantic edges",
    )

    args = parser.parse_args()

    cases_path = Path(args.cases)
    if not cases_path.exists():
        print(f"Error: Cases file not found: {cases_path}")
        return 1

    stats = rebuild_evolution_graph(
        cases_path=cases_path,
        output_path=Path(args.output),
        periods=args.periods,
        domain=args.domain,
        similarity_threshold=args.similarity_threshold,
    )

    print(f"\nRebuild complete!")
    print(f"  Nodes: {stats['total_nodes']}")
    print(f"  Edges: {stats['total_edges']}")

    return 0


if __name__ == "__main__":
    exit(main())

import json
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from pipeline.evolution_models import TopicNode, TopicMode, EvolutionEdge, RelationType, EdgeEvidence


def load_evolution_case_details(case_detail_dir: str) -> Dict[str, Dict[str, Any]]:
    """Load detailed evolution cases from case_detail directory.

    Each case file contains:
    - case_id, anchor_topic_id, anchor_topic_name
    - evolution_path: list of period data with paper counts and neighbors
    - neighbor_topics: list of related topic IDs
    """
    cases = {}
    detail_path = Path(case_detail_dir)

    if not detail_path.exists():
        print(f"Warning: Case detail directory not found: {detail_path}")
        return cases

    for case_file in detail_path.glob("*.json"):
        try:
            with open(case_file, 'r', encoding='utf-8') as f:
                case = json.load(f)

            topic_id = case.get("anchor_topic_id")
            if topic_id:
                cases[topic_id] = case
        except Exception as e:
            print(f"Error loading {case_file}: {e}")
            continue

    print(f"Loaded {len(cases)} detailed case files from {detail_path}")
    return cases


def build_topic_nodes_from_cases(
    case_details: Dict[str, Dict[str, Any]]
) -> List[TopicNode]:
    """Build topic nodes from detailed case data.

    Only creates nodes for periods where the topic actually has data
    (based on evolution_path in case detail).
    """
    nodes = []

    for topic_id, case in case_details.items():
        name = case.get("anchor_topic_name", "")
        category = case.get("category", "")
        mode_str = case.get("anchor_topic_mode", "hybrid")

        try:
            mode = TopicMode(mode_str)
        except ValueError:
            mode = TopicMode.hybrid

        # Get evolution path - this tells us which periods this topic exists in
        evolution_path = case.get("evolution_path", [])

        for period_data in evolution_path:
            period = period_data.get("period")
            if not period:
                continue

            paper_count = period_data.get("anchor_paper_count", 0)

            node = TopicNode(
                id=f"{topic_id}@{period}",
                topic_id=topic_id,
                period=period,
                name=name,
                category=category,
                mode=mode,
                paper_count=paper_count,
                embedding=[]  # Not using embedding-based similarity
            )
            nodes.append(node)

    return nodes


def build_edges_from_case_details(
    case_details: Dict[str, Dict[str, Any]],
    nodes: List[TopicNode],
    max_neighbors_per_period: int = 5
) -> List[EvolutionEdge]:
    """Build evolution edges from detailed case neighbor data.

    Creates two types of edges:
    1. continued: Same topic across consecutive periods (from evolution_path)
    2. related: Topics that are neighbors in the same period (from top_neighbors)
    """
    edges = []
    edge_id_counter = 0

    # Create node lookup
    node_map = {n.id: n for n in nodes}
    nodes_by_topic: Dict[str, List[TopicNode]] = {}
    for n in nodes:
        if n.topic_id not in nodes_by_topic:
            nodes_by_topic[n.topic_id] = []
        nodes_by_topic[n.topic_id].append(n)

    # 1. Create "continued" edges from evolution_path
    for topic_id, case in case_details.items():
        evolution_path = case.get("evolution_path", [])
        periods = [p.get("period") for p in evolution_path if p.get("period")]

        # Sort periods and create edges between consecutive ones
        periods_sorted = sorted(periods)
        for i in range(len(periods_sorted) - 1):
            source_period = periods_sorted[i]
            target_period = periods_sorted[i + 1]

            source_id = f"{topic_id}@{source_period}"
            target_id = f"{topic_id}@{target_period}"

            # Only create edge if both nodes exist
            if source_id in node_map and target_id in node_map:
                edge = EvolutionEdge(
                    id=f"edge_{edge_id_counter:06d}",
                    source=source_id,
                    target=target_id,
                    relation_type=RelationType.continued,
                    confidence=0.95,  # High confidence for temporal continuity
                    rule_triggered=["temporal_continuity", "evolution_path"],
                    evidence=EdgeEvidence(
                        shared_terms=[],
                        cosine_similarity=1.0,
                        temporal_gap=1
                    )
                )
                edges.append(edge)
                edge_id_counter += 1

    # 2. Create "related" edges from top_neighbors in each period
    for topic_id, case in case_details.items():
        evolution_path = case.get("evolution_path", [])

        for period_data in evolution_path:
            period = period_data.get("period")
            if not period:
                continue

            source_id = f"{topic_id}@{period}"
            if source_id not in node_map:
                continue

            # Get top neighbors for this period
            top_neighbors = period_data.get("top_neighbors", [])

            # Sort by weight and take top N
            sorted_neighbors = sorted(
                top_neighbors,
                key=lambda x: x.get("weight", 0),
                reverse=True
            )[:max_neighbors_per_period]

            for neighbor in sorted_neighbors:
                neighbor_id = neighbor.get("topic_id")
                weight = neighbor.get("weight", 0)

                if not neighbor_id:
                    continue

                target_id = f"{neighbor_id}@{period}"

                # Only create edge if target node exists
                if target_id not in node_map:
                    continue

                # Determine relationship type based on category
                source_node = node_map[source_id]
                target_node = node_map.get(target_id)

                if target_node and source_node.category == target_node.category:
                    relation_type = RelationType.diffused_to_neighbor
                    confidence = round(min(0.8, 0.5 + weight * 0.3), 3)
                else:
                    relation_type = RelationType.diffused_to_neighbor
                    confidence = round(min(0.7, 0.4 + weight * 0.3), 3)

                edge = EvolutionEdge(
                    id=f"edge_{edge_id_counter:06d}",
                    source=source_id,
                    target=target_id,
                    relation_type=relation_type,
                    confidence=confidence,
                    rule_triggered=["neighbor_relation", "period_co_occurrence"],
                    evidence=EdgeEvidence(
                        shared_terms=[],
                        cosine_similarity=round(weight, 3),
                        temporal_gap=0
                    )
                )
                edges.append(edge)
                edge_id_counter += 1

    return edges


def build_graph_from_case_details(
    case_detail_dir: str,
    max_neighbors_per_period: int = 5
) -> Dict[str, Any]:
    """Build complete evolution graph from detailed case files.

    Args:
        case_detail_dir: Path to evolution_case_detail directory
        max_neighbors_per_period: Maximum neighbor edges per topic per period

    Returns:
        Dictionary with nodes, edges, and metadata
    """
    from datetime import datetime

    # Load detailed case data
    case_details = load_evolution_case_details(case_detail_dir)

    if not case_details:
        raise ValueError(f"No case details found in {case_detail_dir}")

    # Build nodes from evolution_path
    nodes = build_topic_nodes_from_cases(case_details)

    # Build edges from neighbor relationships
    edges = build_edges_from_case_details(case_details, nodes, max_neighbors_per_period)

    # Collect periods
    periods = sorted(set(n.period for n in nodes))

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "periods": periods,
            "generated_at": datetime.now().isoformat(),
            "source": "evolution_case_detail"
        }
    }


# Legacy functions for backward compatibility
def load_evolution_cases(cases_path: str) -> List[Dict[str, Any]]:
    """Load evolution cases from JSON file (legacy)."""
    with open(cases_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("cases", [])


def build_graph(
    cases_path: str,
    periods: List[str],
    similarity_threshold: float = 0.5,
    max_cross_topic_edges: int = 5
) -> Dict[str, Any]:
    """Build complete evolution graph (legacy interface).

    Now redirects to build_graph_from_case_details if cases_path is a directory.
    """
    path = Path(cases_path)

    # If path is a directory, use new case detail loader
    if path.is_dir():
        return build_graph_from_case_details(
            str(path),
            max_neighbors_per_period=max_cross_topic_edges
        )

    # Otherwise, check if there's a case_detail directory next to the file
    case_detail_dir = path.parent / "evolution_case_detail"
    if case_detail_dir.exists():
        print(f"Found case detail directory, using detailed data: {case_detail_dir}")
        return build_graph_from_case_details(
            str(case_detail_dir),
            max_neighbors_per_period=max_cross_topic_edges
        )

    # Fallback to legacy behavior (will likely produce 0 edges)
    print(f"Warning: Using legacy case loading from {cases_path}")
    from datetime import datetime

    cases = load_evolution_cases(cases_path)
    nodes = []
    for case in cases:
        topic_id = case["anchor_topic_id"]
        name = case["anchor_topic_name"]
        category = case["category"]
        mode_str = case.get("anchor_topic_mode", "hybrid")
        try:
            mode = TopicMode(mode_str)
        except ValueError:
            mode = TopicMode.hybrid

        for period in periods:
            node = TopicNode(
                id=f"{topic_id}@{period}",
                topic_id=topic_id,
                period=period,
                name=name,
                category=category,
                mode=mode,
                paper_count=case.get("paper_count", 0),
                embedding=[]
            )
            nodes.append(node)

    return {
        "nodes": nodes,
        "edges": [],
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": 0,
            "periods": periods,
            "generated_at": datetime.now().isoformat(),
            "warning": "Legacy mode - no edges generated"
        }
    }

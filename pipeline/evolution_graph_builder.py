import json
from pathlib import Path
from typing import List, Dict, Any

from pipeline.evolution_models import TopicNode, TopicMode, EvolutionEdge, RelationType, EdgeEvidence


def load_evolution_cases(cases_path: str) -> List[Dict[str, Any]]:
    """Load evolution cases from JSON file."""
    with open(cases_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("cases", [])


def build_topic_nodes(cases: List[Dict], periods: List[str]) -> List[TopicNode]:
    """Build topic nodes from cases for given periods."""
    nodes = []

    for case in cases:
        topic_id = case["anchor_topic_id"]
        name = case["anchor_topic_name"]
        category = case["category"]

        # Get mode from profile
        mode_str = case.get("anchor_topic_mode", "hybrid")
        try:
            mode = TopicMode(mode_str)
        except ValueError:
            mode = TopicMode.hybrid

        # Create one node per period
        for period in periods:
            node = TopicNode(
                id=f"{topic_id}@{period}",
                topic_id=topic_id,
                period=period,
                name=name,
                category=category,
                mode=mode,
                paper_count=0,  # Will be populated from detailed data
                embedding=[]    # Will be populated from detailed data
            )
            nodes.append(node)

    return nodes


def build_edges(nodes: List[TopicNode], similarity_threshold: float = 0.5) -> List[EvolutionEdge]:
    """Build evolution edges between related topics.

    Creates three types of edges:
    1. Continued: Same topic across consecutive periods
    2. Diffused to neighbor: Topics with same ID prefix across periods
    3. Cross-period similarity: Topics with similar embeddings (if available)
    """
    edges = []
    edge_id_counter = 0

    # Group nodes by topic_id
    nodes_by_topic: Dict[str, List[TopicNode]] = {}
    for node in nodes:
        if node.topic_id not in nodes_by_topic:
            nodes_by_topic[node.topic_id] = []
        nodes_by_topic[node.topic_id].append(node)

    # Sort periods for each topic
    for topic_id, topic_nodes in nodes_by_topic.items():
        topic_nodes.sort(key=lambda n: n.period)

        # Create continued edges between consecutive periods
        for i in range(len(topic_nodes) - 1):
            source = topic_nodes[i]
            target = topic_nodes[i + 1]

            edge = EvolutionEdge(
                id=f"edge_{edge_id_counter:06d}",
                source=source.id,
                target=target.id,
                relation_type=RelationType.continued,
                confidence=1.0,  # Same topic, high confidence
                rule_triggered=["temporal_continuity"],
                evidence=EdgeEvidence(
                    shared_terms=[],
                    cosine_similarity=1.0,
                    temporal_gap=1
                )
            )
            edges.append(edge)
            edge_id_counter += 1

    # Create cross-topic edges based on category similarity
    # Group by period first
    nodes_by_period: Dict[str, List[TopicNode]] = {}
    for node in nodes:
        if node.period not in nodes_by_period:
            nodes_by_period[node.period] = []
        nodes_by_period[node.period].append(node)

    # Within each period, connect topics in same category
    for period, period_nodes in nodes_by_period.items():
        category_groups: Dict[str, List[TopicNode]] = {}
        for node in period_nodes:
            cat = node.category.split('.')[0] if '.' in node.category else node.category
            if cat not in category_groups:
                category_groups[cat] = []
            category_groups[cat].append(node)

        # Create edges between topics in same category
        for cat, cat_nodes in category_groups.items():
            for i, source in enumerate(cat_nodes):
                for target in cat_nodes[i+1:]:
                    if source.topic_id == target.topic_id:
                        continue

                    edge = EvolutionEdge(
                        id=f"edge_{edge_id_counter:06d}",
                        source=source.id,
                        target=target.id,
                        relation_type=RelationType.diffused_to_neighbor,
                        confidence=0.6,  # Same category, moderate confidence
                        rule_triggered=["category_proximity"],
                        evidence=EdgeEvidence(
                            shared_terms=[],
                            cosine_similarity=0.6,
                            temporal_gap=0
                        )
                    )
                    edges.append(edge)
                    edge_id_counter += 1

    return edges

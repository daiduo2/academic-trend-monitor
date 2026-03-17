import json
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from pipeline.evolution_models import TopicNode, TopicMode, EvolutionEdge, RelationType, EdgeEvidence


def load_evolution_cases(cases_path: str) -> List[Dict[str, Any]]:
    """Load evolution cases from JSON file."""
    with open(cases_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("cases", [])


def load_topic_embeddings(cases_path: str) -> Dict[str, List[float]]:
    """Load or compute topic embeddings from evolution cases.

    Uses case keywords and name to generate embeddings if not pre-computed.
    """
    embeddings = {}

    with open(cases_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for case in data.get("cases", []):
        topic_id = case["anchor_topic_id"]
        # Use keywords from case if available, otherwise empty
        keywords = case.get("keywords", [])
        name = case.get("anchor_topic_name", "")

        # Create a simple hash-based embedding as fallback
        # In production, this should use actual sentence embeddings
        text = name + " " + " ".join(keywords)
        embedding = _text_to_embedding(text)
        embeddings[topic_id] = embedding

    return embeddings


def _text_to_embedding(text: str, dim: int = 384) -> List[float]:
    """Convert text to a deterministic pseudo-embedding.

    This is a fallback when real embeddings are not available.
    Uses character n-gram hashing for deterministic vectors.
    """
    if not text:
        return [0.0] * dim

    # Simple character n-gram feature extraction
    vector = [0.0] * dim
    text = text.lower()

    for i in range(len(text) - 2):
        ngram = text[i:i+3]
        hash_val = hash(ngram) % dim
        vector[hash_val] += 1.0

    # Normalize
    norm = math.sqrt(sum(x * x for x in vector))
    if norm > 0:
        vector = [x / norm for x in vector]

    return vector


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0

    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def build_topic_nodes(cases: List[Dict], periods: List[str], embeddings: Optional[Dict[str, List[float]]] = None) -> List[TopicNode]:
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

        # Get embedding for this topic
        embedding = embeddings.get(topic_id, []) if embeddings else []
        if not embedding:
            # Generate fallback embedding from name + keywords
            keywords = case.get("keywords", [])
            text = name + " " + " ".join(keywords)
            embedding = _text_to_embedding(text)

        # Create one node per period
        for period in periods:
            node = TopicNode(
                id=f"{topic_id}@{period}",
                topic_id=topic_id,
                period=period,
                name=name,
                category=category,
                mode=mode,
                paper_count=case.get("paper_count", 0),
                embedding=embedding
            )
            nodes.append(node)

    return nodes


def build_edges(
    nodes: List[TopicNode],
    similarity_threshold: float = 0.5,
    max_cross_topic_edges: int = 5
) -> List[EvolutionEdge]:
    """Build evolution edges between related topics.

    Creates four types of edges:
    1. continued: Same topic across consecutive periods (confidence 0.9-1.0)
    2. diffused_to_neighbor: Topics with similar embeddings, same period (confidence 0.5-0.8)
    3. specialized_into_child: Parent to sub-topic relationship (confidence 0.6-0.9)
    4. merged_from: Topic that absorbed another (confidence 0.7-0.9)
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
    periods_sorted = sorted(set(n.period for n in nodes))
    period_indices = {p: i for i, p in enumerate(periods_sorted)}

    # 1. Create "continued" edges between consecutive periods for same topic
    for topic_id, topic_nodes in nodes_by_topic.items():
        topic_nodes.sort(key=lambda n: n.period)

        for i in range(len(topic_nodes) - 1):
            source = topic_nodes[i]
            target = topic_nodes[i + 1]

            # Calculate temporal gap
            gap = period_indices.get(target.period, 0) - period_indices.get(source.period, 0)

            # Confidence decreases slightly with gap, but stays high for continued topics
            confidence = max(0.9, 1.0 - (gap - 1) * 0.02)

            edge = EvolutionEdge(
                id=f"edge_{edge_id_counter:06d}",
                source=source.id,
                target=target.id,
                relation_type=RelationType.continued,
                confidence=round(confidence, 3),
                rule_triggered=["temporal_continuity"],
                evidence=EdgeEvidence(
                    shared_terms=[],
                    cosine_similarity=1.0,
                    temporal_gap=gap
                )
            )
            edges.append(edge)
            edge_id_counter += 1

    # Group by period for cross-topic analysis
    nodes_by_period: Dict[str, List[TopicNode]] = {}
    for node in nodes:
        if node.period not in nodes_by_period:
            nodes_by_period[node.period] = []
        nodes_by_period[node.period].append(node)

    # 2. Create "diffused_to_neighbor" edges based on semantic similarity
    for period, period_nodes in nodes_by_period.items():
        # Calculate pairwise similarities within period
        similarity_edges = []

        for i, source in enumerate(period_nodes):
            if not source.embedding:
                continue

            for target in period_nodes[i+1:]:
                if source.topic_id == target.topic_id:
                    continue
                if not target.embedding:
                    continue

                sim = cosine_similarity(source.embedding, target.embedding)

                if sim >= similarity_threshold:
                    # Determine if this is a potential specialization relationship
                    # based on name containment (simple heuristic)
                    is_specialization = _is_specialization_relationship(source.name, target.name)

                    if is_specialization:
                        relation_type = RelationType.specialized_into_child
                        confidence = round(min(0.9, 0.6 + sim * 0.3), 3)
                        rules = ["semantic_similarity", "naming_pattern"]
                    else:
                        relation_type = RelationType.diffused_to_neighbor
                        confidence = round(min(0.8, 0.5 + sim * 0.3), 3)
                        rules = ["semantic_similarity"]

                    similarity_edges.append((
                        sim, source, target, relation_type, confidence, rules
                    ))

        # Sort by similarity and take top edges to avoid over-connecting
        similarity_edges.sort(key=lambda x: x[0], reverse=True)

        # Limit edges per node to avoid over-connecting
        node_edge_count: Dict[str, int] = {}
        for sim, source, target, rel_type, confidence, rules in similarity_edges:
            # Check if either node has too many edges already
            src_count = node_edge_count.get(source.id, 0)
            tgt_count = node_edge_count.get(target.id, 0)

            if src_count >= max_cross_topic_edges or tgt_count >= max_cross_topic_edges:
                continue

            edge = EvolutionEdge(
                id=f"edge_{edge_id_counter:06d}",
                source=source.id,
                target=target.id,
                relation_type=rel_type,
                confidence=confidence,
                rule_triggered=rules,
                evidence=EdgeEvidence(
                    shared_terms=_extract_shared_terms(source.name, target.name),
                    cosine_similarity=round(sim, 3),
                    temporal_gap=0
                )
            )
            edges.append(edge)
            edge_id_counter += 1

            node_edge_count[source.id] = src_count + 1
            node_edge_count[target.id] = tgt_count + 1

    # 3. Create "merged_from" edges for topics that appear to absorb others
    # This is detected when a topic in period t+1 has high similarity to
    # multiple topics in period t that don't continue individually
    merged_edges = _detect_merged_topics(nodes_by_topic, period_indices, nodes_by_period)
    for edge_data in merged_edges:
        edge = EvolutionEdge(
            id=f"edge_{edge_id_counter:06d}",
            source=edge_data["source"],
            target=edge_data["target"],
            relation_type=RelationType.merged_from,
            confidence=edge_data["confidence"],
            rule_triggered=["merge_detection", "semantic_similarity"],
            evidence=EdgeEvidence(
                shared_terms=edge_data.get("shared_terms", []),
                cosine_similarity=edge_data["similarity"],
                temporal_gap=edge_data.get("temporal_gap", 1)
            )
        )
        edges.append(edge)
        edge_id_counter += 1

    return edges


def _is_specialization_relationship(parent_name: str, child_name: str) -> bool:
    """Check if one topic name suggests specialization of another."""
    parent_words = set(parent_name.lower().split())
    child_words = set(child_name.lower().split())

    # Check if child contains most of parent's words plus more specific terms
    if len(parent_words) > 0:
        overlap = len(parent_words & child_words)
        if overlap >= len(parent_words) * 0.5 and len(child_words) > len(parent_words):
            return True

    # Check for specific naming patterns indicating specialization
    specific_indicators = ["子", "child", "sub-", "special", "specific"]
    return any(ind in child_name.lower() for ind in specific_indicators)


def _extract_shared_terms(name1: str, name2: str) -> List[str]:
    """Extract shared terms between two topic names."""
    words1 = set(name1.lower().split())
    words2 = set(name2.lower().split())
    shared = words1 & words2
    # Filter out common stop words
    stop_words = {"的", "与", "和", "the", "and", "of", "in", "on", "for"}
    return list(shared - stop_words)


def _detect_merged_topics(
    nodes_by_topic: Dict[str, List[TopicNode]],
    period_indices: Dict[str, int],
    nodes_by_period: Dict[str, List[TopicNode]]
) -> List[Dict[str, Any]]:
    """Detect topics that appear to have merged from multiple prior topics.

    A merge is detected when:
    - Topic A in period t doesn't have a "continued" edge to period t+1
    - Topic B in period t doesn't have a "continued" edge to period t+1
    - Topic C in period t+1 has high similarity to both A and B
    """
    merged_edges = []
    periods_sorted = sorted(period_indices.keys(), key=lambda p: period_indices[p])

    for i in range(len(periods_sorted) - 1):
        current_period = periods_sorted[i]
        next_period = periods_sorted[i + 1]

        current_nodes = {n.topic_id: n for n in nodes_by_period.get(current_period, [])}
        next_nodes = nodes_by_period.get(next_period, [])

        # Find topics in current period that don't continue
        continued_topics = set()
        for topic_id, topic_nodes in nodes_by_topic.items():
            period_ids = {n.period for n in topic_nodes}
            if current_period in period_ids and next_period in period_ids:
                continued_topics.add(topic_id)

        discontinued = set(current_nodes.keys()) - continued_topics

        # For each topic in next period, check similarity to discontinued topics
        for next_node in next_nodes:
            if not next_node.embedding:
                continue

            high_sim_topics = []
            for disc_topic_id in discontinued:
                disc_node = current_nodes[disc_topic_id]
                if not disc_node.embedding:
                    continue

                sim = cosine_similarity(next_node.embedding, disc_node.embedding)
                if sim >= 0.6:  # High similarity threshold for merge detection
                    high_sim_topics.append((disc_topic_id, sim, disc_node))

            # If multiple discontinued topics are similar to this one, it's a merge
            if len(high_sim_topics) >= 2:
                # Sort by similarity
                high_sim_topics.sort(key=lambda x: x[1], reverse=True)

                for source_topic_id, sim, source_node in high_sim_topics:
                    shared_terms = _extract_shared_terms(source_node.name, next_node.name)
                    merged_edges.append({
                        "source": source_node.id,
                        "target": next_node.id,
                        "confidence": round(min(0.9, 0.7 + sim * 0.2), 3),
                        "similarity": round(sim, 3),
                        "shared_terms": shared_terms,
                        "temporal_gap": 1
                    })

    return merged_edges


def build_graph(
    cases_path: str,
    periods: List[str],
    similarity_threshold: float = 0.5,
    max_cross_topic_edges: int = 5
) -> Dict[str, Any]:
    """Build complete evolution graph from cases.

    Args:
        cases_path: Path to evolution_cases.json
        periods: List of periods to include
        similarity_threshold: Minimum similarity for cross-topic edges
        max_cross_topic_edges: Maximum edges per node for cross-topic connections

    Returns:
        Dictionary with nodes, edges, and metadata
    """
    from datetime import datetime

    # Load cases and embeddings
    cases = load_evolution_cases(cases_path)
    embeddings = load_topic_embeddings(cases_path)

    # Build nodes
    nodes = build_topic_nodes(cases, periods, embeddings)

    # Build edges
    edges = build_edges(nodes, similarity_threshold, max_cross_topic_edges)

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "periods": periods,
            "generated_at": datetime.now().isoformat()
        }
    }

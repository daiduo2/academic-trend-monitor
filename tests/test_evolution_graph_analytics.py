def test_detect_isolated_clusters():
    from pipeline.evolution_graph_analytics import detect_isolated_clusters
    from pipeline.evolution_models import (
        TopicNode, TopicMode, EvolutionEdge,
        RelationType, EdgeEvidence, AnomalyType
    )

    # Create disconnected nodes
    nodes = [
        TopicNode(id="t1@2025-02", topic_id="t1", period="2025-02",
                  name="Connected A", category="math", mode=TopicMode.theory,
                  paper_count=10, embedding=[]),
        TopicNode(id="t2@2025-02", topic_id="t2", period="2025-02",
                  name="Connected B", category="math", mode=TopicMode.theory,
                  paper_count=10, embedding=[]),
        TopicNode(id="t3@2025-02", topic_id="t3", period="2025-02",
                  name="Isolated", category="math", mode=TopicMode.theory,
                  paper_count=5, embedding=[]),
    ]

    # Only t1-t2 connected
    edges = [
        EvolutionEdge(
            id="e1", source="t1@2025-02", target="t2@2025-02",
            relation_type=RelationType.continued, confidence=0.9,
            rule_triggered=["test"],
            evidence=EdgeEvidence(shared_terms=[], cosine_similarity=0.8, temporal_gap=0)
        )
    ]

    anomalies = detect_isolated_clusters(nodes, edges, min_cluster_size=1)
    assert len(anomalies) == 1
    assert anomalies[0].type == AnomalyType.isolated_cluster
    assert "t3@2025-02" in anomalies[0].location["nodes"]

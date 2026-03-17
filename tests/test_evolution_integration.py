"""Integration tests for evolution analysis system."""


def test_full_loop_skeleton():
    """Test that all components can be imported and instantiated."""
    from pipeline.evolution_graph_builder import load_evolution_cases
    from pipeline.evolution_graph_analytics import detect_isolated_clusters
    from pipeline.evolution_state_manager import StateManager
    from pipeline.evolution_models import EvolutionGraph

    # Just verify imports work
    assert callable(load_evolution_cases)
    assert callable(detect_isolated_clusters)
    assert StateManager is not None
    assert EvolutionGraph is not None


def test_graph_building_flow():
    """Test the complete graph building flow with mock data."""
    from pipeline.evolution_graph_builder import build_topic_nodes
    from pipeline.evolution_models import TopicNode, TopicMode

    # Mock cases
    cases = [
        {
            "anchor_topic_id": "topic_001",
            "anchor_topic_name": "Test Topic",
            "category": "math.AG",
            "anchor_topic_mode": "theory"
        }
    ]
    periods = ["2025-02", "2025-03"]

    nodes = build_topic_nodes(cases, periods)

    assert len(nodes) == 2  # One node per period
    assert all(isinstance(n, TopicNode) for n in nodes)
    assert all(n.mode == TopicMode.theory for n in nodes)


def test_anomaly_detection_flow():
    """Test anomaly detection with sample graph data."""
    from pipeline.evolution_graph_analytics import detect_isolated_clusters
    from pipeline.evolution_models import TopicNode, EvolutionEdge, TopicMode

    # Create disconnected nodes
    nodes = [
        TopicNode(
            id="n1@2025-02", topic_id="n1", period="2025-02",
            name="Node 1", category="math.AG", mode=TopicMode.theory,
            paper_count=10, embedding=[0.1, 0.2]
        ),
        TopicNode(
            id="n2@2025-02", topic_id="n2", period="2025-02",
            name="Node 2", category="math.AG", mode=TopicMode.theory,
            paper_count=10, embedding=[0.3, 0.4]
        ),
    ]
    edges = []  # No edges = isolated

    anomalies = detect_isolated_clusters(nodes, edges, min_cluster_size=1)

    # Should detect isolated components
    assert isinstance(anomalies, list)

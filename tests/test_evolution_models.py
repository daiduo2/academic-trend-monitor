import pytest
from pipeline.evolution_models import TopicNode, TopicMode


def test_topic_node_creation():
    node = TopicNode(
        id="global_1392@2025-02",
        topic_id="global_1392",
        period="2025-02",
        name="星系气体射电研究",
        category="astro-ph",
        mode=TopicMode.problem,
        paper_count=44,
        embedding=[0.1, 0.2, 0.3]
    )
    assert node.id == "global_1392@2025-02"
    assert node.mode == TopicMode.problem


def test_evolution_edge_creation():
    from pipeline.evolution_models import EvolutionEdge, RelationType, EdgeEvidence

    edge = EvolutionEdge(
        id="global_1392@2025-02→global_1399@2025-03",
        source="global_1392@2025-02",
        target="global_1399@2025-03",
        relation_type=RelationType.diffused_to_neighbor,
        confidence=0.85,
        rule_triggered=["diffusion_rule_v1"],
        evidence=EdgeEvidence(
            shared_terms=["gas", "radio"],
            cosine_similarity=0.78,
            temporal_gap=1
        )
    )
    assert edge.confidence == 0.85


def test_evolution_edge_confidence_validation():
    """Test that confidence must be between 0 and 1."""
    from pydantic import ValidationError
    from pipeline.evolution_models import EvolutionEdge, RelationType, EdgeEvidence

    # Should fail with confidence > 1
    with pytest.raises(ValidationError):
        EvolutionEdge(
            id="test",
            source="a",
            target="b",
            relation_type=RelationType.continued,
            confidence=1.5,  # Invalid: > 1
            rule_triggered=["test"],
            evidence=EdgeEvidence(
                shared_terms=["test"],
                cosine_similarity=0.5,
                temporal_gap=1
            )
        )


def test_edge_evidence_temporal_gap_validation():
    """Test that temporal_gap must be >= 0."""
    from pydantic import ValidationError
    from pipeline.evolution_models import EdgeEvidence

    # Should fail with negative temporal_gap
    with pytest.raises(ValidationError):
        EdgeEvidence(
            shared_terms=["test"],
            cosine_similarity=0.5,
            temporal_gap=-1  # Invalid: negative
        )


def test_edge_evidence_cosine_similarity_validation():
    """Test that cosine_similarity must be between 0 and 1."""
    from pydantic import ValidationError
    from pipeline.evolution_models import EdgeEvidence

    # Should fail with cosine_similarity > 1
    with pytest.raises(ValidationError):
        EdgeEvidence(
            shared_terms=["test"],
            cosine_similarity=1.5,  # Invalid: > 1
            temporal_gap=1
        )


def test_topic_node_is_frozen():
    """Test that TopicNode is immutable."""
    from pydantic import ValidationError
    from pipeline.evolution_models import TopicNode, TopicMode

    node = TopicNode(
        id="test@2025-02",
        topic_id="test",
        period="2025-02",
        name="Test",
        category="math",
        mode=TopicMode.theory,
        paper_count=10,
        embedding=[0.1]
    )

    # Should fail when trying to modify
    with pytest.raises(ValidationError):
        node.paper_count = 20


def test_evolution_edge_is_frozen():
    """Test that EvolutionEdge is immutable."""
    from pydantic import ValidationError
    from pipeline.evolution_models import EvolutionEdge, RelationType, EdgeEvidence

    edge = EvolutionEdge(
        id="test",
        source="a",
        target="b",
        relation_type=RelationType.continued,
        confidence=0.5,
        rule_triggered=["test"],
        evidence=EdgeEvidence(
            shared_terms=["test"],
            cosine_similarity=0.5,
            temporal_gap=1
        )
    )

    # Should fail when trying to modify
    with pytest.raises(ValidationError):
        edge.confidence = 0.8


def test_edge_evidence_is_frozen():
    """Test that EdgeEvidence is immutable."""
    from pydantic import ValidationError
    from pipeline.evolution_models import EdgeEvidence

    evidence = EdgeEvidence(
        shared_terms=["test"],
        cosine_similarity=0.5,
        temporal_gap=1
    )

    # Should fail when trying to modify
    with pytest.raises(ValidationError):
        evidence.cosine_similarity = 0.8


def test_graph_metrics():
    from pipeline.evolution_models import GraphMetrics

    metrics = GraphMetrics(
        total_nodes=100,
        total_edges=150,
        connected_components=3,
        largest_component_ratio=0.85,
        average_path_length=2.5,
        clustering_coefficient=0.3,
        temporal_consistency=0.75,
        theory_purity=0.6,
        cross_category_edges=12
    )
    assert metrics.connected_components == 3


def test_graph_anomaly():
    from pipeline.evolution_models import GraphAnomaly, AnomalyType, Severity

    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.broken_lineage,
        location={
            "nodes": ["global_167@2025-02", "global_5@2025-04"],
            "category": "math"
        },
        severity=Severity.high,
        context={
            "similar_connected_topics": ["global_117"],
            "potential_missing_rules": ["math_definability_continuity"]
        }
    )
    assert anomaly.severity == Severity.high


def test_graph_metrics_validation():
    """Test that GraphMetrics fields have proper bounds."""
    from pydantic import ValidationError
    from pipeline.evolution_models import GraphMetrics

    # Test largest_component_ratio out of range
    with pytest.raises(ValidationError):
        GraphMetrics(
            total_nodes=10,
            total_edges=5,
            connected_components=1,
            largest_component_ratio=1.5,  # Invalid: > 1
            average_path_length=2.0,
            clustering_coefficient=0.5,
            temporal_consistency=0.5
        )

    # Test clustering_coefficient out of range
    with pytest.raises(ValidationError):
        GraphMetrics(
            total_nodes=10,
            total_edges=5,
            connected_components=1,
            largest_component_ratio=0.5,
            average_path_length=2.0,
            clustering_coefficient=-0.1,  # Invalid: < 0
            temporal_consistency=0.5
        )

    # Test temporal_consistency out of range
    with pytest.raises(ValidationError):
        GraphMetrics(
            total_nodes=10,
            total_edges=5,
            connected_components=1,
            largest_component_ratio=0.5,
            average_path_length=2.0,
            clustering_coefficient=0.5,
            temporal_consistency=1.5  # Invalid: > 1
        )


def test_graph_metrics_optional_fields():
    """Test that GraphMetrics optional fields can be omitted."""
    from pipeline.evolution_models import GraphMetrics

    # Should work without optional fields
    metrics = GraphMetrics(
        total_nodes=10,
        total_edges=5,
        connected_components=1,
        largest_component_ratio=1.0,
        average_path_length=2.0,
        clustering_coefficient=0.5,
        temporal_consistency=0.5
        # theory_purity and cross_category_edges omitted
    )
    assert metrics.theory_purity is None
    assert metrics.cross_category_edges is None


def test_graph_metrics_is_frozen():
    """Test that GraphMetrics is immutable."""
    from pydantic import ValidationError
    from pipeline.evolution_models import GraphMetrics

    metrics = GraphMetrics(
        total_nodes=10,
        total_edges=5,
        connected_components=1,
        largest_component_ratio=1.0,
        average_path_length=2.0,
        clustering_coefficient=0.5,
        temporal_consistency=0.5
    )

    with pytest.raises(ValidationError):
        metrics.total_nodes = 20


def test_graph_anomaly_is_frozen():
    """Test that GraphAnomaly is immutable."""
    from pydantic import ValidationError
    from pipeline.evolution_models import GraphAnomaly, AnomalyType, Severity

    anomaly = GraphAnomaly(
        anomaly_id="test",
        type=AnomalyType.broken_lineage,
        location={"nodes": ["a"], "category": "math"},
        severity=Severity.medium,
        context={}
    )

    with pytest.raises(ValidationError):
        anomaly.severity = Severity.high


def test_evolution_graph():
    from pipeline.evolution_models import EvolutionGraph, GraphMetrics
    from datetime import datetime

    graph = EvolutionGraph(
        version="1.0",
        generated_at=datetime.now().isoformat(),
        domain="math",
        nodes=[],
        edges=[],
        metrics=GraphMetrics(
            total_nodes=0, total_edges=0,
            connected_components=0, largest_component_ratio=0.0,
            average_path_length=0.0, clustering_coefficient=0.0,
            temporal_consistency=0.0
        )
    )
    assert graph.domain == "math"


def test_evolution_hypothesis():
    from pipeline.evolution_models import (
        EvolutionHypothesis, RuleSuggestion, ValidationDesign
    )

    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Test hypothesis",
        rule_suggestion=RuleSuggestion(
            rule_name="test_rule",
            suggested_change="increase threshold",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math > math.LO > 集合论",
            time_window=["2025-02", "2025-03"],
            positive_case_criteria="has shared terms",
            negative_case_criteria="no shared terms"
        )
    )
    assert hypothesis.hypothesis_id == "HYP-001"

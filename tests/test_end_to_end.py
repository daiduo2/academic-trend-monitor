"""End-to-end tests for the evolution analysis system."""

import json
import tempfile
import os
from pathlib import Path

from pipeline.evolution_models import (
    EvolutionGraph, GraphAnomaly, AnomalyType, Severity,
    EvolutionHypothesis, ValidationResult
)
from pipeline.evolution_graph_builder import load_evolution_cases, build_topic_nodes, build_edges
from pipeline.evolution_graph_analytics import detect_isolated_clusters
from pipeline.evolution_hypothesis_generator import generate_hypothesis
from pipeline.evolution_hypothesis_validator import validate_hypothesis
from pipeline.evolution_decision_gate import evaluate_experiment
from pipeline.evolution_experiment_logger import log_experiment, load_experiments


def test_full_pipeline_with_real_data():
    """Test complete pipeline with real evolution cases."""
    # Use real data file
    cases_path = "data/output/evolution_cases.json"

    if not Path(cases_path).exists():
        # Skip if no real data
        return

    cases = load_evolution_cases(cases_path)
    assert len(cases) > 0, "No cases loaded"

    # Build graph
    periods = ["2025-02", "2025-03", "2025-04", "2025-05"]
    nodes = build_topic_nodes(cases, periods)
    edges = build_edges(nodes)

    print(f"\nBuilt graph: {len(nodes)} nodes, {len(edges)} edges")
    assert len(nodes) > 0
    assert len(edges) > 0

    # Detect anomalies
    anomalies = detect_isolated_clusters(nodes, edges, min_cluster_size=1)
    print(f"Detected {len(anomalies)} anomalies")

    if anomalies:
        # Generate hypothesis from first anomaly
        config = {
            "hypothesis_templates": {
                "isolated_cluster": [
                    "Topics in {category} may be missing connections"
                ]
            }
        }

        hypothesis = generate_hypothesis(anomalies[0], config, 1)
        print(f"Generated hypothesis: {hypothesis.hypothesis_id}")
        assert hypothesis.hypothesis_id == "HYP-001"
        assert hypothesis.statement is not None

        # Validate hypothesis (simplified)
        current_rules = {"similarity_threshold": 0.5}
        result = validate_hypothesis(hypothesis, cases, current_rules)
        print(f"Validation result: {result.status}, F1 change: {result.f1_change}")
        assert result.status in ["passed", "failed"]

        # Evaluate experiment
        baseline = {"f1": 0.70}
        decision_config = {"min_f1_improvement": 0.01}
        decision = evaluate_experiment(result, baseline, decision_config)
        print(f"Decision: {decision['decision']}")
        assert decision["decision"] in ["keep", "discard"]


def test_edge_building_creates_connections():
    """Test that edge building creates proper connections."""
    # Create simple test data
    cases = [
        {
            "anchor_topic_id": "global_1",
            "anchor_topic_name": "Test Topic 1",
            "category": "math.OA",
            "start_period": "2025-02",
            "anchor_topic_mode": "theory",
            "anchor_topic_profile": {"primary_mode": "theory", "method_score": 0, "problem_score": 0, "theory_score": 3}
        },
        {
            "anchor_topic_id": "global_2",
            "anchor_topic_name": "Test Topic 2",
            "category": "math.OA",  # Same category
            "start_period": "2025-02",
            "anchor_topic_mode": "theory",
            "anchor_topic_profile": {"primary_mode": "theory", "method_score": 0, "problem_score": 0, "theory_score": 3}
        }
    ]

    periods = ["2025-02", "2025-03"]
    nodes = build_topic_nodes(cases, periods)
    edges = build_edges(nodes)

    # Should have:
    # - 2 continued edges (global_1: 2025-02 -> 2025-03, global_2: 2025-02 -> 2025-03)
    # - Cross-topic edges within same period
    print(f"\nNodes: {len(nodes)}, Edges: {len(edges)}")
    assert len(nodes) == 4  # 2 topics * 2 periods
    assert len(edges) >= 2  # At least continued edges

    # Check continued edges exist
    continued_edges = [e for e in edges if e.relation_type.value == "continued"]
    assert len(continued_edges) == 2


def test_experiment_logging_roundtrip():
    """Test that experiments can be logged and loaded."""
    from pipeline.evolution_models import ExperimentRecord

    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        # Create test record
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        # Log experiment
        log_experiment(temp_path, record)

        # Load experiments
        experiments = load_experiments(temp_path)
        assert len(experiments) == 1

        loaded = experiments[0]
        assert loaded.domain == "math"
        assert loaded.decision == "keep"
        assert loaded.f1_score == 0.72

    finally:
        os.unlink(temp_path)


def test_graph_metrics_calculation():
    """Test that graph metrics are calculated correctly."""
    from pipeline.evolution_loop import build_graph

    cases_path = "data/output/evolution_cases.json"
    if not Path(cases_path).exists():
        return

    graph = build_graph(cases_path, "math", ["2025-02", "2025-03"])

    print(f"\nGraph metrics:")
    print(f"  Nodes: {graph.metrics.total_nodes}")
    print(f"  Edges: {graph.metrics.total_edges}")
    print(f"  Connected components: {graph.metrics.connected_components}")
    print(f"  Largest component ratio: {graph.metrics.largest_component_ratio:.2%}")
    print(f"  Temporal consistency: {graph.metrics.temporal_consistency:.2%}")
    print(f"  Clustering coefficient: {graph.metrics.clustering_coefficient:.2%}")

    assert graph.metrics.total_nodes > 0
    assert graph.metrics.total_edges > 0
    assert graph.metrics.connected_components > 0
    assert 0.0 <= graph.metrics.largest_component_ratio <= 1.0
    assert 0.0 <= graph.metrics.temporal_consistency <= 1.0


def test_end_to_end_workflow():
    """Test the complete workflow from graph building to experiment decision."""
    cases_path = "data/output/evolution_cases.json"
    if not Path(cases_path).exists():
        return

    print("\n=== End-to-End Workflow Test ===")

    # Step 1: Build graph
    from pipeline.evolution_loop import build_graph
    graph = build_graph(cases_path, "math", ["2025-02", "2025-03", "2025-04"])
    print(f"✓ Step 1: Built graph with {len(graph.nodes)} nodes, {len(graph.edges)} edges")

    # Step 2: Detect anomalies
    anomalies = detect_isolated_clusters(graph.nodes, graph.edges, min_cluster_size=1)
    print(f"✓ Step 2: Detected {len(anomalies)} anomalies")

    if not anomalies:
        print("⚠ No anomalies to process")
        return

    # Step 3: Generate hypothesis
    config = {"hypothesis_templates": {"isolated_cluster": ["Test template"]}}
    hypothesis = generate_hypothesis(anomalies[0], config, 1)
    print(f"✓ Step 3: Generated hypothesis {hypothesis.hypothesis_id}")

    # Step 4: Validate hypothesis
    cases = load_evolution_cases(cases_path)
    current_rules = {"similarity_threshold": 0.5}
    result = validate_hypothesis(hypothesis, cases, current_rules)
    print(f"✓ Step 4: Validated hypothesis - status: {result.status}")

    # Step 5: Evaluate experiment
    baseline = {"f1": 0.70}
    decision = evaluate_experiment(result, baseline, {})
    print(f"✓ Step 5: Decision - {decision['decision']} ({decision['reason']})")

    # Step 6: Log experiment
    from pipeline.evolution_models import ExperimentRecord
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id=hypothesis.hypothesis_id,
            rule_changed=hypothesis.rule_suggestion.rule_name,
            change_summary=hypothesis.rule_suggestion.suggested_change,
            new_events_count=result.new_events_found or 0,
            precision_change=0.0,
            recall_change=0.0,
            f1_score=result.precision or 0.0,
            decision=decision['decision'],
            reason=decision['reason']
        )
        log_experiment(temp_path, record)
        print(f"✓ Step 6: Logged experiment to {temp_path}")

        # Verify log
        experiments = load_experiments(temp_path)
        assert len(experiments) == 1
        print(f"✓ Verified: Loaded {len(experiments)} experiment from log")

    finally:
        os.unlink(temp_path)

    print("\n=== All Steps Completed Successfully ===")

"""Tests for evolution hypothesis generator."""

import pytest
from datetime import datetime
from pipeline.evolution_models import (
    GraphAnomaly, AnomalyType, Severity, EvolutionHypothesis
)
from pipeline.evolution_hypothesis_generator import (
    generate_hypothesis,
    _generate_statement,
    _generate_rule_suggestion,
    _generate_validation_design,
    _format_hypothesis_id
)


def test_format_hypothesis_id():
    """Test hypothesis ID formatting."""
    assert _format_hypothesis_id(1) == "HYP-001"
    assert _format_hypothesis_id(42) == "HYP-042"
    assert _format_hypothesis_id(999) == "HYP-999"


def test_generate_statement_isolated_cluster():
    """Test statement generation for isolated cluster anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={
            "nodes": ["global_1@2025-02"],
            "category": "math.OA"
        },
        severity=Severity.medium,
        context={}
    )

    config = {
        "hypothesis_templates": {
            "isolated_cluster": [
                "Topics in {category} may be missing connections due to overly strict similarity threshold"
            ]
        }
    }

    statement = _generate_statement(anomaly, config)
    assert "math.OA" in statement
    assert "missing connections" in statement.lower() or "isolated" in statement.lower()


def test_generate_statement_broken_lineage():
    """Test statement generation for broken lineage anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-002",
        type=AnomalyType.broken_lineage,
        location={
            "child": "topic_123",
            "expected_parent": "topic_456"
        },
        severity=Severity.high,
        context={}
    )

    config = {}

    statement = _generate_statement(anomaly, config)
    assert "topic_123" in statement or "child" in statement.lower()
    assert "parent" in statement.lower() or "lineage" in statement.lower()


def test_generate_statement_temporal_gap():
    """Test statement generation for temporal gap anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-003",
        type=AnomalyType.temporal_gap,
        location={
            "topic": "quantum_ml",
            "gap_start": "2025-01",
            "gap_end": "2025-03"
        },
        severity=Severity.medium,
        context={}
    )

    config = {}

    statement = _generate_statement(anomaly, config)
    assert "quantum_ml" in statement or "topic" in statement.lower()
    assert "gap" in statement.lower() or "disappeared" in statement.lower() or "reappeared" in statement.lower()


def test_generate_statement_unexpected_bridge():
    """Test statement generation for unexpected bridge anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-004",
        type=AnomalyType.unexpected_bridge,
        location={
            "source": "math.AG",
            "target": "cs.LG",
            "edge_id": "edge_123"
        },
        severity=Severity.low,
        context={}
    )

    statement = _generate_statement(anomaly, {})
    assert "bridge" in statement.lower() or "unexpected" in statement.lower()


def test_generate_statement_dangling_emergence():
    """Test statement generation for dangling emergence anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-005",
        type=AnomalyType.dangling_emergence,
        location={
            "topic": "new_topic_123",
            "period": "2025-03"
        },
        severity=Severity.medium,
        context={}
    )

    statement = _generate_statement(anomaly, {})
    assert "emerg" in statement.lower() or "origin" in statement.lower()


def test_generate_rule_suggestion_isolated_cluster():
    """Test rule suggestion for isolated cluster."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={"nodes": ["n1"], "category": "math.OA"},
        severity=Severity.medium,
        context={}
    )

    suggestion = _generate_rule_suggestion(anomaly)
    assert suggestion.rule_name is not None
    assert suggestion.rule_name != ""
    assert "similarity" in suggestion.suggested_change.lower() or "threshold" in suggestion.suggested_change.lower()
    assert suggestion.expected_effect in ["expand", "shrink", "shift", "new_pattern"]


def test_generate_rule_suggestion_broken_lineage():
    """Test rule suggestion for broken lineage."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-002",
        type=AnomalyType.broken_lineage,
        location={"child": "topic_123"},
        severity=Severity.high,
        context={}
    )

    suggestion = _generate_rule_suggestion(anomaly)
    assert "lineage" in suggestion.rule_name.lower() or "parent" in suggestion.rule_name.lower()
    assert suggestion.expected_effect in ["expand", "shrink", "shift", "new_pattern"]


def test_generate_rule_suggestion_temporal_gap():
    """Test rule suggestion for temporal gap."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-003",
        type=AnomalyType.temporal_gap,
        location={"topic": "quantum_ml"},
        severity=Severity.medium,
        context={}
    )

    suggestion = _generate_rule_suggestion(anomaly)
    assert "temporal" in suggestion.rule_name.lower() or "window" in suggestion.rule_name.lower()
    assert suggestion.expected_effect in ["expand", "shrink", "shift", "new_pattern"]


def test_generate_validation_design():
    """Test validation design generation."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={
            "nodes": ["global_1@2025-02", "global_2@2025-02"],
            "category": "math.OA"
        },
        severity=Severity.medium,
        context={"periods": ["2025-01", "2025-02", "2025-03"]}
    )

    design = _generate_validation_design(anomaly, "math.OA")

    assert design.target_tree_path is not None
    assert design.target_tree_path != ""
    assert isinstance(design.time_window, list)
    assert len(design.time_window) >= 2
    assert design.positive_case_criteria is not None
    assert design.negative_case_criteria is not None


def test_generate_hypothesis_isolated_cluster():
    """Test hypothesis generation for isolated cluster anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={
            "nodes": ["global_1@2025-02"],
            "category": "math.OA"
        },
        severity=Severity.medium,
        context={}
    )

    config = {
        "hypothesis_templates": {
            "isolated_cluster": [
                "Topics in {category} may be missing connections"
            ]
        }
    }

    hypothesis = generate_hypothesis(anomaly, config, 1)

    assert hypothesis.hypothesis_id == "HYP-001"
    assert hypothesis.source_anomaly == "ANM-001"
    assert "isolated_cluster" in hypothesis.statement.lower() or "math.OA" in hypothesis.statement
    assert hypothesis.rule_suggestion.rule_name is not None
    assert hypothesis.validation_design.target_tree_path is not None
    assert isinstance(hypothesis.generated_at, str)


def test_generate_hypothesis_broken_lineage():
    """Test hypothesis generation for broken lineage anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-002",
        type=AnomalyType.broken_lineage,
        location={
            "child": "topic_123",
            "expected_parent": "topic_456"
        },
        severity=Severity.high,
        context={}
    )

    config = {}

    hypothesis = generate_hypothesis(anomaly, config, 2)

    assert hypothesis.hypothesis_id == "HYP-002"
    assert hypothesis.source_anomaly == "ANM-002"
    assert hypothesis.rule_suggestion is not None
    assert hypothesis.validation_design is not None


def test_generate_hypothesis_temporal_gap():
    """Test hypothesis generation for temporal gap anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-003",
        type=AnomalyType.temporal_gap,
        location={
            "topic": "quantum_ml",
            "gap_start": "2025-01",
            "gap_end": "2025-03"
        },
        severity=Severity.medium,
        context={}
    )

    config = {}

    hypothesis = generate_hypothesis(anomaly, config, 3)

    assert hypothesis.hypothesis_id == "HYP-003"
    assert hypothesis.source_anomaly == "ANM-003"
    assert "quantum_ml" in hypothesis.statement or "gap" in hypothesis.statement.lower()


def test_generate_hypothesis_with_domain():
    """Test hypothesis generation extracts domain from anomaly."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={
            "nodes": ["global_1@2025-02"],
            "category": "cs.LG"
        },
        severity=Severity.medium,
        context={}
    )

    config = {"domain": "computer_science"}

    hypothesis = generate_hypothesis(anomaly, config, 1)

    assert hypothesis.domain == "cs.LG"  # Extracted from location


def test_generate_hypothesis_validation_design_time_window():
    """Test that validation design includes appropriate time window."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.temporal_gap,
        location={"topic": "t1"},
        severity=Severity.medium,
        context={"periods": ["2025-01", "2025-02", "2025-03", "2025-04"]}
    )

    config = {}

    hypothesis = generate_hypothesis(anomaly, config, 1)

    assert len(hypothesis.validation_design.time_window) == 2
    assert hypothesis.validation_design.time_window[0] <= hypothesis.validation_design.time_window[1]


def test_generate_hypothesis_criteria_not_empty():
    """Test that positive and negative criteria are not empty."""
    anomaly = GraphAnomaly(
        anomaly_id="ANM-001",
        type=AnomalyType.isolated_cluster,
        location={"nodes": ["n1"], "category": "math.OA"},
        severity=Severity.medium,
        context={}
    )

    hypothesis = generate_hypothesis(anomaly, {}, 1)

    assert hypothesis.validation_design.positive_case_criteria != ""
    assert hypothesis.validation_design.negative_case_criteria != ""
    assert len(hypothesis.validation_design.positive_case_criteria) > 10
    assert len(hypothesis.validation_design.negative_case_criteria) > 10

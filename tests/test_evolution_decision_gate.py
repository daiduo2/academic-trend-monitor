"""Tests for evolution decision gate.

This module tests the decision logic for keeping or discarding experiments
based on validation results and baseline metrics.
"""

import pytest
from pipeline.evolution_models import ValidationResult
from pipeline.evolution_decision_gate import evaluate_experiment


def test_evaluate_experiment_keep_f1_improved():
    """Test keep decision when F1 improves significantly."""
    result = ValidationResult(
        status="passed",
        precision=0.75,
        recall=0.72,
        new_events_found=5,
        f1_change=0.03
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "keep"
    assert "F1 improved" in decision["reason"]
    assert decision["confidence"] > 0.0


def test_evaluate_experiment_discard_f1_dropped():
    """Test discard decision when F1 drops significantly."""
    result = ValidationResult(
        status="passed",
        precision=0.65,
        recall=0.60,
        new_events_found=2,
        f1_change=-0.06
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "discard"
    assert "F1 dropped" in decision["reason"]


def test_evaluate_experiment_keep_precision_maintained_recall_improved():
    """Test keep decision when precision maintained and recall improved (F1 stable)."""
    result = ValidationResult(
        status="passed",
        precision=0.65,
        recall=0.75,
        new_events_found=3,
        f1_change=0.005  # Stable, within -0.05 to +0.01
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "keep"
    assert "recall improved" in decision["reason"].lower()


def test_evaluate_experiment_keep_new_events_found():
    """Test keep decision when new events found > 5 (F1 stable)."""
    result = ValidationResult(
        status="passed",
        precision=0.55,  # Below 0.6 so precision_maintained is false
        recall=0.68,
        new_events_found=6,
        f1_change=0.005  # Stable
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "keep"
    assert "new events" in decision["reason"].lower()


def test_evaluate_experiment_discard_f1_stable_no_improvement():
    """Test discard decision when F1 stable but no secondary improvement."""
    result = ValidationResult(
        status="passed",
        precision=0.55,  # Below 0.6 threshold
        recall=0.60,
        new_events_found=2,  # Below 5 threshold
        f1_change=0.005  # Stable
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "discard"


def test_evaluate_experiment_returns_required_fields():
    """Test that decision dict contains all required fields."""
    result = ValidationResult(
        status="passed",
        precision=0.75,
        recall=0.72,
        new_events_found=5,
        f1_change=0.03
    )

    baseline = {"f1": 0.70}
    config = {}

    decision = evaluate_experiment(result, baseline, config)

    assert "decision" in decision
    assert "reason" in decision
    assert "confidence" in decision
    assert decision["decision"] in ["keep", "discard"]
    assert isinstance(decision["confidence"], float)
    assert 0.0 <= decision["confidence"] <= 1.0


def test_evaluate_experiment_confidence_high_for_clear_improvement():
    """Test high confidence when F1 improves significantly."""
    result = ValidationResult(
        status="passed",
        precision=0.80,
        recall=0.78,
        new_events_found=10,
        f1_change=0.10  # Large improvement
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "keep"
    assert decision["confidence"] >= 0.8


def test_evaluate_experiment_confidence_low_for_marginal_case():
    """Test lower confidence for marginal improvements."""
    result = ValidationResult(
        status="passed",
        precision=0.62,
        recall=0.65,
        new_events_found=6,  # Just above threshold
        f1_change=0.005  # Stable
    )

    baseline = {"f1": 0.70}
    config = {"min_f1_improvement": 0.01}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "keep"
    assert decision["confidence"] < 0.8


def test_evaluate_experiment_handles_missing_f1_change():
    """Test handling when f1_change is None."""
    result = ValidationResult(
        status="pending",
        precision=None,
        recall=None,
        new_events_found=None,
        f1_change=None
    )

    baseline = {"f1": 0.70}
    config = {}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "discard"
    assert "insufficient data" in decision["reason"].lower()


def test_evaluate_experiment_handles_failed_validation():
    """Test discard decision when validation failed."""
    result = ValidationResult(
        status="failed",
        precision=0.50,
        recall=0.45,
        new_events_found=0,
        f1_change=-0.15
    )

    baseline = {"f1": 0.70}
    config = {}

    decision = evaluate_experiment(result, baseline, config)

    assert decision["decision"] == "discard"
    assert "validation failed" in decision["reason"].lower()


def test_evaluate_experiment_configurable_thresholds():
    """Test that thresholds can be configured."""
    result = ValidationResult(
        status="passed",
        precision=0.75,
        recall=0.72,
        new_events_found=5,
        f1_change=0.005  # Below default 0.01
    )

    baseline = {"f1": 0.70}
    # Use a lower threshold so this counts as improvement
    config = {"min_f1_improvement": 0.001}

    decision = evaluate_experiment(result, baseline, config)

    # With lower threshold, this should be keep
    assert decision["decision"] == "keep"

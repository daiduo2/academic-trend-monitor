"""Tests for evolution hypothesis validator.

This module tests the validation of hypotheses on historical data,
including applying rule changes and measuring results.
"""

import pytest
from datetime import datetime
from typing import Dict, List, Any

from pipeline.evolution_models import (
    EvolutionHypothesis,
    RuleSuggestion,
    ValidationDesign,
    ValidationResult,
    AnomalyType,
    Severity,
    GraphAnomaly,
)
from pipeline.evolution_hypothesis_validator import (
    validate_hypothesis,
    apply_rule_change,
    calculate_metrics,
    compare_metrics,
)


def test_validate_hypothesis_improves_results():
    """Test validation when hypothesis improves results."""
    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Lower threshold to detect more connections",
        rule_suggestion=RuleSuggestion(
            rule_name="similarity_threshold",
            suggested_change="lower from 0.8 to 0.6",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math > math.OA",
            time_window=["2025-02"],
            positive_case_criteria="more events detected",
            negative_case_criteria="no change"
        )
    )

    cases = [
        {"anchor_topic_id": "global_1", "event_types": ["emerged"]},
        {"anchor_topic_id": "global_2", "event_types": []}
    ]

    current_rules = {"similarity_threshold": 0.8}

    result = validate_hypothesis(hypothesis, cases, current_rules)

    assert result.status in ["passed", "failed"]
    assert result.precision is not None
    assert result.recall is not None


def test_validate_hypothesis_returns_validation_result():
    """Test that validate_hypothesis returns a ValidationResult object."""
    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Test hypothesis",
        rule_suggestion=RuleSuggestion(
            rule_name="test_rule",
            suggested_change="lower from 0.8 to 0.6",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math",
            time_window=["2025-02"],
            positive_case_criteria="more events",
            negative_case_criteria="no change"
        )
    )

    cases = []
    current_rules = {}

    result = validate_hypothesis(hypothesis, cases, current_rules)

    assert isinstance(result, ValidationResult)
    assert hasattr(result, 'status')
    assert hasattr(result, 'precision')
    assert hasattr(result, 'recall')
    assert hasattr(result, 'new_events_found')
    assert hasattr(result, 'f1_change')


def test_apply_rule_change_lower_threshold():
    """Test applying a rule change that lowers a threshold."""
    current_rules = {"similarity_threshold": 0.8}
    suggestion = RuleSuggestion(
        rule_name="similarity_threshold",
        suggested_change="lower from 0.8 to 0.6",
        expected_effect="expand"
    )

    modified_rules = apply_rule_change(current_rules, suggestion)

    assert modified_rules["similarity_threshold"] == 0.6


def test_apply_rule_change_add_new_rule():
    """Test applying a rule change that adds a new rule."""
    current_rules = {"existing_rule": 0.5}
    suggestion = RuleSuggestion(
        rule_name="new_rule",
        suggested_change="add new rule with value 0.7",
        expected_effect="new_pattern"
    )

    modified_rules = apply_rule_change(current_rules, suggestion)

    assert "new_rule" in modified_rules
    assert modified_rules["existing_rule"] == 0.5


def test_apply_rule_change_increase_threshold():
    """Test applying a rule change that increases a threshold."""
    current_rules = {"min_shared_terms": 3}
    suggestion = RuleSuggestion(
        rule_name="min_shared_terms",
        suggested_change="increase from 3 to 5",
        expected_effect="shrink"
    )

    modified_rules = apply_rule_change(current_rules, suggestion)

    assert modified_rules["min_shared_terms"] == 5


def test_apply_rule_change_preserves_other_rules():
    """Test that applying a rule change preserves other existing rules."""
    current_rules = {
        "similarity_threshold": 0.8,
        "min_shared_terms": 3,
        "temporal_window": 1
    }
    suggestion = RuleSuggestion(
        rule_name="similarity_threshold",
        suggested_change="lower from 0.8 to 0.6",
        expected_effect="expand"
    )

    modified_rules = apply_rule_change(current_rules, suggestion)

    assert modified_rules["similarity_threshold"] == 0.6
    assert modified_rules["min_shared_terms"] == 3
    assert modified_rules["temporal_window"] == 1


def test_calculate_metrics_empty_cases():
    """Test calculating metrics with empty cases."""
    cases = []
    rules = {}

    metrics = calculate_metrics(cases, rules)

    assert metrics["total_cases"] == 0
    assert metrics["events_detected"] == 0
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["f1_score"] == 0.0


def test_calculate_metrics_with_events():
    """Test calculating metrics with cases that have events."""
    cases = [
        {"anchor_topic_id": "global_1", "event_types": ["emerged"]},
        {"anchor_topic_id": "global_2", "event_types": []},
        {"anchor_topic_id": "global_3", "event_types": ["expanded", "diffused"]},
    ]
    rules = {}

    metrics = calculate_metrics(cases, rules)

    assert metrics["total_cases"] == 3
    assert metrics["events_detected"] == 3  # 1 + 0 + 2
    assert metrics["precision"] > 0
    assert metrics["recall"] > 0


def test_compare_metrics_calculates_f1_change():
    """Test that compare_metrics calculates F1 score change."""
    before = {"f1_score": 0.6}
    after = {"f1_score": 0.75}

    comparison = compare_metrics(before, after)

    assert abs(comparison["f1_change"] - 0.15) < 0.0001


def test_compare_metrics_detects_new_events():
    """Test that compare_metrics detects new events."""
    before = {"events_detected": 5}
    after = {"events_detected": 8}

    comparison = compare_metrics(before, after)

    assert comparison["new_events_found"] == 3


def test_validate_hypothesis_with_expand_effect():
    """Test validation when expected effect is 'expand'."""
    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Lower threshold to detect more",
        rule_suggestion=RuleSuggestion(
            rule_name="similarity_threshold",
            suggested_change="lower from 0.8 to 0.6",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math",
            time_window=["2025-02"],
            positive_case_criteria="more events detected",
            negative_case_criteria="no change"
        )
    )

    cases = [
        {"anchor_topic_id": "global_1", "event_types": ["emerged"]},
        {"anchor_topic_id": "global_2", "event_types": []},
        {"anchor_topic_id": "global_3", "event_types": ["expanded"]},
    ]
    current_rules = {"similarity_threshold": 0.8}

    result = validate_hypothesis(hypothesis, cases, current_rules)

    assert result.status in ["passed", "failed"]
    assert result.new_events_found is not None


def test_validate_hypothesis_with_shrink_effect():
    """Test validation when expected effect is 'shrink'."""
    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Increase threshold to reduce false positives",
        rule_suggestion=RuleSuggestion(
            rule_name="min_shared_terms",
            suggested_change="increase from 3 to 5",
            expected_effect="shrink"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math",
            time_window=["2025-02"],
            positive_case_criteria="fewer false positives",
            negative_case_criteria="precision drops"
        )
    )

    cases = [
        {"anchor_topic_id": "global_1", "event_types": ["emerged"]},
        {"anchor_topic_id": "global_2", "event_types": ["expanded"]},
    ]
    current_rules = {"min_shared_terms": 3}

    result = validate_hypothesis(hypothesis, cases, current_rules)

    assert result.status in ["passed", "failed"]


def test_validate_hypothesis_sets_tested_at_timestamp():
    """Test that validate_hypothesis sets the tested_at timestamp."""
    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Test hypothesis",
        rule_suggestion=RuleSuggestion(
            rule_name="test_rule",
            suggested_change="lower from 0.8 to 0.6",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math",
            time_window=["2025-02"],
            positive_case_criteria="more events",
            negative_case_criteria="no change"
        )
    )

    cases = []
    current_rules = {}

    result = validate_hypothesis(hypothesis, cases, current_rules)

    assert result.tested_at is not None
    # Should be a valid ISO format timestamp
    assert isinstance(result.tested_at, str)
    assert len(result.tested_at) > 0


def test_validate_hypothesis_preserves_original_rules():
    """Test that validate_hypothesis does not modify the original rules dict."""
    current_rules = {"similarity_threshold": 0.8, "min_shared_terms": 3}
    original_rules = current_rules.copy()

    hypothesis = EvolutionHypothesis(
        hypothesis_id="HYP-001",
        generated_at="2026-03-16T10:00:00Z",
        source_anomaly="ANM-001",
        domain="math",
        statement="Test hypothesis",
        rule_suggestion=RuleSuggestion(
            rule_name="similarity_threshold",
            suggested_change="lower from 0.8 to 0.6",
            expected_effect="expand"
        ),
        validation_design=ValidationDesign(
            target_tree_path="math",
            time_window=["2025-02"],
            positive_case_criteria="more events",
            negative_case_criteria="no change"
        )
    )

    cases = []
    validate_hypothesis(hypothesis, cases, current_rules)

    assert current_rules == original_rules

"""Hypothesis validator for evolution graph anomalies.

This module validates hypotheses on historical data by applying suggested
rule changes and measuring the impact on detection results.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pipeline.evolution_models import (
    EvolutionHypothesis,
    RuleSuggestion,
    ValidationResult,
)


def apply_rule_change(current_rules: Dict[str, Any], suggestion: RuleSuggestion) -> Dict[str, Any]:
    """Apply a rule change to the current rules.

    Args:
        current_rules: The current rule configuration.
        suggestion: The rule suggestion containing the change to apply.

    Returns:
        A new dictionary with the modified rules (original is not mutated).
    """
    # Create a copy to avoid mutating the original
    modified_rules = dict(current_rules)

    suggested_change = suggestion.suggested_change.lower()
    rule_name = suggestion.rule_name

    # Parse "lower from X to Y" pattern
    lower_match = re.search(r'lower\s+from\s+([\d.]+)\s+to\s+([\d.]+)', suggested_change)
    if lower_match:
        old_value = float(lower_match.group(1))
        new_value = float(lower_match.group(2))
        if rule_name in modified_rules:
            modified_rules[rule_name] = new_value
        else:
            modified_rules[rule_name] = new_value
        return modified_rules

    # Parse "increase from X to Y" pattern
    increase_match = re.search(r'increase\s+from\s+([\d.]+)\s+to\s+([\d.]+)', suggested_change)
    if increase_match:
        old_value = float(increase_match.group(1))
        new_value = float(increase_match.group(2))
        modified_rules[rule_name] = new_value
        return modified_rules

    # Parse "add new rule with value X" pattern
    add_match = re.search(r'add\s+new\s+rule\s+with\s+value\s+([\d.]+)', suggested_change)
    if add_match:
        value = float(add_match.group(1))
        modified_rules[rule_name] = value
        return modified_rules

    # Default: add the rule with a default value based on expected effect
    if suggestion.expected_effect == "expand":
        modified_rules[rule_name] = 0.6  # Lower threshold to detect more
    elif suggestion.expected_effect == "shrink":
        modified_rules[rule_name] = 0.9  # Higher threshold to detect less
    elif suggestion.expected_effect == "new_pattern":
        modified_rules[rule_name] = 0.7  # Moderate default
    else:
        modified_rules[rule_name] = 0.7

    return modified_rules


def calculate_metrics(cases: List[Dict], rules: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate metrics for a set of cases using the given rules.

    Args:
        cases: List of case dictionaries containing event data.
        rules: The rules to apply for analysis.

    Returns:
        Dictionary containing calculated metrics including:
        - total_cases: Total number of cases analyzed
        - events_detected: Total number of events found
        - precision: Precision score (simplified)
        - recall: Recall score (simplified)
        - f1_score: F1 score
    """
    if not cases:
        return {
            "total_cases": 0,
            "events_detected": 0,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
        }

    total_cases = len(cases)
    events_detected = 0
    cases_with_events = 0

    for case in cases:
        event_types = case.get("event_types", [])
        if event_types:
            cases_with_events += 1
            events_detected += len(event_types)

    # Simplified precision/recall calculation
    # Precision: proportion of cases that have events (higher = more precise)
    precision = cases_with_events / total_cases if total_cases > 0 else 0.0

    # Recall: proportion of potential events detected
    # Assume each case could have 1-2 events on average
    expected_events = total_cases * 1.5  # Assume 1.5 events per case as baseline
    recall = min(events_detected / expected_events, 1.0) if expected_events > 0 else 0.0

    # F1 score: harmonic mean of precision and recall
    if precision + recall > 0:
        f1_score = 2 * (precision * recall) / (precision + recall)
    else:
        f1_score = 0.0

    return {
        "total_cases": total_cases,
        "events_detected": events_detected,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
    }


def compare_metrics(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
    """Compare metrics before and after a rule change.

    Args:
        before: Metrics before the rule change.
        after: Metrics after the rule change.

    Returns:
        Dictionary containing comparison results:
        - f1_change: Change in F1 score
        - new_events_found: Number of new events detected
    """
    f1_change = after.get("f1_score", 0.0) - before.get("f1_score", 0.0)
    new_events_found = after.get("events_detected", 0) - before.get("events_detected", 0)

    return {
        "f1_change": f1_change,
        "new_events_found": new_events_found,
    }


def validate_hypothesis(
    hypothesis: EvolutionHypothesis,
    cases: List[Dict],
    current_rules: Dict[str, Any]
) -> ValidationResult:
    """Validate hypothesis by applying rule change and measuring results.

    This function simulates a "what if" scenario by:
    1. Applying the suggested rule change to current rules
    2. Running analysis on historical cases with modified rules
    3. Comparing metrics before and after the change
    4. Determining if the change improved results

    Args:
        hypothesis: The evolution hypothesis to validate.
        cases: List of historical cases to analyze.
        current_rules: The current rule configuration.

    Returns:
        ValidationResult with:
        - status: "passed" or "failed"
        - precision: Precision score after change
        - recall: Recall score after change
        - new_events_found: Number of new events detected
        - f1_change: Change in F1 score
    """
    # Calculate baseline metrics with current rules
    before_metrics = calculate_metrics(cases, current_rules)

    # Apply the suggested rule change
    modified_rules = apply_rule_change(current_rules, hypothesis.rule_suggestion)

    # Calculate metrics with modified rules
    after_metrics = calculate_metrics(cases, modified_rules)

    # Compare metrics
    comparison = compare_metrics(before_metrics, after_metrics)

    # Determine if the hypothesis passed based on expected effect
    expected_effect = hypothesis.rule_suggestion.expected_effect
    f1_change = comparison["f1_change"]
    new_events_found = comparison["new_events_found"]

    if expected_effect == "expand":
        # For expand: we want more events and improved or stable F1
        if new_events_found > 0 and f1_change >= -0.1:
            status = "passed"
        else:
            status = "failed"
    elif expected_effect == "shrink":
        # For shrink: we want fewer events but better precision (higher F1)
        if f1_change > 0:
            status = "passed"
        else:
            status = "failed"
    elif expected_effect == "new_pattern":
        # For new pattern: we want some change in detection
        if new_events_found != 0 or abs(f1_change) > 0.05:
            status = "passed"
        else:
            status = "failed"
    else:
        # Default: pass if F1 improved
        status = "passed" if f1_change > 0 else "failed"

    # Generate timestamp
    tested_at = datetime.now().isoformat()

    return ValidationResult(
        status=status,
        tested_at=tested_at,
        precision=after_metrics["precision"],
        recall=after_metrics["recall"],
        new_events_found=new_events_found,
        f1_change=f1_change,
    )

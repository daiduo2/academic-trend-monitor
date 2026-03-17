"""Decision gate for evolution experiments.

This module implements the decision logic for keeping or discarding experiments
based on validation results and baseline metrics. It follows a two-tier
decision process:
1. Primary: F1 score improvement
2. Secondary: Precision maintenance and new events found
"""

from typing import Any, Dict, Optional

from pipeline.evolution_models import ValidationResult


def evaluate_experiment(
    validation_result: ValidationResult,
    baseline_metrics: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """Decide whether to keep or discard experiment.

    This function implements a two-tier decision logic:
    1. Primary criterion: F1 score change
       - If F1 improved > min_f1_improvement: "keep"
       - If F1 dropped > max_f1_drop: "discard"
       - If F1 stable: check secondary criteria

    2. Secondary criteria (if F1 stable):
       - Precision maintained (> min_precision): "keep" if recall improved
       - New events found > min_new_events: "keep"
       - Otherwise: "discard"

    Args:
        validation_result: The validation result containing metrics and changes.
        baseline_metrics: The baseline metrics for comparison (must include "f1").
        config: Configuration dictionary with optional thresholds:
            - min_f1_improvement: Minimum F1 improvement to keep (default: 0.01)
            - max_f1_drop: Maximum F1 drop before discarding (default: 0.05)
            - min_precision: Minimum precision to consider maintained (default: 0.6)
            - min_new_events: Minimum new events to justify keeping (default: 5)

    Returns:
        Dict with:
        - decision: "keep" or "discard"
        - reason: Human-readable explanation
        - confidence: Confidence score between 0.0 and 1.0
    """
    # Get configurable thresholds with defaults
    min_f1_improvement = config.get("min_f1_improvement", 0.01)
    max_f1_drop = config.get("max_f1_drop", 0.05)
    min_precision = config.get("min_precision", 0.6)
    min_new_events = config.get("min_new_events", 5)

    # Handle missing or invalid validation result
    if validation_result.f1_change is None:
        return {
            "decision": "discard",
            "reason": "Insufficient data: F1 change not available",
            "confidence": 1.0
        }

    # Handle failed validation
    if validation_result.status == "failed":
        return {
            "decision": "discard",
            "reason": f"Validation failed: {validation_result.status}",
            "confidence": 1.0
        }

    f1_change = validation_result.f1_change
    precision = validation_result.precision or 0.0
    recall = validation_result.recall or 0.0
    new_events = validation_result.new_events_found or 0

    # Primary criterion: F1 improvement
    if f1_change > min_f1_improvement:
        # F1 improved significantly - keep
        confidence = min(0.8 + (f1_change * 5), 1.0)  # Higher improvement = higher confidence
        return {
            "decision": "keep",
            "reason": f"F1 improved by {f1_change:.3f} (threshold: {min_f1_improvement:.3f})",
            "confidence": confidence
        }

    # F1 dropped significantly - discard
    if f1_change < -max_f1_drop:
        confidence = min(0.8 + (abs(f1_change) * 5), 1.0)
        return {
            "decision": "discard",
            "reason": f"F1 dropped by {abs(f1_change):.3f} (max allowed: {max_f1_drop:.3f})",
            "confidence": confidence
        }

    # F1 is stable (-max_f1_drop to +min_f1_improvement)
    # Check secondary criteria
    precision_maintained = precision >= min_precision
    recall_improved = validation_result.recall is not None and baseline_metrics.get("recall", 0.0) < recall
    sufficient_new_events = new_events > min_new_events

    # Decision based on secondary criteria
    if precision_maintained and recall_improved:
        return {
            "decision": "keep",
            "reason": f"F1 stable ({f1_change:+.3f}) but recall improved with maintained precision",
            "confidence": 0.6
        }

    if sufficient_new_events:
        return {
            "decision": "keep",
            "reason": f"F1 stable ({f1_change:+.3f}) but {new_events} new events found",
            "confidence": 0.55
        }

    # No compelling reason to keep
    return {
        "decision": "discard",
        "reason": f"F1 stable ({f1_change:+.3f}) without sufficient secondary improvement",
        "confidence": 0.7
    }

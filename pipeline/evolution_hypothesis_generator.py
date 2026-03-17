"""Hypothesis generator for evolution graph anomalies.

This module generates testable hypotheses from detected graph anomalies,
including natural language statements, rule suggestions, and validation designs.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pipeline.evolution_models import (
    GraphAnomaly,
    AnomalyType,
    EvolutionHypothesis,
    RuleSuggestion,
    ValidationDesign,
)


# Default hypothesis templates for each anomaly type
DEFAULT_TEMPLATES: Dict[str, List[str]] = {
    AnomalyType.isolated_cluster: [
        "Topics in {category} may be missing connections due to overly strict similarity threshold",
        "Isolated cluster in {category} suggests potential undetected relationships",
        "Cluster in {category} may need relaxed connection criteria to integrate with main graph",
    ],
    AnomalyType.broken_lineage: [
        "Child topic {child} may have unrecorded parent relationship",
        "Lineage break detected for {child} suggests missing evolutionary connection",
        "Topic {child} appears disconnected from expected parent lineage",
    ],
    AnomalyType.temporal_gap: [
        "Topic {topic} disappeared then reappeared, suggesting missed intermediate events",
        "Temporal gap for {topic} indicates potential missing time slice data",
        "Gap in {topic} evolution suggests need for expanded temporal window",
    ],
    AnomalyType.unexpected_bridge: [
        "Unexpected connection between distant topics suggests potential over-relaxation of similarity rules",
        "Bridge edge may indicate false positive connection that needs stricter validation",
        "Cross-domain link detected that may not represent true semantic relationship",
    ],
    AnomalyType.dangling_emergence: [
        "Topic {topic} emerged without clear origin, suggesting undetected parent",
        "Dangling emergence of {topic} indicates missing predecessor detection",
        "New topic {topic} lacks traceable lineage from existing topics",
    ],
}


# Default rule suggestions for each anomaly type
DEFAULT_RULE_SUGGESTIONS: Dict[AnomalyType, Dict[str, str]] = {
    AnomalyType.isolated_cluster: {
        "rule_name": "similarity_threshold_relaxation",
        "suggested_change": "Lower cosine similarity threshold from 0.85 to 0.75 for cross-category connections",
        "expected_effect": "expand",
    },
    AnomalyType.broken_lineage: {
        "rule_name": "lineage_detection_enhancement",
        "suggested_change": "Add temporal lineage detection rule with extended parent search window",
        "expected_effect": "new_pattern",
    },
    AnomalyType.temporal_gap: {
        "rule_name": "temporal_window_expansion",
        "suggested_change": "Expand temporal matching window from 1 month to 3 months",
        "expected_effect": "expand",
    },
    AnomalyType.unexpected_bridge: {
        "rule_name": "bridge_validation_strictness",
        "suggested_change": "Increase minimum shared terms requirement from 3 to 5 for cross-category edges",
        "expected_effect": "shrink",
    },
    AnomalyType.dangling_emergence: {
        "rule_name": "emergence_origin_detection",
        "suggested_change": "Add semantic similarity search for newly emerged topics across all historical periods",
        "expected_effect": "new_pattern",
    },
}


def _format_hypothesis_id(sequence_counter: int) -> str:
    """Format hypothesis ID with zero-padding.

    Args:
        sequence_counter: The sequence number for this hypothesis.

    Returns:
        Formatted hypothesis ID like "HYP-001".
    """
    return f"HYP-{sequence_counter:03d}"


def _get_domain_from_anomaly(anomaly: GraphAnomaly) -> str:
    """Extract domain from anomaly location.

    Args:
        anomaly: The graph anomaly to extract domain from.

    Returns:
        Domain string, defaults to "unknown" if not found.
    """
    location = anomaly.location

    # Try different possible location keys for domain/category
    if "category" in location:
        return location["category"]
    if "domain" in location:
        return location["domain"]
    if "source" in location:
        return location["source"]

    # Extract from node IDs if available
    if "nodes" in location and location["nodes"]:
        first_node = location["nodes"][0]
        if "@" in first_node:
            # Format like "global_1@2025-02" - extract category from context if available
            pass

    return "unknown"


def _generate_statement(anomaly: GraphAnomaly, config: Dict[str, Any]) -> str:
    """Generate a natural language hypothesis statement.

    Args:
        anomaly: The graph anomaly to generate statement for.
        config: Domain configuration with optional hypothesis_templates.

    Returns:
        A human-readable hypothesis statement.
    """
    # Get templates from config or use defaults
    templates_config = config.get("hypothesis_templates", {})

    # Get templates for this anomaly type
    anomaly_type_str = anomaly.type.value
    templates = templates_config.get(
        anomaly_type_str,
        DEFAULT_TEMPLATES.get(anomaly.type, ["Unknown anomaly type detected"])
    )

    # Select first template (could be randomized or scored in future)
    template = templates[0] if templates else f"Anomaly of type {anomaly_type_str} detected"

    # Format template with location data
    location = anomaly.location

    try:
        statement = template.format(**location)
    except KeyError:
        # If template formatting fails, use a generic statement
        category = location.get("category", "unknown category")
        topic = location.get("topic", location.get("child", "unknown topic"))

        if anomaly.type == AnomalyType.isolated_cluster:
            statement = f"Topics in {category} may be missing connections due to overly strict similarity threshold"
        elif anomaly.type == AnomalyType.broken_lineage:
            statement = f"Child topic {topic} may have unrecorded parent relationship"
        elif anomaly.type == AnomalyType.temporal_gap:
            statement = f"Topic {topic} disappeared then reappeared, suggesting missed intermediate events"
        elif anomaly.type == AnomalyType.unexpected_bridge:
            statement = "Unexpected connection between distant topics suggests potential over-relaxation of similarity rules"
        elif anomaly.type == AnomalyType.dangling_emergence:
            statement = f"Topic {topic} emerged without clear origin, suggesting undetected parent"
        else:
            statement = f"Anomaly detected: {anomaly_type_str} in {category}"

    return statement


def _generate_rule_suggestion(anomaly: GraphAnomaly) -> RuleSuggestion:
    """Generate a rule suggestion based on anomaly type.

    Args:
        anomaly: The graph anomaly to generate rule suggestion for.

    Returns:
        A RuleSuggestion with appropriate rule name, change, and expected effect.
    """
    suggestion_data = DEFAULT_RULE_SUGGESTIONS.get(
        anomaly.type,
        {
            "rule_name": "generic_anomaly_investigation",
            "suggested_change": "Review detection rules for this anomaly type",
            "expected_effect": "shift",
        }
    )

    return RuleSuggestion(
        rule_name=suggestion_data["rule_name"],
        suggested_change=suggestion_data["suggested_change"],
        expected_effect=suggestion_data["expected_effect"],
    )


def _extract_time_window(anomaly: GraphAnomaly) -> List[str]:
    """Extract time window from anomaly context or location.

    Args:
        anomaly: The graph anomaly to extract time window from.

    Returns:
        A list with start and end time strings.
    """
    context = anomaly.context
    location = anomaly.location

    # Try to get periods from context
    if "periods" in context and isinstance(context["periods"], list):
        periods = context["periods"]
        if len(periods) >= 2:
            return [periods[0], periods[-1]]
        elif len(periods) == 1:
            return [periods[0], periods[0]]

    # Try to extract from location for temporal gaps
    if "gap_start" in location and "gap_end" in location:
        return [location["gap_start"], location["gap_end"]]

    # Try to extract from node IDs (format: "topic_id@YYYY-MM")
    if "nodes" in location and location["nodes"]:
        periods = []
        for node_id in location["nodes"]:
            if "@" in str(node_id):
                period = str(node_id).split("@")[-1]
                periods.append(period)

        if periods:
            periods.sort()
            return [periods[0], periods[-1]]

    # Default to current month if nothing else found
    current_month = datetime.now().strftime("%Y-%m")
    return [current_month, current_month]


def _generate_positive_criteria(anomaly: GraphAnomaly) -> str:
    """Generate positive case criteria for validation.

    Args:
        anomaly: The graph anomaly to generate criteria for.

    Returns:
        A description of what would confirm the fix.
    """
    if anomaly.type == AnomalyType.isolated_cluster:
        return (
            "After applying the rule change, the previously isolated cluster should "
            "form connections with the main graph component. At least 50% of nodes "
            "in the cluster should have edges to nodes outside the cluster, and "
            "the number of connected components should decrease by at least 1."
        )
    elif anomaly.type == AnomalyType.broken_lineage:
        return (
            "After applying the rule change, the child topic should have a detected "
            "parent relationship. A new edge should appear connecting the child to "
            "a parent topic with confidence >= 0.7, and the lineage path should be "
            "traceable through at least one generation."
        )
    elif anomaly.type == AnomalyType.temporal_gap:
        return (
            "After expanding the temporal window, the topic should show continuous "
            "evolution without gaps. Intermediate time slices should reveal "
            "connecting events, and the topic should have edges spanning the "
            "previously gap period with no missing months in the sequence."
        )
    elif anomaly.type == AnomalyType.unexpected_bridge:
        return (
            "After applying stricter validation, the unexpected bridge should either "
            "be removed (if false positive) or confirmed with stronger evidence "
            "(>= 5 shared terms, confidence >= 0.8). Cross-category edges should "
            "have explicit semantic justification."
        )
    elif anomaly.type == AnomalyType.dangling_emergence:
        return (
            "After applying origin detection rules, the emerged topic should have "
            "a traceable parent or predecessor. At least one incoming edge from "
            "an earlier time period should be detected with confidence >= 0.6, "
            "establishing clear lineage from existing topics."
        )
    else:
        return (
            "The anomaly should be resolved after applying the suggested rule change. "
            "Validation metrics should show measurable improvement in graph connectivity "
            "or temporal consistency."
        )


def _generate_negative_criteria(anomaly: GraphAnomaly) -> str:
    """Generate negative case criteria for validation.

    Args:
        anomaly: The graph anomaly to generate criteria for.

    Returns:
        A description of what would reject the fix.
    """
    if anomaly.type == AnomalyType.isolated_cluster:
        return (
            "If the cluster remains isolated after lowering the threshold, or if "
            "the rule change creates spurious connections to unrelated topics, "
            "the hypothesis is rejected. The fix is also rejected if precision "
            "drops below 0.6 (too many false positive connections)."
        )
    elif anomaly.type == AnomalyType.broken_lineage:
        return (
            "If no parent relationship is detected after rule enhancement, or if "
            "the detected parent has low semantic similarity (< 0.5), the hypothesis "
            "is rejected. The fix is also rejected if the child topic is confirmed "
            "to be a truly novel emergence without precedent."
        )
    elif anomaly.type == AnomalyType.temporal_gap:
        return (
            "If the topic remains discontinuous even with expanded window, or if "
            "the gap represents a genuine research hiatus (confirmed by zero papers "
            "in intermediate periods), the hypothesis is rejected. The fix is also "
            "rejected if expanding the window introduces false positive connections."
        )
    elif anomaly.type == AnomalyType.unexpected_bridge:
        return (
            "If the bridge edge persists with strong evidence even after stricter "
            "validation, it may represent a genuine cross-disciplinary connection. "
            "The hypothesis is rejected if the edge has >= 8 shared terms and "
            "manual review confirms semantic validity."
        )
    elif anomaly.type == AnomalyType.dangling_emergence:
        return (
            "If no parent is found even with expanded search, or if the topic is "
            "confirmed to be a breakthrough innovation without precedent, the "
            "hypothesis is rejected. The fix is also rejected if forcing a "
            "parent connection creates false lineage."
        )
    else:
        return (
            "The hypothesis is rejected if the rule change does not resolve the "
            "anomaly or if it introduces new problems (false positives, degraded "
            "precision, or broken existing connections)."
        )


def _generate_validation_design(
    anomaly: GraphAnomaly,
    domain: str
) -> ValidationDesign:
    """Generate a validation design for testing the hypothesis.

    Args:
        anomaly: The graph anomaly to generate validation design for.
        domain: The domain/category being analyzed.

    Returns:
        A ValidationDesign with target path, time window, and criteria.
    """
    # Determine target tree path
    location = anomaly.location

    if "category" in location:
        target_path = f"/{location['category']}"
    elif "topic" in location:
        target_path = f"/{domain}/{location['topic']}"
    elif "child" in location:
        target_path = f"/{domain}/{location['child']}"
    elif "nodes" in location and location["nodes"]:
        target_path = f"/{domain}/{location['nodes'][0]}"
    else:
        target_path = f"/{domain}"

    # Extract time window
    time_window = _extract_time_window(anomaly)

    # Generate criteria
    positive_criteria = _generate_positive_criteria(anomaly)
    negative_criteria = _generate_negative_criteria(anomaly)

    return ValidationDesign(
        target_tree_path=target_path,
        time_window=time_window,
        positive_case_criteria=positive_criteria,
        negative_case_criteria=negative_criteria,
    )


def generate_hypothesis(
    anomaly: GraphAnomaly,
    domain_config: Dict[str, Any],
    sequence_counter: int
) -> EvolutionHypothesis:
    """Generate a hypothesis from a graph anomaly.

    This is the main entry point for hypothesis generation. It takes a detected
    anomaly and creates a complete EvolutionHypothesis with statement,
    rule suggestion, and validation design.

    Args:
        anomaly: The graph anomaly to generate hypothesis from.
        domain_config: Domain-specific configuration including templates.
        sequence_counter: Sequence number for generating hypothesis ID.

    Returns:
        A complete EvolutionHypothesis ready for validation.
    """
    # Generate hypothesis ID
    hypothesis_id = _format_hypothesis_id(sequence_counter)

    # Get current timestamp
    generated_at = datetime.now().isoformat()

    # Extract domain from anomaly
    domain = _get_domain_from_anomaly(anomaly)

    # Generate hypothesis statement
    statement = _generate_statement(anomaly, domain_config)

    # Generate rule suggestion
    rule_suggestion = _generate_rule_suggestion(anomaly)

    # Generate validation design
    validation_design = _generate_validation_design(anomaly, domain)

    return EvolutionHypothesis(
        hypothesis_id=hypothesis_id,
        generated_at=generated_at,
        source_anomaly=anomaly.anomaly_id,
        domain=domain,
        statement=statement,
        rule_suggestion=rule_suggestion,
        validation_design=validation_design,
        validation_result=None,
    )

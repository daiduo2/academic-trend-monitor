from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TopicMode(str, Enum):
    method = "method"
    problem = "problem"
    theory = "theory"
    hybrid = "hybrid"


class TopicNode(BaseModel):
    id: str
    topic_id: str
    period: str
    name: str
    category: str
    mode: TopicMode
    paper_count: int
    embedding: List[float]

    class Config:
        frozen = True


class RelationType(str, Enum):
    continued = "continued"
    diffused_to_neighbor = "diffused_to_neighbor"
    specialized_into_child = "specialized_into_child"
    merged_from = "merged_from"
    migrated_to_category = "migrated_to_category"


class EdgeEvidence(BaseModel):
    shared_terms: List[str]
    cosine_similarity: float = Field(..., ge=0.0, le=1.0)
    temporal_gap: int = Field(..., ge=0)

    class Config:
        frozen = True


class EvolutionEdge(BaseModel):
    id: str
    source: str
    target: str
    relation_type: RelationType
    confidence: float = Field(..., ge=0.0, le=1.0)
    rule_triggered: List[str]
    evidence: EdgeEvidence

    class Config:
        frozen = True


class GraphMetrics(BaseModel):
    total_nodes: int
    total_edges: int
    connected_components: int
    largest_component_ratio: float = Field(..., ge=0.0, le=1.0)
    average_path_length: float
    clustering_coefficient: float = Field(..., ge=0.0, le=1.0)
    temporal_consistency: float = Field(..., ge=0.0, le=1.0)
    theory_purity: Optional[float] = None
    cross_category_edges: Optional[int] = None

    class Config:
        frozen = True


class AnomalyType(str, Enum):
    temporal_gap = "temporal_gap"
    isolated_cluster = "isolated_cluster"
    broken_lineage = "broken_lineage"
    unexpected_bridge = "unexpected_bridge"
    dangling_emergence = "dangling_emergence"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class GraphAnomaly(BaseModel):
    anomaly_id: str
    type: AnomalyType
    location: Dict[str, Any]
    severity: Severity
    context: Dict[str, Any]

    class Config:
        frozen = True


class EvolutionGraph(BaseModel):
    version: str
    generated_at: str
    domain: str
    nodes: List[TopicNode]
    edges: List[EvolutionEdge]
    metrics: GraphMetrics

    class Config:
        frozen = True


class RuleSuggestion(BaseModel):
    rule_name: str
    suggested_change: str
    expected_effect: str  # "expand" | "shrink" | "shift" | "new_pattern"

    class Config:
        frozen = True


class ValidationDesign(BaseModel):
    target_tree_path: str
    time_window: List[str]
    positive_case_criteria: str
    negative_case_criteria: str

    class Config:
        frozen = True


class ValidationResult(BaseModel):
    status: str  # "pending" | "running" | "passed" | "failed"
    tested_at: Optional[str] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    new_events_found: Optional[int] = None
    f1_change: Optional[float] = None

    class Config:
        frozen = True


class EvolutionHypothesis(BaseModel):
    hypothesis_id: str
    generated_at: str
    source_anomaly: str
    domain: str
    statement: str
    rule_suggestion: RuleSuggestion
    validation_design: ValidationDesign
    validation_result: Optional[ValidationResult] = None

    class Config:
        frozen = True


class ExperimentRecord(BaseModel):
    """Record of an experiment run for logging purposes."""

    timestamp: str
    domain: str
    git_branch: str
    git_commit: str
    hypothesis_id: str
    rule_changed: str
    change_summary: str
    new_events_count: int
    precision_change: float
    recall_change: float
    f1_score: float
    decision: str  # "keep" or "discard"
    reason: str

    class Config:
        frozen = True

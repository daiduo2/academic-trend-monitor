# Topic Evolution Autonomous Analysis System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-improving topic evolution analysis system that detects graph anomalies, generates hypotheses, validates on historical data, and keeps/discards based on results.

**Architecture:** Core engine with domain-agnostic components (Graph Builder, Analytics, Hypothesis Generator/Validator, State Manager) driven by domain-specific YAML configs. Git-based experiment state management. TSV logging for reproducibility.

**Tech Stack:** Python 3.10+, NetworkX (graph), GitPython (state), PyYAML (config), pytest (testing), Pydantic (validation)

---

## File Structure

```
pipeline/
├── evolution_graph_builder.py      # Build graph from cases
├── evolution_graph_analytics.py    # Detect anomalies
├── evolution_hypothesis_generator.py # Generate hypotheses from anomalies
├── evolution_hypothesis_validator.py # Validate on historical data
├── evolution_state_manager.py      # Git-based state management
└── evolution_decision_gate.py      # Keep/discard logic

config/evolution_domains/
└── math.yaml                       # Math domain configuration

data/output/
├── evolution_graphs/
│   └── math_graph.json             # Generated graph storage
└── evolution_experiments.tsv       # Experiment log (autoresearch-style)

.claude/skills/
├── evolution-loop.md               # /evolution-loop slash command
├── evolution-graph-status.md       # /graph-status slash command
└── evolution-inspect.md            # /inspect-case slash command

tests/
├── test_evolution_graph.py         # Graph builder tests
├── test_evolution_analytics.py     # Anomaly detection tests
├── test_evolution_hypothesis.py    # Hypothesis system tests
├── test_evolution_state.py         # State manager tests
└── test_evolution_integration.py   # End-to-end tests
```

---

## Chunk 1: Foundation - Graph Data Models

**Files:**
- Create: `pipeline/evolution_models.py`
- Test: `tests/test_evolution_models.py`

**Goal:** Define all data models with Pydantic validation

---

### Task 1: TopicNode and EvolutionEdge Models

- [ ] **Step 1: Write failing test for TopicNode**

```python
# tests/test_evolution_models.py
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd academic-trend-monitor
pytest tests/test_evolution_models.py::test_topic_node_creation -v
```
Expected: `ModuleNotFoundError: No module named 'pipeline.evolution_models'`

- [ ] **Step 3: Write minimal implementation**

```python
# pipeline/evolution_models.py
from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class TopicMode(str, Enum):
    method = "method"
    problem = "problem"
    theory = "theory"
    hybrid = "hybrid"


class TopicNode(BaseModel):
    id: str                          # "global_1392@2025-02"
    topic_id: str                    # "global_1392"
    period: str                      # "2025-02"
    name: str
    category: str
    mode: TopicMode
    paper_count: int
    embedding: List[float]

    class Config:
        frozen = True
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_topic_node_creation -v
```
Expected: `PASSED`

- [ ] **Step 5: Write failing test for EvolutionEdge**

```python
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
    assert len(evidence.shared_terms) == 2
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pytest tests/test_evolution_models.py::test_evolution_edge_creation -v
```
Expected: `NameError: name 'EvolutionEdge' is not defined`

- [ ] **Step 7: Write minimal implementation**

```python
# Add to pipeline/evolution_models.py

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
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_evolution_edge_creation -v
```
Expected: `PASSED`

- [ ] **Step 9: Commit**

```bash
git add pipeline/evolution_models.py tests/test_evolution_models.py
git commit -m "feat: add TopicNode and EvolutionEdge models"
```

---

### Task 2: GraphMetrics and GraphAnomaly Models

- [ ] **Step 1: Write failing test for GraphMetrics**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_evolution_models.py::test_graph_metrics -v
```
Expected: `NameError: name 'GraphMetrics' is not defined`

- [ ] **Step 3: Write minimal implementation**

```python
# Add to pipeline/evolution_models.py

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_graph_metrics -v
```
Expected: `PASSED`

- [ ] **Step 5: Write failing test for GraphAnomaly**

```python
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
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pytest tests/test_evolution_models.py::test_graph_anomaly -v
```
Expected: `NameError: name 'GraphAnomaly' is not defined`

- [ ] **Step 7: Write minimal implementation**

```python
# Add to pipeline/evolution_models.py
from typing import Any, Dict

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
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_graph_anomaly -v
```
Expected: `PASSED`

- [ ] **Step 9: Commit**

```bash
git add pipeline/evolution_models.py tests/test_evolution_models.py
git commit -m "feat: add GraphMetrics and GraphAnomaly models"
```

---

### Task 3: EvolutionGraph and EvolutionHypothesis Models

- [ ] **Step 1: Write failing test for EvolutionGraph**

```python
def test_evolution_graph():
    from pipeline.evolution_models import EvolutionGraph
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_evolution_models.py::test_evolution_graph -v
```

- [ ] **Step 3: Write minimal implementation**

```python
# Add to pipeline/evolution_models.py

class EvolutionGraph(BaseModel):
    version: str
    generated_at: str
    domain: str
    nodes: List[TopicNode]
    edges: List[EvolutionEdge]
    metrics: GraphMetrics
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_evolution_graph -v
```
Expected: `PASSED`

- [ ] **Step 5: Write failing test for EvolutionHypothesis**

```python
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
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pytest tests/test_evolution_models.py::test_evolution_hypothesis -v
```

- [ ] **Step 7: Write minimal implementation**

```python
# Add to pipeline/evolution_models.py

class RuleSuggestion(BaseModel):
    rule_name: str
    suggested_change: str
    expected_effect: str  # "expand" | "shrink" | "shift" | "new_pattern"


class ValidationDesign(BaseModel):
    target_tree_path: str
    time_window: List[str]
    positive_case_criteria: str
    negative_case_criteria: str


class ValidationResult(BaseModel):
    status: str  # "pending" | "running" | "passed" | "failed"
    tested_at: Optional[str] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    new_events_found: Optional[int] = None
    f1_change: Optional[float] = None


class EvolutionHypothesis(BaseModel):
    hypothesis_id: str
    generated_at: str
    source_anomaly: str
    domain: str
    statement: str
    rule_suggestion: RuleSuggestion
    validation_design: ValidationDesign
    validation_result: Optional[ValidationResult] = None
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pytest tests/test_evolution_models.py::test_evolution_hypothesis -v
```
Expected: `PASSED`

- [ ] **Step 9: Run all model tests**

```bash
pytest tests/test_evolution_models.py -v
```
Expected: All 6 tests PASSED

- [ ] **Step 10: Commit**

```bash
git add pipeline/evolution_models.py tests/test_evolution_models.py
git commit -m "feat: add EvolutionGraph and EvolutionHypothesis models"
```

---

## Chunk 2: Graph Builder

**Files:**
- Create: `pipeline/evolution_graph_builder.py`
- Create: `tests/test_evolution_graph_builder.py`

**Goal:** Build evolution graph from cases JSON

---

### Task 4: Graph Builder Core

- [ ] **Step 1: Write failing test for loading cases**

```python
# tests/test_evolution_graph_builder.py
import json
import tempfile
import os
from pathlib import Path


def test_load_evolution_cases():
    from pipeline.evolution_graph_builder import load_evolution_cases

    # Create temp file with test data
    test_cases = {
        "version": "1.0",
        "cases": [
            {
                "case_id": "test-001",
                "anchor_topic_id": "global_1",
                "anchor_topic_name": "Test Topic",
                "category": "math",
                "start_period": "2025-02",
                "event_types": ["emerged"]
            }
        ]
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_cases, f)
        temp_path = f.name

    try:
        cases = load_evolution_cases(temp_path)
        assert len(cases) == 1
        assert cases[0]["case_id"] == "test-001"
    finally:
        os.unlink(temp_path)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_evolution_graph_builder.py::test_load_evolution_cases -v
```

- [ ] **Step 3: Write minimal implementation**

```python
# pipeline/evolution_graph_builder.py
import json
from pathlib import Path
from typing import List, Dict, Any


def load_evolution_cases(cases_path: str) -> List[Dict[str, Any]]:
    """Load evolution cases from JSON file."""
    with open(cases_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get("cases", [])
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_graph_builder.py::test_load_evolution_cases -v
```
Expected: `PASSED`

- [ ] **Step 5: Write failing test for building nodes**

```python
def test_build_topic_nodes():
    from pipeline.evolution_graph_builder import build_topic_nodes
    from pipeline.evolution_models import TopicMode

    cases = [
        {
            "anchor_topic_id": "global_1",
            "anchor_topic_name": "Topic A",
            "category": "math",
            "start_period": "2025-02",
            "anchor_topic_mode": "theory",
            "anchor_topic_profile": {
                "primary_mode": "theory",
                "method_score": 0,
                "problem_score": 0,
                "theory_score": 3
            }
        }
    ]

    nodes = build_topic_nodes(cases, ["2025-02"])
    assert len(nodes) == 1
    assert nodes[0].topic_id == "global_1"
    assert nodes[0].mode == TopicMode.theory
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pytest tests/test_evolution_graph_builder.py::test_build_topic_nodes -v
```

- [ ] **Step 7: Write minimal implementation**

```python
# Add to pipeline/evolution_graph_builder.py
from pipeline.evolution_models import TopicNode, TopicMode


def build_topic_nodes(cases: List[Dict], periods: List[str]) -> List[TopicNode]:
    """Build topic nodes from cases for given periods."""
    nodes = []

    for case in cases:
        topic_id = case["anchor_topic_id"]
        name = case["anchor_topic_name"]
        category = case["category"]

        # Get mode from profile
        mode_str = case.get("anchor_topic_mode", "hybrid")
        try:
            mode = TopicMode(mode_str)
        except ValueError:
            mode = TopicMode.hybrid

        # Create one node per period
        for period in periods:
            node = TopicNode(
                id=f"{topic_id}@{period}",
                topic_id=topic_id,
                period=period,
                name=name,
                category=category,
                mode=mode,
                paper_count=0,  # Will be populated from detailed data
                embedding=[]    # Will be populated from detailed data
            )
            nodes.append(node)

    return nodes
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pytest tests/test_evolution_graph_builder.py::test_build_topic_nodes -v
```
Expected: `PASSED`

- [ ] **Step 9: Commit**

```bash
git add pipeline/evolution_graph_builder.py tests/test_evolution_graph_builder.py
git commit -m "feat: add graph builder with case loading and node building"
```

---

## Chunk 3: Graph Analytics (Anomaly Detection)

**Files:**
- Create: `pipeline/evolution_graph_analytics.py`
- Create: `tests/test_evolution_graph_analytics.py`

**Goal:** Detect anomalies in evolution graph

---

### Task 5: Anomaly Detection - Isolated Clusters

- [ ] **Step 1: Write failing test for detecting isolated clusters**

```python
# tests/test_evolution_graph_analytics.py
def test_detect_isolated_clusters():
    from pipeline.evolution_graph_analytics import detect_isolated_clusters
    from pipeline.evolution_models import TopicNode, TopicMode

    # Create disconnected nodes
    nodes = [
        TopicNode(id="t1@2025-02", topic_id="t1", period="2025-02",
                  name="Connected A", category="math", mode=TopicMode.theory,
                  paper_count=10, embedding=[]),
        TopicNode(id="t2@2025-02", topic_id="t2", period="2025-02",
                  name="Connected B", category="math", mode=TopicMode.theory,
                  paper_count=10, embedding=[]),
        TopicNode(id="t3@2025-02", topic_id="t3", period="2025-02",
                  name="Isolated", category="math", mode=TopicMode.theory,
                  paper_count=5, embedding=[]),
    ]

    # Only t1-t2 connected
    edges = [
        EvolutionEdge(
            id="e1", source="t1@2025-02", target="t2@2025-02",
            relation_type=RelationType.continued, confidence=0.9,
            rule_triggered=["test"],
            evidence=EdgeEvidence(shared_terms=[], cosine_similarity=0.8, temporal_gap=0)
        )
    ]

    anomalies = detect_isolated_clusters(nodes, edges, min_cluster_size=1)
    assert len(anomalies) == 1
    assert anomalies[0].type == AnomalyType.isolated_cluster
    assert "t3@2025-02" in anomalies[0].location["nodes"]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_evolution_graph_analytics.py::test_detect_isolated_clusters -v
```

- [ ] **Step 3: Write minimal implementation**

```python
# pipeline/evolution_graph_analytics.py
import networkx as nx
from typing import List
from pipeline.evolution_models import (
    TopicNode, EvolutionEdge, GraphAnomaly, AnomalyType, Severity
)


def detect_isolated_clusters(
    nodes: List[TopicNode],
    edges: List[EvolutionEdge],
    min_cluster_size: int = 3
) -> List[GraphAnomaly]:
    """Detect isolated clusters in the graph."""
    # Build NetworkX graph
    G = nx.Graph()
    for node in nodes:
        G.add_node(node.id, category=node.category)
    for edge in edges:
        G.add_edge(edge.source, edge.target)

    anomalies = []
    connected_components = list(nx.connected_components(G))

    # Find the largest component
    if not connected_components:
        return anomalies

    largest_component = max(connected_components, key=len)

    # Report smaller components as anomalies
    for i, component in enumerate(connected_components):
        if component != largest_component and len(component) >= min_cluster_size:
            # Get category from first node
            node_id = list(component)[0]
            category = G.nodes[node_id].get("category", "unknown")

            anomaly = GraphAnomaly(
                anomaly_id=f"ANM-ISOLATED-{i:03d}",
                type=AnomalyType.isolated_cluster,
                location={
                    "nodes": list(component),
                    "category": category
                },
                severity=Severity.medium if len(component) < 5 else Severity.high,
                context={}
            )
            anomalies.append(anomaly)

    return anomalies
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_graph_analytics.py::test_detect_isolated_clusters -v
```
Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add pipeline/evolution_graph_analytics.py tests/test_evolution_graph_analytics.py
git commit -m "feat: add isolated cluster anomaly detection"
```

---

## Chunk 4: State Manager (Git-based)

**Files:**
- Create: `pipeline/evolution_state_manager.py`
- Create: `tests/test_evolution_state_manager.py`

**Goal:** Manage experiment state with Git

---

### Task 6: State Manager Core

- [ ] **Step 1: Write failing test for branch creation**

```python
# tests/test_evolution_state_manager.py
import tempfile
import os
from git import Repo


def test_create_branch():
    from pipeline.evolution_state_manager import StateManager

    # Create temp git repo
    with tempfile.TemporaryDirectory() as tmpdir:
        repo = Repo.init(tmpdir)
        # Create initial commit
        with open(os.path.join(tmpdir, "init.txt"), "w") as f:
            f.write("init")
        repo.index.add(["init.txt"])
        repo.index.commit("Initial commit")

        sm = StateManager(tmpdir)
        branch_name = sm.create_branch("math", 1)

        assert branch_name == "evolution/math-001"
        assert branch_name in [b.name for b in repo.branches]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_evolution_state_manager.py::test_create_branch -v
```

- [ ] **Step 3: Write minimal implementation**

```python
# pipeline/evolution_state_manager.py
import json
import os
from pathlib import Path
from git import Repo
from typing import Dict, List, Optional


class StateManager:
    """Git-based state management for evolution experiments."""

    def __init__(self, repo_path: str):
        self.repo = Repo(repo_path)
        self.repo_path = Path(repo_path)
        self.sequence_file = self.repo_path / ".evolution" / "sequence.json"

    def _load_sequence(self) -> Dict[str, int]:
        """Load domain sequence counters."""
        if self.sequence_file.exists():
            with open(self.sequence_file, 'r') as f:
                return json.load(f)
        return {}

    def _save_sequence(self, sequence: Dict[str, int]):
        """Save domain sequence counters."""
        self.sequence_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.sequence_file, 'w') as f:
            json.dump(sequence, f)

    def create_branch(self, domain: str, sequence: Optional[int] = None) -> str:
        """Create a new experiment branch."""
        sequences = self._load_sequence()

        if sequence is None:
            sequence = sequences.get(domain, 0) + 1

        branch_name = f"evolution/{domain}-{sequence:03d}"

        # Create branch from current HEAD
        current = self.repo.head.reference
        new_branch = self.repo.create_head(branch_name, current)
        new_branch.checkout()

        # Update sequence
        sequences[domain] = sequence
        self._save_sequence(sequences)

        return branch_name
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_evolution_state_manager.py::test_create_branch -v
```
Expected: `PASSED`

- [ ] **Step 5: Write failing test for commit and reset**

```python
def test_commit_and_reset():
    from pipeline.evolution_state_manager import StateManager

    with tempfile.TemporaryDirectory() as tmpdir:
        repo = Repo.init(tmpdir)
        with open(os.path.join(tmpdir, "init.txt"), "w") as f:
            f.write("init")
        repo.index.add(["init.txt"])
        initial_commit = repo.index.commit("Initial commit")

        sm = StateManager(tmpdir)
        sm.create_branch("math", 1)

        # Make a change
        with open(os.path.join(tmpdir, "test.txt"), "w") as f:
            f.write("test content")

        # Commit
        commit_hash = sm.commit("Test commit", ["test.txt"])
        assert commit_hash is not None
        assert "test.txt" in repo.head.commit.stats.files

        # Reset
        sm.reset(initial_commit.hexsha)
        assert repo.head.commit == initial_commit
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pytest tests/test_evolution_state_manager.py::test_commit_and_reset -v
```

- [ ] **Step 7: Write minimal implementation**

```python
# Add to pipeline/evolution_state_manager.py

    def commit(self, message: str, files: List[str]) -> str:
        """Commit changes to current branch."""
        # Add files
        for file in files:
            file_path = self.repo_path / file
            if file_path.exists():
                self.repo.index.add([file])

        # Commit
        commit = self.repo.index.commit(message)
        return commit.hexsha[:7]

    def reset(self, to_ref: str):
        """Hard reset to reference."""
        self.repo.head.reset(to_ref, index=True, working_tree=True)
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pytest tests/test_evolution_state_manager.py::test_commit_and_reset -v
```
Expected: `PASSED`

- [ ] **Step 9: Commit**

```bash
git add pipeline/evolution_state_manager.py tests/test_evolution_state_manager.py
git commit -m "feat: add git-based state manager for experiments"
```

---

## Chunk 5: Integration and Main Loop

**Files:**
- Create: `pipeline/evolution_loop.py`
- Modify: `Makefile` (add evolution commands)

**Goal:** Wire everything together into autonomous loop

---

### Task 7: Main Loop Structure

- [ ] **Step 1: Write integration test**

```python
# tests/test_evolution_integration.py
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
```

- [ ] **Step 2: Run test to verify it passes**

```bash
pytest tests/test_evolution_integration.py::test_full_loop_skeleton -v
```
Expected: `PASSED`

- [ ] **Step 3: Create main loop file**

```python
# pipeline/evolution_loop.py
"""
Topic Evolution Autonomous Analysis Loop

Usage:
    python -m pipeline.evolution_loop --domain=math --config=config/evolution_domains/math.yaml
"""
import argparse
import json
from pathlib import Path
from typing import Optional

from pipeline.evolution_models import EvolutionGraph, GraphMetrics
from pipeline.evolution_graph_builder import load_evolution_cases, build_topic_nodes
from pipeline.evolution_graph_analytics import detect_isolated_clusters
from pipeline.evolution_state_manager import StateManager


def build_graph(cases_path: str, domain: str, periods: list) -> EvolutionGraph:
    """Build evolution graph from cases."""
    cases = load_evolution_cases(cases_path)
    nodes = build_topic_nodes(cases, periods)

    # TODO: Build edges from cases
    edges = []

    # Calculate basic metrics
    metrics = GraphMetrics(
        total_nodes=len(nodes),
        total_edges=len(edges),
        connected_components=0,  # TODO: Calculate
        largest_component_ratio=0.0,
        average_path_length=0.0,
        clustering_coefficient=0.0,
        temporal_consistency=0.0
    )

    from datetime import datetime
    return EvolutionGraph(
        version="1.0",
        generated_at=datetime.now().isoformat(),
        domain=domain,
        nodes=nodes,
        edges=edges,
        metrics=metrics
    )


def main():
    parser = argparse.ArgumentParser(description="Evolution Analysis Loop")
    parser.add_argument("--domain", required=True, help="Domain to analyze")
    parser.add_argument("--config", help="Domain config file")
    parser.add_argument("--cases", default="data/output/evolution_cases.json",
                        help="Path to evolution cases")
    parser.add_argument("--periods", nargs="+",
                        default=["2025-02", "2025-03", "2025-04", "2025-05"],
                        help="Time periods to analyze")

    args = parser.parse_args()

    # Build graph
    graph = build_graph(args.cases, args.domain, args.periods)

    # Save graph
    output_dir = Path("data/output/evolution_graphs")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"{args.domain}_graph.json"
    with open(output_path, 'w') as f:
        f.write(graph.json(indent=2, ensure_ascii=False))

    print(f"Graph built: {len(graph.nodes)} nodes, {len(graph.edges)} edges")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Test the main loop**

```bash
cd academic-trend-monitor
python -m pipeline.evolution_loop --domain=math --periods 2025-02 2025-03
```
Expected: Creates `data/output/evolution_graphs/math_graph.json`

- [ ] **Step 5: Add Makefile targets**

```makefile
# Add to Makefile

# Evolution Analysis Loop
GRAPH_OUTPUT_DIR=data/output/evolution_graphs

evolution-graph:
	@mkdir -p $(GRAPH_OUTPUT_DIR)
	python -m pipeline.evolution_loop \
		--domain=math \
		--config=config/evolution_domains/math.yaml \
		--cases=data/output/evolution_cases.json

evolution-analytics:
	python -m pipeline.evolution_analytics \
		--graph=$(GRAPH_OUTPUT_DIR)/math_graph.json \
		--output=data/output/evolution_anomalies.json

evolution-loop:
	python -m pipeline.evolution_loop --mode=autonomous --domain=math

evolution-test:
	pytest tests/test_evolution_*.py -v
```

- [ ] **Step 6: Test Makefile targets**

```bash
make evolution-test
```
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add pipeline/evolution_loop.py tests/test_evolution_integration.py Makefile
git commit -m "feat: add evolution main loop and makefile targets"
```

---

## Plan Complete

**Next Steps:**
1. Execute this plan using `superpowers:subagent-driven-development`
2. After implementation, run `make evolution-test` to verify
3. Test with real data: `make evolution-graph`
4. Review generated graph and anomalies

**Plan saved to:** `docs/superpowers/plans/2026-03-16-topic-evolution-autonomous-analysis.md`

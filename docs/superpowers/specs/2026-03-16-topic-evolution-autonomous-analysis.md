---
doc_type: "spec"
scope: "topic evolution autonomous analysis system - B+C integration"
status: "draft"
owner: "academic-trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/superpowers/specs/2026-03-12-evolution-delegation-plugin-design.md"
  - "docs/plans/2026-03-12-evolution-task-template.md"
downstream_docs: []
last_reviewed: "2026-03-16"
---

# Topic Evolution Autonomous Analysis System

## 1. Overview

### 1.1 Purpose

This document specifies the **Topic Evolution Autonomous Analysis System**, a self-improving research engine that combines:

- **Hypothesis Validation (B)**: Automatically generate and validate evolution hypotheses from graph anomalies
- **Graph Construction (C)**: Build and incrementally update topic evolution graphs

The system applies Karpathy's autoresearch methodology to academic topic evolution analysis, creating a reusable, domain-agnostic workflow.

### 1.2 Core Philosophy

> **Reusable Workflow > Single Analysis Result**

The system is designed as a "self-improving machine" that:
1. Detects structural anomalies in topic evolution graphs
2. Generates hypotheses to explain/fix anomalies
3. Validates hypotheses on historical data
4. Keeps improvements, discards failures
5. Repeats indefinitely

### 1.3 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Graph Coverage | >80% topics connected | Connected component analysis |
| Event Precision | >70% confirmed | Human sampling |
| Hypothesis Hit Rate | >50% validated | Experiment logs |
| Loop Cycle Time | <30 min/iteration | Timestamp tracking |
| Domain Migration Cost | <1 day | Time to add new domain |

---

## 2. Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  /evolution-loop│  │  /graph-status  │  │  /inspect-case  │              │
│  │  start|stop     │  │  view           │  │  <topic_id>     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Autonomous Loop Engine                                  │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │  Graph Builder  │─────▶│  Graph          │─────▶│  Hypothesis     │     │
│  │  (build/update) │      │  Analytics      │      │  Generator      │     │
│  └─────────────────┘      └─────────────────┘      └────────┬────────┘     │
│          ▲                                                  │              │
│          │                                                  ▼              │
│          │                                         ┌─────────────────┐     │
│          │                                         │  Hypothesis     │     │
│          │                                         │  Validator      │     │
│          │                                         │  (replay 12mo)  │     │
│          │                                         └────────┬────────┘     │
│          │                                                  │              │
│          │         ┌─────────────────┐                      │              │
│          │         │  State Manager  │◀─────────────────────┘              │
│          │         │  (Git-based)    │                                     │
│          │         │  *branch/exp    │                                     │
│          │         │  *commit/reset  │                                     │
│          │         └────────┬────────┘                                     │
│          │                  │                                              │
│          └──────────────────┘                                              │
│                    │                                                       │
│                    ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      Decision Gate                                  │  │
│  │  IF new_events > threshold AND precision > baseline: COMMIT         │  │
│  │  ELSE: RESET + GENERATE_NEW_HYPOTHESIS                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Data Layer (Immutable)                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  12mo Topic Data│  │  Evolution Rules│  │  Experiment Log │              │
│  │  (read-only)    │  │  (versioned)    │  │  (results.tsv)  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Mapping to Autoresearch

| Autoresearch | Our System | Rationale |
|--------------|------------|-----------|
| `prepare.py` (read-only) | Graph Builder + 12mo Topic Data | Historical data is fixed infrastructure |
| `train.py` (agent edits) | Evolution Rules + Hypothesis Validator | Rules are the optimization target |
| `program.md` (instructions) | Hypothesis Generator templates | Domain-specific prompt templates |
| `results.tsv` (log) | Experiment Log | Direct adoption of format |
| Git branch per experiment | State Manager | Enables rollback on failure |
| 5-min time budget | Fixed history window | Comparable experiments regardless of rule changes |

---

## 2.3 State Manager Interface

The State Manager provides Git-based state management for the autonomous loop:

```typescript
interface StateManager {
  // Branch management
  createBranch(domain: string, sequence: number): string;
  // Returns: "evolution/math-001"
  // Format: evolution/{domain}-{sequence:03d}

  getCurrentBranch(): string;
  listBranches(domain?: string): string[];

  // State operations
  commit(message: string, files: string[]): string;
  // Returns commit hash (short)

  reset(toRef: string): void;
  // Hard reset to branch or commit

  getDiffStats(): {
    files_changed: number;
    insertions: number;
    deletions: number;
  };

  // Experiment lifecycle
  startExperiment(domain: string): ExperimentContext;
  // Creates branch, returns context with branch name

  finalizeExperiment(decision: "keep" | "discard", reason: string): void;
  // If keep: commits with message, returns to main
  // If discard: resets and deletes branch
}

interface ExperimentContext {
  branch: string;
  started_at: string;
  domain: string;
  sequence: number;
}
```

**Branch Naming Convention:**
- Format: `evolution/{domain}-{sequence:03d}`
- Examples: `evolution/math-001`, `evolution/cs-042`
- Sequence is per-domain counter stored in `.evolution/sequence.json`

**Commit Message Convention:**
```
evolution/{domain}-{seq}: {action} {rule_name}

- Hypothesis: {hypothesis_id}
- Change: {change_summary}
- Result: f1={f1_score} ({f1_change:+.2f})
```

---

## 3. Data Models

### 3.1 Topic Evolution Graph

```typescript
// Node: Topic instance at specific time
interface TopicNode {
  id: string;                    // "global_1392@2025-02"
  topic_id: string;              // "global_1392"
  period: string;                // "2025-02"
  name: string;
  category: string;              // "math", "cs.AI", etc.
  mode: "method" | "problem" | "theory" | "hybrid";
  paper_count: number;
  embedding: number[];
}

// Edge: Evolution relationship
interface EvolutionEdge {
  id: string;                    // "global_1392@2025-02→global_1399@2025-03"
  source: string;                // source node id
  target: string;                // target node id
  relation_type:
    | "continued"                // Same topic across months
    | "diffused_to_neighbor"     // Diffusion to nearby topic
    | "specialized_into_child"   // Specialization
    | "merged_from"              // Merge from multiple topics
    | "migrated_to_category";    // Cross-category migration
  confidence: number;            // 0-1 based on rule match
  rule_triggered: string[];      // Triggering rule names
  evidence: {
    shared_terms: string[];
    cosine_similarity: number;
    temporal_gap: number;        // Months difference
  };
}

interface EvolutionGraph {
  version: string;
  generated_at: string;
  domain: string;                // "math", "cs", etc.
  nodes: TopicNode[];
  edges: EvolutionEdge[];
  metrics: GraphMetrics;
}
```

### 3.2 Graph Metrics

```typescript
interface GraphMetrics {
  // Basic
  total_nodes: number;
  total_edges: number;

  // Connectivity
  connected_components: number;
  largest_component_ratio: number;

  // Structure
  average_path_length: number;
  clustering_coefficient: number;

  // Temporal
  temporal_consistency: number;  // Cross-month edges ratio

  // Domain-specific (math example)
  theory_purity?: number;        // Theory topics ratio
  cross_category_edges?: number;
  subfield_migration_matrix?: Record<string, Record<string, number>>;
}
```

### 3.3 Graph Anomalies

```typescript
interface GraphAnomaly {
  anomaly_id: string;
  type:
    | "temporal_gap"             // Required: nodes, periods
    | "isolated_cluster"         // Required: nodes, category
    | "broken_lineage"           // Required: nodes (child first)
    | "unexpected_bridge"        // Required: edges, category
    | "dangling_emergence";      // Required: nodes, periods

  // Location requirements by anomaly type:
  // temporal_gap:     nodes (2+), periods (gap range)
  // isolated_cluster: nodes (cluster members), category
  // broken_lineage:   nodes [child, potential_parent1, ...]
  // unexpected_bridge: edges [the suspicious edge], category
  // dangling_emergence: nodes [emerged_topic], periods [emergence_month]
  location: {
    nodes?: string[];            // Topic node IDs, order matters for some types
    edges?: string[];            // Edge IDs
    periods?: string[];          // Time periods (YYYY-MM format)
    category?: string;           // Category context
  };

  severity: "low" | "medium" | "high";

  context: {
    similar_connected_topics?: string[];
    potential_missing_rules?: string[];
    bridge_candidates?: string[];
  };
}
```

### 3.4 Hypothesis Structure

```typescript
interface EvolutionHypothesis {
  hypothesis_id: string;
  generated_at: string;
  source_anomaly: string;
  domain: string;                // "math", "cs", etc.

  statement: string;             // Natural language description

  rule_suggestion: {
    rule_name: string;
    suggested_change: string;
    expected_effect: "expand" | "shrink" | "shift" | "new_pattern";
  };

  validation_design: {
    // Tree path format: "{category} > {subcategory} > {topic_segment}"
    // Examples:
    //   "math > math.LO > 集合论与基数理论"
    //   "cs > cs.AI > 大语言模型"
    //   "physics > hep-th > 弦理论"
    // Used to filter validation scope to relevant topic subtree
    target_tree_path: string;

    // Time periods for validation (YYYY-MM format)
    // Example: ["2025-02", "2025-03", "2025-04"]
    time_window: string[];

    positive_case_criteria: string;
    negative_case_criteria: string;
  };

  validation_result?: {
    status: "pending" | "running" | "passed" | "failed";
    tested_at?: string;
    precision?: number;
    recall?: number;
    new_events_found?: number;
    f1_change?: number;
  };
}
```

### 3.5 Experiment Log (TSV Format)

```typescript
interface ExperimentRecord {
  // Identification
  timestamp: string;             // ISO 8601
  domain: string;                // "math", "cs", etc.
  git_branch: string;            // "evolution/math-001"
  git_commit: string;            // Short hash

  // Experiment Design
  hypothesis_id: string;
  rule_changed: string;
  change_summary: string;

  // Results
  graph_metrics_before: GraphMetrics;
  graph_metrics_after: GraphMetrics;
  new_events_count: number;
  precision_change: number;
  recall_change: number;
  f1_score: number;

  // Decision
  decision: "keep" | "discard";
  reason: string;
}
```

**TSV Header:**
```
timestamp	domain	git_branch	git_commit	hypothesis_id	rule_changed	change_summary	new_events_count	precision_change	recall_change	f1_score	decision	reason
```

---

## 4. Domain Configuration

### 4.1 Configuration Structure

Domain-specific settings are isolated in YAML files:

```yaml
# config/evolution_domains/math.yaml

domain:
  name: "math"
  description: "Mathematics topics with strict theoretical lineages"

  # Data filtering
  category_filter: ["math", "math-ph", "cs.LO"]
  exclude_subcategories: []

  # Graph building parameters
  graph_params:
    temporal_window_months: 4
    min_similarity_threshold: 0.65
    max_edge_distance: 2

    # Cross-category bonus format: "{source_cat}→{target_cat}: {multiplier}"
    # - Arrow (→) is required, direction matters
    # - Categories can use wildcards: "math.*→cs.*"
    # - More specific matches override wildcards
    # - "default" applies when no pattern matches
    cross_category_bonus:
      "math.AG→math.NT": 1.2        # Exact match (highest priority)
      "math.*→math.*": 1.1          # Wildcard match (medium priority)
      "math.AT→cs.CG": 0.8          # Exact match with penalty
      "*→*": 1.0                    # Global default (lowest priority)
      "default": 1.0                # Fallback when no pattern matches

  # Anomaly detection settings
  anomaly_detection:
    enabled_types:
      - "temporal_gap"
      - "broken_lineage"
      - "unexpected_bridge"
      - "isolated_cluster"

    thresholds:
      min_gap_months: 2
      min_cluster_size: 3
      bridge_similarity_threshold: 0.5

  # Hypothesis generation templates
  hypothesis_templates:
    broken_lineage:
      - "Does {ancestor_topic} conceptually precede {descendant_topic}?"
      - "Is there a missing link between {theory_topic} and {related_theory}?"

    unexpected_bridge:
      - "Can {algebraic_topic} methods apply to {analytic_problem}?"
      - "Is there a hidden connection between {pure_topic} and {applied_topic}?"

    temporal_gap:
      - "Was {classical_theory} revived by {new_tool}?"
      - "Did {topic} re-emerge with {modern_approach}?"

  # Validation requirements
  validation:
    min_positive_cases: 2
    min_negative_cases: 2
    required_precision: 0.70
    required_recall: 0.60
    max_iterations: 100

  # Delegation threshold for autonomous loop → plugin
  # Complexity formula considers:
  #   - severity weight: high=3, medium=2, low=1
  #   - node_count: number of affected nodes
  #   - cross_domain: 2 if spans multiple domains, 1 otherwise
  # complexity = severity_weight * sqrt(node_count) * cross_domain
  delegation_threshold:
    complexity_threshold: 6.0       # If complexity >= 6, delegate to plugin
    always_delegate_types:          # Always delegate these anomaly types
      - "unexpected_bridge"
    never_delegate_types:           # Never delegate (autonomous only)
      - "temporal_gap"
```

### 4.2 Domain Migration Guide

To add a new domain (e.g., "cs"):

**Step 1: Copy and modify config**
```bash
cp config/evolution_domains/math.yaml config/evolution_domains/cs.yaml
# Edit: category_filter, thresholds, templates
```

**Step 2: Prepare data**
```bash
# Ensure data/output/cs_evolution_cases.json exists
# Run: make evolution-analysis DOMAIN=cs
```

**Step 3: Start domain-specific loop**
```bash
/evolution-loop start --domain=cs
```

**No code changes required!**

---

## 5. Integration with Existing Systems

### 5.1 Evolution Delegation Plugin Integration

```
┌─────────────────────────────────────────────────────────────┐
│              evolution_delegation_plugin                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │/delegate-evolution│ │/case-worker   │ │/rule-worker   │      │
│  │(manual tasks) │ │(find cases)   │ │(modify rules) │      │
│  └───────┬───────┘ └───────────────┘ └───────────────┘      │
│          │                                                   │
│          │  "Complex anomaly detected"                       │
│          │  "Human review required"                          │
│          ▼                                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           evolution_autonomous_loop                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Autonomous Agent (runs continuously)           │  │  │
│  │  │    while (running) {                            │  │  │
│  │  │      anomalies = detect_anomalies(graph)        │  │  │
│  │  │      for (anomaly in anomalies) {               │  │  │
│  │  │        if (complexity > threshold) {            │  │  │
│  │  │          delegate_to_plugin(anomaly)            │  │  │
│  │  │          continue                               │  │  │
│  │  │        }                                        │  │  │
│  │  │        hypothesis = generate_hypothesis(anomaly)│  │  │
│  │  │        result = validate(hypothesis)            │  │  │
│  │  │        if (result.improved) commit()            │  │  │
│  │  │        else reset()                             │  │  │
│  │  │      }                                          │  │  │
│  │  │    }                                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Workflow Modes

**Mode 1: Autonomous (Default)**
- Runs during off-hours (night/weekend)
- Handles simple anomalies automatically
- Delegates complex cases to plugin
- Logs all experiments

**Mode 2: Supervised**
- Human triggers via `/delegate-evolution`
- Precise control over critical changes
- Uses plugin's case/rule/doc workers
- Suitable for high-stakes modifications

**Mode 3: Hybrid (Recommended)**
- Autonomous loop discovers opportunities
- Flags interesting findings for human review
- Human decides which hypotheses to pursue
- Combines efficiency with control

---

## 6. File Structure

```
academic-trend-monitor/
├── config/
│   └── evolution_domains/
│       ├── math.yaml              # Math domain config
│       ├── cs.yaml                # CS domain config (future)
│       └── physics.yaml           # Physics domain config (future)
├── pipeline/
│   ├── evolution_analysis.py      # Existing: rule implementations
│   ├── evolution_graph_builder.py # NEW: build/update graphs
│   ├── evolution_graph_analytics.py # NEW: detect anomalies
│   ├── evolution_hypothesis_generator.py # NEW: generate hypotheses
│   └── evolution_hypothesis_validator.py # NEW: validate on history
├── .claude/skills/                # NEW: Claude Code slash commands
│   ├── evolution-loop.md          # /evolution-loop command
│   ├── evolution-graph-status.md  # /graph-status command
│   └── evolution-inspect.md       # /inspect-case command
├── data/output/
│   ├── evolution_cases.json       # Existing: input cases
│   ├── evolution_graphs/
│   │   └── math_graph.json        # NEW: generated graphs
│   └── evolution_experiments.tsv  # NEW: experiment log
└── tests/
    ├── test_evolution_graph.py    # NEW: graph tests
    └── test_evolution_loop.py     # NEW: loop tests
```

---

## 7. Implementation Phases

**Prerequisites (Before Phase 1):**
- [ ] 12-month topic data exists: `data/output/evolution_cases.json`
- [ ] Math domain has minimum 50 cases with events
- [ ] Existing evolution rules in `pipeline/evolution_analysis.py`
- [ ] Git repository initialized with clean main branch

**Timeline:** Calendar weeks, assuming 1 full-time developer

### Phase 1: Core Engine (Week 1)
**Goal:** Build and analyze graphs autonomously

**Deliverables:**
- `pipeline/evolution_graph_builder.py` - Build from cases
- `pipeline/evolution_graph_analytics.py` - Detect basic anomalies
- `pipeline/evolution_state_manager.py` - Git operations
- `config/evolution_domains/math.yaml` - Math domain config

**Validation:**
- [ ] Graph builds without errors from 12mo data
- [ ] Anomalies detected match manual inspection
- [ ] State Manager creates/commits/resets branches correctly

### Phase 2: Hypothesis System (Week 2)
**Goal:** Generate and validate hypotheses

**Deliverables:**
- `pipeline/evolution_hypothesis_generator.py` - Templates → hypotheses
- `pipeline/evolution_hypothesis_validator.py` - Replay on history
- `pipeline/evolution_decision_gate.py` - Keep/discard logic
- `data/output/evolution_experiments.tsv` - Experiment log

**Validation:**
- [ ] Hypotheses generated from all anomaly types
- [ ] Validation runs successfully on historical data
- [ ] Decision gate correctly evaluates experiments

### Phase 3: Integration (Week 3)
**Goal:** User interface and plugin integration

**Deliverables:**
- `.claude/skills/evolution-loop.md` - /evolution-loop command
- `.claude/skills/evolution-graph-status.md` - /graph-status command
- `.claude/skills/evolution-inspect.md` - /inspect-case command
- Plugin integration hooks in `pipeline/evolution_delegation.py`
- Graph visualization in frontend

**Validation:**
- [ ] Slash commands work in Claude Code
- [ ] Autonomous loop delegates complex cases to plugin
- [ ] Graph visualization displays correctly

### Phase 4: Domain Expansion (Week 4)
**Goal:** Validate domain-agnostic design

**Deliverables:**
- `config/evolution_domains/cs.yaml` - CS domain config
- Migration guide documentation
- Performance benchmarks
- Final system documentation

**Validation:**
- [ ] CS domain configured in <1 day
- [ ] CS graph builds and analyzes correctly
- [ ] Performance meets <30min/iteration target

---

## 8. Success Metrics & Testing

### 8.1 Automated Tests

```bash
# Unit tests
pytest tests/test_evolution_graph.py
pytest tests/test_evolution_analytics.py
pytest tests/test_hypothesis_generator.py

# Integration tests
pytest tests/test_evolution_loop.py

# Domain-specific tests
pytest tests/test_evolution_math.py
```

### 8.2 Manual Validation Checklist

- [ ] Graph builds without errors from 12mo data
- [ ] Anomalies are meaningful (not noise)
- [ ] Hypotheses are actionable
- [ ] Validation results are reproducible
- [ ] Git state management works correctly
- [ ] Experiment log is human-readable
- [ ] Domain migration takes <1 day

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Graph too dense | Performance | Configurable similarity thresholds |
| False positive anomalies | Wasted work | Human review for "high" severity |
| Git conflicts | State corruption | Branch naming convention with timestamps |
| Domain config drift | Inconsistency | Versioned configs with schema validation |
| Loop runs forever | Resource waste | Max iterations + human kill switch |
| Storage growth | Disk full | Data retention policy (see below) |

### 9.1 Data Retention Policy

**Experiment Branches:**
- Keep: All `keep` branches (successful experiments)
- Keep: Last 10 `discard` branches per domain (for analysis)
- Delete: Older `discard` branches (automated cleanup monthly)

**Experiment Log (TSV):**
- Rotate monthly: `evolution_experiments_2026-03.tsv`
- Archive quarterly to `data/archive/`
- Keep 2 years of detailed logs, aggregate older

**Graph Snapshots:**
- Keep: Latest graph per domain
- Keep: Graph at each `keep` experiment commit
- Delete: Intermediate graph states

**Cleanup Command:**
```bash
make evolution-cleanup [--domain=math] [--dry-run]
```

---

## 10. Appendix: Example Execution

### Scenario: Math Domain Broken Lineage

**Step 1: Graph Analytics detects anomaly**
```json
{
  "anomaly_id": "ANM-001",
  "type": "broken_lineage",
  "location": {
    "nodes": ["global_167@2025-02", "global_5@2025-04"],
    "category": "math"
  },
  "severity": "high",
  "context": {
    "similar_connected_topics": ["global_117"],
    "potential_missing_rules": ["math_definability_continuity"]
  }
}
```

**Step 2: Hypothesis Generator creates hypothesis**
```json
{
  "hypothesis_id": "HYP-001",
  "statement": "法诺簇模空间曲线 (global_167) 应该通过 definability_continuity 规则连接到卢斯蒂格代数上同调 (global_5)",
  "rule_suggestion": {
    "rule_name": "math_lo_definability_continuity",
    "suggested_change": "放宽 shared_terms 阈值从3到2",
    "expected_effect": "expand"
  }
}
```

**Step 3: Validator runs on history**
```bash
git checkout -b evolution/math-001
# Modify rule threshold
make evolution-analysis DOMAIN=math
# Compare results
```

**Step 4: Decision Gate evaluates**
```
Before: precision=0.65, recall=0.70, f1=0.67
After:  precision=0.70, recall=0.72, f1=0.71 (+0.04)
New events: +5
Decision: KEEP
```

**Step 5: State Manager commits**
```bash
git commit -m "evolution/math-001: relax definability threshold for broken lineage"
# Log to results.tsv
```

---

*End of Specification*

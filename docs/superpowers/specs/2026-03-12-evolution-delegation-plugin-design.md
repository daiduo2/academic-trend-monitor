# Evolution Delegation Plugin Design

doc_type: "spec"
scope: "evolution-analysis skills and plugin architecture"
status: "draft"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-12-evolution-skills-design.md"
  - "docs/plans/2026-03-12-math-worker-backlog.md"
downstream_docs: []
last_reviewed: "2026-03-12"

---

## 1. Overview

### 1.1 Purpose

This document specifies the **Evolution Delegation Plugin**, a structured execution framework for `trend-monitor` evolution-analysis tasks. The plugin provides:

- **4 specialized skills**: `/delegate-evolution`, `/case-worker`, `/rule-worker`, `/doc-worker`
- **Hard guardrails**: Prevent weak models from over-expanding task boundaries
- **Completion enforcement**: Every task must pass Claude review and create git commit
- **Status protection**: Prevent premature upgrades (partial → ready, bridge-level → event-level)

### 1.2 Problem Statement

Current pain points in evolution-analysis workflow:

1. **Task boundary expansion** - Weak models attempt to do case + rule + doc simultaneously
2. **Premature status upgrades** - Bridge-level rules incorrectly marked as `ready`
3. **Synthetic case pollution** - Unit tests mixed into real benchmark documentation
4. **Completion gaps** - Tasks finish without git commit or proper review

### 1.3 Solution Approach

**Two-layer architecture**:

```
┌─────────────────────────────────────────┐
│  Plugin Layer (Hard Constraints)        │
│  - Slash command routing                │
│  - Task template injection              │
│  - Guardrail enforcement                │
│  - Completion checklist                 │
├─────────────────────────────────────────┤
│  Skills Layer (Execution Logic)         │
│  - /delegate-evolution (dispatcher)     │
│  - /case-worker (find cases)            │
│  - /rule-worker (modify rules)          │
│  - /doc-worker (update docs)            │
└─────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 Component Diagram

```
User Input
    │
    ▼
┌─────────────────┐
│  Plugin Router  │───Parse YAML frontmatter
│  (slash command)│───Validate input
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Task Package   │────▶│  Guardrails     │───Check constraints
│  (injected)     │     │  (config/*.yaml)│
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Skill Worker   │───Execute with self-check
│  (case/rule/doc)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Return to      │────▶│  Delegate       │───Final validation
│  Delegate       │     │  Review         │
└─────────────────┘     └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Output +       │───Git commit
                         │  Completion     │
                         └─────────────────┘
```

### 2.2 File Structure

```
~/.claude/plugins/evolution-delegation/
├── plugin.yaml                    # Plugin metadata
├── config/
│   ├── guardrails.yaml           # Constraint rules
│   └── templates.yaml            # Task package templates
├── skills/                       # Skill definitions
│   ├── delegate-evolution.md
│   ├── case-worker.md
│   ├── rule-worker.md
│   └── doc-worker.md
└── validators/                   # Guardrail validators
    ├── case_validator.py
    ├── rule_validator.py
    └── doc_validator.py

~/.claude/skills/                 # Symlinks to plugin skills/
├── delegate-evolution.md ────────┐
├── case-worker.md                │ (symlinks)
├── rule-worker.md                │
└── doc-worker.md ────────────────┘
```

**File Type Interaction**:

| Directory | File Type | Purpose | Loaded By |
|-----------|-----------|---------|-----------|
| `skills/` | `.md` | Skill definition (human-readable constraints, I/O schema) | Claude Code skill system |
| `config/` | `.yaml` | Configuration (guardrails, templates) | Plugin at startup |
| `validators/` | `.py` | Guardrail validation logic (Python functions) | Plugin when running guardrails |

**Interaction Flow**:
1. User invokes `/delegate-evolution` → Claude loads `skills/delegate-evolution.md`
2. Plugin parses YAML frontmatter → Loads `config/guardrails.yaml`
3. Plugin routes to worker → Worker loads corresponding `skills/*-worker.md`
4. Worker completes task → Plugin runs `validators/*.py` for guardrail checks
5. Validation passes → Output returned to user

---

## 3. Skills Specification

### 3.1 /delegate-evolution

**Purpose**: Entry point for all evolution-analysis tasks. Routes to appropriate worker and enforces completion.

**Input Schema**:
```yaml
---
tree_path: string                 # e.g., "math > math.LO" (required)
task_type: enum                   # case_update | rule_update | doc_update | status_cleanup (required)
target_rule: string               # e.g., "math_lo_forcing_continuity" (required)
goal: string                      # Human-readable task description (required)
priority: enum                    # high | medium | low (default: medium)
positive_case_hint: string        # Optional hint for case-worker
negative_case_hint: string        # Optional hint for case-worker
---
```

**Task Type to Worker Mapping**:
| task_type | Assigned Worker | Description |
|-----------|-----------------|-------------|
| case_update | case-worker | Find positive/negative/ambiguous cases |
| rule_update | rule-worker | Modify rule implementation and tests |
| doc_update | doc-worker | Update documentation (registry, review, benchmark) |
| status_cleanup | doc-worker | Clean up status inconsistencies (special case of doc_update) |

**Execution Flow**:
1. Parse input YAML frontmatter
2. Load matching task package from `math-worker-backlog.md`
3. Determine `assigned_worker` based on `task_type`
4. Inject task template with constraints
5. Delegate to worker
6. Receive worker output
7. Run guardrail validation
8. Output result with completion status

**Output Schema**:
```yaml
---
assigned_worker: string
validation_passed: boolean
guardrails_check:
  - item: string
    status: pass | fail | warn
completion_status:
  - claude_review: pending | done
  - git_commit: pending | done
---
```

### 3.2 /case-worker

**Purpose**: Find positive, negative, and ambiguous cases for evolution rules.

**Input Schema** (injected by delegate):
```yaml
---
tree_path: string
target_rule: string
positive_case_hint: string
negative_case_hint: string
allowed_files:
  - "docs/plans/*-benchmark.md"
  - "docs/plans/*-review.md"
forbidden_operations:
  - "修改 pipeline/evolution_analysis.py"
  - "升级规则状态 partial->ready"
  - "将 synthetic case 写入 benchmark"
---
```

**Success Criteria**:
- [ ] At least 1 positive case identified from real data
- [ ] At least 1 negative case identified from real data
- [ ] Cases clearly distinguish rule boundary

**Self-Check List** (worker must confirm):
```yaml
worker_self_check:
  - "找到的是真实数据中的 case，而非 synthetic"
  - "positive 和 negative 区分了规则边界"
  - "case 与目标规则明确相关"
```

**Output Schema**:
```yaml
---
candidate_positive_cases:          # Required: at least 1 item
  - case_id: string                # Required: unique identifier
    anchor: string                 # Required: anchor topic ID
    target: string                 # Required: target topic ID
    shared_terms: [string]         # Required: shared terms that trigger rule
    level: enum                    # Required: bridge-level | event-level
    note: string                   # Optional: additional context
candidate_negative_cases:          # Required: at least 1 item
  - case_id: string                # Required: unique identifier
    anchor: string                 # Required: anchor topic ID
    target: string                 # Required: target topic ID
    reason: string                 # Required: why this should NOT trigger the rule
    note: string                   # Optional: additional context
recommended_case_pair:             # Required
  positive: string                 # Required: case_id of best positive case
  negative: string                 # Required: case_id of best negative case
  rationale: string                # Required: why this pair distinguishes rule boundary
ambiguity_notes: [string]          # Optional: notes about ambiguous or uncertain cases
---
```

### 3.3 /rule-worker

**Purpose**: Modify rule implementation and tests.

**Input Schema**:
```yaml
---
tree_path: string
target_rule: string
selected_positive_case: string
selected_negative_case: string
allowed_files:
  - "pipeline/evolution_analysis.py"
  - "tests/test_evolution_analysis.py"
required_commands:
  - "pytest tests/test_evolution_analysis.py -q"
  - "make evolution-analysis  # Runs full evolution analysis pipeline"
forbidden_operations:
  - "新增规则"
  - "升级规则状态 partial->ready"
  - "决定长期方向或开新领域"
---
```

**Success Criteria**:
- [ ] Code changes implemented
- [ ] Tests updated
- [ ] All required commands pass
- [ ] Residual risk documented

**Output Schema**:
```yaml
---
what_changed: string
tests_run: string
benchmark_impact: string
residual_risk: string
---
```

### 3.4 /doc-worker

**Purpose**: Update registry, review, and benchmark documentation.

**Input Schema**:
```yaml
---
tree_path: string
target_rule: string
doc_targets:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
status_intent: enum               # cleanup | document_only
forbidden_operations:
  - "修改规则实现"
  - "创造新技术结论"
  - "将单元测试结果包装成真实 benchmark"
  - "把 bridge-level 写成 event-level"
---
```

**Success Criteria**:
- [ ] Documentation structure follows standard skeleton
- [ ] Registry, review, benchmark are consistent
- [ ] Status changes justified by evidence

**Output Schema**:
```yaml
---
docs_updated:
  - file: string
    changes: [string]
status_changes:
  - rule: string
    from: string
    to: string
    reason: string
open_risks:
  - description: string
    severity: low | medium | high
---
```

---

## 4. Guardrails Configuration

### 4.1 Hard Constraints

**`config/guardrails.yaml`**:

```yaml
guardrails:
  # Constraint 1: No cases, no new rule
  - id: no_cases_no_rule
    trigger:
      type: file_change
      pattern: "pipeline/evolution_analysis.py"
    condition: "new_rule_added && !has_positive_case && !has_negative_case"
    action: reject
    message: "新增规则必须同时提供 positive case 和 negative case"

  # Constraint 2: No premature ready upgrade
  - id: no_premature_ready
    trigger:
      type: status_change
      file: "docs/plans/*-rule-coverage.md"
    condition: "status: partial->ready && benchmark.level != event-level"
    action: reject
    message: "bridge-level 规则不能标记为 ready，必须等到 event-level 正例出现"

  # Constraint 3: No synthetic in benchmark
  - id: no_synthetic_in_benchmark
    trigger:
      type: file_change
      pattern: "docs/plans/*-benchmark.md"
    condition: "contains_synthetic == true"
    action: reject
    message: "synthetic case 只能存在于单元测试，不能写入 benchmark 文档"

  # Constraint 4: No bridge-level as event-level
  - id: accurate_level_annotation
    trigger:
      type: file_change
      pattern: "docs/plans/*-benchmark.md"
    condition: "level == event-level && evidence.level == bridge-level"
    action: reject
    message: "不得把 bridge-level 结果写成 event-level"

  # Constraint 5: Mandatory completion checklist
  - id: completion_checklist
    trigger:
      type: task_complete
    condition: "!claude_review_done || !git_commit_done"
    action: hold
    message: "必须完成 Claude review 和本地 git commit"
```

**Condition Evaluation Context**:

Guardrail conditions are evaluated against a context object that contains:

```yaml
context:
  # File change context
  file_changes:           # List of files modified in this task
    - path: string
      change_type: added | modified | deleted
      diff_summary: string

  # Task context
  task:
    tree_path: string
    target_rule: string
    task_type: string

  # Rule registry state (before and after)
  registry:
    before: {rule_object}
    after: {rule_object}

  # Benchmark state
  benchmark:
    cases: [{case_object}]
    has_synthetic: boolean
    level: bridge-level | event-level | mixed

  # Completion state
  completion:
    claude_review_done: boolean
    git_commit_done: boolean
    commit_hash: string | null

  # Worker output
  worker_output:
    what_changed: string
    tests_passed: boolean
    benchmark_impact: string
```

**Validator Implementation Interface**:

```python
class GuardrailValidator:
    """Base class for guardrail validators."""

    def evaluate(self, context: ValidationContext) -> ValidationResult:
        """
        Evaluate guardrail condition against context.

        Args:
            context: ValidationContext containing all relevant state

        Returns:
            ValidationResult with:
              - passed: bool
              - action: allow | reject | hold | warn
              - message: str (if not passed)
        """
        pass

# Example validator implementations
class NoCasesNoRuleValidator(GuardrailValidator):
    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if ctx.has_new_rule_added() and not ctx.has_positive_and_negative_cases():
            return ValidationResult(
                passed=False,
                action="reject",
                message="新增规则必须同时提供 positive case 和 negative case"
            )
        return ValidationResult(passed=True)

class NoPrematureReadyValidator(GuardrailValidator):
    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if ctx.is_status_changed(from_="partial", to_="ready"):
            if ctx.benchmark.level != "event-level":
                return ValidationResult(
                    passed=False,
                    action="reject",
                    message="bridge-level 规则不能标记为 ready"
                )
        return ValidationResult(passed=True)
```

### 4.2 Validation Flow

```
Worker Output
    │
    ▼
┌─────────────────┐
│ Worker Self-Check│───Worker confirms checklist
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Plugin Validator │───Run all guardrails
│ (config/*.yaml)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Delegate Review  │───Final validation
│ (Claude review)  │
└────────┬────────┘
         │
         ▼
    Complete
```

---

## 5. Data Flow & State Machine

### 5.1 Task Package Lifecycle

```yaml
states:
  created:
    description: "Delegate creates task package"
    next: assigned
    guard: "tree_path valid && target_rule exists in registry"

  assigned:
    description: "Assigned to specific worker"
    next: in_progress
    guard: "worker confirms understanding of task boundaries"

  in_progress:
    description: "Worker executing"
    next: pending_review
    guard: "worker self-check passed && required_commands success"

  pending_review:
    description: "Waiting for delegate validation"
    next: completed
    guard: "all guardrails passed && no forbidden_operations triggered"

  completed:
    description: "Task validated"
    next: committed
    guard: "git add success"

  committed:
    description: "Final state - git commit created"
    guard: "git commit success && commit_hash recorded"
```

### 5.2 State Transitions

| From | To | Condition |
|------|-----|-----------|
| created | assigned | Input valid, template injected |
| assigned | in_progress | Worker acknowledges |
| in_progress | pending_review | Worker self-check + commands pass |
| pending_review | completed | Guardrails + delegate review pass |
| completed | committed | Git commit created |

---

## 6. Integration with Existing Docs

### 6.1 Document Mapping

| Plugin Component | Existing Document | Relationship |
|-----------------|-------------------|--------------|
| `config/templates.yaml` | `docs/plans/2026-03-12-evolution-task-template.md` | Import and extend |
| `skills/*-worker.md` | `docs/plans/2026-03-12-evolution-worker-playbook.md` | Implement constraints |
| `config/guardrails.yaml` | `evolution-doc-standards.md` | Enforce standards |
| `delegate-evolution.md` | `subagent-delegation-sop.md` | Automate dispatch |

### 6.2 Synchronization Strategy

1. **Plugin loads SOP docs at startup**:
   - Read `docs/plans/2026-03-12-evolution-worker-playbook.md`
   - Extract hard constraints
   - Merge into `config/guardrails.yaml`

2. **Skills reference same SOP**:
   - Each skill doc includes: "See `docs/plans/2026-03-12-evolution-worker-playbook.md` for full SOP"
   - Skills implement specific constraints from SOP

3. **Version tracking**:
   - Plugin records which SOP version it was built against
   - Warn if project SOP has diverged

---

## 7. Testing Strategy

### 7.1 Test Layers

**Layer 1: Unit Tests** (Skill logic)
```bash
pytest tests/skills/test_case_worker.py
pytest tests/skills/test_rule_worker.py
pytest tests/skills/test_doc_worker.py
```

**Layer 2: Integration Tests** (Plugin + Skills)
```bash
pytest tests/plugin/test_delegation_flow.py
pytest tests/plugin/test_guardrails.py
pytest tests/plugin/test_validation.py
```

**Layer 3: E2E Tests** (Full task packages)
```bash
# Test MLO-01: Status cleanup
make test-e2e fixture=tests/fixtures/MLO-01.yaml

# Test MAG-01: Synthetic cleanup
make test-e2e fixture=tests/fixtures/MAG-01.yaml
```

### 7.2 Test Fixtures

```yaml
# tests/fixtures/MLO-01.yaml
test_name: "MLO-01 status cleanup"
input:
  tree_path: "math > math.LO"
  task_type: "status_cleanup"
  target_rule: "math_lo_forcing_continuity"

expected:
  validation_passed: true
  status_changes:
    - from: "ready"
      to: "partial"
  guardrails:
    - no_premature_ready: pass
```

---

## 8. Implementation Phases

### Phase 1: Core Skills (Week 1)
- Implement 4 skills with basic I/O
- Create skill documentation
- Unit tests for each skill

### Phase 2: Plugin Shell (Week 2)
- Plugin.yaml configuration
- Slash command routing
- Template injection

### Phase 3: Guardrails (Week 3)
- Config file loader
- Validation engine
- Hard constraint enforcement

### Phase 4: Integration (Week 4)
- Delegate review workflow
- Git commit automation
- E2E testing with real task packages

---

## 9. Success Criteria

The plugin is considered successful when:

1. **Task containment**: 90%+ of tasks complete within assigned worker scope
   - *Measurement*: Tasks where worker output passes guardrails without scope expansion / Total tasks
   - *Tracked via*: Guardrail trigger logs

2. **No premature upgrades**: Zero incidents of partial→ready without event-level evidence
   - *Measurement*: Count of `no_premature_ready` guardrail rejections
   - *Target*: 0 rejections (all upgrades justified)

3. **No synthetic pollution**: Synthetic cases never appear in benchmark docs
   - *Measurement*: `no_synthetic_in_benchmark` guardrail rejections
   - *Target*: 0 rejections

4. **Completion rate**: 95%+ of tasks complete with both Claude review and git commit
   - *Measurement*: Tasks with `completion.claude_review_done=true` AND `completion.git_commit_done=true` / Total tasks
   - *Tracked via*: Task state logs

5. **Status accuracy**: Registry status matches actual benchmark level
   - *Measurement*: Manual audit of random sample (monthly)
   - *Target*: 100% consistency

---

## 10. Appendix: Example Task Execution

### Example: MLO-01 Status Cleanup

**User Input**:
```bash
/delegate-evolution
---
tree_path: "math > math.LO"
task_type: "status_cleanup"
target_rule: "math_lo_forcing_continuity"
goal: "校正 registry 中 partial/ready 与 benchmark level 的一致性"
---
```

**Plugin Actions**:
1. Parse input
2. Load matching package from backlog
3. Route to `doc-worker`
4. Inject template with constraints

**Worker Execution**:
1. Read `docs/plans/2026-03-10-evolution-rule-coverage.md`
2. Find `math_lo_forcing_continuity` entry
3. Check `docs/plans/2026-03-12-math-lo-benchmark.md` for level info
4. Update status: `ready` → `partial`
5. Add note: "当前为 bridge-level 解释层"
6. Self-check: "没有升级状态，只是清理一致性"

**Plugin Validation**:
1. Check: status change direction? `ready→partial` ✓ (safe)
2. Check: synthetic case added? No ✓
3. Check: bridge→event? No ✓
4. All guardrails pass

**Output**:
```yaml
---
validation_passed: true
docs_updated:
  - file: "docs/plans/2026-03-10-evolution-rule-coverage.md"
    changes:
      - "status: ready → partial"
      - "note: 当前为 bridge-level 解释层"
status_changes:
  - rule: "math_lo_forcing_continuity"
    from: "ready"
    to: "partial"
    reason: "benchmark level is bridge-level, not event-level"
---
```

**Completion**:
- Claude review: Approved
- Git commit: `abc1234 fix: revert forcing_continuity to partial (bridge-level)`
  - *Note*: `abc1234` is a short hash (first 7 chars) for readability. Full hash stored in completion context.

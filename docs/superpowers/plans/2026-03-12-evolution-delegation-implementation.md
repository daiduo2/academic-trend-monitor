# Evolution Delegation Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Evolution Delegation Plugin with 4 skills (delegate-evolution, case-worker, rule-worker, doc-worker) and guardrails system for trend-monitor evolution-analysis tasks.

**Architecture:** Two-layer architecture - Plugin Layer (hard constraints, routing, validation) + Skills Layer (execution logic). Plugin enforces guardrails before/after skill execution.

**Tech Stack:** Python (validators), YAML (config), Markdown (skills), Git (version control)

**Reference Spec:** `docs/superpowers/specs/2026-03-12-evolution-delegation-plugin-design.md`

---

## Chunk 1: Core Infrastructure

### Task 1: Create Plugin Directory Structure

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/` (base directory)
- Create: `~/.claude/plugins/evolution-delegation/config/`
- Create: `~/.claude/plugins/evolution-delegation/skills/`
- Create: `~/.claude/plugins/evolution-delegation/validators/`

**Commands:**
```bash
mkdir -p ~/.claude/plugins/evolution-delegation/{config,skills,validators}
```

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p ~/.claude/plugins/evolution-delegation/{config,skills,validators}`
Expected: Directories created without error

- [ ] **Step 2: Verify structure**

Run: `ls -la ~/.claude/plugins/evolution-delegation/`
Expected: Shows config/, skills/, validators/ directories

- [ ] **Step 3: Commit (infrastructure)**

```bash
cd academic-trend-monitor
git add -A  # No files yet, just marking checkpoint
git commit --allow-empty -m "chore: evolution-delegation plugin directory structure"
```

---

### Task 2: Create Plugin Metadata File

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/plugin.yaml`

**Code:**
```yaml
# ~/.claude/plugins/evolution-delegation/plugin.yaml
name: "evolution-delegation"
version: "0.1.0"
description: "Structured execution framework for trend-monitor evolution-analysis tasks"
author: "trend-monitor"

entry_points:
  slash_commands:
    - name: "/delegate-evolution"
      skill: "delegate-evolution"
      description: "Entry point for all evolution-analysis tasks"
    - name: "/case-worker"
      skill: "case-worker"
      description: "Find positive/negative/ambiguous cases"
    - name: "/rule-worker"
      skill: "rule-worker"
      description: "Modify rule implementation and tests"
    - name: "/doc-worker"
      skill: "doc-worker"
      description: "Update registry, review, and benchmark docs"

config:
  guardrails_file: "config/guardrails.yaml"
  templates_file: "config/templates.yaml"

requirements:
  - "python >= 3.9"
  - "pyyaml"
  - "git"
```

- [ ] **Step 1: Write plugin.yaml**

Create file with content above

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/plugin.yaml'))"`
Expected: No output (no error)

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/plugin.yaml
git commit -m "feat: add evolution-delegation plugin metadata"
```

---

### Task 3: Create Skill Symlinks in ~/.claude/skills/

**Files:**
- Create: `~/.claude/skills/delegate-evolution.md` (symlink)
- Create: `~/.claude/skills/case-worker.md` (symlink)
- Create: `~/.claude/skills/rule-worker.md` (symlink)
- Create: `~/.claude/skills/doc-worker.md` (symlink)

**Commands:**
```bash
# First create placeholder skill files
# Then create symlinks
```

- [ ] **Step 1: Create placeholder skill files**

Run:
```bash
touch ~/.claude/plugins/evolution-delegation/skills/{delegate-evolution,case-worker,rule-worker,doc-worker}.md
```

- [ ] **Step 2: Create symlinks**

Run:
```bash
ln -s ~/.claude/plugins/evolution-delegation/skills/delegate-evolution.md ~/.claude/skills/delegate-evolution.md
ln -s ~/.claude/plugins/evolution-delegation/skills/case-worker.md ~/.claude/skills/case-worker.md
ln -s ~/.claude/plugins/evolution-delegation/skills/rule-worker.md ~/.claude/skills/rule-worker.md
ln -s ~/.claude/plugins/evolution-delegation/skills/doc-worker.md ~/.claude/skills/doc-worker.md
```

- [ ] **Step 3: Verify symlinks**

Run: `ls -la ~/.claude/skills/ | grep evolution-delegation`
Expected: Shows 4 symlinks pointing to plugin skills/

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: create skill placeholders and symlinks"
```

---

## Chunk 2: Guardrails System

### Task 4: Create Guardrails Configuration

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/config/guardrails.yaml`

**Code:**
```yaml
# ~/.claude/plugins/evolution-delegation/config/guardrails.yaml
guardrails:
  # Constraint 1: No cases, no new rule
  - id: no_cases_no_rule
    trigger:
      type: file_change
      pattern: "pipeline/evolution_analysis.py"
    condition: "new_rule_added && !has_positive_case && !has_negative_case"
    action: reject
    message: "新增规则必须同时提供 positive case 和 negative case"
    validator: "NoCasesNoRuleValidator"

  # Constraint 2: No premature ready upgrade
  - id: no_premature_ready
    trigger:
      type: status_change
      file: "docs/plans/*-rule-coverage.md"
    condition: "status: partial->ready && benchmark.level != event-level"
    action: reject
    message: "bridge-level 规则不能标记为 ready，必须等到 event-level 正例出现"
    validator: "NoPrematureReadyValidator"

  # Constraint 3: No synthetic in benchmark
  - id: no_synthetic_in_benchmark
    trigger:
      type: file_change
      pattern: "docs/plans/*-benchmark.md"
    condition: "contains_synthetic == true"
    action: reject
    message: "synthetic case 只能存在于单元测试，不能写入 benchmark 文档"
    validator: "NoSyntheticInBenchmarkValidator"

  # Constraint 4: No bridge-level as event-level
  - id: accurate_level_annotation
    trigger:
      type: file_change
      pattern: "docs/plans/*-benchmark.md"
    condition: "level == event-level && evidence.level == bridge-level"
    action: reject
    message: "不得把 bridge-level 结果写成 event-level"
    validator: "AccurateLevelAnnotationValidator"

  # Constraint 5: Mandatory completion checklist
  - id: completion_checklist
    trigger:
      type: task_complete
    condition: "!claude_review_done || !git_commit_done"
    action: hold
    message: "必须完成 Claude review 和本地 git commit"
    validator: "CompletionChecklistValidator"
```

- [ ] **Step 1: Write guardrails.yaml**

Create file with content above

- [ ] **Step 2: Validate YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/config/guardrails.yaml'))"`
Expected: No error

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/config/guardrails.yaml
git commit -m "feat: add guardrails configuration"
```

---

### Task 5: Create Guardrail Validator Base Class

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/validators/base.py`

**Code:**
```python
# ~/.claude/plugins/evolution-delegation/validators/base.py
"""Base class and types for guardrail validators."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ValidationResult:
    """Result of a guardrail validation."""
    passed: bool
    action: str  # 'allow', 'reject', 'hold', 'warn'
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class ValidationContext:
    """Context for guardrail validation."""
    # File change context
    file_changes: List[Dict[str, Any]]

    # Task context
    tree_path: str
    target_rule: str
    task_type: str

    # Rule registry state (before and after)
    registry_before: Optional[Dict] = None
    registry_after: Optional[Dict] = None

    # Benchmark state
    benchmark_cases: List[Dict] = None
    has_synthetic: bool = False
    benchmark_level: Optional[str] = None

    # Completion state
    claude_review_done: bool = False
    git_commit_done: bool = False
    commit_hash: Optional[str] = None

    # Worker output
    worker_output: Optional[Dict] = None

    def has_new_rule_added(self) -> bool:
        """Check if a new rule was added."""
        if not self.registry_before or not self.registry_after:
            return False
        before_rules = set(r.get('rule_name') for r in self.registry_before.get('rules', []))
        after_rules = set(r.get('rule_name') for r in self.registry_after.get('rules', []))
        return len(after_rules - before_rules) > 0

    def has_positive_and_negative_cases(self) -> bool:
        """Check if both positive and negative cases exist."""
        if not self.benchmark_cases:
            return False
        has_positive = any(c.get('type') == 'positive' for c in self.benchmark_cases)
        has_negative = any(c.get('type') == 'negative' for c in self.benchmark_cases)
        return has_positive and has_negative

    def is_status_changed(self, from_: str, to: str) -> bool:
        """Check if rule status changed from->to."""
        if not self.registry_before or not self.registry_after:
            return False
        # Find rule in both states
        before_status = None
        after_status = None
        for r in self.registry_before.get('rules', []):
            if r.get('rule_name') == self.target_rule:
                before_status = r.get('status')
                break
        for r in self.registry_after.get('rules', []):
            if r.get('rule_name') == self.target_rule:
                after_status = r.get('status')
                break
        return before_status == from_ and after_status == to


class GuardrailValidator(ABC):
    """Base class for guardrail validators."""

    @abstractmethod
    def evaluate(self, context: ValidationContext) -> ValidationResult:
        """
        Evaluate guardrail condition against context.

        Args:
            context: ValidationContext containing all relevant state

        Returns:
            ValidationResult with passed status and action
        """
        pass
```

- [ ] **Step 1: Write base.py**

Create file with content above

- [ ] **Step 2: Validate Python syntax**

Run: `python3 -m py_compile ~/.claude/plugins/evolution-delegation/validators/base.py`
Expected: No output (no error)

- [ ] **Step 3: Test import**

Run: `cd ~/.claude/plugins/evolution-delegation && python3 -c "from validators.base import GuardrailValidator, ValidationContext, ValidationResult; print('OK')"`
Expected: "OK"

- [ ] **Step 4: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/validators/base.py
git commit -m "feat: add guardrail validator base class"
```

---

### Task 6: Implement Guardrail Validators

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/validators/guardrails.py`
- Modify: `~/.claude/plugins/evolution-delegation/validators/__init__.py`

**Code for guardrails.py:**
```python
# ~/.claude/plugins/evolution-delegation/validators/guardrails.py
"""Concrete guardrail validator implementations."""

from .base import GuardrailValidator, ValidationContext, ValidationResult


class NoCasesNoRuleValidator(GuardrailValidator):
    """Validator for no_cases_no_rule guardrail."""

    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if ctx.has_new_rule_added() and not ctx.has_positive_and_negative_cases():
            return ValidationResult(
                passed=False,
                action="reject",
                message="新增规则必须同时提供 positive case 和 negative case"
            )
        return ValidationResult(passed=True, action="allow")


class NoPrematureReadyValidator(GuardrailValidator):
    """Validator for no_premature_ready guardrail."""

    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if ctx.is_status_changed(from_="partial", to="ready"):
            if ctx.benchmark_level != "event-level":
                return ValidationResult(
                    passed=False,
                    action="reject",
                    message="bridge-level 规则不能标记为 ready，必须等到 event-level 正例出现"
                )
        return ValidationResult(passed=True, action="allow")


class NoSyntheticInBenchmarkValidator(GuardrailValidator):
    """Validator for no_synthetic_in_benchmark guardrail."""

    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if ctx.has_synthetic:
            return ValidationResult(
                passed=False,
                action="reject",
                message="synthetic case 只能存在于单元测试，不能写入 benchmark 文档"
            )
        return ValidationResult(passed=True, action="allow")


class AccurateLevelAnnotationValidator(GuardrailValidator):
    """Validator for accurate_level_annotation guardrail."""

    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        # Check if any case claims event-level but evidence is bridge-level
        for case in ctx.benchmark_cases or []:
            case_level = case.get('level')
            evidence_level = case.get('evidence', {}).get('level')
            if case_level == "event-level" and evidence_level == "bridge-level":
                return ValidationResult(
                    passed=False,
                    action="reject",
                    message="不得把 bridge-level 结果写成 event-level",
                    details={"case_id": case.get('case_id')}
                )
        return ValidationResult(passed=True, action="allow")


class CompletionChecklistValidator(GuardrailValidator):
    """Validator for completion_checklist guardrail."""

    def evaluate(self, ctx: ValidationContext) -> ValidationResult:
        if not ctx.claude_review_done or not ctx.git_commit_done:
            missing = []
            if not ctx.claude_review_done:
                missing.append("Claude review")
            if not ctx.git_commit_done:
                missing.append("git commit")
            return ValidationResult(
                passed=False,
                action="hold",
                message=f"必须完成: {', '.join(missing)}"
            )
        return ValidationResult(passed=True, action="allow")


# Mapping of guardrail IDs to validator classes
VALIDATOR_REGISTRY = {
    "no_cases_no_rule": NoCasesNoRuleValidator,
    "no_premature_ready": NoPrematureReadyValidator,
    "no_synthetic_in_benchmark": NoSyntheticInBenchmarkValidator,
    "accurate_level_annotation": AccurateLevelAnnotationValidator,
    "completion_checklist": CompletionChecklistValidator,
}
```

**Code for __init__.py:**
```python
# ~/.claude/plugins/evolution-delegation/validators/__init__.py
"""Guardrail validators package."""

from .base import GuardrailValidator, ValidationContext, ValidationResult
from .guardrails import (
    NoCasesNoRuleValidator,
    NoPrematureReadyValidator,
    NoSyntheticInBenchmarkValidator,
    AccurateLevelAnnotationValidator,
    CompletionChecklistValidator,
    VALIDATOR_REGISTRY,
)

__all__ = [
    "GuardrailValidator",
    "ValidationContext",
    "ValidationResult",
    "NoCasesNoRuleValidator",
    "NoPrematureReadyValidator",
    "NoSyntheticInBenchmarkValidator",
    "AccurateLevelAnnotationValidator",
    "CompletionChecklistValidator",
    "VALIDATOR_REGISTRY",
]
```

- [ ] **Step 1: Write guardrails.py**

Create file with content above

- [ ] **Step 2: Write __init__.py**

Create file with content above

- [ ] **Step 3: Validate syntax**

Run: `python3 -m py_compile ~/.claude/plugins/evolution-delegation/validators/guardrails.py`
Expected: No error

- [ ] **Step 4: Test imports**

Run: `cd ~/.claude/plugins/evolution-delegation && python3 -c "from validators import VALIDATOR_REGISTRY; print(f'Loaded {len(VALIDATOR_REGISTRY)} validators')"`
Expected: "Loaded 5 validators"

- [ ] **Step 5: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/validators/
git commit -m "feat: implement guardrail validators"
```

---

## Chunk 3: Skills Implementation

### Task 7: Implement /delegate-evolution Skill

**Files:**
- Modify: `~/.claude/plugins/evolution-delegation/skills/delegate-evolution.md`

**Code:**
```markdown
---
name: delegate-evolution
description: Entry point for all evolution-analysis tasks. Routes to appropriate worker and enforces completion.
type: rigid
---

## Purpose

`/delegate-evolution` is the entry point for all evolution-analysis tasks. It:
1. Parses input YAML frontmatter
2. Loads matching task package from backlog
3. Determines assigned_worker based on task_type
4. Injects task template with constraints
5. Delegates to worker
6. Receives worker output
7. Runs guardrail validation
8. Outputs result with completion status

## Input Schema

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

## Task Type to Worker Mapping

| task_type | Assigned Worker | Description |
|-----------|-----------------|-------------|
| case_update | case-worker | Find positive/negative/ambiguous cases |
| rule_update | rule-worker | Modify rule implementation and tests |
| doc_update | doc-worker | Update documentation (registry, review, benchmark) |
| status_cleanup | doc-worker | Clean up status inconsistencies (special case of doc_update) |

## Execution Flow

1. **Parse Input**: Extract YAML frontmatter from user input
2. **Validate Input**: Check required fields (tree_path, task_type, target_rule)
3. **Load Context**: Read existing registry/review/benchmark docs
4. **Route Task**: Determine worker based on task_type mapping
5. **Inject Template**: Add constraints to worker input
6. **Delegate**: Call appropriate worker skill
7. **Receive Output**: Get worker result
8. **Run Guardrails**: Validate against all guardrails
9. **Output Result**: Present final result with completion status

## Output Schema

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

## Constraints

- Must NOT directly write code
- Must NOT bypass benchmark and Claude review
- Must enforce guardrails on all worker outputs

## Success Criteria

- [ ] Task correctly routed to appropriate worker
- [ ] All guardrails checked
- [ ] Output contains validation results

- [ ] **Step 1: Write delegate-evolution.md**

Create file at `~/.claude/plugins/evolution-delegation/skills/delegate-evolution.md` with content above

- [ ] **Step 2: Validate markdown syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/skills/delegate-evolution.md').read().split('---')[1])"`
Expected: No error (YAML frontmatter parses correctly)

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/skills/delegate-evolution.md
git commit -m "feat: add delegate-evolution skill"
```

---

### Task 8: Implement /case-worker Skill

**Files:**
- Modify: `~/.claude/plugins/evolution-delegation/skills/case-worker.md`

**Code:**
```markdown
---
name: case-worker
description: Find positive/negative/ambiguous cases for evolution rules. Updates benchmark and review docs.
type: rigid
---

## Purpose

`/case-worker` finds and documents cases that define rule boundaries:
- **Positive cases**: Clear evidence of evolution (what the rule SHOULD catch)
- **Negative cases**: Similar but non-evolution (what the rule should NOT catch)
- **Ambiguous cases**: Edge cases for human review

## Input Schema

```yaml
---
tree_path: string                 # e.g., "math > math.LO" (required)
target_rule: string               # e.g., "math_lo_forcing_continuity" (required)
positive_case_hint: string        # Starting point for positive search (optional)
negative_case_hint: string        # Starting point for negative search (optional)
allowed_files:
  - "docs/plans/*-benchmark.md"
  - "docs/plans/*-rule-review.md"
required_commands:
  - "make evolution-analysis"
---
```

## Execution Steps

1. **Load Context**: Read existing benchmark and review docs
2. **Search Positive**: Find clear evolution evidence matching target_rule
3. **Search Negative**: Find similar cases that are NOT evolution
4. **Document Cases**: Format as case blocks per doc standards
5. **Update Benchmark**: Add cases to benchmark.md (ONLY real cases, NO synthetic)
6. **Update Review**: Add case inventory notes
7. **Self-Check**: Verify cases are distinguishable
8. **Output Results**: Return case blocks and ambiguity notes

## Output Schema

```yaml
---
candidate_positive_cases:
  - case_id: string
    anchor_paper: string
    target_paper: string
    evidence: string
    confidence: high | medium | low
candidate_negative_cases:
  - case_id: string
    anchor_paper: string
    target_paper: string
    explanation: string
    confidence: high | medium | low
recommended_case_pair:
  positive_case_id: string
  negative_case_id: string
  why_distinguishing: string
ambiguity_notes:
  - note: string
    requires_human_review: boolean
files_updated:
  - string
---
```

## Constraints

- MUST NOT modify `pipeline/evolution_analysis.py`
- MUST NOT upgrade rule status (partial/ready)
- MUST NOT write synthetic cases to benchmark
- MUST distinguish positive from negative clearly

## Success Criteria

- [ ] At least 1 positive case found
- [ ] At least 1 negative case found
- [ ] Cases documented in benchmark.md
- [ ] Ambiguity notes recorded

- [ ] **Step 1: Write case-worker.md**

Create file at `~/.claude/plugins/evolution-delegation/skills/case-worker.md` with content above

- [ ] **Step 2: Validate YAML frontmatter**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/skills/case-worker.md').read().split('---')[1])"`
Expected: No error

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/skills/case-worker.md
git commit -m "feat: add case-worker skill"
```

---

### Task 9: Implement /rule-worker Skill

**Files:**
- Modify: `~/.claude/plugins/evolution-delegation/skills/rule-worker.md`

**Code:**
```markdown
---
name: rule-worker
description: Modify rule implementation and tests. Reports impact on benchmark cases.
type: rigid
---

## Purpose

`/rule-worker` implements rule changes with test coverage:
- Modifies `pipeline/evolution_analysis.py`
- Updates or creates tests
- Runs required commands
- Reports benchmark impact and residual risk

## Input Schema

```yaml
---
tree_path: string                 # e.g., "math > math.LO" (required)
target_rule: string               # e.g., "math_lo_forcing_continuity" (required)
selected_positive_case:
  case_id: string
  anchor_paper: string
  target_paper: string
selected_negative_case:
  case_id: string
  anchor_paper: string
  target_paper: string
allowed_files:
  - "pipeline/evolution_analysis.py"
  - "tests/test_evolution_analysis.py"
  - "tests/test_*_benchmark.py"
required_commands:
  - "pytest tests/test_evolution_analysis.py -q"
  - "make evolution-analysis"
---
```

## Execution Steps

1. **Analyze Cases**: Understand why positive is evolution, negative is not
2. **Review Current Rule**: Read existing implementation
3. **Design Change**: Plan minimal modification
4. **Implement**: Modify rule in `pipeline/evolution_analysis.py`
5. **Update Tests**: Ensure test coverage for both cases
6. **Run Commands**: Execute required_commands
7. **Verify Impact**: Check positive now passes, negative fails appropriately
8. **Document Risk**: Note residual risks or limitations

## Output Schema

```yaml
---
what_changed:
  files_modified:
    - string
  lines_changed: number
  change_summary: string
tests_run:
  - command: string
    status: pass | fail
    output_summary: string
benchmark_impact:
  positive_cases_now_pass: number
  negative_cases_correctly_reject: number
  regressions: []  # List of case_ids that broke
residual_risk:
  - risk: string
    mitigation: string
    confidence: high | medium | low
---
```

## Constraints

- MUST NOT decide long-term direction
- MUST NOT add new domain areas
- MUST NOT change status (partial->ready)
- MUST run all required_commands

## Success Criteria

- [ ] Code and tests both updated
- [ ] All required commands pass
- [ ] Residual risk documented

- [ ] **Step 1: Write rule-worker.md**

Create file at `~/.claude/plugins/evolution-delegation/skills/rule-worker.md` with content above

- [ ] **Step 2: Validate YAML frontmatter**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/skills/rule-worker.md').read().split('---')[1])"`
Expected: No error

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/skills/rule-worker.md
git commit -m "feat: add rule-worker skill"
```

---

### Task 10: Implement /doc-worker Skill

**Files:**
- Modify: `~/.claude/plugins/evolution-delegation/skills/doc-worker.md`

**Code:**
```markdown
---
name: doc-worker
description: Update registry, review, and benchmark docs. Clean up documentation inconsistencies.
type: rigid
---

## Purpose

`/doc-worker` maintains documentation consistency:
- Updates rule registry (status, coverage, gaps)
- Updates review docs (case inventory, decisions)
- Updates benchmark docs (case details, evidence)
- Cleans up status inconsistencies

## Input Schema

```yaml
---
tree_path: string                 # e.g., "math > math.LO" (required)
target_rule: string               # e.g., "math_lo_forcing_continuity" (required)
doc_targets:
  - registry
  - review
  - benchmark
status_intent: maintain | upgrade_to_partial | cleanup_synthetic
allowed_files:
  - "docs/plans/*-rule-coverage.md"
  - "docs/plans/*-rule-review.md"
  - "docs/plans/*-benchmark.md"
required_commands: []
---
```

## Execution Steps

1. **Load All Docs**: Read registry, review, benchmark for tree_path
2. **Check Consistency**: Identify mismatches
3. **Update Registry**: Sync status with benchmark evidence
4. **Update Review**: Document case inventory decisions
5. **Update Benchmark**: Ensure case evidence is complete
6. **Status Cleanup**: If intent is cleanup, fix partial/ready mismatches
7. **Validate**: Run guardrails (no synthetic in benchmark, accurate level)

## Output Schema

```yaml
---
docs_updated:
  - doc_type: registry | review | benchmark
    file_path: string
    changes:
      - field: string
        old_value: any
        new_value: any
status_changes:
  - rule: string
    from: string
    to: string
    reason: string
open_risks:
  - risk: string
    severity: high | medium | low
    recommended_action: string
consistency_issues_fixed:
  - issue: string
    resolution: string
---
```

## Constraints

- MUST NOT modify rule implementation
- MUST NOT create new technical conclusions
- MUST NOT promote unit test results to benchmark
- MUST maintain doc standard skeleton

## Status Change Rules

| Current | Target | Condition | Allowed |
|---------|--------|-----------|---------|
| - | partial | Always | Yes |
| partial | ready | Has event-level positive case | Yes |
| partial | ready | Only bridge-level | NO (guardrail) |
| ready | partial | Evidence is bridge-level | Yes (corrective) |

## Success Criteria

- [ ] Registry, review, benchmark are consistent
- [ ] Status changes follow rules above
- [ ] No synthetic cases in benchmark

- [ ] **Step 1: Write doc-worker.md**

Create file at `~/.claude/plugins/evolution-delegation/skills/doc-worker.md` with content above

- [ ] **Step 2: Validate YAML frontmatter**

Run: `python3 -c "import yaml; yaml.safe_load(open('~/.claude/plugins/evolution-delegation/skills/doc-worker.md').read().split('---')[1])"`
Expected: No error

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/plugins/evolution-delegation/skills/doc-worker.md
git commit -m "feat: add doc-worker skill"
```

---

## Chunk 4: Integration and Validation

### Task 11: Create Plugin Loader/Runner (Optional Python Helper)

**Files:**
- Create: `~/.claude/plugins/evolution-delegation/runner.py` (optional)

**Purpose:**
This is an optional helper script for testing the plugin outside Claude Code. Not required for plugin operation.

**Code:**
```python
#!/usr/bin/env python3
"""Optional runner for testing evolution-delegation plugin."""

import yaml
import sys
from pathlib import Path

# Add validators to path
sys.path.insert(0, str(Path(__file__).parent))

from validators import VALIDATOR_REGISTRY, ValidationContext


def load_guardrails():
    """Load guardrails configuration."""
    config_path = Path(__file__).parent / "config" / "guardrails.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def run_guardrail_checks(context: ValidationContext):
    """Run all guardrail checks against context."""
    guardrails = load_guardrails()
    results = []

    for guardrail in guardrails.get("guardrails", []):
        validator_name = guardrail.get("validator")
        if validator_name in VALIDATOR_REGISTRY:
            validator = VALIDATOR_REGISTRY[validator_name]()
            result = validator.evaluate(context)
            results.append({
                "id": guardrail["id"],
                "passed": result.passed,
                "action": result.action,
                "message": result.message
            })

    return results


if __name__ == "__main__":
    # Example: test guardrails with empty context
    ctx = ValidationContext(
        file_changes=[],
        tree_path="math > math.LO",
        target_rule="test_rule",
        task_type="case_update"
    )
    results = run_guardrail_checks(ctx)
    print(yaml.dump(results, allow_unicode=True))
```

- [ ] **Step 1: Write runner.py** (optional)

Create file with content above (skip if not needed)

- [ ] **Step 2: Test runner**

Run: `cd ~/.claude/plugins/evolution-delegation && python3 runner.py`
Expected: YAML output with guardrail check results

- [ ] **Step 3: Commit** (if created)

```bash
git add ~/.claude/plugins/evolution-delegation/runner.py
git commit -m "feat: add optional plugin test runner"
```

---

### Task 12: Final Integration Test

**Goal:** Verify complete plugin works end-to-end

- [ ] **Step 1: Verify all files exist**

Run:
```bash
ls -la ~/.claude/plugins/evolution-delegation/
ls -la ~/.claude/plugins/evolution-delegation/skills/
ls -la ~/.claude/plugins/evolution-delegation/validators/
ls -la ~/.claude/plugins/evolution-delegation/config/
ls -la ~/.claude/skills/*.md | grep evolution
```
Expected: All expected files present, symlinks valid

- [ ] **Step 2: Validate all YAML files**

Run:
```bash
python3 -c "
import yaml
from pathlib import Path
base = Path.home() / '.claude/plugins/evolution-delegation'
files = [
    base / 'plugin.yaml',
    base / 'config/guardrails.yaml',
]
for f in files:
    yaml.safe_load(open(f))
    print(f'OK: {f}')
"
```
Expected: All files report OK

- [ ] **Step 3: Validate all Python files**

Run:
```bash
python3 -m py_compile ~/.claude/plugins/evolution-delegation/validators/base.py
python3 -m py_compile ~/.claude/plugins/evolution-delegation/validators/guardrails.py
python3 -m py_compile ~/.claude/plugins/evolution-delegation/validators/__init__.py
echo "Python files OK"
```
Expected: "Python files OK"

- [ ] **Step 4: Test validator imports**

Run:
```bash
cd ~/.claude/plugins/evolution-delegation && python3 -c "
from validators import VALIDATOR_REGISTRY, ValidationContext, ValidationResult
print(f'Loaded {len(VALIDATOR_REGISTRY)} validators')
ctx = ValidationContext(file_changes=[], tree_path='test', target_rule='test', task_type='test')
print('ValidationContext created successfully')
"
```
Expected: "Loaded 5 validators" and "ValidationContext created successfully"

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: evolution-delegation plugin v0.1.0 complete"
```

---

## Summary

After completing this plan, you will have:

1. **Plugin Structure**: `~/.claude/plugins/evolution-delegation/` with:
   - `plugin.yaml` - Plugin metadata
   - `config/guardrails.yaml` - 5 hard constraints
   - `validators/` - Python validation logic
   - `skills/` - 4 skill definitions

2. **Skill Symlinks**: `~/.claude/skills/{delegate-evolution,case-worker,rule-worker,doc-worker}.md`

3. **Guardrails System**:
   - `no_cases_no_rule`: Reject new rules without positive/negative cases
   - `no_premature_ready`: Reject bridge-level -> ready upgrades
   - `no_synthetic_in_benchmark`: Reject synthetic cases in benchmark docs
   - `accurate_level_annotation`: Reject bridge-level labeled as event-level
   - `completion_checklist`: Hold until Claude review + git commit done

4. **Usage**:
   ```
   /delegate-evolution
   ---
   tree_path: "math > math.LO"
   task_type: "case_update"
   target_rule: "math_lo_forcing_continuity"
   goal: "Find distinguishing positive/negative cases"
   ---
   ```

doc_type: "governance"
scope: "math evolution worker task packages"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-skills-design.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-task-template.md"
downstream_docs: []
last_reviewed: "2026-03-12"

# Math Worker Backlog

## Purpose

这份文档把数学方向后续可分发给弱模型或 Claude subagent 的任务，整理成固定任务包。

原则是：

- 不给开放式“继续推进”
- 只给中等粒度、强约束、可验收的 task package

## Scope

当前 backlog 只覆盖：

- `math > math.LO`
- `math > math.AG`

## Package Template

每个包都应固定包含：

- `tree_path`
- `task_owner`
- `task_type`
- `target_rule`
- `positive_case`
- `negative_case`
- `allowed_files`
- `required_commands`
- `done_when`

## Active Task Packages

### Package MLO-01

```yaml
tree_path: "math > math.LO"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rule:
  - "math_lo_forcing_continuity"
  - "math_lo_definability_continuity"
goal: "校正 registry 中 partial / ready 与 benchmark level 的一致性"
positive_case:
  anchor: "global_51"
  target: "global_951"
negative_case:
  anchor: "global_339"
  target: "global_951"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
required_commands:
  - "pytest tests/test_math_lo_benchmark.py -q"
  - "make math-lo-benchmark"
done_when:
  - "registry 状态与 benchmark level 一致"
  - "bridge-level 规则不再被写成 ready"
```

### Package MLO-02

```yaml
tree_path: "math > math.LO"
task_owner: "case-worker"
task_type: "review_update"
target_rule: "math_lo_type_theory_continuity"
goal: "补一组更稳定的正反例，确认它是否仍然只停留在 bridge-level"
positive_case:
  anchor: "global_56"
  target: "global_980"
negative_case:
  anchor: "global_56"
  target: "global_438"
allowed_files:
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
required_commands:
  - "make evolution-analysis"
  - "make math-lo-benchmark"
done_when:
  - "review 里明确 type-theory 是 bridge-level 还是接近 event-level"
  - "benchmark 补齐正反例备注"
```

### Package MLO-03

```yaml
tree_path: "math > math.LO > 集合论与基数理论"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_lo_set_theory_continuity"
goal: "补充集合论路径的真实 negative cases，避免只靠 cardinal/forcing 误判"
positive_case:
  anchor: "global_51"
  target: "global_75"
negative_case:
  anchor: "global_167"
  target: "global_75"
allowed_files:
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
required_commands:
  - "make math-lo-benchmark"
done_when:
  - "新增至少 1 个真实 negative case"
  - "review 中记录为何它是负例"
```

### Package MAG-01

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rule: "math_ag_method_continuity"
goal: "把 synthetic evidence 从 benchmark 语义中剥离，改写成 test evidence"
positive_case:
  anchor: "ag-method-b1"
  target: "synthetic"
negative_case:
  anchor: "ag-method-n1"
  target: "synthetic"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
required_commands:
  - "pytest tests/test_evolution_analysis.py -q"
done_when:
  - "registry 不再把 synthetic case 写成真实 benchmark"
  - "文档明确这部分只是 test evidence"
```

### Package MAG-02

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_ag_object_continuity"
goal: "继续搜集真实 positive / negative pairs，确认对象词典覆盖盲点"
positive_case:
  anchor: "global_69"
  target: "global_287"
negative_case:
  anchor: "global_30"
  target: "global_355"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
required_commands:
  - "make evolution-analysis"
done_when:
  - "新增至少 1 条真实 negative note"
  - "review registry 说明对象词典盲点"
```

### Package MAG-03A: Method Continuity Case Discovery **[PENDING - DECISION REQUIRED]**

**STATUS: ⏸️ 待决策 - 仅当明确需要时才执行**

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "case_discovery"
target_rule: "math_ag_method_continuity"
goal: "判断 method_continuity 是否值得进入 benchmark 主流程"
decision_fork:
  option_a:
    condition: "找到 >=2 个真实 event-level positive cases"
    action: "进入 MAG-03B-runner，实现 math_ag_method_continuity benchmark"
  option_b:
    condition: "只找到 bridge-level cases 或 case 不足"
    action: "进入 MAG-03B-normalization，明确维持 test-evidence-only"
search_criteria:
  - "共享 >=2 个方法词: cohomology/derived/motivic/tropical/étale"
  - "共享对象词 <2 个 (确保是方法连续性而非对象连续性)"
  - "有清晰的 temporal evolution 证据 (event-level)"
  - "跨期出现，而非同期并存"
current_candidates:
  - note: "已找到的 cases 均为 bridge-level"
  - ag-method-p1: "global_136 -> global_263 (2025-06 -> 2025-10)"
  - ag-method-p2: "global_237 -> global_263 (2025-09 -> 2025-10)"
  - assessment: "时间跨度太短，无法构成 event-level evolution"
allowed_files:
  - "docs/plans/2026-03-17-math-ag-benchmark.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
stop_conditions:
  - "搜索后仍无 event-level cases"
  - "所有 candidate 都是同期或短期并存"
  - "与 object_continuity 边界无法区分"
done_when:
  - "明确 decision_fork 走向 (option_a 或 option_b)"
  - "文档记录决策理由"
```

### Package MAG-03B-runner: Implement Method Benchmark **[CONDITIONAL]**

**STATUS: 🔒 锁定 - 仅在 MAG-03A 选择 option_a 后解锁**

```yaml
tree_path: "math > math.AG"
task_owner: "rule-worker"
task_type: "benchmark_implementation"
target_rule: "math_ag_method_continuity"
precondition: "MAG-03A 必须完成且选择 option_a"
goal: "为 method_continuity 实现完整的 benchmark runner"
required_cases:
  - ">=2 event-level positive cases"
  - ">=1 negative case"
allowed_files:
  - "pipeline/math_ag_benchmark.py"
  - "tests/test_math_ag_benchmark.py"
  - "docs/plans/2026-03-17-math-ag-benchmark.md"
```

### Package MAG-03B-normalization: Scope Cleanup **[FALLBACK]**

**STATUS: 🔓 默认路径 - 当 MAG-03A 无法找到足够 cases 时执行**

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "scope_normalization"
target_rule: "math_ag_method_continuity"
precondition: "MAG-03A 完成，选择 option_b (case 不足)"
goal: "明确将 method_continuity 从 benchmark 候选中移除，维持 test-evidence-only"
actions:
  - "更新 registry: 明确标注 'test evidence only / not benchmark-ready'"
  - "更新 math-ag-benchmark.md: 将 method cases 移入 'Test Evidence' 章节"
  - "更新 math_ag_benchmark.py: 移除 method continuity cases 或标注为 test-only"
  - "更新 worker-backlog: 归档 MAG-03，标注 'archived - insufficient event-level data'"
done_when:
  - "method_continuity 不再出现在 benchmark runner 中"
  - "文档明确区分: object_continuity (ready) vs method_continuity (test-only)"
  - "无歧义的 stop condition 已记录"
```

## Dispatch Rules

分发时默认遵循：

1. 文档一致性问题先交 `doc-worker`
2. case 缺失问题先交 `case-worker`
3. 只有当 case 边界清楚时，才交 `rule-worker`

## Recommended Near-Term Order

### 已完成 ✅

1. `MLO-01` - Registry 状态一致性校正
2. `MAG-01` - Synthetic 标注清理
3. `MLO-03` - Set theory negative case 补充
4. `MLO-02` - Type theory bridge-level 确认
5. `MAG-02` - Object continuity negative case 补充

### 待决策 ⏸️

6. **`MAG-03A`** - Method continuity case discovery **[需要明确决策]**
   - 选择 A: 找到 event-level cases → 进入 `MAG-03B-runner`
   - 选择 B: 无 event-level cases → 进入 `MAG-03B-normalization` (默认路径)

**默认路径**: 若 `MAG-03A` 无法找到足够 cases，直接执行 `MAG-03B-normalization`

### 重要原则

**不要跳过 `MAG-03A` 直接执行 `MAG-03B-runner`**

math_ag_method_continuity 目前状态：
- ✅ Threshold 验证通过
- ❌ **无 event-level cases** (只有 bridge-level)
- ❌ **不配进入 benchmark runner**

必须先做 `MAG-03A` case discovery，明确：
1. 能否找到跨期明显的 evolution cases
2. 还是只能找到同期/短期的结构相似性

只有确认有 event-level cases 后，才允许实现 runner。

## Stop Conditions

以下情况不得继续扩展任务包：

- 同一路径下 registry / review / benchmark 彼此矛盾
- 只有 synthetic case，没有真实 case
- benchmark 绿色但无法解释为什么是正例
- 规则边界和相邻规则明显重叠

## Completion Rule

每个 task package 完成时，都必须留下：

- 任务块
- 改动文件列表
- Claude review 结论
- 本地 git commit hash

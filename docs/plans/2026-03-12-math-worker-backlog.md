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

### Package MAG-03

**STATUS: 已执行前置 case-worker 搜索，待规则微调**

```yaml
tree_path: "math > math.AG"
task_owner: "rule-worker"
task_type: "rule_update"
target_rule: "math_ag_method_continuity"
goal: "只在已有真实 case 足够时，微调 method overlap 阈值或 taxonomy 权重"
positive_case:
  - case_id: "ag-method-p1"
    anchor: "global_136"
    target: "global_263"
    reason: "共享方法词: motivic, étale (2个)，无共享对象词，纯方法连续性"
  - case_id: "ag-method-p2"
    anchor: "global_237"
    target: "global_263"
    reason: "共享方法词: cohomology, motivic (2个)，无共享对象词，纯方法连续性"
negative_case:
  - case_id: "ag-method-n1"
    anchor: "global_215"
    target: "global_237"
    reason: "仅共享1个方法词(cohomology)，低于>=2阈值，Hodge vs Motivic不同子领域"
rejected_candidates:
  - pair: "global_136 -> global_237"
    reason: "仅1个方法词(motivic)，但有1个对象词(schemes)，属于对象连续性"
  - pair: "global_287 -> global_69"
    reason: "已在math_ag_object_continuity中作为对象连续性案例，时间顺序相反"
allowed_files:
  - "pipeline/evolution_analysis.py"
  - "tests/test_evolution_analysis.py"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-17-math-ag-benchmark.md"
required_commands:
  - "pytest tests/test_evolution_analysis.py -q"
  - "make evolution-analysis"
  - "make math-ag-benchmark"
done_when:
  - "已有2个真实positive case和1个negative case"
  - "阈值微调后所有case通过验证"
  - "创建git commit"
```

## Dispatch Rules

分发时默认遵循：

1. 文档一致性问题先交 `doc-worker`
2. case 缺失问题先交 `case-worker`
3. 只有当 case 边界清楚时，才交 `rule-worker`

## Recommended Near-Term Order

接下来最推荐的顺序：

1. `MLO-01`
2. `MAG-01`
3. `MLO-03`
4. `MLO-02`
5. `MAG-02`
6. `MAG-03`

这个顺序的目的，是先把文档边界和 benchmark 边界收紧，再动规则。

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

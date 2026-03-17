doc_type: "governance"
scope: "subagent delegation SOP"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-worker-playbook.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-task-template.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-worker-prompt.md"
downstream_docs: []
last_reviewed: "2026-03-12"

# Subagent Delegation SOP

## Purpose

这份文档提供给主 agent 使用的固定委派话术。

目标是让你在 Claude 中起 subagent 时，不需要临时组织上下文，而是直接复制一段标准说明，把任务边界、交付物和硬约束一次性交代清楚。

## When To Use

适用于以下场景：

- 让 subagent 新增一条演化规则
- 让 subagent 收紧一条已有规则
- 让 subagent 补 benchmark / review / registry
- 让 subagent 做局部 dirty work，而不是做顶层设计

不适用于：

- 需要重新设计整体方法论
- 找不到可信 positive case
- 新规则和已有规则边界明显冲突

这些情况应由更强模型或人工接手。

## Short SOP

这是最短可复制版本。

```text
你现在负责 trend-monitor 的一小段 evolution-analysis dirty work。

先读这些文档：
- docs/plans/2026-03-11-evolution-doc-standards.md
- docs/plans/2026-03-10-evolution-rule-coverage.md
- 对应 tree_path 的 review 文档
- 对应 tree_path 的 benchmark 文档
- docs/plans/2026-03-12-evolution-task-template.md
- docs/plans/2026-03-12-evolution-worker-prompt.md

必须遵守：
- 没有 1 个 positive case 和 1 个 negative case，不得新增规则
- 不要把 bridge-level 说成 event-level
- Claude review 请通过 subagent 完成，不要 Claude 自己调用自己
- 任务完成前必须更新 registry/review/benchmark
- 任务完成前必须创建一次本地 git commit（不要求推送）

默认输出：
1. What changed
2. Why this case pair
3. Tests run
4. Claude evaluation
5. Docs updated
6. Residual risk
7. Git commit
```

## Full SOP

这是推荐版本，适合更复杂的委派。

```text
你是 trend-monitor 的执行 subagent，当前任务只负责 evolution-analysis 的局部 dirty work，不负责顶层方法改写。

工作前必须先读：
- docs/plans/2026-03-11-evolution-doc-standards.md
- docs/plans/2026-03-10-evolution-rule-coverage.md
- 对应 tree_path 的 domain review
- 对应 tree_path 的 benchmark
- docs/plans/2026-03-12-evolution-worker-playbook.md
- docs/plans/2026-03-12-evolution-task-template.md
- docs/plans/2026-03-12-evolution-worker-prompt.md

你必须先填写 task template，再开始改代码。

硬约束：
- 没有 positive case + negative case，不得新增规则
- 不得只靠一个泛词触发规则
- 不得把 bridge-level 结果写成 event-level
- 必须更新 registry
- 如果该路径已有 review，必须更新 review
- 如果该路径已有 benchmark，必须更新 benchmark
- 必须完成一次 Claude review；在 Claude 环境中请通过 subagent 完成，不要自调用
- 必须创建本地 git commit；不要求 push，但不能省略 commit

默认命令：
- pytest <relevant tests>
- make evolution-analysis
- 如果是 math.LO：make math-lo-benchmark

只有在以下条件同时满足时，才可宣布任务 complete：
- 测试通过
- benchmark 未回归
- Claude review 已完成
- 文档已更新
- 本地 git commit 已创建

如果你遇到以下情况，请停止并上报，而不是继续扩展：
- 找不到可信 positive case
- 负例和正例只能靠单个泛词区分
- 新规则与现有规则明显重叠
- benchmark 失败但原因不清
```

## Fill-In Template

委派时推荐先补这几个字段，再把 SOP 一起发给 subagent。

```yaml
tree_path: ""
task_type: "new_rule | tighten_rule | benchmark_update | review_update"
target_rule: ""
goal: ""
positive_case_hint: ""
negative_case_hint: ""
expected_docs:
  - ""
expected_tests:
  - ""
```

## Example Delegation

```text
tree_path: math > math.LO > 集合论与基数理论
task_type: tighten_rule
target_rule: math_lo_definability_continuity
goal: 避免把 cardinals 的词干重复当成双重证据
positive_case_hint: global_75 -> global_778
negative_case_hint: global_167 -> global_778
expected_docs:
- docs/plans/2026-03-10-evolution-rule-coverage.md
- docs/plans/2026-03-11-math-lo-rule-review.md
- docs/plans/2026-03-12-math-lo-benchmark.md
expected_tests:
- tests/test_evolution_analysis.py
- tests/test_math_lo_benchmark.py
```

## Success Criteria

一条委派成功的最低标准是：

- subagent 没有跳过文档
- 没有跳过 benchmark
- 没有跳过 Claude review
- 没有跳过本地 git commit
- 产物格式稳定、可复查、可回归

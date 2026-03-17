doc_type: "governance"
scope: "evolution-analysis task template"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-11-evolution-doc-standards.md"
  - "docs/plans/2026-03-12-evolution-worker-playbook.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
downstream_docs: []
last_reviewed: "2026-03-12"

# Evolution Task Template

## Purpose

这份文档提供一个最小任务模板，供后续模型或贡献者执行演化规则 dirty work。

目标是把一轮规则迭代收敛成固定格式，而不是每次重新组织流程。

## When To Use

在以下情况使用这份模板：

- 新增一条规则
- 收紧一条规则阈值
- 为某条规则补 benchmark
- 为某个 `tree_path` 补 review

## Minimal Task Checklist

一轮任务至少要完成：

- [ ] 先确认 `tree_path`
- [ ] 先确认这是新增规则还是已有规则收紧
- [ ] 找到 1 个 positive case
- [ ] 找到 1 个 negative case
- [ ] 修改代码
- [ ] 修改测试
- [ ] 跑测试
- [ ] 跑 `make evolution-analysis`
- [ ] 做 Claude 评估（Claude 环境优先 subagent）
- [ ] 更新 registry
- [ ] 更新 review
- [ ] 更新 benchmark
- [ ] 创建本地 git commit

## Copy-Paste Task Block

后续模型应先复制这段，再逐项填写：

```yaml
task_type: "new_rule | tighten_rule | benchmark_update | review_update"
tree_path: ""
target_rule: ""
change_goal: ""
positive_case:
  anchor: ""
  target: ""
  expected_relation: ""
negative_case:
  anchor: ""
  target: ""
  expected_relation: "none | not <rule>"
benchmark_case_ids:
  - ""
code_files:
  - "pipeline/evolution_analysis.py"
test_files:
  - "tests/test_evolution_analysis.py"
doc_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - ""
commands_to_run:
  - "pytest ..."
  - "make evolution-analysis"
  - "make math-lo-benchmark"
claude_review_mode: "subagent | claude-p | external reviewer"
claude_prompt_summary: ""
git_commit_message: ""
completion_status: "draft | partial | complete"
```

## Required Output Format

一轮任务结束时，结果应至少包含以下 6 项：

1. `What changed`
2. `Why this case pair`
3. `Tests run`
4. `Claude evaluation`
5. `Docs updated`
6. `Residual risk`
7. `Git commit`

## Minimal Command Template

如果是 `math.LO` 路径，默认命令为：

```bash
pytest tests/test_evolution_analysis.py tests/test_math_lo_benchmark.py -q
make evolution-analysis
make math-lo-benchmark
```

如果不是 `math.LO`，至少保留：

```bash
pytest <relevant tests>
make evolution-analysis
```

## Do Not Do

弱模型不得：

- 直接新增规则但不补 negative case
- 跳过 benchmark 更新
- 只说“规则有效”而不给具体 case
- 把 `bridge-level` 写成 `event-level`
- 在没有 Claude 评估的情况下宣布规则稳定
- 在没有本地 git commit 的情况下宣布任务完成

## Good Completion Example

```text
task_type: tighten_rule
tree_path: math > math.LO > 集合论与基数理论
target_rule: math_lo_definability_continuity
change_goal: 避免把 cardinals 的词干重复当成双重证据
positive_case:
  anchor: global_75
  target: global_778
  expected_relation: math_lo_definability_continuity
negative_case:
  anchor: global_167
  target: global_778
  expected_relation: none
completion_status: complete
```

## Escalate Instead Of Continuing

如果出现以下情况，应暂停，而不是继续填模板：

- 找不到可信 positive case
- 负例和正例只能靠一个泛词区分
- 新规则和已有规则无法划边界
- benchmark 失败但原因不明

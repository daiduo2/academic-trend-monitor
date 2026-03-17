doc_type: "governance"
scope: "evolution-analysis worker execution"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-11-evolution-doc-standards.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
downstream_docs:
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
last_reviewed: "2026-03-12"

# Evolution Worker Playbook

## Purpose

这份文档用于约束后续执行演化规则 dirty work 的模型或贡献者。

目标是尽量减少以下几类常见错误：

- 直接拍脑袋新增规则
- 只写结论，不补正反例
- 不区分 `bridge-level` 与 `event-level`
- 跳过 registry / review / benchmark
- 因为词面相似而误加关系

## Hard Constraints

以下规则必须遵守。

1. **先查文档，再动代码**
   - 先看：
     - [2026-03-11-evolution-doc-standards.md](docs/plans/2026-03-11-evolution-doc-standards.md)
     - [2026-03-10-evolution-rule-coverage.md](docs/plans/2026-03-10-evolution-rule-coverage.md)
     - 对应 `tree_path` 的 review / benchmark

2. **没有正反例，不得新增规则**
   - 至少准备：
     - 1 个 positive case
     - 1 个 negative case

3. **没有 benchmark，不得宣布规则 ready**
   - 没有 benchmark 的规则最多是 `partial`

4. **不得把桥接证据当成事件证据**
   - `bridge-level` 和 `event-level` 必须明确区分

5. **不得只靠单个泛词触发规则**
   - 例如：
     - `logic`
     - `model`
     - `theory`
     - `set`
     - `program`

## Required Workflow

每次新增或修改规则，顺序固定为：

1. 先确认 `tree_path`
2. 查 registry 是否已有相近规则
3. 用真实 case 找正反例
4. 修改代码
5. 跑测试
6. 跑 `make evolution-analysis`
7. 做 Claude 评估
8. 更新 registry
9. 更新 domain review
10. 更新 benchmark
11. 创建本地 git commit

如果做不到 8-11，不能说“这条规则已经完成”。

## Allowed Claims

弱模型只能使用以下几种结论词：

- `implemented`
- `partial`
- `bridge-level positive`
- `event-level positive`
- `needs review`
- `not supported yet`

不要使用：

- `solved`
- `complete`
- `generalized`
- `works across the field`

## Default Decision Rules

如果不确定如何判断，默认遵循：

1. 优先不触发规则，而不是放宽规则
2. 优先增加负例，而不是继续增加词表
3. 优先写 `partial`，而不是写 `ready`
4. 优先在已有 `tree_path` 下继续收敛，而不是开新领域

## Minimum Output Standard

一次合格的规则迭代，最少要留下：

- 代码改动
- 测试
- registry 更新
- review 更新
- benchmark 更新
- Claude 评估结论
- 本地 git commit

缺任何一项，都视为未闭环。

## Task Template

执行 dirty work 时，优先直接使用：

- [2026-03-12-evolution-task-template.md](docs/plans/2026-03-12-evolution-task-template.md)

不要每次重新组织任务结构。

## Claude Evaluation Mode

如果工作在 Claude 环境中：

- 优先起一个 subagent 做规则评估
- 不要让 Claude 自己调用自己

只有在当前环境支持外部 CLI 调用时，才使用 `claude -p` 作为 fallback。

## Escalation Conditions

出现以下情况时，不要继续自动扩展规则，应暂停并交给更强模型或人工：

- 找不到可信 positive case
- 只有词面相似，没有结构连续性
- 正例和负例只能靠一两个泛词区分
- 一个规则需要同时解释太多不同路径
- 新规则会和已有规则严重重叠

## Current Preferred Focus

当前优先级固定为：

1. 先补 benchmark
2. 再补现有路径 review
3. 最后才新增规则

也就是说，默认不要继续横向开领域。

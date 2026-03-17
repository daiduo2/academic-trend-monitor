doc_type: "governance"
scope: "evolution-analysis skill and plugin design"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-11-evolution-doc-standards.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-worker-playbook.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-task-template.md"
downstream_docs:
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-math-worker-backlog.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-subagent-delegation-sop.md"
last_reviewed: "2026-03-12"

# Evolution Skills Design

## Purpose

这份文档定义 `trend-monitor` 演化规则 dirty work 的 skills / plugin 骨架。

目标不是让弱模型“自己推进项目”，而是把它约束在固定角色和固定任务包里执行。

## Why Skills

当前问题不是规则体系不存在，而是执行形态太自由。

弱模型在以下场景里最容易打转：

- 开放式继续推进
- 一次同时做 case、rule、doc 三件事
- benchmark 变绿后过早升级规则状态
- 把 synthetic test 当成真实 benchmark

因此，默认执行形态应改为：

- 先由强模型或人工定义任务包
- 再由 skill 化的 worker 执行局部工作
- 最后由统一入口检查闭环

## Skill Topology

第一版建议固定为 4 个 skills：

1. `/case-worker`
2. `/rule-worker`
3. `/doc-worker`
4. `/delegate-evolution`

其中前三者是执行角色，最后一个是分发入口。

## Worker Contracts

### `/case-worker`

作用：

- 找正例、负例、模糊例
- 整理 case block
- 输出为什么这组 case 能区分规则边界

允许：

- 更新 benchmark 文档
- 更新 review 文档里的 case inventory
- 产出手动 replay 结论

禁止：

- 不改 `pipeline/evolution_analysis.py`
- 不直接升级规则状态
- 不把 synthetic test 写成 benchmark case

成功标准：

- 至少产出 1 个 positive case
- 至少产出 1 个 negative case
- case 与目标规则边界明确

### `/rule-worker`

作用：

- 修改规则实现
- 修改测试
- 跑必要命令
- 汇报规则对正反例的影响

允许：

- 修改 `pipeline/evolution_analysis.py`
- 修改相关测试
- 更新 benchmark 脚本或检查脚本

禁止：

- 不决定长期方向
- 不自行新增领域
- 不自行把 `partial` 提升为 `ready`

成功标准：

- 代码和测试一起落地
- 必跑命令通过
- 输出 residual risk

### `/doc-worker`

作用：

- 更新 registry / review / benchmark / task docs
- 规范规则状态和案例登记
- 清理文档不一致

允许：

- 修改 `docs/plans/*.md`
- 同步 README / AGENTS 中的入口

禁止：

- 不改规则实现
- 不创造新的技术结论
- 不把单元测试结果包装成真实 benchmark

成功标准：

- 文档结构符合 standard skeleton
- registry、review、benchmark 三者一致

### `/delegate-evolution`

作用：

- 接收任务包
- 判断分配给哪个 worker
- 检查闭环是否完成
- 明确下一步是否需要更强模型介入

禁止：

- 不直接写规则实现
- 不绕过 benchmark 和 Claude review

## Slash Command Inputs

### `/delegate-evolution`

建议输入固定为：

```yaml
tree_path: ""
task_type: "case_update | rule_update | benchmark_update | review_update | status_cleanup"
target_rule: ""
goal: ""
positive_case_hint: ""
negative_case_hint: ""
allowed_files:
  - ""
required_commands:
  - ""
```

输出固定为：

```yaml
assigned_worker: "case-worker | rule-worker | doc-worker"
why_this_worker: ""
must_update_docs:
  - ""
must_run_commands:
  - ""
stop_conditions:
  - ""
completion_requirements:
  - "Claude review"
  - "local git commit"
```

### `/case-worker`

输入最少包含：

- `tree_path`
- `target_rule`
- `positive_case_hint`
- `negative_case_hint`

输出最少包含：

- `candidate_positive_cases`
- `candidate_negative_cases`
- `recommended_case_pair`
- `ambiguity_notes`

### `/rule-worker`

输入最少包含：

- `tree_path`
- `target_rule`
- `selected_positive_case`
- `selected_negative_case`
- `allowed_files`

输出最少包含：

- `what_changed`
- `tests_run`
- `benchmark_impact`
- `residual_risk`

### `/doc-worker`

输入最少包含：

- `tree_path`
- `target_rule`
- `doc_targets`
- `status_intent`

输出最少包含：

- `docs_updated`
- `status_changes`
- `open_risks`

## Plugin Boundary

不建议第一版就做成重插件。

更合理的路线是：

1. 先把 4 个 skills 固化
2. 再做一个轻量 plugin 壳，只负责：
   - 路由 slash command
   - 注入 task template
   - 检查 completion checklist

plugin 第一版不负责：

- 自动改代码
- 自动判断规则成熟度
- 自动生成 benchmark 结论

## Required Guardrails

无论由哪个 worker 执行，都必须继承这些硬约束：

1. 没有正反例，不得新增规则
2. 没有 benchmark，不得宣布 `ready`
3. 不得把 `bridge-level` 写成 `event-level`
4. Claude 环境优先 subagent review，不要自调用
5. 每轮完成后必须创建本地 git commit

## Recommended Execution Order

默认顺序固定为：

1. `/delegate-evolution`
2. `/case-worker`
3. `/rule-worker`
4. `/doc-worker`
5. Claude review
6. local git commit

如果任务只是文档收束，可简化为：

1. `/delegate-evolution`
2. `/doc-worker`
3. Claude review
4. local git commit

## Failure Modes To Prevent

这套 skills 主要是为了抑制以下失败模式：

- worker 自行扩张任务边界
- rule-worker 一边改规则一边改成熟度
- doc-worker 根据测试结果过度乐观升级状态
- case-worker 只给词面相似例子
- delegate-worker 不做 stop-condition 检查

## First Implementation Scope

第一批建议只覆盖数学 dirty work：

- `math > math.LO`
- `math > math.AG`

不要一开始就面向全领域开放。

## Success Criteria

如果这套 skills 设计有效，应该能达到：

1. 弱模型不再需要自己决定“下一步做什么”
2. 每轮任务都能落在固定 task package 内
3. benchmark / review / registry 的同步率提高
4. `partial -> ready` 的升级更克制
5. 数学路径的规则开发速度更稳定

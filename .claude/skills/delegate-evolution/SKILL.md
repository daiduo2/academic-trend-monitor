# Delegate Evolution Skill

## Purpose

负责任务分发、路由决策和完成检查，确保整个演化规则开发流程闭环。

## When to Use

当需要：
- 启动一轮新的规则开发任务
- 判断应该分配给哪个 worker
- 检查任务是否可以继续推进
- 决定是否需要更强模型介入

## Allowed Actions

✅ **允许**
- 读取并解析任务包
- 根据任务类型路由到对应 worker
- 检查 stop conditions
- 验证完成条件
- 决定是否需要 escalate

## Forbidden Actions

❌ **禁止**
- 直接编写规则实现代码
- 绕过 benchmark 和 Claude review
- 自行决定新领域的优先级排序
- 在没有 case 的情况下继续推进规则开发

## Required Output

每个 delegate-evolution 任务必须输出：

```yaml
output:
  routing_decision:
    assigned_worker: ""           # case-worker | rule-worker | doc-worker
    reasoning: ""                 # 为什么选择这个 worker

  must_update_docs: []            # 必须更新的文档
  must_run_commands: []           # 必须运行的命令

  stop_conditions:
    - condition: ""               # 触发的停止条件
      action: "escalate"          # escalate | continue

  completion_requirements:
    - "Claude review completed"
    - "Local git commit created"
    - "Benchmark passed"

  next_steps: ""                  # 下一步建议
```

## Success Criteria

- [ ] 正确识别任务类型
- [ ] 合理分配给对应 worker
- [ ] 所有 stop conditions 被检查
- [ ] 明确 completion requirements

## Workflow

1. **读取任务包**
   ```yaml
   tree_path: ""
   task_type: ""
   target_rule: ""
   goal: ""
   ```

2. **检查前置条件**
   - `tree_path` 是否已在 registry 中？
   - 如果是新增规则，是否有 case pair？
   - benchmark 是否存在？

3. **路由决策**

   | 任务类型 | 分配 Worker |
   |---------|------------|
   | 需要找 case | case-worker |
   | 已有 case，需要实现规则 | rule-worker |
   | 需要更新文档 | doc-worker |
   | 规则已实现，需要补文档 | doc-worker |

4. **检查 Stop Conditions**

   以下情况必须 escalate：
   - 找不到可信 positive case
   - 正例负例只能靠单个泛词区分
   - 新规则与现有规则明显重叠
   - benchmark 失败但原因不清

5. **验证完成条件**

   任务完成前必须：
   - [ ] Claude review 已完成
   - [ ] Local git commit 已创建
   - [ ] Benchmark 未回归
   - [ ] 文档已更新

6. **输出下一步**
   - 明确下一步应该做什么
   - 如果需要，指派给下一个 worker

## Benchmark 绑定

使用 convention + fallback 机制：

```bash
# 优先尝试
make math-{xx}-benchmark

# Fallback（如果 make target 不存在）
python3 pipeline/math_benchmark.py --domain math_{xx}
```

映射规则：
- `math.LO` -> `math-lo`
- `math.AG` -> `math-ag`
- `math.QA` -> `math-qa`

## Stop Conditions

以下情况**停止并上报**：

| 条件 | 原因 | 建议 |
|-----|------|------|
| 找不到可信 positive case | 无法验证规则 | 扩大搜索范围或重新设计规则 |
| 正例负例只能靠泛词区分 | 规则边界不清 | 重新定义规则范围 |
| 新规则与现有规则重叠 | 重复造轮子 | 合并或明确区分 |
| benchmark 失败原因不明 | 需要调试 | 人工介入分析 |

## Completion Gate

任务标记为完成前，必须检查：

```yaml
completion_checks:
  - check: "Claude review"
    status: "completed"

  - check: "Local git commit"
    status: "created"
    verify: "git status shows no uncommitted changes"

  - check: "Benchmark"
    status: "passed"
    verify: "no regression in existing cases"

  - check: "Documentation"
    status: "updated"
    verify: "registry, review, benchmark in sync"
```

## Example

```yaml
# Input
tree_path: "math > math.LO > 模态逻辑"
task_type: "new_rule"
target_rule: "math_lo_modal_continuity_v2"
goal: "收紧规则阈值，避免误判"

# 前置检查
has_case_pair: false              # 缺少 case

# Output
routing_decision:
  assigned_worker: "case-worker"
  reasoning: "新增规则但缺少 case pair，必须先由 case-worker 找到合适的正例和负例"

must_update_docs:
  - "docs/plans/...-math-lo-benchmark.md"

stop_conditions: []               # 暂无阻断条件

completion_requirements:
  - "找到至少 1 个 positive case"
  - "找到至少 1 个 negative case"
  - "输出 case 推荐理由"

next_steps: "case-worker 完成后，将结果交给 rule-worker 实现规则"
```

## 第二轮示例

```yaml
# Input（case-worker 完成后）
tree_path: "math > math.LO > 模态逻辑"
task_type: "new_rule"
target_rule: "math_lo_modal_continuity_v2"
selected_positive_case:
  case_id: "lo-v2-b1"
selected_negative_case:
  case_id: "lo-v2-n1"

# 前置检查
has_case_pair: true

# Output
routing_decision:
  assigned_worker: "rule-worker"
  reasoning: "已有 case pair，可以开始实现规则"

must_run_commands:
  - "pytest tests/test_evolution_analysis.py -v"
  - "make math-lo-benchmark"

completion_requirements:
  - "规则实现通过测试"
  - "benchmark 通过"
  - "创建 git commit"

next_steps: "rule-worker 完成后，交给 doc-worker 更新文档"
```

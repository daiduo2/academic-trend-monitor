# Case Worker Skill

## Purpose

负责找到并整理 benchmark case，为规则开发提供正例、负例和模糊例。

## When to Use

当需要：
- 为新的演化规则寻找 case pair
- 补充现有规则的 benchmark case
- 分析规则边界和潜在模糊地带

## Allowed Actions

✅ **允许**
- 搜索和筛选 candidate cases
- 整理 case block 和 case inventory
- 更新 benchmark 文档
- 输出 case 推荐理由
- 标记 case 的 level (bridge-level / event-level)

## Forbidden Actions

❌ **禁止**
- 修改 `pipeline/evolution_analysis.py` 中的规则实现
- 直接升级规则状态 (partial -> ready)
- 创建 synthetic case 而不标注
- 将 bridge-level case 标记为 event-level

## Required Output

每个 case-worker 任务必须输出：

```yaml
output:
  candidate_positive_cases: []    # 至少 1 个
  candidate_negative_cases: []    # 至少 1 个
  recommended_pair:               # 推荐的 case pair
    positive:
      case_id: ""
      anchor: ""
      target: ""
      reason: ""
    negative:
      case_id: ""
      anchor: ""
      target: ""
      reason: ""
  ambiguity_notes: ""             # 边界模糊处说明
  boundary_definition: ""         # 与相邻规则的边界
```

## Success Criteria

- [ ] 至少产出 1 个 positive case
- [ ] 至少产出 1 个 negative case
- [ ] case 与目标规则边界明确
- [ ] 有清晰的推荐理由

## Workflow

1. **理解规则目标**
   - 读取 `tree_path` 和 `target_rule`
   - 理解规则要捕捉的演化关系

2. **搜索候选 case**
   - 从 `evolution_cases.json` 中筛选
   - 检查 topic graph 中的相邻关系
   - 标记 potential candidates

3. **评估 case 质量**
   - Positive: 应该触发规则
   - Negative: 不应该触发规则
   - Ambiguous: 边界模糊，需要 review

4. **输出推荐 pair**
   - 选择最能区分规则边界的 pair
   - 说明为什么这个 pair 能测试规则核心

5. **标记边界模糊处**
   - 哪些 case 可能处于灰色地带
   - 与相邻规则的边界在哪里

## Guardrails

执行前检查：
- `tree_path` 是否已在 registry 中登记？
- `target_rule` 是否有明确定义？

执行后检查：
- 是否有足够的 case 数量？
- 是否有清晰的边界说明？

## Example

```yaml
# Input
tree_path: "math > math.LO > 模态逻辑"
target_rule: "math_lo_modal_continuity"

# Output
candidate_positive_cases:
  - case_id: "lo-b1"
    anchor: "global_56"
    target: "global_27"

candidate_negative_cases:
  - case_id: "lo-n1"
    anchor: "global_56"
    target: "global_438"

recommended_pair:
  positive:
    case_id: "lo-b1"
    reason: "直觉主义逻辑到概率逻辑的连续演化，共享 modal + semantics"
  negative:
    case_id: "lo-n1"
    reason: "到 LLM 数学推理无连续性，不应触发 modal 规则"

ambiguity_notes: "集合论 case 与 modal logic case 的边界在 proof theory"
```

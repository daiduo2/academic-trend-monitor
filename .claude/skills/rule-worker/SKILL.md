# Rule Worker Skill

## Purpose

负责实现和修改演化规则，确保规则通过 benchmark 验证。

## When to Use

当需要：
- 新增一条演化规则
- 收紧/放宽规则阈值
- 修复 benchmark regression
- 优化规则性能

## Allowed Actions

✅ **允许**
- 修改 `pipeline/evolution_analysis.py` 中的规则实现
- 修改相关测试文件
- 更新 benchmark 脚本
- 运行测试和 benchmark
- 调整 taxonomy 权重
- 补充 negative case

## Forbidden Actions

❌ **禁止**
- 决定规则长期方向或新增领域
- 自行将规则状态从 `partial` 提升为 `ready`
- 修改 `allowed_files` 之外的文件
- 创造 synthetic case 作为正例
- 将 bridge-level 提升为 event-level 而不经过 review

## Required Output

每个 rule-worker 任务必须输出：

```yaml
output:
  what_changed: ""              # 代码变更摘要
  why_this_case_pair: ""        # 为什么选择这对 case
  tests_run: []                 # 运行的测试
  benchmark_impact:             # benchmark 影响
    positive_cases:
      - case_id: ""
        before: ""
        after: ""
    negative_cases:
      - case_id: ""
        before: ""
        after: ""
  residual_risk: ""             # 剩余风险
  git_commit_hash: ""           # git commit hash
```

## Success Criteria

- [ ] 代码和测试一起落地
- [ ] 必跑命令通过
- [ ] 至少 1 个 positive case 通过
- [ ] 至少 1 个 negative case 正确拒绝
- [ ] 输出 residual risk
- [ ] 创建本地 git commit

## Workflow

1. **读取输入**
   - 确认 `selected_positive_case` 和 `selected_negative_case`
   - 理解 `target_rule` 要实现的逻辑
   - 检查 `allowed_files`

2. **分析现有代码**
   - 查看 `evolution_analysis.py` 中相关规则
   - 理解相邻规则的边界
   - 确定修改位置

3. **实现规则**
   - 添加/修改规则逻辑
   - 确保严格遵循 `tree_path` 隔离
   - 保持代码风格一致

4. **运行测试**
   ```bash
   pytest tests/test_evolution_analysis.py -v
   ```

5. **运行 Benchmark**
   ```bash
   make math-{xx}-benchmark
   # 或 fallback:
   python3 pipeline/math_benchmark.py --domain math_{xx}
   ```

6. **分析结果**
   - 正例是否命中？
   - 负例是否正确拒绝？
   - 是否有 regression？

7. **调优**
   - 调整阈值
   - 调整 taxonomy 权重
   - 补充负例保护

8. **提交**
   - 创建 git commit
   - 输出 summary

## Guardrails

执行前检查：
- 是否有明确的 case pair？
- `allowed_files` 是否包含目标文件？

执行中检查：
- 是否只修改了允许的文件？（防止 out_of_scope_edit）

执行后检查：
- benchmark 是否通过？
- 是否有 regression？
- 是否创建了 git commit？

## Risk Management

如果发现以下情况，**停止并上报**，不要继续：

- 正例和负例只能靠一个泛词区分
- 新规则与已有规则边界明显冲突
- benchmark 失败但原因不明
- 找不到可信 positive case

## Example

```yaml
# Input
target_rule: "math_lo_modal_continuity"
selected_positive_case:
  case_id: "lo-b1"
  anchor: "global_56"
  target: "global_27"
selected_negative_case:
  case_id: "lo-n1"
  anchor: "global_56"
  target: "global_438"
allowed_files:
  - "pipeline/evolution_analysis.py"
  - "tests/test_math_lo_benchmark.py"

# Output
what_changed: |
  收紧 math_lo_modal_continuity 阈值：
  - 从 shared_objects >= 1 改为 >= 2
  - 新增 shared_methods >= 1 要求

tests_run:
  - "pytest tests/test_evolution_analysis.py -v"
  - "make math-lo-benchmark"

benchmark_impact:
  positive_cases:
    - case_id: "lo-b1"
      before: "hit"
      after: "hit"
  negative_cases:
    - case_id: "lo-n1"
      before: "false_positive"
      after: "correctly_rejected"

residual_risk: |
  当前阈值可能对弱 modal 联系过于严格，
  后续需要补充更多 edge case 验证。

git_commit_hash: "abc1234"
```

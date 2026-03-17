# Doc Worker Skill

## Purpose

负责更新和维护文档，确保 registry、review、benchmark 三者一致。

## When to Use

当需要：
- 更新规则注册表 (registry)
- 同步 review 文档
- 更新 benchmark 文档
- 清理文档不一致

## Allowed Actions

✅ **允许**
- 修改 `docs/plans/*.md`
- 更新 registry 中的规则状态
- 同步 review 文档与代码实现
- 更新 benchmark 文档格式
- 检查并标记文档不一致

## Forbidden Actions

❌ **禁止**
- 修改规则实现代码
- 创造新的技术结论
- 根据测试结果过度乐观升级状态
- 将单元测试结果包装成真实 benchmark
- 自行决定规则从 `partial` 升为 `ready`

## Required Output

每个 doc-worker 任务必须输出：

```yaml
output:
  docs_updated: []              # 更新的文档列表
  status_changes:               # 状态变更
    - doc: "registry"
      rule: ""
      from: ""
      to: ""
  consistency_status:           # 一致性检查结果
    registry_vs_review: "synced | outdated"
    review_vs_benchmark: "synced | outdated"
    benchmark_vs_code: "synced | outdated"
  open_risks: []                # 开放风险
  git_commit_hash: ""           # git commit hash
```

## Success Criteria

- [ ] 文档结构符合 standard skeleton
- [ ] registry、review、benchmark 三者一致
- [ ] 所有状态变更有明确理由
- [ ] 创建本地 git commit

## Workflow

1. **读取当前状态**
   - 读取 registry (`evolution-rule-coverage.md`)
   - 读取 review 文档
   - 读取 benchmark 文档
   - 检查代码实现

2. **检查一致性**
   - registry vs review: 规则列表是否一致？
   - review vs benchmark: case 是否同步？
   - benchmark vs code: 规则实现是否匹配？

3. **更新 Registry**
   - 添加/更新规则条目
   - 更新状态 (但不得自行升到 `ready`)
   - 补充缺失字段

4. **更新 Review 文档**
   - 同步规则列表
   - 更新案例登记
   - 添加新的 observation

5. **更新 Benchmark 文档**
   - 同步 case 列表
   - 更新预期结果
   - 标记 level 和 confidence

6. **标记不一致**
   - 如果存在无法自动修复的不一致，标记出来
   - 建议下一步行动

7. **提交**
   - 创建 git commit
   - 输出 summary

## Document Standards

### Registry 条目格式

```yaml
rule_name: "math_xx_object_continuity"
tree_path: "math > math.XX"
path_scope: "prefix"
status: "partial"              # 不得自行改为 ready
rule_type: "domain_specific"
trigger_sketch:
  - "条件1"
  - "条件2"
positive_examples:
  - "case_id"
counter_examples:
  - "case_id"
implemented_in:
  - "pipeline/evolution_analysis.py"
claude_evaluation:
  required: true
  representative_cases: []
  conclusion: ""
```

### Review 文档结构

- Domain Overview
- Rule Inventory
- Case Analysis
- Boundary Discussion
- Open Questions

### Benchmark 文档结构

- Scope
- Case List (positive / negative / ambiguous)
- Expected Relations
- Level Classification
- Review Schedule

## Guardrails

执行前检查：
- 是否有权限修改这些文档？
- 状态升级是否经过 Claude review？

执行后检查：
- 文档格式是否符合标准？
- 链接是否有效？

## Risk Management

以下情况需要**特别注意**：

- 试图将 `partial` 改为 `ready`：必须有 benchmark 和 review 支持
- benchmark 文档只有 synthetic case：需要标记并补充真实 case
- registry 中规则的 `implemented_in` 与实际代码不匹配：需要同步

## Example

```yaml
# Input
doc_targets:
  - doc: "registry"
    action: "update"
  - doc: "review"
    action: "sync"

status_intent:
  current: "partial"
  target: "partial"              # 不升级，只同步
  justification: "补充案例登记"

# Output
docs_updated:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"

status_changes: []               # 无状态变更，只是同步

consistency_status:
  registry_vs_review: "synced"
  review_vs_benchmark: "synced"
  benchmark_vs_code: "synced"

open_risks:
  - "math_lo_modal_continuity 还需要补充 2 个负例"

git_commit_hash: "def5678"
```

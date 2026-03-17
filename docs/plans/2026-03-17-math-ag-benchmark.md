doc_type: "benchmark"
scope: "math > math.AG"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-11-evolution-doc-standards.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
downstream_docs: []
last_reviewed: "2026-03-17"

# Math.AG Benchmark

## Purpose

这份文档固定 `math.AG` 的代表性 benchmark case。

用于验证 `math_ag_object_continuity` 和 `math_ag_method_continuity` 规则的边界。

## Scope

范围限定为：

- `math > math.AG`
- 代数簇与模空间相关主题

## Case List

### Positive Cases - Object Continuity

| Case ID | Anchor | Target | Expected Relation | Level | Confidence |
|---------|--------|--------|-------------------|-------|------------|
| `ag-b1` | `global_69` 代数叠与层理论 | `global_287` 导出代数叠范畴 | `math_ag_object_continuity` | event-level | 0.85 |
| `ag-e2` | `global_69` 代数叠与层理论 | `global_287` 导出代数叠范畴 | `math_ag_object_continuity` | event-level | 0.85 |

### Positive Cases - Method Continuity

| Case ID | Anchor | Target | Expected Relation | Level | Confidence |
|---------|--------|--------|-------------------|-------|------------|
| `ag-method-p1` | `global_136` 动机层与亨泽尔层 | `global_263` 平展上同调与光滑性 | `math_ag_method_continuity` | bridge-level | 0.82 |
| `ag-method-p2` | `global_237` 母题上同调与规范群 | `global_263` 平展上同调与光滑性 | `math_ag_method_continuity` | bridge-level | 0.80 |

**Method Continuity Case Details:**

#### `ag-method-p1`: global_136 → global_263

- **Anchor** `global_136`: 动机层与亨泽尔层 (math.AG)
  - 方法词: `motivic`, `étale`, `schemes`
  - 对象词: `schemes`, `sheaves`
- **Target** `global_263`: 平展上同调与光滑性 (math.AG)
  - 方法词: `cohomology`, `motivic`, `étale`
  - 对象词: 无
- **分析**:
  - 共享方法词: `motivic`, `étale` (2个)
  - 共享对象词: 无 (0个)
  - 时间顺序: 2025-06 → 2025-10
  - 结论: **纯方法连续性**，没有对象连续性干扰

#### `ag-method-p2`: global_237 → global_263

- **Anchor** `global_237`: 母题上同调与规范群 (math.AG)
  - 方法词: `cohomology`, `motivic`, `etale`, `schemes`
  - 对象词: `schemes`
- **Target** `global_263`: 平展上同调与光滑性 (math.AG)
  - 方法词: `cohomology`, `motivic`, `étale`
  - 对象词: 无
- **分析**:
  - 共享方法词: `cohomology`, `motivic` (2个)
  - 共享对象词: 无 (0个)
  - 时间顺序: 2025-09 → 2025-10
  - 结论: **纯方法连续性**

### Negative Cases

| Case ID | Anchor | Target | Expected Relation |
|---------|--------|--------|-------------------|
| `ag-n1` | `global_30` 法诺簇模空间曲线 | `global_287` 导出代数叠范畴 | `none` |
| `ag-n2` | `global_30` 法诺簇模空间曲线 | `global_69` 代数叠与层理论 | `none` |
| `ag-method-n1` | `global_215` 霍奇商上同调猜想 | `global_237` 母题上同调与规范群 | `not math_ag_method_continuity` |

**Negative Case Details:**

#### `ag-method-n1`: global_215 → global_237

- **Anchor** `global_215`: 霍奇商上同调猜想 (math.AG)
  - 方法词: `cohomology`, `algebraic`, `hodge`
  - 核心领域: Hodge theory
- **Target** `global_237`: 母题上同调与规范群 (math.AG)
  - 方法词: `cohomology`, `motivic`, `etale`
  - 核心领域: Motivic/Gauge theory
- **分析**:
  - 共享方法词: `cohomology` (1个，低于>=2阈值)
  - 结论: **不触发方法连续性**
  - 原因: 仅1个方法词，且分属不同子领域(Hodge vs Motivic)

## Expected Relations

- `ag-b1`, `ag-e2` 必须命中 `math_ag_object_continuity`
- `ag-method-p1`, `ag-method-p2` 必须命中 `math_ag_method_continuity`

## Expected Non-Relations

- `ag-n1` 不能因为共享 `projective` 泛词就误判
- `ag-method-n1` 不能因为共享单个 `cohomology` 就误判为方法连续性

## Review Notes

### Object vs Method Continuity Distinction

关键区分标准:

| 维度 | Object Continuity | Method Continuity |
|------|-------------------|-------------------|
| 触发条件 | 共享 >=2 对象词 | 共享 >=2 方法词 |
| 典型对象词 | varieties, curves, moduli, stacks, sheaves | - |
| 典型方法词 | - | cohomology, derived, motivic, étale |
| 边界情况 | 共享对象词 >=2 时优先 | 共享对象词 <2 时才考虑 |

### Method Continuity Case Selection Criteria

真实 method continuity case 必须满足:

1. 共享 >=2 个方法词 (cohomology, derived, motivic, tropical, étale 等)
2. 共享对象词 <2 个 (确保不是对象连续性)
3. 有合理的时间顺序 (anchor 早于 target)
4. 方法词是真正的方法/技术，不是泛词

### Current Assessment (2026-03-17)

**math_ag_object_continuity**: `ready`
- 已有 2 个 event-level 正例 (ag-b1, ag-e2)
- Benchmark: 2/2 positive PASS, 4/5 negative PASS (ag-n5 为已知反向演化问题)

**math_ag_method_continuity**: `partial` ✅ **已验证**
- 已有 2 个真实 bridge-level 正例 (ag-method-p1, ag-method-p2)
- 已有 1 个真实 negative case (ag-method-n1)
- **Threshold 验证**: `len(shared_math_ag_methods) >= 2`
  - ag-method-p1: 共享 motivic, étale (2个) → PASS
  - ag-method-p2: 共享 cohomology, motivic (2个) → PASS
  - ag-method-n1: 共享 cohomology (1个) → 正确拒绝
- **结论**: 当前阈值正确，无需微调
- 尚未达到 `ready` 所需的 2 个 event-level 正例
- 状态保持 `partial`，不可升级

## Change Log

- `2026-03-17`
  - 初版建立
  - 添加 object continuity cases (ag-b1, ag-e2)
  - 添加 method continuity positive cases (ag-method-p1, ag-method-p2)
  - 添加 method continuity negative case (ag-method-n1)
  - 明确 method continuity 选取标准

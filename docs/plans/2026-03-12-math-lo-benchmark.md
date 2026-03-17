doc_type: "benchmark"
scope: "math > math.LO"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-11-evolution-doc-standards.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
downstream_docs: []
last_reviewed: "2026-03-14"

# Math.LO Benchmark

## Purpose

这份文档固定 `math.LO` 的代表性 benchmark case。

用途不是证明系统已经完成，而是给后续规则迭代、弱模型维护和回归检查提供一个统一基准。

## Scope

范围限定为：

- `math > math.LO`
- 以及与其直接相关的 `cs.LO` 跨路径连续性

## Case List

### Positive Cases

| Case ID | Anchor | Target | Expected Relation | Level | Confidence |
|---------|--------|--------|-------------------|-------|------------|
| `lo-b1` | `global_56` 直觉主义逻辑证明 | `global_27` 概率逻辑与自动机语义 | `math_lo_modal_continuity` | event-level | 0.88 |
| `lo-e2` | `global_977` 模态逻辑 | `global_1155` 非经典逻辑 | `math_lo_modal_continuity` | event-level | 0.92 |
| `lo-b2` | `global_56` 直觉主义逻辑证明 | `global_980` 程序线性化与类型 | `math_lo_type_theory_continuity` | bridge-level | 0.85 |
| `lo-b3` | `global_313` 基数与超滤子公理 | `global_360` ZF基数选择公理 | `math_lo_set_theory_continuity` | bridge-level | 0.80 |
| `lo-b4` | `global_51` 基数与波莱尔公理 | `global_951` 基数与力迫法 | `math_lo_forcing_continuity` | bridge-level | 0.82 |
| `lo-b5` | `global_75` 基数迭代强制法 | `global_778` 武丁公理与可定义性 | `math_lo_definability_continuity` | bridge-level | 0.81 |

### Negative Cases

| Case ID | Anchor | Target | Expected Relation |
|---------|--------|--------|-------------------|
| `lo-n1` | `global_51` 基数与波莱尔公理 | `global_75` 基数迭代强制法 | `not math_lo_forcing_continuity` |
| `lo-n2` | `global_339` 基数、理想与力迫法 | `global_951` 基数与力迫法 | `none` |
| `lo-n3` | `global_167` 可定义基数塔基序 | `global_778` 武丁公理与可定义性 | `none` |
| `lo-n4` | `global_361` 亨泽尔域存在可定义性 | `global_778` 武丁公理与可定义性 | `none` |
| `lo-n5` | `global_56` 直觉主义逻辑证明 | `global_438` 大语言模型数学推理 | `none` |

### Ambiguous Cases

| Case ID | Anchor | Target | Current Status | Note |
|---------|--------|--------|----------------|------|
| `lo-a1` | `global_75` 基数迭代强制法 | `global_951` 基数与力迫法 | review-needed | 与 forcing 支路接近，但当前缺 `axiom` |
| `lo-a2` | `global_339` 基数、理想与力迫法 | `global_51` 基数与波莱尔公理 | review-needed | 对象连续性接近，但证据不足 |

## Expected Relations

- `lo-b1` 必须命中 `math_lo_modal_continuity`
- `lo-e2` 必须命中 `math_lo_modal_continuity`
- `lo-b2` 必须命中 `math_lo_type_theory_continuity`
- `lo-b3` 必须命中 `math_lo_set_theory_continuity`
- `lo-b4` 必须命中 `math_lo_forcing_continuity`
- `lo-b5` 必须命中 `math_lo_definability_continuity`

## Expected Non-Relations

- `lo-n1` 不能因为共享 `forcing` 就误判成 `math_lo_forcing_continuity`
- `lo-n2` 不能因为共享 `cardinal + forcing` 就误判
- `lo-n3` 不能因为 `definable + cardinals` 的弱联系就误判
- `lo-n4` 不能因为 `definable` 单词本身就误判
- `lo-n5` 不能把一般 AI 推理主题误判成类型理论连续性

## Review Notes

- 当前 benchmark 混合了 `event-level` 与 `bridge-level` 两种粒度
- 后续优先目标不是增加 case 数量，而是让更多 `bridge-level` case 升到 `event-level`
- 每次新增 `math.LO` 规则时，必须至少补一个 positive case 和一个 negative case 到这份文档

## Change Log

- `2026-03-14`
  - 新增 positive case `lo-e2` (global_977 → global_1155)
  - 更新 `math_lo_modal_continuity` 规则状态为 `ready`
  - 添加 Confidence 列到 positive cases 表格

- `2026-03-12`
  - 初版建立
  - 固定 5 个 positive、5 个 negative、2 个 ambiguous case

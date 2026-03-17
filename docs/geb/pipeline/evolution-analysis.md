<!-- docs/geb/pipeline/evolution-analysis.md -->
@geb-leaf #evolution-analysis
@mirror ./pipeline/evolution_analysis.py
@loop #pipeline
@invariant "Rule registry matches implemented rules"
@invariant "Taxonomy weights documented accurately"
@emerge "update rule registry on new rule added"

# 主题演化分析

## 功能

分析跨时间主题之间的演化关系，识别连续、分化、跃迁等演化模式。

## 输入输出

| 类型 | 路径 | 格式 |
|------|------|------|
| 输入 | `data/output/aligned_topics_hierarchy.json` | JSON |
| 输入 | `data/output/topics_tree.json` | JSON |
| 输出 | `data/output/evolution_analysis.json` | JSON |
| 输出 | `data/output/topic_graph.json` | JSON |

## 演化规则体系

### 通用规则

| 规则 | 触发条件 | 描述 |
|------|----------|------|
| `continuous` | 关键词重叠 ≥30% 且历史连续 | 主题自然延续 |
| `diffusion` | 下游多分支继承 | 主题扩散分化 |
| `emergence` | 无显著父主题的新主题 | 新兴主题 |

### 领域特化规则

#### Math.AG (代数几何)

| 规则 | 触发条件 | 状态 |
|------|----------|------|
| `math_ag_object_continuity` | ≥2 个共享对象 + taxonomy 验证 | ready |
| `math_ag_method_continuity` | ≥2 个共享方法或 method_overlap≥1.5 | partial |

对象 Taxonomy:
- `variety_family`: variety, varieties, fano, calabi-yau...
- `moduli_and_stack`: moduli, stack, stacks...
- `sheaf_and_bundle`: sheaf, sheaves, bundle, bundles...
- `scheme_level`: scheme, schemes, projective...

#### Math.LO (数理逻辑)

| 规则 | 触发条件 | 状态 |
|------|----------|------|
| `math_lo_modal_continuity` | ≥2 modal objects + ≥1 modal method | ready |
| `math_lo_set_theory_continuity` | ≥3 set objects 或 2+1 | partial |
| `math_lo_forcing_continuity` | forcing_domain + axiom + 4 objects | partial |
| `math_lo_type_theory_continuity` | type_theory_domain + 2 objects | partial |
| `math_lo_definability_continuity` | definability_domain + cardinal | partial |

## 关键函数

| 函数 | 职责 |
|------|------|
| `analyze_evolution_cases()` | 主分析入口 |
| `build_bridge_evidence()` | 构建主题间桥接证据 |
| `_score_taxonomy_overlap()` | 计算 taxonomy 重叠度 |
| `classify_diffusion_kind()` | 分类扩散类型 |

## Guardrails

- `no_cases_no_rule`: 无案例的规则保持 gap 状态
- `no_premature_ready`: 至少 2 个 event-level 案例才能 ready
- `no_synthetic_in_benchmark`: 正例必须来自真实数据

## 同构代码

- @mirror ./pipeline/evolution_analysis.py

## 相关节点

- @geb-node #pipeline - 返回流水线总览
- @geb-leaf #math-lo-benchmark - Math.LO 规则验证
- @geb-leaf #math-ag-benchmark - Math.AG 规则验证
- @geb-leaf #alignment - 上一步：主题对齐

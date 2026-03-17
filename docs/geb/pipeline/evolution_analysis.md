<!-- docs/geb/pipeline/evolution_analysis.md -->
@geb-leaf #evolution-analysis
@mirror ./pipeline/evolution_analysis.py
@loop #pipeline
@invariant "Rule registry matches implemented relations"
@invariant "Taxonomy weights match benchmark results"
@emerge "update registry on rule change"

# 演化分析框架

## 功能

分析学术主题的历史演化关系，识别主题间的连续性、分叉、融合等模式。

## 核心能力

| 能力 | 说明 |
|------|------|
| Bridge Evidence | 构建主题间演化的证据链 |
| Relation Classification | 分类演化关系类型 |
| Taxonomy-based Matching | 基于领域 taxonomy 的对象/方法匹配 |
| Consistency Check | 演化一致性验证 |

## 支持的演化关系

### 通用关系
- `same_lineage` - 同一线路继承
- `diffusion` - 知识扩散
- `transfer` - 方法迁移
- `alias_risk` - 别名风险

### Math.AG 专用关系
- `math_ag_object_continuity` - 代数几何对象连续性
- `math_ag_method_continuity` - 代数几何方法连续性

### Math.LO 专用关系
- `math_lo_modal_continuity` - 模态逻辑连续性
- `math_lo_set_theory_continuity` - 集合论连续性
- `math_lo_forcing_continuity` - 力迫法连续性
- `math_lo_definability_continuity` - 可定义性连续性
- `math_lo_type_theory_continuity` - 类型论连续性

## Taxonomy 体系

### Math.AG 对象分类
```python
MATH_AG_OBJECT_TAXONOMY = {
    "variety_family": {"variety", "varieties", "fano", "calabi-yau", ...},
    "moduli_and_stack": {"moduli", "stack", "stacks", ...},
    "sheaf_and_bundle": {"sheaf", "sheaves", "bundle", ...},
    "scheme_level": {"scheme", "schemes", "projective", ...},
}
```

### 规则状态

| 规则 | 状态 | 正例数 | 级别 |
|------|------|--------|------|
| math_ag_object_continuity | ready | 2 | event-level |
| math_lo_modal_continuity | ready | 2 | event-level |
| math_lo_set_theory_continuity | partial | - | bridge-level |
| math_lo_forcing_continuity | partial | - | bridge-level |

## 输入输出

| 类型 | 路径 | 格式 |
|------|------|------|
| 输入 | `data/output/aligned_topics.json` | JSON |
| 输出 | `data/output/evolution_analysis.json` | JSON |
| 输出 | `data/output/benchmarks/*/` | Reports |

## 同构代码

- @mirror ./pipeline/evolution_analysis.py

## 相关节点

- @geb-node #pipeline - 返回流水线总览
- @geb-leaf #math-lo-benchmark - Math.LO 基准测试
- @geb-leaf #math-ag-benchmark - Math.AG 基准测试
- @geb-leaf #alignment - 上一步：主题对齐

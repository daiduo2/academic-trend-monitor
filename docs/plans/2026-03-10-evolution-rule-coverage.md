# Evolution Rule Coverage Matrix

## 目的

这份文档用于维护 `trend-monitor` 历史演化分析器中“自然演化规则”的适配状态。

从现在开始，这张表 **强制复用项目已有的层次化主题树视角**。

维护单位不再只是 `Layer 1` / `Layer 2`，而是完整的 **`tree_path`**：

- `Layer 1`：固定学科
- `Layer 2`：固定 arXiv 子类
- `Layer 3+`：动态主题树节点

也就是说，后续规则登记的首选主键应为：

- `tree_path`
- 或者某个明确的路径前缀

例如：

- `cs`
- `cs > cs.CV`
- `math > math.AG`
- `math > math.AG > 代数簇与模空间`
- `hep > hep-th > 量子场论与弦论`

这样做的原因很直接：

1. 规则开发应该沿现有树结构逐步下钻，而不是按零散案例漂移。
2. 同一个 `Layer 2` 下，不同动态主题分支也可能有不同演化规律。
3. 增量更新后，规则可以继续挂在相同路径或路径前缀上，而不是重新命名领域。

## 维护约定

- 每次新增或明显修改演化解释规则后，都要更新这张表。
- 新规则必须优先登记到某个 `tree_path` 或路径前缀。
- 如果当前只确认到上层范围，可以先挂到 `Layer 1` / `Layer 2` 路径前缀。
- 如果已经明确适用于某个动态分支，应直接写完整路径，而不是只写泛领域名。
- 如果规则只是少量案例验证，状态必须写 `partial`。
- 如果某个 `Layer 1` / `Layer 2` 还没有规则，不要留空，明确写 `gap`。
- 新增规则时，必须先按下方“规则登记模板”登记，再更新主表。
- 新增关系后，必须挑选代表性案例做一次 Claude 评估，并把结论写回开发记录或汇总说明。
- 如果在 Claude 环境中执行，优先使用 subagent 完成评估；只有在当前环境支持 CLI 自调用时才使用 `claude -p`。
- 每次完成规则写入后，必须创建一次本地 git commit，即使不推送到远程仓库。
- 对于纯理论领域，优先补 `math` / `hep` / `math-ph` 等路径，再扩展到应用或交叉路径。

## 规则登记模板

每次新增规则时，先按这个模板补一条记录，再决定要不要把它提升到主表。

```yaml
rule_name: ""
tree_path: ""
path_scope: "exact | prefix"
status: "ready | partial | gap"
rule_type: "general | domain_specific"
trigger_sketch:
  - ""
positive_examples:
  - ""
counter_examples:
  - ""
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - ""
claude_evaluation:
  required: true
  representative_cases:
    - ""
  conclusion: ""
```

字段说明：

- `rule_name`
  - 规则内部名称，例如 `formal_structure_same_lineage`
- `tree_path`
  - 规则挂载的主题树路径或路径前缀
- `path_scope`
  - `exact` 表示只适用于当前路径
  - `prefix` 表示适用于当前路径及其后代分支
- `status`
  - 当前成熟度
- `rule_type`
  - 通用规则还是领域特化规则
- `trigger_sketch`
  - 最小触发逻辑，不写实现细节
- `positive_examples`
  - 当前支持这条规则的案例
- `counter_examples`
  - 容易误判或尚未解决的反例
- `implemented_in`
  - 代码落点
- `notes`
  - 任何需要提醒后续维护者的信息
- `claude_evaluation`
  - 新增关系后必须补
  - 至少包含代表案例和一句总结结论

## 已登记规则

```yaml
rule_name: "math_ag_object_continuity"
tree_path: "math > math.AG"
path_scope: "prefix"
status: "ready"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 都位于 math.AG 路径"
  - "共享至少 2 个代数几何对象词，如 varieties / curves / moduli / stacks / sheaves"
positive_examples:
  - "math > math.AG > 代数簇与模空间 邻域内的对象连续演化"
  - "ag-e2: global_69 (stacks/stack) -> global_287 (sheaf/stacks), event-level, confidence=0.85"
counter_examples:
  - "仅共享一个泛词，如 projective，不应直接触发"
  - "global_30 -> global_355: 仅共享 curves + adic，对象重叠不足（需>=2对象词）"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "用于把对象层面的连续演化与一般形式结构连续性拆开"
  - "当前已加入对象 taxonomy 与层次权重，开始区分 exact overlap / same-class overlap / related-class overlap"
  - "已有 2 个正例 (ag-b1 和 ag-e2)，进入 ready 状态"
  - "对象词典盲点（2026-03-17发现）:"
  - "  - varieties/curves/moduli/bundles/surfaces 分布不均，同一路径下对象差异可能很大"
  - "  - global_30 (法诺簇) 与 global_355 (阿贝尔簇) 同属'代数簇与模空间'，但仅共享1个对象词"
claude_evaluation:
  required: true
  representative_cases:
    - "global_30-2025-02"
    - "ag-e2: global_69 -> global_287"
    - "negative: global_30 -> global_355 (仅共享 curves，不足以触发)"
  conclusion: "math.AG taxonomy v3 比 v2 更具本体解释力；ag-e2 案例验证了 stacks/sheaf/bundle 在 moduli_and_stack 与 sheaf_and_bundle 类别间的连续演化，related-class overlap 机制有效。规则已有 2 个正例，已进入 ready 状态。新增 negative case (global_30 -> global_355) 验证阈值有效性：仅共享1个对象词(curves) + 1个泛词(adic)时，正确不触发连续性。"
```

```yaml
rule_name: "math_ag_method_continuity"
tree_path: "math > math.AG"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 都位于 math.AG 路径"
  - "共享至少 2 个方法词，如 cohomology / derived / motivic / tropical / étale"
positive_examples:
  - "上同调、导出几何、热带几何等方法链路"
  - "ag-method-p1: global_136 (动机层与亨泽尔层) -> global_263 (平展上同调与光滑性)"
  - "  共享方法词: motivic, étale (2个)，无共享对象词，纯方法连续性"
  - "ag-method-p2: global_237 (母题上同调与规范群) -> global_263 (平展上同调与光滑性)"
  - "  共享方法词: cohomology, motivic (2个)，无共享对象词，纯方法连续性"
counter_examples:
  - "对象连续性更强时，不应误标成 method continuity"
  - "ag-method-n1: global_215 (霍奇商上同调猜想) -> global_237 (母题上同调与规范群)"
  - "  仅共享1个方法词(cohomology)，低于>=2阈值，不同子领域(Hodge vs Motivic)"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "用于把 math.AG 中的方法迁移和对象迁移分开建模"
  - "⚠️ TEST EVIDENCE ONLY / NOT BENCHMARK-READY"
  - "原因: 虽有2个真实bridge-level cases，但无event-level cases"
  - "现状: cases时间跨度太短(2025-06->2025-10, 2025-09->2025-10)，不足以构成evolution事件"
  - "决策: 维持test-evidence-only状态，不进入benchmark runner"
  - "未来: 只有当找到event-level cases后才考虑benchmark化"
claude_evaluation:
  required: true
  representative_cases:
    - "global_30-2025-02 (synthetic validation only)"
    - "ag-method-p1: global_136 -> global_263 (positive, bridge-level)"
    - "ag-method-p2: global_237 -> global_263 (positive, bridge-level)"
    - "ag-method-n1: global_215 -> global_237 (negative, only 1 method word)"
  conclusion: "math_ag_object/method_continuity 拆分方向合理。2026-03-17重要更新: ⚠️ 将method_continuity明确降级为TEST EVIDENCE ONLY。原因: 找到的cases(ag-method-p1/p2)均为bridge-level，时间跨度不足(仅1-4个月)，无法构成event-level evolution。这些cases验证阈值有效性，但不足以支持benchmark runner。决策: method_continuity维持test-evidence-only状态，不进入math_ag_benchmark.py主流程。只有当未来找到event-level cases(跨期明显evolution信号)后才考虑重新评估。"
```

```yaml
rule_name: "math_lo_formal_system_continuity"
tree_path: "math > math.LO"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 都位于 math.LO 路径"
  - "共享至少 2 个核心形式对象，如 modal / automata / model / satisfiability / semantics"
  - "且至少共享 1 个方法词，如 intuitionistic / definable / sequent / computable"
positive_examples:
  - "模态逻辑、模型论、类型论、集合论之间的形式系统连续演化"
counter_examples:
  - "仅因通用词如 theory / sets 命中而误判"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "第一版规则，先覆盖逻辑、模型论、集合论、类型论等结构对象"
  - "已根据 Claude 反馈收紧阈值，避免仅靠 logic / semantics 这类宽泛词误判"
claude_evaluation:
  required: true
  representative_cases:
    - "global_208-2025-08"
    - "global_27-2025-02"
  conclusion: "math_lo_formal_system_continuity 以“>=2 个核心对象 + >=1 个方法”为当前工作阈值更合理；单对象共享（如仅 cardinals）不足以触发该关系。"
```

```yaml
rule_name: “math_lo_modal_continuity”
tree_path: “math > math.LO > 数理逻辑 > 模态逻辑 / 非经典逻辑”
path_scope: “prefix”
status: “ready”
rule_type: “domain_specific”
trigger_sketch:
  - “anchor 与 target 都位于 math.LO 的模态逻辑 / 非经典逻辑 / 直觉主义逻辑 / 概率逻辑路径”
  - “共享至少 2 个 modal object，如 modal / logic / semantics / proof / satisfiability / calculus”
  - “且至少共享 1 个 modal method，如 intuitionistic / probabilistic / sequent / hoare / smt”
positive_examples:
  - “直觉主义逻辑 -> 概率逻辑 (global_56 -> global_27)”
  - “模态逻辑 -> 非经典逻辑 (global_977 -> global_1155)”
counter_examples:
  - “集合论 / 力迫法 / 大基数等形式对象，不应被 modal 规则误伤”
implemented_in:
  - “pipeline/evolution_analysis.py”
notes:
  - “作为 math.LO 的第一条子域规则，优先覆盖 modal / non-classical logic 这条更稳定的连续性支路”
  - “当前已有多个 event-level 正例 (lo-b1, lo-e2)，状态从 partial 升级为 ready”
  - “若只共享 modal 词而没有方法词，不触发该关系”
claude_evaluation:
  required: true
  representative_cases:
    - “global_56-2025-03”
    - “global_51-2025-03”
    - “global_977-2025-03”
    - “global_1155-2025-03”
  conclusion: “规则已验证可信；`global_56-2025-03` 作为直觉主义逻辑向概率逻辑/自动机语义的 theory spillover 正例可信，`global_977 -> global_1155` 作为模态逻辑向非经典逻辑的 event-level 正例进一步巩固了规则有效性。`global_51` 这类集合论样本作为负例也合理。当前阈值应继续保持”shared_math_lo_core_objects >= 2 且 shared_math_lo_modal_methods >= 1”的必要条件。”
```

```yaml
rule_name: "math_lo_set_theory_continuity"
tree_path: "math > math.LO > 集合论与基数理论"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 都位于 math.LO 的集合论与基数理论 / 力迫法路径"
  - "共享至少 3 个 set object，如 cardinal / cardinals / forcing / axiom / ultrafilter / zf / choice"
  - "或者共享至少 2 个 set object 且共享至少 1 个 set method，如 definable / iterable / constructive / realizability"
positive_examples:
  - "基数与超滤子公理 -> ZF基数选择公理"
  - "基数与波莱尔公理 -> 基数迭代强制法"
counter_examples:
  - "只共享 cardinal + forcing 的弱重叠 (global_339 -> global_51)"
  - "只共享 cardinals + definable 的可定义性弱联系 (global_167 -> global_75)"
  - "global_167 (可定义基数塔基序) -> global_75 (基数迭代强制法): 仅共享1个set对象(cardinals)，且分属不同子分支(ultrafilter vs iterable/woodin)"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "这条规则偏对象连续性，不像 modal/non-classical logic 那样依赖方法词"
  - "当前在 bridge 级别已有正例，但自动 replay 主事件还未稳定覆盖到这条规则，因此先保持 partial"
claude_evaluation:
  required: true
  representative_cases:
    - “global_313 -> global_360 (positive, bridge-level)”
    - “global_51 -> global_75 (positive, bridge-level)”
    - “global_339 -> global_51 (negative, only 2 shared objects)”
    - “global_167 -> global_75 (negative, only 1 shared object - cardinals)”
  conclusion: “规则值得保留，其中 `global_51 -> global_75` 更可信；`global_339 -> global_51` 作为只共享 cardinal + forcing 的负例，说明当前”至少 3 个共享对象，或 2 个对象 + 1 个方法”的阈值是有效的。新增负例 `global_167 -> global_75` (仅共享 cardinals) 进一步验证：仅共享1个set对象不足以触发连续性，可有效防止 ultrafilter 分支与 iterable/woodin 分支的误判。”
```

```yaml
rule_name: "math_lo_forcing_continuity"
tree_path: "math > math.LO > 集合论与基数理论 > 力迫法"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 位于力迫法 / 大基数与力迫法 / 集合论与数理逻辑相关路径，允许 math.LO 与 cs.LO 跨顶层触发"
  - "shared_math_lo_forcing_objects 必须包含 axiom"
  - "且共享至少 4 个 forcing object，或共享至少 3 个 forcing object 并共享至少 1 个 forcing method"
positive_examples:
  - "基数与波莱尔公理 -> 基数与力迫法"
counter_examples:
  - "基数迭代强制法 -> 基数与力迫法"
  - "基数、理想与力迫法 -> 基数与力迫法"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "这条规则的目标是识别 forcing / large-cardinal 逻辑族在 math.LO 与 cs.LO 之间的跨路径连续性"
  - "当前主要在 bridge 级别可验证，还没有在自动 replay 主事件里稳定浮现"
claude_evaluation:
  required: true
  representative_cases:
    - "global_51 -> global_951 (bridge-level)"
    - "global_75 -> global_951 (negative)"
    - "global_339 -> global_951 (negative)"
  conclusion: "规则值得保留；`global_51 -> global_951` 作为正例可信，而 `global_75 -> global_951` 这种只差 `axiom` 的对照例说明 `axiom` 应作为必要判别词保留在阈值中。WARNING: 当前正例均为 bridge-level，规则状态应保持 partial，不可升为 ready。"
```

```yaml
rule_name: "math_lo_type_theory_continuity"
tree_path: "math > math.LO > 数理逻辑 > 直觉主义逻辑"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 位于 math.LO 的数理逻辑 / 非经典逻辑 / 直觉主义逻辑路径"
  - "target 位于 cs.LO 的逻辑与形式化方法 / 自动推理与证明路径"
  - "共享至少 2 个 type object，目前只保留 type / types / typed"
  - "anchor 侧还需出现 proof / calculus / intuitionistic 等 source term，target 侧需出现 program / languages / subtyping / correctness 等 target term"
positive_examples:
  - "直觉主义逻辑证明 -> 程序线性化与类型"
counter_examples:
  - "直觉主义逻辑证明 -> 大语言模型数学推理"
  - "程序线性化与类型 -> 大语言模型数学推理"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "这条规则捕捉的是 proof/calculus 到 type/programming-logic 的跨路径连续性，而不是泛化的模型论规则"
  - "当前共享对象层已刻意收窄到 type / types / typed，proof / calculus / program 只作为 source/target 辅助证据"
claude_evaluation:
  required: true
  representative_cases:
    - "global_56 -> global_980"
    - "global_56 -> global_438"
    - "global_980 -> global_438"
  conclusion: "规则值得保留；`global_56 -> global_980` 体现了 proof-to-type-system 的经典理论连续性。当前应保持 shared type objects >= 2，并继续避免把 proof / calculus / program 这类高频词放回共享对象层。"
```

```yaml
rule_name: "math_lo_definability_continuity"
tree_path: "math > math.LO > 集合论与基数理论"
path_scope: "prefix"
status: "partial"
rule_type: "domain_specific"
trigger_sketch:
  - "anchor 与 target 位于 math.LO / cs.LO 的集合论与基数理论 / 逻辑与形式化方法相关路径"
  - "必须共享 definable 这一方法词"
  - "共享对象里必须同时出现 cardinal/cardinals 与至少一个 special object，如 woodin / axiom / reals / uniformization"
positive_examples:
  - "基数迭代强制法 -> 武丁公理与可定义性"
counter_examples:
  - "可定义基数塔基序 -> 武丁公理与可定义性"
  - "亨泽尔域存在可定义性 -> 武丁公理与可定义性"
implemented_in:
  - "pipeline/evolution_analysis.py"
notes:
  - "这是比 model-theory 更窄的一条 definability 支路，只覆盖 set-theoretic definability 的跨路径连续性"
  - "当前已刻意避免把 cardinal/cardinals 的词干重复当成双重证据，必须再共享一个更专门的对象词"
  - "当前规则仅在 bridge-level 可验证，尚未进入 event-level"
  - "状态保持 partial 直至出现 event-level 正例"
claude_evaluation:
  required: true
  representative_cases:
    - "global_75 -> global_778 (bridge-level)"
    - "global_167 -> global_778 (negative)"
    - "global_361 -> global_778 (negative)"
  conclusion: "规则值得保留；`global_75 -> global_778` 是可信正例。阈值应保持’共享 definable + 共享 cardinal/cardinals + 至少一个 special object（如 woodin/axiom）’，从而避免把只有 definable 或只有 cardinals 的弱联系误判成连续性。WARNING: 当前所有正例均为 bridge-level，规则状态应保持 partial，不可升为 ready。"
```

## 状态定义

| 状态 | 含义 |
|------|------|
| `ready` | 已进入主流程，且当前有回放案例支持 |
| `partial` | 已实现，但只覆盖少量子场景或案例 |
| `gap` | 当前尚无专门适配 |

## 通用骨架

这些规则不绑定具体学科层级，属于全局基础设施。

| Rule | Scope | Status | Implemented In | Notes |
|------|-------|--------|----------------|-------|
| topic temporal graph | 全领域 | `ready` | `pipeline/evolution_analysis.py` | 基础图状态层，包含 `belongs_to` / `active_in` / `adjacent_to` / `evolves_from` |
| event extraction | 全领域 | `ready` | `pipeline/evolution_analysis.py` | 提取 `emerged` / `expanded` / `diffused_to_neighbor` / `specialized_into_child` / `merged_into_parent` / `migrated_to_new_category` / `weakened` / `stabilized` |
| topic profile | 全领域 | `ready` | `pipeline/evolution_analysis.py` | `method` / `problem` / `hybrid` / `theory` 解释层 |
| bridge evidence | 全领域 | `ready` | `pipeline/evolution_analysis.py` | 输出 `shared_keywords` / `bridge_topics` / `target_evidence_titles` / `category_flow` / `pipeline_relation` / `bridge_strength` |
| alias risk | 全领域 | `partial` | `pipeline/evolution_analysis.py` | 当前主要覆盖中英文别名与高关键词重叠 |
| persistence checks | 全领域 | `ready` | `pipeline/evolution_analysis.py` | 包含 target / anchor / relative persistence |
| consistency check | 全领域 | `partial` | `pipeline/evolution_analysis.py` | 当前主要识别“高桥接但弱承接”的矛盾，需要更多 Layer 2 特化规则支持 |

## Tree Path Registry

这是后续维护的主登记表。`Layer 1` / `Layer 2` 只是它的上层前缀。

| Tree Path | Layer Span | Coverage | Status | Current Rule | Notes |
|-----------|------------|----------|--------|--------------|-------|
| `cs` | L1 | 中 | `partial` | 通用规则 | 当前只有部分分支开始特化 |
| `cs > cs.CV` | L1-L2 | 中 | `partial` | `representation_to_perception_same_pipeline` | 目前主要覆盖 3D 视觉方向 |
| `eess > eess.IV` | L1-L2 | 中 | `partial` | `imaging_to_analysis_same_pipeline` | 作为医学影像链路上游来源域 |
| `math` | L1 | 低到中 | `partial` | `formal_structure_same_lineage` | 仅代表“数学已纳入考虑”，不代表所有子域已适配 |
| `math > math.AG` | L1-L2 | 中 | `ready` | `math_ag_object_continuity`, `math_ag_method_continuity`, `formal_structure_same_lineage` | `math_ag_object_continuity` 已有 2 个正例，进入 ready 状态 |
| `math > math.LO` | L1-L2 | 中 | `partial` | `math_lo_formal_system_continuity`, `math_lo_modal_continuity`, `math_lo_type_theory_continuity`, `math_lo_set_theory_continuity`, `math_lo_forcing_continuity`, `math_lo_definability_continuity` | 已从通用形式系统连续性下钻到 modal、type-theory、set theory、forcing、definability 五条子路径；modal 规则已升级为 ready |
| `math > math.GR` | L1-L2 | 高 | `ready` | `math_gr_object_continuity` | 群论领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.RT` | L1-L2 | 高 | `ready` | `math_rt_object_continuity` | 表示论领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.RA` | L1-L2 | 高 | `ready` | `math_ra_object_continuity` | 环与代数领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.QA` | L1-L2 | 高 | `ready` | `math_qa_object_continuity` | 量子代数领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.AT` | L1-L2 | 高 | `ready` | `math_at_object_continuity` | 代数拓扑领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.GT` | L1-L2 | 高 | `ready` | `math_gt_object_continuity` | 几何拓扑领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.GN` | L1-L2 | 高 | `ready` | `math_gn_object_continuity` | 一般拓扑领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.AP` | L1-L2 | 高 | `ready` | `math_ap_object_continuity` | 偏微分方程领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.CA` | L1-L2 | 高 | `ready` | `math_ca_object_continuity` | 经典分析领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.FA` | L1-L2 | 高 | `ready` | `math_fa_object_continuity` | 泛函分析领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.DS` | L1-L2 | 高 | `ready` | `math_ds_object_continuity` | 动力系统领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.DG` | L1-L2 | 高 | `ready` | `math_dg_object_continuity` | 微分几何领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.MG` | L1-L2 | 高 | `ready` | `math_mg_object_continuity` | 度量几何领域规则，共享 ≥2 对象 + ≥1 方法 |
| `math > math.CV` | L1-L2 | 高 | `ready` | `math_cv_object_continuity` | 复变函数领域规则，共享 ≥2 对象 + ≥1 方法 |
| `hep` | L1 | 中 | `partial` | `formal_structure_same_lineage` | 当前更多偏 `hep-th` |
| `hep > hep-th` | L1-L2 | 中 | `partial` | `formal_structure_same_lineage` | 规范理论 / 圈振幅 / 弦论邻域 |
| `stat` | L1 | 低 | `gap` | - | 尚无专门特化 |
| `econ` | L1 | 低 | `gap` | - | 尚无专门特化 |
| `q-bio` | L1 | 低 | `gap` | - | 尚无专门特化 |
| `astro-ph` | L1 | 低 | `gap` | - | 尚无专门特化 |

## Layer 1 Coverage

这是面向全局规划的压缩视图。实际登记以后以上面的 `Tree Path Registry` 为准。

| Layer 1 | Coverage | Current State | Layer 2 Focus | Notes |
|---------|----------|---------------|---------------|-------|
| `cs` | 中 | `partial` | `cs.CV` | 当前只有计算机视觉相关规则，NLP / systems / security 仍是空白 |
| `math` | 高 | `ready` | 全部核心子域 | 已覆盖 AG, LO, GR, RT, RA, QA, AT, GT, GN, AP, CA, FA, DS, DG, MG, CV 共16个子域，21条专门规则 |
| `hep` | 中 | `partial` | `hep-th` 起步 | 当前与数学共用理论结构连续性规则，仍然偏粗 |
| `eess` | 中 | `partial` | 与医学影像链路有关 | 当前更多是作为医学影像上游来源域出现 |
| `stat` | 低 | `gap` | 可优先考虑 `stat.ML` / `stat.ME` | 目前没有独立规则 |
| `econ` | 低 | `gap` | 可优先考虑因果推断与实验设计 | 目前没有独立规则 |
| `q-bio` | 低 | `gap` | 可优先考虑 `q-bio.QM` / `q-bio.BM` | 目前没有独立规则 |
| `astro-ph` | 低 | `gap` | 可优先考虑 survey / observation / ML 分析链路 | 目前只有通用规则 |
| `quant-ph` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `cond-mat` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `physics` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `gr-qc` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `nucl` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `q-fin` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `nlin` | 低 | `gap` | 待定 | 目前只有通用规则 |
| `math-ph` | 低 | `gap` | 待定 | 目前只有通用规则 |

## Layer 2 Coverage

这一层只记录“已经开始特化”或“下一步明确要做”的固定子类。

| Layer 1 | Layer 2 | Coverage | Status | Current Rule | Notes |
|---------|---------|----------|--------|--------------|-------|
| `cs` | `cs.CV` | 中 | `partial` | `representation_to_perception_same_pipeline` | 当前主要覆盖 3D 视觉 / 表示到感知的链路 |
| `math` | `math.AG` | 中 | `ready` | `math_ag_object_continuity`, `math_ag_method_continuity`, `formal_structure_same_lineage` | `math_ag_object_continuity` 已有 2 个正例 (ag-b1, ag-e2)，进入 ready 状态 |
| `hep` | `hep-th` | 中 | `partial` | `formal_structure_same_lineage` | 当前能覆盖部分规范理论 / 圈振幅 / 弦论邻域 |
| `eess` + `cs` | `eess.IV` / `cs.CV` | 中到高 | `ready` | `imaging_to_analysis_same_pipeline` | 当前医学影像链路实际跨多个 Layer 1/2，需要保留联合记录 |
| `stat` | `stat.ML` | 低 | `gap` | - | 可优先考虑因果估计、实验设计、推断流程链路 |
| `econ` | `econ.EM` / `econ.TH` / `econ.GN` | 低 | `gap` | - | 需要先梳理当前实际出现频繁的子类 |
| `math` | `math.LO` | 中 | `partial` | `math_lo_formal_system_continuity`, `math_lo_modal_continuity`, `math_lo_type_theory_continuity`, `math_lo_set_theory_continuity`, `math_lo_forcing_continuity`, `math_lo_definability_continuity` | 已出现 modal 正例 (lo-b1, lo-e2)，集合论 / forcing / type-theory / definability 支路也已有 bridge 级正例；modal 规则已升级为 ready |
| `math` | `math.CO` / `math.PR` / `math.NA` | 低 | `gap` | - | 这些子域不应直接复用 `math.AG` 的结构词逻辑 |

## 当前已落地的特化规则

| Rule | Preferred Tree Path | Status | Notes |
|------|---------------------|--------|-------|
| `imaging_to_analysis_same_pipeline` | `eess > eess.IV` and `cs > cs.CV` | `ready` | 对应“成像/重建 -> 分割/诊断/分析” |
| `representation_to_perception_same_pipeline` | `cs > cs.CV` | `partial` | 对应“表示/渲染 -> 感知/重建” |
| `math_ag_object_continuity` | `math > math.AG` | `ready` | 对应代数几何里对象层面的连续演化；已有 2 个正例 (ag-b1, ag-e2) |
| `math_ag_method_continuity` | `math > math.AG` | `partial` | 对应代数几何里方法层面的连续演化 |
| `math_lo_formal_system_continuity` | `math > math.LO` | `partial` | 对应逻辑 / 模型论 / 类型论 / 集合论的形式系统连续性 |
| `math_lo_modal_continuity` | `math > math.LO > 数理逻辑 > 模态逻辑 / 非经典逻辑` | `ready` | 对应模态逻辑、非经典逻辑、直觉主义逻辑、概率逻辑之间的局部连续性；已有 2 个 event-level 正例 (lo-b1, lo-e2) |
| `math_lo_type_theory_continuity` | `math > math.LO > 数理逻辑 > 直觉主义逻辑` | `partial` | 对应 proof/calculus 到 type/programming-logic 的跨路径连续性 |
| `math_lo_set_theory_continuity` | `math > math.LO > 集合论与基数理论` | `partial` | 对应基数理论、超滤子、公理、力迫法之间的对象连续性 |
| `math_lo_forcing_continuity` | `math > math.LO > 集合论与基数理论 > 力迫法` | `partial` | 对应 forcing / large-cardinal 邻域在 `math.LO` 与 `cs.LO` 之间的跨路径连续性 |
| `math_lo_definability_continuity` | `math > math.LO > 集合论与基数理论` | `partial` | 对应 set-theoretic definability 在 `math.LO` 与 `cs.LO` 之间的跨路径连续性 |
| `formal_structure_same_lineage` | `math > math.AG` and `hep > hep-th` 起步 | `partial` | 对应数学/理论主题的形式结构连续性 |

## 数学方向的当前判断

数学现在已经纳入主表，但仍然只是 **第一版 tree-path 适配**。

当前状态：

- `tree_path = math` 已有专门规则，不再是完全空白
- 更细的路径目前只在 `math > math.AG` 附近开始起步
- `math.AG` 现在已经开始区分对象连续性和方法连续性
- `math.AG` 的对象连续性已加入 taxonomy 与层次权重，但真实案例词典仍偏弱
- 其他数学子类还不能套用同一逻辑

这意味着：

- 现在可以说“数学已纳入考虑”
- 但不能说“数学内部各子域已经适配”

## 理论领域优先级

从规则开发顺序上，当前优先级建议明确向纯理论领域倾斜。

原因：

1. 纯理论领域的发展脉络通常更稳定，语义对象更清晰。
2. 这类领域更适合先验证“结构连续性”而不是“热点 carryover”。
3. 数学与理论物理可以作为方法论试验场，再把经验迁移到应用领域。

当前建议的优先顺序：

1. `math`
2. `hep`
3. `math-ph`
4. `cs > cs.CV`
5. 其他应用与交叉路径

## 数学方向下一步建议

建议严格沿 `Layer 2` 推进，而不是继续用一个泛化数学规则覆盖全部纯数。

| Priority | Tree Path | Suggested Rule |
|----------|-----------|----------------|
| P1 | `math > math.AG` | 区分“对象连续性”与“方法连续性” |
| P1 | `math > math.CO`, `math > math.DS` | 组合结构 / 离散过程的连续演化词表 |
| P1 | `math > math.PR`, `math > math.AP` | 概率对象 -> 分析方法 -> 极限行为的链路 |
| P1 | `math > math.LO` | 模型论 / 类型论 / 范畴论的形式系统连续性 |
| P2 | `math > math.NA` | 数值方法 -> PDE / 优化 / 计算框架链路 |
| P2 | `math > math.RT`, `math > math.QA` | 表示论 / 量子代数内部的对象迁移规则 |

## 下一批优先级

| Priority | Tree Path | Suggested Rule |
|----------|-----------|----------------|
| P1 | `math > math.LO` | 先落第一条形式系统连续性规则 |
| P1 | `math > math.AG` 起步，再扩到 `math > math.CO` / `math > math.PR` | 拆分数学内部子域规则 |
| P1 | `cs > cs.CV` | 细化 `representation -> perception -> planning` 的阶段 taxonomy |
| P2 | `stat > stat.ML`, `stat > stat.ME` | 因果推断、实验设计、识别策略之间的自然演化链路 |
| P2 | `econ > *` | 先从实际样本中归纳活跃路径，再定义规则 |
| P2 | `q-bio > q-bio.QM`, `q-bio > q-bio.BM` | 分子表示 -> 结合预测 -> 下游设计 |

## 更新清单

### 2026-03-14 (Math.AG)

- 更新 `math_ag_object_continuity` 规则
  - 添加 positive case `ag-e2` (global_69 -> global_287, stacks/stack -> sheaf/stacks)
  - 规则状态从 `partial` 升级为 `ready`（已有 2 个正例：ag-b1, ag-e2）
  - 更新 claude_evaluation 结论，验证 related-class overlap 机制有效
  - 创建 `pipeline/math_ag_benchmark.py` 和 benchmark 报告
- 同步更新 Tree Path Registry、Layer 2 Coverage 和已落地特化规则表格

### 2026-03-14 (Math.LO)

- 更新 `math_lo_modal_continuity` 规则
  - 添加 positive case `lo-e2` (global_977 -> global_1155)
  - 规则状态从 `partial` 升级为 `ready`（已有 2 个 event-level 正例：lo-b1, lo-e2）
  - 更新 claude_evaluation 结论，添加 global_977 和 global_1155 作为代表性案例
- 同步更新 Tree Path Registry 和 Layer 2 Coverage 表格中的 notes

### 2026-03-10

- 新增文档并建立规则覆盖矩阵
- 重构为”主题树路径优先”的视图，`Layer 1 -> Layer 2` 仅作为上层摘要
- 记录当前已落地的 3 条领域特化规则：
  - `imaging_to_analysis_same_pipeline`
  - `representation_to_perception_same_pipeline`
  - `formal_structure_same_lineage`
- 明确把数学标记为：
  - `tree_path = math` 为 `partial`
  - 更细路径仅 `math > math.AG` 起步，不是全数学适配

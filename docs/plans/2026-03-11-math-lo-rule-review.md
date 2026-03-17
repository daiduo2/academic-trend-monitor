# Math.LO Rule Review

## Summary

截至当前版本，`math.LO` 相关自然演化规则已经拆成 6 条：

- `math_lo_formal_system_continuity`
- `math_lo_modal_continuity`
- `math_lo_type_theory_continuity`
- `math_lo_set_theory_continuity`
- `math_lo_forcing_continuity`
- `math_lo_definability_continuity`

这些规则目前更适合作为 `bridge-level` 解释层，而不是主案例筛选层。

## Main Case Coverage

当前主产物 [evolution_cases.json](data/output/evolution_cases.json) 的 12 个自动案例里，出现过的规则只有：

- `representation_to_perception_same_pipeline`: 1
- `imaging_to_analysis_same_pipeline`: 2
- `formal_structure_same_lineage`: 1
- `math_ag_object_continuity`: 1

`math.LO` 六条规则在主 12 案例中当前都没有命中。

这说明：

- `math.LO` 规则已经能解释局部邻接关系
- 但当前 anchor 自动选择与事件主路径仍然偏向高热度案例
- 理论逻辑类规则更多停留在局部 replay / bridge evidence 层

## Manual Replay Signals

### 1. `math_lo_modal_continuity`

最稳定的真实正例：

- `global_56-2025-03`
  - `直觉主义逻辑证明 -> 概率逻辑与自动机语义`

判断：

- 当前最成熟的 `math.LO` 子规则
- 已在手动 replay 的事件层命中
- 可以视作 `math.LO` 中唯一进入“事件级有效”的规则

### 2. `math_lo_type_theory_continuity`

当前桥接正例：

- `global_56 -> global_980`
  - `直觉主义逻辑证明 -> 程序线性化与类型`

当前负例：

- `global_56 -> global_438`
- `global_980 -> global_438`

判断：

- 这条规则的结构是合理的
- 但目前还停留在 bridge-level
- 还没有在 replay 事件层浮现

### 3. `math_lo_set_theory_continuity`

当前桥接正例：

- `global_313 -> global_360`
  - `基数与超滤子公理 -> ZF基数选择公理`
- `global_51 -> global_75`
  - `基数与波莱尔公理 -> 基数迭代强制法`

当前负例：

- `global_339 -> global_51`
  - 仅共享 `cardinal + forcing`，弱重叠，不满足 `>=3` 对象阈值
- `global_167 -> global_75`
  - `可定义基数塔基序 -> 基数迭代强制法`
  - 仅共享 1 个 set 对象 (`cardinals`)，远低于阈值
  - global_167 核心对象: `ultrafilter`, `tukey` (超滤子理论方向)
  - global_75 核心对象: `iterable`, `woodin` (迭代/大基数方向)
  - 两者同属集合论但研究分支不同，不应触发连续性

判断：

- 这条规则在对象连续性上是通的
- 但事件层没有稳定命中
- 说明它更像”结构近邻解释器”，还不是”演化主路径解释器”
- **新增发现 (2026-03-17)**: `cardinals` 单共享不足触发，需区分 `cardinal arithmetic` vs `cardinal iteration` vs `ultrafilter theory` 分支

### 4. `math_lo_forcing_continuity`

当前桥接正例：

- `global_51 -> global_951`
  - `基数与波莱尔公理 -> 基数与力迫法`

当前负例：

- `global_75 -> global_951`
- `global_339 -> global_951`

判断：

- 当前最有价值的是跨 `math.LO -> cs.LO` 的 forcing / large-cardinal 连续性
- `axiom` 作为必要词后，规则明显更稳
- 仍未进入 replay 事件层

### 5. `math_lo_definability_continuity`

当前桥接正例：

- `global_75 -> global_778`
  - `基数迭代强制法 -> 武丁公理与可定义性`

当前负例：

- `global_167 -> global_778`
- `global_361 -> global_778`

判断：

- 这是目前最窄、也最干净的 `definability` 规则
- 已避免把 `cardinal/cardinals` 的词干重复当作双重证据
- 当前依然停留在 bridge-level

### 6. `math_lo_formal_system_continuity`

当前状态：

- 更像 `math.LO` 的总兜底规则
- 在细分规则增加后，应减少它直接承担解释的范围

判断：

- 后续应保留，但不应继续放宽
- 它更适合作为未覆盖子域的 fallback

## Current Assessment

按成熟度排序：

1. `math_lo_modal_continuity`
2. `math_lo_type_theory_continuity`
3. `math_lo_set_theory_continuity`
4. `math_lo_forcing_continuity`
5. `math_lo_definability_continuity`
6. `math_lo_formal_system_continuity`

其中：

- `modal` 已进入事件层
- `type / set / forcing / definability` 仍主要停留在 bridge-level
- `formal_system` 更像保底规则

## Recommended Next Step

下一步不建议继续横向增加更多 `math.LO` 规则数量。

更值的方向是二选一：

### Option A

改进 anchor 选择与事件抽取，让理论类 topic 更容易进入主案例。

目标：

- 让现有 `math.LO` 规则从 bridge-level 进入 event-level

### Option B

增加一份 `math.LO` 专门 benchmark case list。

目标：

- 固定评估：
  - `global_56 -> global_27`
  - `global_56 -> global_980`
  - `global_313 -> global_360`
  - `global_51 -> global_951`
  - `global_75 -> global_778`

推荐优先做 `Option B`，因为成本更低，且更适合当前规则开发阶段。

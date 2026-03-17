# Evolution Analysis Documentation Standard

## Goal

这份文档定义 `trend-monitor` 中演化分析相关文档的统一骨架。

目标不是“把所有内容写得更多”，而是让文档结构先固定下来，后续规则、评审、基准和迭代记录都沿同一骨架逐层收敛。

从现在开始，演化分析文档应优先回答 4 个问题：

1. **我们在描述哪一层对象**
2. **这份文档属于哪一种文档类型**
3. **它的成熟度处于什么阶段**
4. **它和上层/同层/下层文档是什么关系**

## Documentation Layers

演化分析文档统一分为 4 层。

### L0. Governance

作用：

- 定义文档标准
- 定义登记规则
- 定义维护流程

当前文档：

- [2026-03-11-evolution-doc-standards.md](docs/plans/2026-03-11-evolution-doc-standards.md)

### L1. Registry

作用：

- 描述“当前有哪些规则/路径/空白”
- 维护覆盖矩阵
- 维护 rule registry

当前文档：

- [2026-03-10-evolution-rule-coverage.md](docs/plans/2026-03-10-evolution-rule-coverage.md)

### L2. Domain Review

作用：

- 对某个 `tree_path` 做阶段性评审
- 汇总命中情况、局部 replay、盲点和优先级

当前文档：

- [2026-03-11-math-lo-rule-review.md](docs/plans/2026-03-11-math-lo-rule-review.md)

### L3. Benchmark

作用：

- 固定一组代表性正例/负例/模糊例
- 用于后续规则回归验证

当前状态：

- 还未正式建立，属于下一步优先项

## Required Document Types

每个演化分析方向至少应有以下 3 类文档：

1. `Registry`
2. `Domain Review`
3. `Benchmark`

如果缺其中任何一种，必须在 registry 或 review 中明确标注缺口，而不是默认“后面再说”。

## Required Metadata

从现在开始，演化分析文档应在开头显式写出以下元信息。

```yaml
doc_type: "governance | registry | domain_review | benchmark"
scope: ""
status: "draft | active | stable | deprecated"
owner: "trend-monitor"
source_of_truth: true | false
upstream_docs:
  - ""
downstream_docs:
  - ""
last_reviewed: "YYYY-MM-DD"
```

字段含义：

- `doc_type`
  - 文档类型
- `scope`
  - 作用范围，优先写 `tree_path` 或明确模块
- `status`
  - 文档成熟度
- `owner`
  - 当前维护归属
- `source_of_truth`
  - 是否是该主题下的主文档
- `upstream_docs`
  - 上游约束文档
- `downstream_docs`
  - 下游消费文档
- `last_reviewed`
  - 最后人工确认日期

## Required Skeletons

### A. Registry Skeleton

适用于规则总表和覆盖矩阵。

必备章节：

1. `Purpose`
2. `Scope`
3. `Maintenance Rules`
4. `Registration Template`
5. `Registered Rules`
6. `Coverage Matrix`
7. `Known Gaps`
8. `Next Review Targets`

### B. Domain Review Skeleton

适用于某个 `tree_path` 的阶段性复盘。

必备章节：

1. `Summary`
2. `Scope`
3. `Rule Inventory`
4. `Main Case Coverage`
5. `Manual Replay Signals`
6. `Failure Modes`
7. `Current Assessment`
8. `Recommended Next Step`

### C. Benchmark Skeleton

适用于固定样例集合。

必备章节：

1. `Purpose`
2. `Scope`
3. `Case List`
4. `Expected Relations`
5. `Expected Non-Relations`
6. `Review Notes`
7. `Change Log`

## Naming Convention

文档命名统一使用：

```text
YYYY-MM-DD-<topic>-<doc-kind>.md
```

例如：

- `2026-03-10-evolution-rule-coverage.md`
- `2026-03-11-math-lo-rule-review.md`
- `2026-03-12-math-lo-benchmark.md`

其中 `<doc-kind>` 建议只用：

- `doc-standards`
- `rule-coverage`
- `rule-review`
- `benchmark`
- `change-log`

## Tree-Path First Principle

演化分析文档的默认索引单位是 `tree_path`，不是泛领域名。

也就是说：

- 优先写 `math > math.LO > 数理逻辑 > 直觉主义逻辑`
- 不优先写“数学逻辑”

只有在规则尚未下钻时，才允许临时挂在更高层：

- `math`
- `math > math.LO`

## Progression Rule

逐层收敛的默认顺序固定为：

1. `Registry` 先登记
2. 再补 `Domain Review`
3. 最后建立 `Benchmark`

不允许跳过前两层，直接只留一份零散评审。

## Update Policy

当新增或修改一条演化规则时，文档更新顺序固定为：

1. 更新 `Registry`
2. 若该规则属于已有路径，更新对应 `Domain Review`
3. 若该路径已有 benchmark，补 benchmark
4. 用 Claude 做评估
5. 把 Claude 结论写回 registry/review
6. 创建本地 git commit

## Current Mapping

当前仓库中的映射关系如下：

| Document | Type | Scope | Role |
|----------|------|-------|------|
| [2026-03-11-evolution-doc-standards.md](docs/plans/2026-03-11-evolution-doc-standards.md) | `governance` | `evolution-analysis` | 顶层标准 |
| [2026-03-10-evolution-rule-coverage.md](docs/plans/2026-03-10-evolution-rule-coverage.md) | `registry` | `all tree_paths` | 规则总表 |
| [2026-03-11-math-lo-rule-review.md](docs/plans/2026-03-11-math-lo-rule-review.md) | `domain_review` | `math > math.LO` | 子域复盘 |

## Immediate Next Step

按这套骨架，当前最值得补的不是新规则，而是：

- [ ] 建立 `math.LO` benchmark 文档
- [ ] 给 registry 和 review 文档补统一 metadata header
- [ ] 在 README 中明确这 3 类文档的入口关系

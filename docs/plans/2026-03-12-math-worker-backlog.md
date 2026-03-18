doc_type: "governance"
scope: "math evolution worker task packages"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-skills-design.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "/Users/daiduo2/.codex/worktrees/2124/academic-trend-monitor/docs/plans/2026-03-12-evolution-task-template.md"
downstream_docs: []
last_reviewed: "2026-03-18"

# Math Worker Backlog

## Purpose

这份文档把数学方向后续可分发给弱模型或 Claude subagent 的任务，整理成固定任务包。

原则是：

- 不给开放式“继续推进”
- 只给中等粒度、强约束、可验收的 task package

## Scope

当前 backlog 覆盖：

- `math > math.LO`
- `math > math.AG`
- `math > math.QA` (数据不足，标记为 gap)
- `math > math.RA` (数据不足，标记为 gap)

## Package Template

每个包都应固定包含：

- `tree_path`
- `task_owner`
- `task_type`
- `target_rule`
- `positive_case`
- `negative_case`
- `allowed_files`
- `required_commands`
- `done_when`

## Active Task Packages

### Package MLO-01

```yaml
tree_path: "math > math.LO"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rule:
  - "math_lo_forcing_continuity"
  - "math_lo_definability_continuity"
goal: "校正 registry 中 partial / ready 与 benchmark level 的一致性"
positive_case:
  anchor: "global_51"
  target: "global_951"
negative_case:
  anchor: "global_339"
  target: "global_951"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
required_commands:
  - "pytest tests/test_math_lo_benchmark.py -q"
  - "make math-lo-benchmark"
done_when:
  - "registry 状态与 benchmark level 一致"
  - "bridge-level 规则不再被写成 ready"
```

### Package MLO-02

```yaml
tree_path: "math > math.LO"
task_owner: "case-worker"
task_type: "review_update"
target_rule: "math_lo_type_theory_continuity"
goal: "补一组更稳定的正反例，确认它是否仍然只停留在 bridge-level"
positive_case:
  anchor: "global_56"
  target: "global_980"
negative_case:
  anchor: "global_56"
  target: "global_438"
allowed_files:
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
required_commands:
  - "make evolution-analysis"
  - "make math-lo-benchmark"
done_when:
  - "review 里明确 type-theory 是 bridge-level 还是接近 event-level"
  - "benchmark 补齐正反例备注"
```

### Package MLO-03

```yaml
tree_path: "math > math.LO > 集合论与基数理论"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_lo_set_theory_continuity"
goal: "补充集合论路径的真实 negative cases，避免只靠 cardinal/forcing 误判"
positive_case:
  anchor: "global_51"
  target: "global_75"
negative_case:
  anchor: "global_167"
  target: "global_75"
allowed_files:
  - "docs/plans/2026-03-12-math-lo-benchmark.md"
  - "docs/plans/2026-03-11-math-lo-rule-review.md"
required_commands:
  - "make math-lo-benchmark"
done_when:
  - "新增至少 1 个真实 negative case"
  - "review 中记录为何它是负例"
```

### Package MAG-01

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rule: "math_ag_method_continuity"
goal: "把 synthetic evidence 从 benchmark 语义中剥离，改写成 test evidence"
positive_case:
  anchor: "ag-method-b1"
  target: "synthetic"
negative_case:
  anchor: "ag-method-n1"
  target: "synthetic"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
required_commands:
  - "pytest tests/test_evolution_analysis.py -q"
done_when:
  - "registry 不再把 synthetic case 写成真实 benchmark"
  - "文档明确这部分只是 test evidence"
```

### Package MAG-02

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_ag_object_continuity"
goal: "继续搜集真实 positive / negative pairs，确认对象词典覆盖盲点"
positive_case:
  anchor: "global_69"
  target: "global_287"
negative_case:
  anchor: "global_30"
  target: "global_355"
allowed_files:
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
required_commands:
  - "make evolution-analysis"
done_when:
  - "新增至少 1 条真实 negative note"
  - "review registry 说明对象词典盲点"
```

### Package MAG-03A: Method Continuity Case Discovery **[ARCHIVED - 2026-03-17]**

**STATUS: ✅ 已完成决策 - 选择 Option B (进入 normalization)**

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "case_discovery"
target_rule: "math_ag_method_continuity"
goal: "判断 method_continuity 是否值得进入 benchmark 主流程"
decision_fork:
  option_a:
    condition: "找到 >=2 个真实 event-level positive cases"
    action: "进入 MAG-03B-runner，实现 math_ag_method_continuity benchmark"
  option_b:
    condition: "只找到 bridge-level cases 或 case 不足"
    action: "进入 MAG-03B-normalization，明确维持 test-evidence-only"
search_criteria:
  - "共享 >=2 个方法词: cohomology/derived/motivic/tropical/étale"
  - "共享对象词 <2 个 (确保是方法连续性而非对象连续性)"
  - "有清晰的 temporal evolution 证据 (event-level)"
  - "跨期出现，而非同期并存"
current_candidates:
  - note: "已找到的 cases 均为 bridge-level"
  - ag-method-p1: "global_136 -> global_263 (2025-06 -> 2025-10)"
  - ag-method-p2: "global_237 -> global_263 (2025-09 -> 2025-10)"
  - assessment: "时间跨度太短，无法构成 event-level evolution"
allowed_files:
  - "docs/plans/2026-03-17-math-ag-benchmark.md"
  - "docs/plans/2026-03-10-evolution-rule-coverage.md"
stop_conditions:
  - "搜索后仍无 event-level cases"
  - "所有 candidate 都是同期或短期并存"
  - "与 object_continuity 边界无法区分"
done_when:
  - "明确 decision_fork 走向 (option_a 或 option_b)"
  - "文档记录决策理由"
```

### Package MAG-03B-runner: Implement Method Benchmark **[LOCKED - NOT UNLOCKED]**

**STATUS: 🔒 保持锁定 - 因 MAG-03A 选择 Option B，此包不会执行**

```yaml
tree_path: "math > math.AG"
task_owner: "rule-worker"
task_type: "benchmark_implementation"
target_rule: "math_ag_method_continuity"
precondition: "MAG-03A 必须完成且选择 option_a"
goal: "为 method_continuity 实现完整的 benchmark runner"
required_cases:
  - ">=2 event-level positive cases"
  - ">=1 negative case"
allowed_files:
  - "pipeline/math_ag_benchmark.py"
  - "tests/test_math_ag_benchmark.py"
  - "docs/plans/2026-03-17-math-ag-benchmark.md"
```

### Package MAG-03B-normalization: Scope Cleanup **[COMPLETED - 2026-03-17]**

**STATUS: ✅ 已完成 - method_continuity 已明确为 test-evidence-only**

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "scope_normalization"
target_rule: "math_ag_method_continuity"
precondition: "MAG-03A 完成，选择 option_b (case 不足)"
goal: "明确将 method_continuity 从 benchmark 候选中移除，维持 test-evidence-only"
actions_completed:
  - ✅ "更新 registry: 明确标注 'test evidence only / not benchmark-ready'"
    - 文件: docs/plans/2026-03-10-evolution-rule-coverage.md
  - ✅ "更新 math-ag-benchmark.md: 将 method cases 移入 'Test Evidence' 章节"
    - 文件: docs/plans/2026-03-17-math-ag-benchmark.md
  - ✅ "更新 math_ag_benchmark.py: 移除 method continuity cases"
    - 文件: pipeline/math_ag_benchmark.py (仅剩 object_continuity cases)
  - ✅ "更新 evolution-ops: 归档 PKG-AG-03"
    - 文件: docs/plans/evolution-ops/03-task-packages.md
completion_verify:
  - ✅ method_continuity 不在 runner 中
  - ✅ 文档明确区分: object_continuity (ready) vs method_continuity (test-only)
  - ✅ 无歧义的 stop condition 已记录
  - ✅ math.AG benchmark 全绿: 6/6 passed
```

---

## Math.QA Task Packages

### Package MQA-01A: Gap Normalization **[COMPLETED - 2026-03-18]**

**STATUS: ✅ 已完成 - math.QA 已明确为 gap / insufficient data**

```yaml
tree_path: "math > math.QA"
task_owner: "doc-worker"
task_type: "gap_normalization"
target_rule:
  - "math_qa_object_continuity"
  - "math_qa_method_continuity"
goal: "把 math.QA 在当前数据中的不足状态收口为 gap / insufficient real data"
data_assessment:
  total_topics: 2
  topics:
    - "global_55: 李代数与Hopf代数 (105 papers, 10 periods)"
    - "global_301: 等变旗流形环不变量 (10 papers, 1 period)"
  evolution_cases: 0
  object_continuity_candidates: "无"
  method_continuity_candidates: "无"
actions_completed:
  - ✅ "更新 registry: math > math.QA 状态从 ready 改为 gap"
    - 文件: docs/plans/2026-03-10-evolution-rule-coverage.md
  - ✅ "新增 math_qa_gap_insufficient_data 规则条目"
    - 文件: docs/plans/2026-03-10-evolution-rule-coverage.md
  - ✅ "更新 Tree Path Registry 中 math.QA 的 notes"
  - ✅ "更新 Layer 1/2 Coverage 表格"
  - ✅ "更新数学方向优先级: math.QA 降级为 P3"
completion_verify:
  - ✅ registry 不再暗示 math.QA 已 ready
  - ✅ math.QA 明确标注为 gap / insufficient data / not benchmark-ready
  - ✅ 文档明确记录: 当前数据里 math.QA 只有极少 topic
  - ✅ 文档明确记录: 当前没有足够真实 evolution cases
  - ✅ 文档明确记录: 现在不适合直接 benchmark 化
next_package_if_continue: "PKG-QA-01B: longer-window exploration"
```

### Package MQA-01B: Longer-Window Exploration **[PENDING]**

**STATUS: ⏸️ 待定 - 需要更长数据窗口**

```yaml
tree_path: "math > math.QA"
task_owner: "case-worker"
task_type: "data_exploration"
target_rule: "math_qa_object_continuity"
precondition: "必须获得更长周期的 math.QA 数据 (建议 >= 24 个月)"
goal: "在更长数据窗口中搜索 math.QA 的 evolution cases"
search_criteria:
  - "寻找 >=2 个 math.QA topics 之间有 temporal evolution 关系"
  - "关键词应包含: quantum, affine, crystal, hall, cluster, vertex, hopf, yangian"
  - "避免只靠泛词 (algebra, group, theory) 区分"
  - "需要有清晰的 anchor -> target 跨期演化证据"
stop_conditions:
  - "搜索后仍无足够 topics (>=4)"
  - "topics 之间无 temporal 关联"
  - "无法区分 object continuity vs method continuity"
decision_fork:
  option_a:
    condition: "找到 >=2 个真实 event-level positive cases"
    action: "进入 MQA-02: benchmark skeleton bootstrap"
  option_b:
    condition: "数据仍然不足"
    action: "保持 gap 状态，等待未来数据"
```

---

## Math.RA Task Packages

### Package MRA-01: Bootstrap with Decision Fork **[COMPLETED - 2026-03-18]**

**STATUS: ✅ 已完成 - math.RA 已明确为 gap / insufficient data**

```yaml
tree_path: "math > math.RA"
task_owner: "case-worker"
task_type: "bootstrap_with_decision_fork"
target_rule:
  - "math_ra_object_continuity"
  - "math_ra_method_continuity"
goal: "判断 math.RA 是否具备 benchmark skeleton 条件；若具备则直接建立 skeleton，若不足则直接收口为 gap"
data_assessment:
  total_topics: 3
  topics:
    - "global_82: 泊松-巴克斯特李代数 (32 papers, 1 period)"
    - "global_200: 多项式映射与算法 (14 papers, 1 period)"
    - "global_214: 随机矩阵与正定性 (46 papers, 1 period)"
  evolution_cases: 0
  temporal_pairs: 0
  object_continuity_candidates: "无 (所有 topics 仅 1 个 period)"
  method_continuity_candidates: "无 (所有 topics 仅 1 个 period)"
decision_fork:
  option_a:
    condition: "找到 >=2 个可信 object-side candidate positives"
    action: "建立 math.RA benchmark skeleton"
  option_b:
    condition: "case 不足，无法区分 object vs method continuity"
    action: "收口为 gap"
  decision: "Option B"
  reason: "仅3个topics，全部仅1个active month，无法构成temporal evolution，无法形成任何pairs"
actions_completed:
  - ✅ "更新 registry: math > math.RA 状态从 ready 改为 gap"
    - 文件: docs/plans/2026-03-10-evolution-rule-coverage.md
  - ✅ "新增 math_ra_gap_insufficient_data 规则条目"
    - 文件: docs/plans/2026-03-10-evolution-rule-coverage.md
  - ✅ "更新 Tree Path Registry 中 math.RA 的 notes"
  - ✅ "更新 Layer 1 Coverage 表格"
completion_verify:
  - ✅ registry 不再暗示 math.RA 已 ready
  - ✅ math.RA 明确标注为 gap / insufficient data / not benchmark-ready
  - ✅ 文档明确记录: 当前数据里 math.RA 只有 3 个 topics
  - ✅ 文档明确记录: 全部仅 1 个 active period，无法构成跨期演化
  - ✅ 文档明确记录: 现在不适合直接 benchmark 化
next_package_if_continue: "PKG-RA-01B: longer-window exploration"
```

### Package MRA-01B: Longer-Window Exploration **[PENDING]**

**STATUS: ⏸️ 待定 - 需要更长数据窗口**

```yaml
tree_path: "math > math.RA"
task_owner: "case-worker"
task_type: "data_exploration"
target_rule: "math_ra_object_continuity"
precondition: "必须获得更长周期的 math.RA 数据 (建议 >= 24 个月)"
goal: "在更长数据窗口中搜索 math.RA 的 evolution cases"
search_criteria:
  - "寻找 >=2 个 math.RA topics 之间有 temporal evolution 关系"
  - "关键词应包含: ring, rings, algebra, algebras, module, modules, ideal, ideals"
  - "避免只靠泛词 (algebra, module, theory) 区分"
  - "需要有清晰的 anchor -> target 跨期演化证据"
  - "需要 topics 有 >=2 个 active periods 才能构成 temporal 关联"
stop_conditions:
  - "搜索后仍无足够 topics (>=4)"
  - "topics 之间无 temporal 关联"
  - "无法区分 object continuity vs method continuity"
decision_fork:
  option_a:
    condition: "找到 >=2 个真实 event-level positive cases"
    action: "进入 MRA-02: benchmark skeleton bootstrap"
  option_b:
    condition: "数据仍然不足"
    action: "保持 gap 状态，等待未来数据"
```

## Dispatch Rules

分发时默认遵循：

1. 文档一致性问题先交 `doc-worker`
2. case 缺失问题先交 `case-worker`
3. 只有当 case 边界清楚时，才交 `rule-worker`

## Recommended Near-Term Order

### 已完成 ✅

1. `MLO-01` - Registry 状态一致性校正
2. `MAG-01` - Synthetic 标注清理
3. `MLO-03` - Set theory negative case 补充
4. `MLO-02` - Type theory bridge-level 确认
5. `MAG-02` - Object continuity negative case 补充

### 已完成 ✅

6. **`MAG-03A`** - Method continuity case discovery **[已归档]**
   - 决策: 选择 Option B (case 不足)
   - 结果: 进入 `MAG-03B-normalization`，已完成

7. **`MAG-03B-normalization`** - Scope cleanup **[已完成]**
   - method_continuity 明确为 test-evidence-only
   - math.AG benchmark 6/6 全绿

8. **`MRA-01`** - Bootstrap with decision fork **[已完成]**
   - 决策: 选择 Option B (case 不足)
   - 结果: math.RA 明确为 gap / insufficient data
   - 当前状态: 3 topics, 全部仅 1 个 period, 0 evolution cases

### 重要原则

**MAG-03 任务包已完成 (2026-03-17)**

math_ag_method_continuity 最终状态：
- ✅ Threshold 验证通过
- ❌ **无 event-level cases** (只有 bridge-level)
- ✅ **决策**: 明确为 test-evidence-only，不进入 benchmark runner

决策结果：
1. `MAG-03A` case discovery 完成
2. 确认无法找到 event-level cases，选择 Option B
3. `MAG-03B-normalization` 已完成，文档已更新
4. math.AG benchmark 稳定: **6/6 全绿**

## Stop Conditions

以下情况不得继续扩展任务包：

- 同一路径下 registry / review / benchmark 彼此矛盾
- 只有 synthetic case，没有真实 case
- benchmark 绿色但无法解释为什么是正例
- 规则边界和相邻规则明显重叠

## Completion Rule

每个 task package 完成时，都必须留下：

- 任务块
- 改动文件列表
- Claude review 结论
- 本地 git commit hash

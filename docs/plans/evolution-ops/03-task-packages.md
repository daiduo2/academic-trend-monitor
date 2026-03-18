doc_type: "governance"
scope: "evolution-analysis task packages"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-12-math-worker-backlog.md"
downstream_docs: []
last_reviewed: "2026-03-18"

# Evolution Analysis Task Packages

## Purpose

这份文档是 evolution-analysis 任务包的 ops 层定义，与 `2026-03-12-math-worker-backlog.md` 保持同步。

**关键原则**：
- 无真实 case 时不得推进 runner 实现
- 所有 method_continuity 规则必须先经过 case discovery
- benchmark 必须全绿后才算稳定基线

---

## Math.AG Task Packages

### PKG-AG-01: Synthetic Cleanup ✅ COMPLETE

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rule: "math_ag_method_continuity"
goal: "把 synthetic evidence 从 benchmark 语义中剥离，改写成 test evidence"
decision: "已完成"
result: "明确标注为 test-evidence-only，不进入 benchmark"
```

### PKG-AG-02: Object Continuity Negative Case ✅ COMPLETE

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_ag_object_continuity"
goal: "补充真实 negative case，确认对象词典盲点"
decision: "已完成"
result: "新增 ag-n1..n4，benchmark 6 cases 全绿"
```

### PKG-AG-03: Method Continuity Case Discovery ✅ ARCHIVED

**状态: 已归档 (2026-03-17)**

```yaml
tree_path: "math > math.AG"
task_owner: "case-worker"
task_type: "case_discovery"
target_rule: "math_ag_method_continuity"
goal: "判断 method_continuity 是否值得进入 benchmark 主流程"
result: "已决策 - 选择 Option B (case 不足，进入 normalization)"
archive_reason: "insufficient event-level data"
```

**决策历史**:

| 选项 | 条件 | 结果 |
|------|------|------|
| **Option A** | 找到 >=2 个真实 **event-level** positive cases | ❌ 未满足 |
| **Option B** | 只找到 bridge-level cases 或 case 不足 | ✅ 已选择 |

**Case Discovery 结果**:
- 已找到 2 bridge-level cases (ag-method-p1, ag-method-p2)
- 时间跨度：1-4 个月（不足构成 event-level）
- ag-method-p1: 2025-06 → 2025-10 (4个月)
- ag-method-p2: 2025-09 → 2025-10 (1个月)
- **结论**: 无法构成 event-level evolution 信号

**归档备注**:
- 所有 cases 已移至 test-evidence 章节
- method_continuity 明确标记为 test-evidence-only
- benchmark runner 仅包含 object_continuity (6/6 全绿)

---

### PKG-AG-03B-runner: Conditional Implementation 🔒 LOCKED

```yaml
tree_path: "math > math.AG"
task_owner: "rule-worker"
task_type: "benchmark_implementation"
target_rule: "math_ag_method_continuity"
precondition: "PKG-AG-03 必须完成且选择 Option A"
goal: "为 method_continuity 实现完整的 benchmark runner"
unlock_condition: "找到 event-level cases 后才解锁"
```

---

### PKG-AG-03B-normalization: Scope Cleanup ✅ COMPLETE

```yaml
tree_path: "math > math.AG"
task_owner: "doc-worker"
task_type: "scope_normalization"
target_rule: "math_ag_method_continuity"
precondition: "PKG-AG-03 完成，选择 Option B (case 不足)"
goal: "明确将 method_continuity 维持 test-evidence-only"
completed_at: "2026-03-17"
```

**执行动作**:
- ✅ 确认 registry 标注: `⚠️ TEST EVIDENCE ONLY / NOT BENCHMARK-READY`
  - 位置: `docs/plans/2026-03-10-evolution-rule-coverage.md`
- ✅ 确认 method cases 不在 `math_ag_benchmark.py`
  - 仅有 object continuity cases (ag-b1, ag-e2)
- ✅ 归档 PKG-AG-03，标注 `archived - insufficient event-level data`
- ✅ 文档明确区分: object (ready) vs method (test-only)

**完成验证**:
- `method_continuity` 不在 runner 中 ✅
- 无歧义的 stop condition 已记录 ✅
- **math.AG benchmark 全绿 (6/6)** ✅

---

## Math.LO Task Packages

### PKG-LO-01: Status Alignment ✅ COMPLETE

```yaml
tree_path: "math > math.LO"
task_owner: "doc-worker"
task_type: "status_cleanup"
target_rules:
  - "math_lo_forcing_continuity"
  - "math_lo_definability_continuity"
result: "registry 状态与 benchmark level 一致，明确 bridge-level 标注"
```

### PKG-LO-02: Type Theory Level Confirmation ✅ COMPLETE

```yaml
tree_path: "math > math.LO"
task_owner: "case-worker"
task_type: "review_update"
target_rule: "math_lo_type_theory_continuity"
result: "确认为 bridge-level，非 event-level"
```

### PKG-LO-03: Set Theory Negative Case ✅ COMPLETE

```yaml
tree_path: "math > math.LO > 集合论与基数理论"
task_owner: "case-worker"
task_type: "benchmark_update"
target_rule: "math_lo_set_theory_continuity"
result: "新增 lo-n6 negative case"
```

---

## Execution Rules

### 顺序约束

1. **必须先做 case-worker，后做 rule-worker**
   - discovery → evaluation → (conditional) implementation

2. **必须先 benchmark 全绿，后才算稳定基线**
   - math.LO: 12/13 passed (lo-e2 已知问题)
   - math.AG: **6/6 passed ✅** (ag-n5 已移除)

3. **runner 实现必须有前置条件**
   - PKG-AG-03B-runner: 需要 PKG-AG-03 Option A
   - 无前置条件满足时，走 normalization

### 禁止事项

- ❌ 不要跳过 discovery 直接实现 runner
- ❌ 不要用 bridge-level cases 冒充 event-level
- ❌ 不要放宽阈值来凑 cases
- ❌ 不要顺手改未分配的规则

---

## Current State Summary

| Package | Status | Result |
|---------|--------|--------|
| PKG-AG-01 | ✅ Complete | test-evidence-only 标注完成 |
| PKG-AG-02 | ✅ Complete | 6/6 benchmark 全绿 |
| PKG-AG-03 | ✅ Archived | 已决策 Option B，归档理由: insufficient event-level data |
| PKG-AG-03B-runner | 🔒 Locked | 因 Option B 选择，保持锁定 |
| PKG-AG-03B-normalization | ✅ Complete | method_continuity 明确为 test-evidence-only |
| PKG-LO-01 | ✅ Complete | 状态对齐完成 |
| PKG-LO-02 | ✅ Complete | bridge-level 确认 |
| PKG-LO-03 | ✅ Complete | negative case 补充 |
| PKG-QA-01A | ✅ Complete | math.QA 标记为 gap / insufficient data |
| PKG-QA-01B | ⏸️ Pending | longer-window exploration (conditional) |

---

## Math.QA Task Packages

### PKG-QA-01A: Gap Normalization **[COMPLETED - 2026-03-18]**

**STATUS: ✅ 已完成 - math.QA 已明确为 gap / insufficient data**

```yaml
tree_path: "math > math.QA"
owner: "doc-worker"
task_type: "gap_normalization"
target_rule:
  - "math_qa_object_continuity"
  - "math_qa_method_continuity"
goal: "把 math.QA 在当前数据中的不足状态收口为 gap / insufficient real data"
data_assessment:
  total_topics: 2
  evolution_cases: 0
  note: "当前数据不足以支持 benchmark 化"
actions_completed:
  - ✅ "更新 registry: math > math.QA 状态从 ready 改为 gap"
  - ✅ "新增 math_qa_gap_insufficient_data 规则条目"
  - ✅ "更新 Tree Path Registry、Layer 1/2 Coverage 表格"
completion_verify:
  - ✅ registry 不再暗示 math.QA 已 ready
  - ✅ math.QA 明确标注为 gap / insufficient data / not benchmark-ready
next_package: "PKG-QA-01B: longer-window exploration (conditional)"
```

### PKG-QA-01B: Longer-Window Exploration **[PENDING]**

**STATUS: ⏸️ 待定 - 需要更长数据窗口**

```yaml
tree_path: "math > math.QA"
owner: "case-worker"
task_type: "data_exploration"
precondition: "必须获得更长周期的 math.QA 数据 (建议 >= 24 个月)"
goal: "在更长数据窗口中搜索 math.QA 的 evolution cases"
decision_fork:
  option_a:
    condition: "找到 >=2 个真实 event-level positive cases"
    action: "进入 MQA-02: benchmark skeleton bootstrap"
  option_b:
    condition: "数据仍然不足"
    action: "保持 gap 状态，等待未来数据"
```

---

## Next Recommended Actions

### 当前状态 (2026-03-17)

**math.AG evolution 任务包全部完成**:
- ✅ PKG-AG-01: Synthetic cleanup 完成
- ✅ PKG-AG-02: Object continuity negative cases 完成 (6/6 benchmark 全绿)
- ✅ PKG-AG-03: Case discovery 完成，已归档
- ✅ PKG-AG-03B-normalization: 完成，method_continuity 明确为 test-evidence-only

**基准状态**:
- math.AG: **稳定 (6/6 全绿)**
- math.LO: 稳定 (12/13，lo-e2 已知问题)

### 可选下一步

1. **进入通用 runner 设计**
   - 抽象 `math_benchmark.py` 统一框架
   - 支持多领域 (math.AG, math.LO, math.GR 等)
   - **math.QA 暂不包含** (gap 状态，数据不足)

2. **扩展其他数学子域**
   - math.GR, math.RT, math.RA 等已有规则但缺少 benchmark cases
   - 按同样模式: case discovery → benchmark → runner
   - math.QA 需先执行 PKG-QA-01B longer-window exploration

3. **暂停 evolution-analysis 迭代**
   - 当前基线已稳定
   - 等待新数据或新需求再启动下一轮
   - math.QA 明确需要更长数据窗口 (>=24 months) 才能重新评估

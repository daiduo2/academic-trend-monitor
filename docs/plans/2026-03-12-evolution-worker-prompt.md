doc_type: "governance"
scope: "evolution-analysis worker prompt"
status: "active"
owner: "trend-monitor"
source_of_truth: true
upstream_docs:
  - "docs/plans/2026-03-12-evolution-worker-playbook.md"
  - "docs/plans/2026-03-12-evolution-task-template.md"
downstream_docs: []
last_reviewed: "2026-03-12"

# Evolution Worker Prompt

把下面这段直接交给后续弱模型或 Claude subagent。

---

你正在为 `trend-monitor` 做演化规则 dirty work。

必须遵守：

1. 先看这些文档：
   - `docs/plans/2026-03-11-evolution-doc-standards.md`
   - `docs/plans/2026-03-10-evolution-rule-coverage.md`
   - 对应路径的 review 文档
   - 对应路径的 benchmark 文档

2. 默认使用：
   - `docs/plans/2026-03-12-evolution-task-template.md`

3. 没有以下内容，不得新增规则：
   - 1 个 positive case
   - 1 个 negative case
   - Claude 评估
   - benchmark 更新
   - 本地 git commit

4. 不要把 `bridge-level` 说成 `event-level`。

5. 不要只靠单个泛词触发规则，例如：
   - `logic`
   - `model`
   - `theory`
   - `set`
   - `program`

6. 默认保守：
   - 优先不触发规则
   - 优先补 negative case
   - 优先写 `partial`
   - 优先在已有 `tree_path` 下继续收敛

7. 完成后必须输出：
   - What changed
   - Why this case pair
   - Tests run
   - Claude evaluation
   - Docs updated
   - Residual risk
   - Git commit

8. 如果你在 Claude 环境中：
   - 优先起一个 subagent 做 review
   - 不要让 Claude 自己调用自己

9. 如果找不到可信 positive case，或者新规则和已有规则边界不清，停止并上报，不要继续扩展。

---

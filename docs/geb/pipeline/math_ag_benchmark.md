<!-- docs/geb/pipeline/math_ag_benchmark.md -->
@geb-leaf #math-ag-benchmark
@mirror ./pipeline/math_ag_benchmark.py
@loop #evolution-analysis
@invariant "BENCHMARK_CASES matches rule registry"
@invariant "Report date matches code version"
@emerge "regenerate report on case change"

# Math.AG Benchmark

## 功能

验证 Math.AG (代数几何) 领域演化规则的准确性。

## 测试覆盖

### 正例 (Positive Cases)

| Case ID | Anchor | Target | 期望关系 | 级别 | 置信度 |
|---------|--------|--------|----------|------|--------|
| ag-b1 | global_69 | global_287 | math_ag_object_continuity | event-level | - |
| ag-e2 | global_69 | global_287 | math_ag_object_continuity | event-level | 0.85 |

### 负例 (Negative Cases)

| Case ID | 验证点 |
|---------|--------|
| ag-n1 | 泛词 projective 不应触发 |
| ag-n2 | 不同分支不连续 |
| ag-n3 | 反向演化不触发 |
| ag-n4 | 跨路径不触发 |
| ag-n5 | 反向不连续 |

## 最新报告

- **生成日期**: 2026-03-14
- **总计**: 7 cases
- **通过**: 2 (28.6%)
- **失败**: 5 (71.4%)
- **状态**: ⚠️ 阈值需调优

### 失败分析

负例被误判为 `math_ag_object_continuity`，说明当前阈值过宽。
已应用修复：要求至少有1个 exact taxonomy term 匹配。

## 运行方式

```bash
make math-ag-benchmark
# 或
python3 pipeline/math_ag_benchmark.py
```

## 输出位置

- JSON: `data/output/benchmarks/math_ag/math_ag_benchmark.json`
- Markdown: `data/output/benchmarks/math_ag/math_ag_benchmark.md`

## 同构代码

- @mirror ./pipeline/math_ag_benchmark.py

## 相关节点

- @geb-leaf #evolution-analysis - 演化分析框架
- @geb-leaf #math-lo-benchmark - Math.LO 基准测试

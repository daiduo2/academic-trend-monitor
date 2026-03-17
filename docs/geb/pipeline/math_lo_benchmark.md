<!-- docs/geb/pipeline/math_lo_benchmark.md -->
@geb-leaf #math-lo-benchmark
@mirror ./pipeline/math_lo_benchmark.py
@loop #evolution-analysis
@invariant "BENCHMARK_CASES matches rule registry"
@invariant "Report date matches code version"
@emerge "regenerate report on case change"

# Math.LO Benchmark

## 功能

验证 Math.LO (数理逻辑) 领域演化规则的准确性。

## 测试覆盖

### 正例 (Positive Cases)

| Case ID | Anchor | Target | 期望关系 | 级别 |
|---------|--------|--------|----------|------|
| lo-b1 | global_56 | global_27 | math_lo_modal_continuity | event-level |
| lo-e2 | global_977 | global_1155 | math_lo_modal_continuity | event-level |
| lo-b2 | global_56 | global_980 | math_lo_type_theory_continuity | bridge-level |
| lo-b3 | global_313 | global_360 | math_lo_set_theory_continuity | bridge-level |
| lo-b4 | global_51 | global_951 | math_lo_forcing_continuity | bridge-level |
| lo-b5 | global_75 | global_778 | math_lo_definability_continuity | bridge-level |

### 负例 (Negative Cases)

| Case ID | 验证点 |
|---------|--------|
| lo-n1 | 集合论 ≠ 力迫法 |
| lo-n2 | 弱共享应返回 none |
| lo-n3 | 可定义性不匹配 |
| lo-n4 | 亨泽尔域不匹配 |
| lo-n5 | 跨领域不触发 |

### 模糊例 (Ambiguous Cases)

| Case ID | 处理方式 |
|---------|----------|
| lo-a1 | review-needed |
| lo-a2 | review-needed |

## 最新报告

- **生成日期**: 2026-03-12
- **总计**: 12 cases
- **通过**: 12 (100%)
- **状态**: ✅ 全部通过

## 运行方式

```bash
make math-lo-benchmark
# 或
python3 pipeline/math_lo_benchmark.py
```

## 输出位置

- JSON: `data/output/benchmarks/math_lo/math_lo_benchmark.json`
- Markdown: `data/output/benchmarks/math_lo/math_lo_benchmark.md`

## 同构代码

- @mirror ./pipeline/math_lo_benchmark.py
- @mirror ./tests/test_math_lo_benchmark.py

## 相关节点

- @geb-leaf #evolution-analysis - 演化分析框架
- @geb-leaf #math-ag-benchmark - Math.AG 基准测试

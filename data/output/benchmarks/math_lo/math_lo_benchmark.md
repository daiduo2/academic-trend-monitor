# Math.LO Benchmark Report

- Generated at: 2026-03-12T01:24:26.980063+00:00
- Total cases: 12
- Passed: 12
- Failed: 0

## Positive Cases

- `lo-b1` PASS: 直觉主义逻辑证明 -> 概率逻辑与自动机语义 (expected `math_lo_modal_continuity`, actual `math_lo_modal_continuity`)
- `lo-b2` PASS: 直觉主义逻辑证明 -> 程序线性化与类型 (expected `math_lo_type_theory_continuity`, actual `math_lo_type_theory_continuity`)
- `lo-b3` PASS: 基数与超滤子公理 -> ZF基数选择公理 (expected `math_lo_set_theory_continuity`, actual `math_lo_set_theory_continuity`)
- `lo-b4` PASS: 基数与波莱尔公理 -> 基数与力迫法 (expected `math_lo_forcing_continuity`, actual `math_lo_forcing_continuity`)
- `lo-b5` PASS: 基数迭代强制法 -> 武丁公理与可定义性 (expected `math_lo_definability_continuity`, actual `math_lo_definability_continuity`)

## Negative Cases

- `lo-n1` PASS: 基数与波莱尔公理 -> 基数迭代强制法 (expected `not math_lo_forcing_continuity`, actual `math_lo_set_theory_continuity`)
- `lo-n2` PASS: 基数、理想与力迫法 -> 基数与力迫法 (expected `none`, actual `none`)
- `lo-n3` PASS: 可定义基数塔基序 -> 武丁公理与可定义性 (expected `none`, actual `none`)
- `lo-n4` PASS: 亨泽尔域存在可定义性 -> 武丁公理与可定义性 (expected `none`, actual `none`)
- `lo-n5` PASS: 直觉主义逻辑证明 -> 大语言模型数学推理 (expected `none`, actual `none`)

## Ambiguous Cases

- `lo-a1` PASS: 基数迭代强制法 -> 基数与力迫法 (expected `review-needed`, actual `none`)
- `lo-a2` PASS: 基数、理想与力迫法 -> 基数与波莱尔公理 (expected `review-needed`, actual `none`)

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

try:
    from evolution_analysis import DEFAULT_INPUT, build_adjacency, build_bridge_evidence, load_trend_source
except ModuleNotFoundError:
    from pipeline.evolution_analysis import DEFAULT_INPUT, build_adjacency, build_bridge_evidence, load_trend_source


BENCHMARK_CASES = {
    "positive": [
        {
            "case_id": "ag-b1",
            "anchor": "global_69",
            "target": "global_287",
            "expected_relation": "math_ag_object_continuity",
            "level": "event-level",
            "evidence": {
                "shared_objects": ["stack", "stacks"],
                "taxonomy_overlap": ["moduli_and_stack"],
            },
        },
        {
            "case_id": "ag-e2",
            "anchor": "global_69",
            "target": "global_287",
            "expected_relation": "math_ag_object_continuity",
            "level": "event-level",
            "confidence": 0.85,
            "evidence": {
                "shared_objects": ["stack", "stacks", "sheaf", "algebraic"],
                "taxonomy_overlap": ["moduli_and_stack", "sheaf_and_bundle", "scheme_level"],
            },
        },
        # NOTE: math_ag_method_continuity cases are NOT included here
        # They are test-evidence-only, not benchmark-ready
        # See docs/plans/2026-03-17-math-ag-benchmark.md for details
    ],
    "negative": [
        {
            "case_id": "ag-n1",
            "anchor": "global_30",
            "target": "global_287",
            "expected_relation": "none",
            "reason": "仅共享 projective 泛词，不足以触发",
        },
        {
            "case_id": "ag-n2",
            "anchor": "global_30",
            "target": "global_69",
            "expected_relation": "none",
            "reason": "共享对象不足，且位于不同演化分支",
        },
        {
            "case_id": "ag-n3",
            "anchor": "global_287",
            "target": "global_30",
            "expected_relation": "none",
            "reason": "反向演化，且共享词为泛词",
        },
        {
            "case_id": "ag-n4",
            "anchor": "global_69",
            "target": "global_30",
            "expected_relation": "none",
            "reason": "target 不在 math.AG 路径",
        },
        {
            "case_id": "ag-n5",
            "anchor": "global_287",
            "target": "global_69",
            "expected_relation": "none",
            "reason": "反向演化，不触发连续性",
        },
        # NOTE: ag-method-n1 is NOT included here
        # Method continuity is test-evidence-only, not in benchmark runner
    ],
}


def build_neighbor_map(adjacency_edges: Sequence[Dict[str, object]]) -> Dict[str, List[Tuple[str, float]]]:
    neighbors: Dict[str, List[Tuple[str, float]]] = {}
    for edge in adjacency_edges:
        neighbors.setdefault(edge["source"], []).append((edge["target"], float(edge["weight"])))
        neighbors.setdefault(edge["target"], []).append((edge["source"], float(edge["weight"])))
    for topic_id, values in neighbors.items():
        values.sort(key=lambda item: (-item[1], item[0]))
    return neighbors


def evaluate_expected(actual_relation: str, expected_relation: str) -> Tuple[bool, str]:
    if expected_relation == "review-needed":
        return True, "review_only"
    if expected_relation.startswith("not "):
        forbidden = expected_relation[4:]
        ok = actual_relation != forbidden
        return ok, "forbidden_relation" if not ok else "ok"
    ok = actual_relation == expected_relation
    return ok, "mismatch" if not ok else "ok"


def evaluate_case(case: Dict[str, object], topics, neighbor_map) -> Dict[str, object]:
    anchor = topics[case["anchor"]]
    target = topics[case["target"]]
    neighbors = neighbor_map.get(case["anchor"], [])
    bridge = build_bridge_evidence(anchor, target, neighbors, topics)
    relation = (bridge.get("pipeline_relation") or {}).get("relation", "none")
    passed, reason = evaluate_expected(relation, case["expected_relation"])
    return {
        "case_id": case["case_id"],
        "anchor_topic_id": case["anchor"],
        "anchor_topic_name": anchor.name,
        "target_topic_id": case["target"],
        "target_topic_name": target.name,
        "expected_relation": case["expected_relation"],
        "actual_relation": relation,
        "passed": passed,
        "reason": reason,
        "level": case.get("level", "bridge-level"),
        "confidence": case.get("confidence"),
        "pipeline_relation": bridge.get("pipeline_relation", {}),
        "evidence": case.get("evidence", {}),
    }


def evaluate_benchmark(topics) -> Dict[str, object]:
    adjacency_edges = build_adjacency(topics)
    neighbor_map = build_neighbor_map(adjacency_edges)
    sections = {}
    total = 0
    passed = 0
    for section, cases in BENCHMARK_CASES.items():
        results = [evaluate_case(case, topics, neighbor_map) for case in cases]
        sections[section] = results
        total += len(results)
        passed += sum(1 for item in results if item["passed"])
    return {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_cases": total,
        "passed_cases": passed,
        "failed_cases": total - passed,
        "sections": sections,
    }


def build_markdown_report(report: Dict[str, object]) -> str:
    lines = [
        "# Math.AG Benchmark Report",
        "",
        f"- Generated at: {report['generated_at']}",
        f"- Total cases: {report['total_cases']}",
        f"- Passed: {report['passed_cases']}",
        f"- Failed: {report['failed_cases']}",
        "",
    ]
    for section in ("positive", "negative"):
        lines.extend([f"## {section.title()} Cases", ""])
        for item in report["sections"].get(section, []):
            status = "PASS" if item["passed"] else "FAIL"
            confidence = f" (confidence={item['confidence']})" if item.get("confidence") else ""
            lines.append(
                f"- `{item['case_id']}` {status}: {item['anchor_topic_name']} -> {item['target_topic_name']} "
                f"(expected `{item['expected_relation']}`, actual `{item['actual_relation']}`){confidence}"
            )
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Math.AG benchmark checks.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to aligned topics JSON.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/output/benchmarks/math_ag"), help="Output directory.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    _, topics = load_trend_source(args.input)
    report = evaluate_benchmark(topics)
    report_md = build_markdown_report(report)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "math_ag_benchmark.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output_dir / "math_ag_benchmark.md").write_text(report_md, encoding="utf-8")
    print(f"Wrote benchmark report to {args.output_dir}")


if __name__ == "__main__":
    main()

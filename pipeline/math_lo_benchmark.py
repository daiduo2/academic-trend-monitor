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
            "case_id": "lo-b1",
            "anchor": "global_56",
            "target": "global_27",
            "expected_relation": "math_lo_modal_continuity",
            "level": "event-level",
        },
        {
            "case_id": "lo-e2",
            "anchor": "global_977",
            "target": "global_1155",
            "expected_relation": "math_lo_modal_continuity",
            "level": "event-level",
            "confidence": 0.92,
        },
        {
            "case_id": "lo-b2",
            "anchor": "global_56",
            "target": "global_980",
            "expected_relation": "math_lo_type_theory_continuity",
            "level": "bridge-level",
        },
        {
            "case_id": "lo-b3",
            "anchor": "global_313",
            "target": "global_360",
            "expected_relation": "math_lo_set_theory_continuity",
            "level": "bridge-level",
        },
        {
            "case_id": "lo-b4",
            "anchor": "global_51",
            "target": "global_951",
            "expected_relation": "math_lo_forcing_continuity",
            "level": "bridge-level",
        },
        {
            "case_id": "lo-b5",
            "anchor": "global_75",
            "target": "global_778",
            "expected_relation": "math_lo_definability_continuity",
            "level": "bridge-level",
        },
    ],
    "negative": [
        {
            "case_id": "lo-n1",
            "anchor": "global_51",
            "target": "global_75",
            "expected_relation": "not math_lo_forcing_continuity",
        },
        {
            "case_id": "lo-n2",
            "anchor": "global_339",
            "target": "global_951",
            "expected_relation": "none",
        },
        {
            "case_id": "lo-n3",
            "anchor": "global_167",
            "target": "global_778",
            "expected_relation": "none",
        },
        {
            "case_id": "lo-n4",
            "anchor": "global_361",
            "target": "global_778",
            "expected_relation": "none",
        },
        {
            "case_id": "lo-n5",
            "anchor": "global_56",
            "target": "global_438",
            "expected_relation": "none",
        },
    ],
    "ambiguous": [
        {
            "case_id": "lo-a1",
            "anchor": "global_75",
            "target": "global_951",
            "expected_relation": "review-needed",
        },
        {
            "case_id": "lo-a2",
            "anchor": "global_339",
            "target": "global_51",
            "expected_relation": "review-needed",
        },
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


def evaluate_case(case: Dict[str, str], topics, neighbor_map) -> Dict[str, object]:
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
        "pipeline_relation": bridge.get("pipeline_relation", {}),
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
        "# Math.LO Benchmark Report",
        "",
        f"- Generated at: {report['generated_at']}",
        f"- Total cases: {report['total_cases']}",
        f"- Passed: {report['passed_cases']}",
        f"- Failed: {report['failed_cases']}",
        "",
    ]
    for section in ("positive", "negative", "ambiguous"):
        lines.extend([f"## {section.title()} Cases", ""])
        for item in report["sections"].get(section, []):
            status = "PASS" if item["passed"] else "FAIL"
            lines.append(
                f"- `{item['case_id']}` {status}: {item['anchor_topic_name']} -> {item['target_topic_name']} "
                f"(expected `{item['expected_relation']}`, actual `{item['actual_relation']}`)"
            )
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Math.LO benchmark checks.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to aligned topics JSON.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/output/benchmarks/math_lo"), help="Output directory.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    _, topics = load_trend_source(args.input)
    report = evaluate_benchmark(topics)
    report_md = build_markdown_report(report)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "math_lo_benchmark.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output_dir / "math_lo_benchmark.md").write_text(report_md, encoding="utf-8")
    print(f"Wrote benchmark report to {args.output_dir}")


if __name__ == "__main__":
    main()

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from pipeline.utils.literature_api import get_literature_api_config, upload_topic_run


ALIGNED_TOPICS_PATH = Path("data/output/aligned_topics_hierarchy.json")
TOPIC_MAPPINGS_PATH = Path("data/output/topic_mappings.json")
HIERARCHY_DIR = Path("data/output/hierarchy")


@dataclass(frozen=True)
class LatestTopicBinding:
    global_id: str
    period: str
    local_topic_id: str


def parse_global_topic_id(global_id: str) -> int:
    prefix = "global_"
    if not global_id.startswith(prefix):
        raise ValueError(f"unsupported global topic id: {global_id}")
    return int(global_id[len(prefix):])


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def build_latest_bindings(topic_mappings: dict) -> dict[str, LatestTopicBinding]:
    bindings: dict[str, LatestTopicBinding] = {}
    for period in sorted(topic_mappings.keys()):
        for local_topic_id, global_id in topic_mappings[period].items():
            bindings[global_id] = LatestTopicBinding(
                global_id=global_id,
                period=period,
                local_topic_id=local_topic_id,
            )
    return bindings


def load_hierarchy_topics(period: str) -> dict:
    hierarchy_path = HIERARCHY_DIR / f"{period}.json"
    if not hierarchy_path.exists():
        raise FileNotFoundError(f"hierarchy file not found: {hierarchy_path}")
    return load_json(hierarchy_path)["topics"]


def build_global_topic_run_payload(*, period_name: Optional[str] = None) -> tuple[dict, dict]:
    aligned = load_json(ALIGNED_TOPICS_PATH)
    topic_mappings = load_json(TOPIC_MAPPINGS_PATH)
    latest_bindings = build_latest_bindings(topic_mappings)

    hierarchy_cache: dict[str, dict] = {}
    topics_payload = []
    unique_rep_docs = set()
    latest_paper_count_sum = 0
    stats = {
        "missing_bindings": [],
        "missing_local_topics": [],
        "empty_representative_docs": [],
    }

    for global_id, trend in sorted(aligned["trends"].items(), key=lambda item: parse_global_topic_id(item[0])):
        binding = latest_bindings.get(global_id)
        if binding is None:
            stats["missing_bindings"].append(global_id)
            continue

        hierarchy_topics = hierarchy_cache.setdefault(binding.period, load_hierarchy_topics(binding.period))
        local_topic = hierarchy_topics.get(binding.local_topic_id)
        if local_topic is None:
            stats["missing_local_topics"].append(
                {"global_id": global_id, "period": binding.period, "local_topic_id": binding.local_topic_id}
            )
            continue

        representative_docs = local_topic.get("representative_docs", [])
        if not representative_docs:
            stats["empty_representative_docs"].append(
                {"global_id": global_id, "period": binding.period, "local_topic_id": binding.local_topic_id}
            )

        normalized_docs = []
        for doc in representative_docs:
            paper_id = doc["id"]
            unique_rep_docs.add(paper_id)
            normalized_docs.append(
                {
                    "id": paper_id,
                    "title": doc["title"],
                    "primary_category": doc.get("primary_category", ""),
                }
            )

        paper_count = int(local_topic.get("paper_count", 0))
        latest_paper_count_sum += paper_count
        topics_payload.append(
            {
                "topic_id": parse_global_topic_id(global_id),
                "keywords": trend.get("keywords", []),
                "paper_count": paper_count,
                "representative_docs": normalized_docs,
            }
        )

    payload = {
        "period": period_name or f"global-index-{max(topic_mappings.keys())}",
        "n_topics": len(topics_payload),
        "n_documents": latest_paper_count_sum,
        "topics": topics_payload,
    }
    stats["unique_representative_docs"] = len(unique_rep_docs)
    stats["latest_paper_count_sum"] = latest_paper_count_sum
    return payload, stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Build or upload a topic-runs payload for global topic_index topics.")
    parser.add_argument(
        "--period-name",
        help="Override the topic-runs period string. Defaults to global-index-<latest mapped period>.",
    )
    parser.add_argument(
        "--output",
        help="Optional JSON output path for the built payload.",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload the generated payload to the configured literature API.",
    )
    args = parser.parse_args()

    payload, stats = build_global_topic_run_payload(period_name=args.period_name)
    print(
        f"Built payload period={payload['period']} n_topics={payload['n_topics']} "
        f"n_documents={payload['n_documents']} unique_rep_docs={stats['unique_representative_docs']}"
    )
    if stats["missing_bindings"]:
        print(f"Missing bindings: {len(stats['missing_bindings'])}")
    if stats["missing_local_topics"]:
        print(f"Missing local topics: {len(stats['missing_local_topics'])}")
    if stats["empty_representative_docs"]:
        print(f"Empty representative docs: {len(stats['empty_representative_docs'])}")

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved payload to {output_path}")

    if args.upload:
        config = get_literature_api_config()
        if config is None:
            raise RuntimeError("LITERATURE_API_BASE_URL is not configured")
        response = upload_topic_run(config, payload)
        print(f"Upload response: {response}")


if __name__ == "__main__":
    main()

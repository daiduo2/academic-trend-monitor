import argparse
import json
from pathlib import Path

from pipeline.utils.literature_api import get_literature_api_config, upload_papers, upload_topic_run


def load_raw_period_papers(period: str) -> list[dict]:
    raw_path = Path("data/raw") / f"{period}.jsonl"
    if not raw_path.exists():
        raise FileNotFoundError(f"raw period file not found: {raw_path}")

    papers = []
    with raw_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            papers.append(json.loads(line))
    return papers


def load_topic_run(period: str) -> dict:
    topic_path = Path("data/output/bertopic") / f"{period}.json"
    if not topic_path.exists():
        raise FileNotFoundError(f"topic run file not found: {topic_path}")
    with topic_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def infer_periods() -> list[str]:
    return sorted(path.stem for path in Path("data/output/bertopic").glob("*.json"))


def sync_period(period: str) -> None:
    config = get_literature_api_config()
    if config is None:
        raise RuntimeError("LITERATURE_API_BASE_URL is not configured")

    papers = load_raw_period_papers(period)
    topic_run = load_topic_run(period)

    print(f"Uploading papers for {period}: {len(papers)} records")
    upload_papers(config, papers)

    print(f"Uploading topic run for {period}: {len(topic_run.get('topics', []))} topics")
    upload_topic_run(config, topic_run)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync BERTopic topic runs to the literature API.")
    parser.add_argument("--period", help="Single period to sync, e.g. 2026-02")
    parser.add_argument("--all", action="store_true", help="Sync all available periods")
    args = parser.parse_args()

    if args.period:
        periods = [args.period]
    elif args.all:
        periods = infer_periods()
    else:
        raise SystemExit("Provide --period YYYY-MM or --all")

    for period in periods:
        sync_period(period)


if __name__ == "__main__":
    main()

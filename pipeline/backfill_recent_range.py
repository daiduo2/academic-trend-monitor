import argparse
import json
import os
from collections import OrderedDict
from datetime import datetime, timedelta
from pathlib import Path

from pipeline.daily_fetch import fetch_arxiv_papers_requests_all
from pipeline.tag_papers import tag_papers
from pipeline.utils.compact_format import compact_paper


def daterange(start_date: datetime, end_date: datetime):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def load_existing_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []

    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def merge_by_key(existing: list[dict], incoming: list[dict], key: str) -> list[dict]:
    merged: OrderedDict[str, dict] = OrderedDict()
    for item in existing:
        merged[str(item[key])] = item
    for item in incoming:
        merged[str(item[key])] = item
    return list(merged.values())


def save_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def save_monthly_raw(records: list[dict]) -> None:
    grouped: dict[str, list[dict]] = {}
    for record in records:
        published = record.get("published") or record.get("updated") or ""
        if not published:
            continue
        month = published[:7]
        grouped.setdefault(month, []).append(record)

    for month, month_records in grouped.items():
        target = Path("data/raw") / f"{month}.jsonl"
        existing = load_existing_jsonl(target)
        merged = merge_by_key(existing, month_records, "id")
        save_jsonl(target, merged)
        print(f"Saved {len(merged)} raw records to {target}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill arXiv metadata and topic tags for a date range.")
    parser.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD")
    parser.add_argument(
        "--recent-output",
        default="data/recent.jsonl",
        help="JSONL path for compact tagged papers",
    )
    parser.add_argument(
        "--tag-batch-size",
        type=int,
        default=32,
        help="Embedding batch size used during tagging",
    )
    args = parser.parse_args()

    start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    end_date = datetime.strptime(args.end_date, "%Y-%m-%d")
    if end_date < start_date:
        raise SystemExit("end-date must be >= start-date")

    fetched_records: list[dict] = []
    for day in daterange(start_date, end_date):
        day_str = day.strftime("%Y-%m-%d")
        print(f"Fetching arXiv metadata for {day_str}")
        daily_records = fetch_arxiv_papers_requests_all(day_str, day_str)
        fetched_records.extend(daily_records)
        print(f"  fetched {len(daily_records)} records")

    deduped_records = merge_by_key([], fetched_records, "id")
    print(f"Fetched {len(fetched_records)} total rows, {len(deduped_records)} unique paper ids")

    save_monthly_raw(deduped_records)

    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    tagged_records = tag_papers(
        deduped_records,
        "data/output/topic_index",
        batch_size=args.tag_batch_size,
    )
    compact_records = [compact_paper(record) for record in tagged_records]
    compact_records.sort(key=lambda item: item["p"], reverse=True)

    recent_output = Path(args.recent_output)
    existing_recent = load_existing_jsonl(recent_output)
    merged_recent = merge_by_key(existing_recent, compact_records, "i")
    merged_recent.sort(key=lambda item: item["p"], reverse=True)
    save_jsonl(recent_output, merged_recent)
    print(f"Saved {len(merged_recent)} compact tagged records to {recent_output}")


if __name__ == "__main__":
    main()

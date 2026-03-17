import argparse
import json
from pathlib import Path

from pipeline.build_global_topic_run import build_global_topic_run_payload
from pipeline.daily_fetch import fetch_arxiv_papers_by_ids
from pipeline.utils.literature_api import get_literature_api_config, upload_papers, upload_topic_run


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync the full global topic index to the literature API.")
    parser.add_argument(
        "--period-name",
        help="Override the topic-runs period string.",
    )
    parser.add_argument(
        "--rep-paper-cache",
        default="data/raw/global_topic_representative_papers.jsonl",
        help="Optional cache path for fetched representative paper metadata.",
    )
    parser.add_argument(
        "--skip-paper-sync",
        action="store_true",
        help="Upload only topic-runs. Use only if representative papers are already stored server-side.",
    )
    parser.add_argument(
        "--fetch-batch-size",
        type=int,
        default=500,
        help="How many missing representative papers to fetch before flushing cache to disk.",
    )
    args = parser.parse_args()

    config = get_literature_api_config()
    if config is None:
        raise RuntimeError("LITERATURE_API_BASE_URL is not configured")

    payload, stats = build_global_topic_run_payload(period_name=args.period_name)
    rep_ids = sorted({doc["id"] for topic in payload["topics"] for doc in topic["representative_docs"]})
    rep_id_set = set(rep_ids)
    print(
        f"Prepared global topic payload period={payload['period']} n_topics={payload['n_topics']} "
        f"rep_papers={len(rep_ids)}"
    )

    if not args.skip_paper_sync:
        cache_path = Path(args.rep_paper_cache)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cached_papers = {}
        if cache_path.exists():
            with cache_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    record = json.loads(line)
                    if record["id"] in rep_id_set:
                        cached_papers[record["id"]] = record

        missing_rep_ids = [paper_id for paper_id in rep_ids if paper_id not in cached_papers]
        if missing_rep_ids:
            print(f"Fetching metadata for {len(missing_rep_ids)} missing representative papers")
            for index in range(0, len(missing_rep_ids), args.fetch_batch_size):
                fetch_batch = missing_rep_ids[index:index + args.fetch_batch_size]
                fetched_papers = fetch_arxiv_papers_by_ids(fetch_batch)
                for paper in fetched_papers:
                    cached_papers[paper["id"]] = paper
                cache_path.write_text(
                    "\n".join(
                        json.dumps(cached_papers[paper_id], ensure_ascii=False) for paper_id in sorted(cached_papers)
                    )
                    + "\n",
                    encoding="utf-8",
                )
                print(
                    f"Cached representative paper metadata to {cache_path} "
                    f"({len(cached_papers)} / {len(rep_ids)})"
                )
        else:
            print(f"Using cached representative paper metadata from {cache_path}")

        rep_papers = [cached_papers[paper_id] for paper_id in rep_ids]
        upload_papers(config, rep_papers)
        print(f"Uploaded {len(rep_papers)} representative papers")

    response = upload_topic_run(config, payload)
    print(f"Topic run upload response: {response}")
    if stats["missing_bindings"] or stats["missing_local_topics"]:
        print(
            f"Warnings: missing_bindings={len(stats['missing_bindings'])} "
            f"missing_local_topics={len(stats['missing_local_topics'])}"
        )


if __name__ == "__main__":
    main()

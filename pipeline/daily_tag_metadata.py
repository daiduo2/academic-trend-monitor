"""Tag existing recent metadata stored in PostgreSQL."""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timedelta, timezone

from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.daily_fetch_and_tag import _cleanup_topic_index, _resolve_topic_index, store_paper_tags
from pipeline.tag_papers import tag_papers
from pipeline.utils.config import load_config


def load_recent_papers(days: int, active_version: str) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.arxiv_id, p.title, p.abstract, p.authors, p.primary_category, p.categories,
                       p.published_at, p.updated_at, p.pdf_url
                FROM papers_recent p
                WHERE p.published_at >= %s
                  AND NOT EXISTS (
                      SELECT 1
                      FROM paper_topic_tags t
                      WHERE t.arxiv_id = p.arxiv_id
                        AND t.topic_version_month = %s
                  )
                ORDER BY p.published_at DESC
                """,
                (cutoff, active_version),
            )
            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "title": row[1] or "",
            "abstract": row[2] or "",
            "authors": row[3] or [],
            "primary_category": row[4],
            "categories": row[5] or [],
            "published": row[6].isoformat() if row[6] else "",
            "updated": row[7].isoformat() if row[7] else "",
            "pdf_url": row[8],
        }
        for row in rows
    ]


def run_daily_tag_metadata(days: int = 1) -> int:
    config = load_config()
    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)

    if not active:
        print("No active topic version found in PostgreSQL, skipping tagging")
        return 0

    papers = load_recent_papers(days, active["version_month"])
    if not papers:
        print("No untagged recent papers found")
        return 0

    topic_index_base = os.getenv("TOPIC_INDEX_URL") or active.get("topic_index_path") or config.get("database", {}).get("topic_index_path", "")
    topic_index_path = _resolve_topic_index(topic_index_base)
    tagging_config = config.get("pipeline", {}).get("tagging", {})
    threshold = float(os.getenv("TAG_SCORE_THRESHOLD") or tagging_config.get("score_threshold", 0.6))
    tagger_version = os.getenv("TAGGER_VERSION") or "embedding-v1"

    try:
        tagged_papers = tag_papers(papers, topic_index_path, threshold=threshold)
        stored = store_paper_tags(tagged_papers, active["version_month"], tagger_version)
    finally:
        _cleanup_topic_index(topic_index_path)

    print(f"Stored {stored} tagged papers for topic version {active['version_month']}")
    return stored


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag recent papers already stored in PostgreSQL")
    parser.add_argument("--days", type=int, default=1)
    args = parser.parse_args()
    run_daily_tag_metadata(days=args.days)


if __name__ == "__main__":
    main()

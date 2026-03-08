"""Fetch daily papers, tag them, and store results in PostgreSQL."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlretrieve

from pipeline.daily_fetch import fetch_arxiv_papers, get_date_range
from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.tag_papers import tag_papers
from pipeline.utils.config import load_config


def _resolve_topic_index(base_path: str) -> str:
    if not base_path:
        raise ValueError("Topic index path is not configured")

    parsed = urlparse(base_path)
    if parsed.scheme in ("http", "https"):
        tmp_dir = Path(tempfile.mkdtemp(prefix="topic-index-"))
        for suffix in (".faiss", ".json"):
            urlretrieve(f"{base_path}{suffix}", tmp_dir / f"topic_index{suffix}")
        return str(tmp_dir / "topic_index")

    local_path = Path(base_path)
    if local_path.suffix in (".faiss", ".json"):
        return str(local_path.with_suffix(""))
    return str(local_path)


def _cleanup_topic_index(path: str) -> None:
    candidate = Path(path)
    parent = candidate.parent
    if parent.name.startswith("topic-index-") and parent.exists():
        shutil.rmtree(parent, ignore_errors=True)


def store_papers_and_tags(papers: list[dict], active_version: str, tagged_papers: list[dict], tagger_version: str) -> int:
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            for paper in papers:
                cur.execute(
                    """
                    INSERT INTO papers_recent (
                        arxiv_id, title, abstract, authors, primary_category, categories, published_at, updated_at, pdf_url, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (arxiv_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        abstract = EXCLUDED.abstract,
                        authors = EXCLUDED.authors,
                        primary_category = EXCLUDED.primary_category,
                        categories = EXCLUDED.categories,
                        published_at = EXCLUDED.published_at,
                        updated_at = EXCLUDED.updated_at,
                        pdf_url = EXCLUDED.pdf_url,
                        metadata = EXCLUDED.metadata,
                        fetched_at = NOW()
                    """,
                    (
                        paper["id"],
                        paper.get("title", ""),
                        paper.get("abstract", ""),
                        json.dumps(paper.get("authors", [])),
                        paper.get("primary_category"),
                        json.dumps(paper.get("categories", [])),
                        paper.get("published") or None,
                        paper.get("updated") or None,
                        paper.get("pdf_url"),
                        json.dumps({"source": "arxiv"}),
                    ),
                )

            for paper in tagged_papers:
                cur.execute(
                    "DELETE FROM paper_topic_tags WHERE arxiv_id = %s AND topic_version_month = %s",
                    (paper["id"], active_version),
                )
                for rank, (topic_id, score) in enumerate(zip(paper.get("tags", []), paper.get("scores", [])), start=1):
                    cur.execute(
                        """
                        INSERT INTO paper_topic_tags (
                            arxiv_id, topic_id, topic_version_month, score, rank, tagger_version, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            paper["id"],
                            str(topic_id),
                            active_version,
                            float(score),
                            rank,
                            tagger_version,
                            json.dumps({}),
                        ),
                    )
    return len(tagged_papers)


def run_daily_fetch_and_tag(days: int = 1, categories: list[str] | None = None) -> int:
    config = load_config()
    start, end = get_date_range(days=days)
    papers = fetch_arxiv_papers(start, end, categories=categories)
    if not papers:
        print("No new papers found")
        return 0

    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)

    if not active:
        raise RuntimeError("No active topic version found in PostgreSQL")

    topic_index_base = os.getenv("TOPIC_INDEX_URL") or active.get("topic_index_path") or config.get("database", {}).get("topic_index_path", "")
    topic_index_path = _resolve_topic_index(topic_index_base)
    tagging_config = config.get("pipeline", {}).get("tagging", {})
    threshold = float(os.getenv("TAG_SCORE_THRESHOLD") or tagging_config.get("score_threshold", 0.6))
    tagger_version = os.getenv("TAGGER_VERSION") or "embedding-v1"

    try:
        tagged_papers = tag_papers(papers, topic_index_path, threshold=threshold)
        stored = store_papers_and_tags(papers, active["version_month"], tagged_papers, tagger_version)
    finally:
        _cleanup_topic_index(topic_index_path)

    print(f"Stored {stored} tagged papers for topic version {active['version_month']}")
    return stored


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch and tag recent papers into PostgreSQL")
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--category", action="append", dest="categories")
    args = parser.parse_args()
    run_daily_fetch_and_tag(days=args.days, categories=args.categories)


if __name__ == "__main__":
    main()

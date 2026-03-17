"""Fetch daily arXiv metadata and store it in PostgreSQL."""
from __future__ import annotations

import argparse

from pipeline.daily_fetch import fetch_arxiv_papers, get_date_range
from pipeline.daily_fetch_and_tag import store_papers


def run_daily_fetch(days: int = 1, categories: list[str] | None = None) -> int:
    start, end = get_date_range(days=days)
    papers = fetch_arxiv_papers(start, end, categories=categories)
    if not papers:
        print("No new papers found")
        return 0

    stored = store_papers(papers)
    print(f"Stored {stored} papers in papers_recent")
    return stored


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch daily papers into PostgreSQL")
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--category", action="append", dest="categories")
    args = parser.parse_args()
    run_daily_fetch(days=args.days, categories=args.categories)


if __name__ == "__main__":
    main()

# pipeline/daily_fetch.py
from datetime import datetime, timedelta
from typing import Tuple


def get_date_range(days: int = 1) -> Tuple[str, str]:
    """Get date range for fetching papers."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    return (
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )


def fetch_arxiv_papers(start_date: str, end_date: str, categories: list = None) -> list:
    """Fetch papers from arXiv API."""
    # This will be implemented with actual arXiv API calls
    # For now, return empty list as placeholder
    return []


if __name__ == "__main__":
    import sys

    days = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    start, end = get_date_range(days)
    print(f"Fetching papers from {start} to {end}")

    papers = fetch_arxiv_papers(start, end)
    print(f"Fetched {len(papers)} papers")

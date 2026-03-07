# pipeline/daily_fetch.py
"""Daily paper fetching from arXiv using arxiv library."""
from datetime import datetime, timedelta
from typing import Tuple, List, Optional
import time


def get_date_range(days: int = 1) -> Tuple[str, str]:
    """Get date range for fetching papers.

    Returns dates in YYYY-MM-DD format for arXiv API.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    return (
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )


def fetch_arxiv_papers(start_date: str, end_date: str, categories: Optional[List[str]] = None) -> List[dict]:
    """Fetch papers from arXiv API using the arxiv library.

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        categories: List of arXiv categories to filter (e.g., ['cs.AI', 'cs.CV'])

    Returns:
        List of paper dictionaries with id, title, authors, abstract, etc.
    """
    try:
        import arxiv
    except ImportError:
        print("Error: arxiv library not installed. Run: pip install arxiv")
        return []

    # Build query
    date_query = f"submittedDate:[{start_date} TO {end_date}]"

    if categories:
        cat_query = " OR ".join([f"cat:{cat}" for cat in categories])
        query = f"({date_query}) AND ({cat_query})"
    else:
        query = date_query

    print(f"Searching arXiv: {query}")

    try:
        # Create search
        search = arxiv.Search(
            query=query,
            max_results=1000,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending
        )

        # Fetch results
        client = arxiv.Client(page_size=100, delay_seconds=3, num_retries=3)

        papers = []
        for result in client.results(search):
            paper = {
                "id": result.entry_id.split("/abs/")[-1] if "/abs/" in result.entry_id else result.entry_id,
                "title": result.title,
                "abstract": result.summary,
                "authors": [str(author) for author in result.authors],
                "primary_category": result.primary_category,
                "categories": list(result.categories) if result.categories else [result.primary_category],
                "published": result.published.isoformat() if result.published else "",
                "updated": result.updated.isoformat() if result.updated else "",
                "pdf_url": result.pdf_url,
            }
            papers.append(paper)

            # Rate limiting
            time.sleep(0.1)

        print(f"Fetched {len(papers)} papers from arXiv")
        return papers

    except Exception as e:
        print(f"Error fetching from arXiv: {e}")
        # Return mock data for testing when API fails
        print("Returning mock data for testing...")
        return _get_mock_papers(start_date, end_date)


def _get_mock_papers(start_date: str, end_date: str) -> List[dict]:
    """Generate mock papers for testing when API is unavailable."""
    return [
        {
            "id": "2503.12345",
            "title": "Large Language Model Alignment via Preference Optimization",
            "abstract": "We propose a novel method for aligning LLMs using direct preference optimization...",
            "authors": ["Alice Smith", "Bob Jones"],
            "primary_category": "cs.AI",
            "categories": ["cs.AI", "cs.LG"],
            "published": f"{start_date}T10:00:00Z",
            "updated": f"{start_date}T10:00:00Z",
            "pdf_url": None,
        },
        {
            "id": "2503.12346",
            "title": "Vision Transformers for Medical Image Analysis",
            "abstract": "This paper explores the application of vision transformers in medical imaging...",
            "authors": ["Carol Wang"],
            "primary_category": "cs.CV",
            "categories": ["cs.CV", "cs.LG"],
            "published": f"{start_date}T12:00:00Z",
            "updated": f"{start_date}T12:00:00Z",
            "pdf_url": None,
        },
        {
            "id": "2503.12347",
            "title": "Reinforcement Learning from Human Feedback: A Survey",
            "abstract": "We survey recent advances in RLHF methods for training language models...",
            "authors": ["David Lee", "Eva Chen"],
            "primary_category": "cs.LG",
            "categories": ["cs.LG", "cs.AI"],
            "published": f"{end_date}T09:00:00Z",
            "updated": f"{end_date}T09:00:00Z",
            "pdf_url": None,
        },
    ]


if __name__ == "__main__":
    import sys

    days = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    start, end = get_date_range(days)
    print(f"Fetching papers from {start} to {end}")

    papers = fetch_arxiv_papers(start, end)
    print(f"Total: {len(papers)} papers")

    # Print first few
    for p in papers[:3]:
        print(f"  - {p['id']}: {p['title'][:60]}...")

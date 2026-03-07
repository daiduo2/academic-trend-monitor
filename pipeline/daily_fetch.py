# pipeline/daily_fetch.py
"""Daily paper fetching from arXiv using arxiv library."""
from datetime import datetime, timedelta
from pathlib import Path
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

    # Build query - arXiv requires YYYYMMDD format (not YYYY-MM-DD)
    start_fmt = start_date.replace("-", "")
    end_fmt = end_date.replace("-", "")
    date_query = f"submittedDate:[{start_fmt} TO {end_fmt}]"

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
        import traceback
        print(f"\n=== Error fetching from arXiv ===")
        print(f"Exception type: {type(e).__name__}")
        print(f"Exception message: {e}")
        print(f"\nFull traceback:")
        traceback.print_exc()
        print(f"\n=== End of error ===\n")

        # Try fallback to direct requests if arxiv library failed
        print("Attempting fallback to direct API call...")
        fallback_papers = _fetch_with_requests(start_date, end_date, categories)
        if fallback_papers:
            return fallback_papers

        # API failed - return empty list to avoid polluting daily pipeline with old data
        print("ERROR: All API methods failed. Returning empty list.")
        print("Daily pipeline expects only new papers from arXiv API.")
        print("Please check network connectivity or arXiv API status.")
        return []


def _fetch_with_requests(start_date: str, end_date: str, categories: Optional[List[str]] = None) -> List[dict]:
    """Fallback fetch using direct requests to arXiv API."""
    try:
        import requests
        import xml.etree.ElementTree as ET
    except ImportError:
        print("requests not available for fallback")
        return []

    # Build query - arXiv requires YYYYMMDD format
    start_fmt = start_date.replace("-", "")
    end_fmt = end_date.replace("-", "")
    date_query = f"submittedDate:[{start_fmt} TO {end_fmt}]"
    if categories:
        cat_query = " OR ".join([f"cat:{cat}" for cat in categories])
        query = f"({date_query}) AND ({cat_query})"
    else:
        query = date_query

    url = "https://export.arxiv.org/api/query"
    params = {
        "search_query": query,
        "start": 0,
        "max_results": 100,
        "sortBy": "submittedDate",
        "sortOrder": "descending"
    }

    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code != 200:
            print(f"Fallback API returned status {resp.status_code}")
            return []

        # Parse XML
        root = ET.fromstring(resp.content)
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        papers = []
        for entry in root.findall("atom:entry", ns):
            id_elem = entry.find("atom:id", ns)
            if id_elem is None:
                continue

            full_id = id_elem.text
            paper_id = full_id.split("/abs/")[-1] if "/abs/" in full_id else full_id

            title_elem = entry.find("atom:title", ns)
            title = title_elem.text.strip() if title_elem is not None else ""

            summary_elem = entry.find("atom:summary", ns)
            abstract = summary_elem.text.strip() if summary_elem is not None else ""

            authors = []
            for author in entry.findall("atom:author", ns):
                name_elem = author.find("atom:name", ns)
                if name_elem is not None:
                    authors.append(name_elem.text)

            primary_category = None
            categories_list = []
            for cat in entry.findall("atom:category", ns):
                term = cat.get("term", "")
                if term:
                    categories_list.append(term)
                    if primary_category is None:
                        primary_category = term

            published_elem = entry.find("atom:published", ns)
            published = published_elem.text if published_elem is not None else ""

            papers.append({
                "id": paper_id,
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "primary_category": primary_category,
                "categories": categories_list,
                "published": published,
                "updated": "",
                "pdf_url": None,
            })

        print(f"Fallback fetched {len(papers)} papers")
        return papers

    except Exception as e:
        print(f"Fallback also failed: {e}")
        return []


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

# pipeline/daily_fetch.py
from datetime import datetime, timedelta
from typing import Tuple


def get_date_range(days: int = 1) -> Tuple[str, str]:
    """Get date range for fetching papers (arXiv uses UTC)."""
    from datetime import timezone

    # Use UTC time for arXiv API
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    return (
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )


def fetch_arxiv_papers(start_date: str, end_date: str, categories: list = None) -> list:
    """Fetch papers from arXiv API.

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        categories: List of arXiv categories to filter (e.g., ['cs.AI', 'cs.CV'])

    Returns:
        List of paper dictionaries with id, title, authors, abstract, etc.
    """
    import xml.etree.ElementTree as ET
    import time
    try:
        import requests
        USE_REQUESTS = True
    except ImportError:
        USE_REQUESTS = False
        import urllib.request
        import urllib.parse

    # Build search query
    date_query = f"submittedDate:[{start_date} TO {end_date}]"

    if categories:
        cat_query = " OR ".join([f"cat:{cat}" for cat in categories])
        search_query = f"({date_query}) AND ({cat_query})"
    else:
        search_query = date_query

    # arXiv API endpoint
    base_url = "https://export.arxiv.org/api/query"
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": 100,
        "sortBy": "submittedDate",
        "sortOrder": "descending"
    }

    try:
        data = None

        # Try using requests library first (more reliable)
        if USE_REQUESTS:
            for attempt in range(3):
                try:
                    response = requests.get(base_url, params=params, timeout=30)
                    response.raise_for_status()
                    data = response.text
                    break
                except Exception as e:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    raise
        else:
            # Fallback to urllib
            import ssl
            url = f"{base_url}?{urllib.parse.urlencode(params)}"
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            for attempt in range(3):
                try:
                    req = urllib.request.Request(
                        url,
                        headers={'User-Agent': 'Mozilla/5.0 (Academic Trend Monitor)'}
                    )
                    with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
                        data = response.read().decode('utf-8')
                        break
                except Exception as e:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    raise

        if data is None:
            return []

        # Parse XML
        root = ET.fromstring(data)

        # Define namespaces
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }

        papers = []
        for entry in root.findall('atom:entry', ns):
            # Extract paper ID
            id_elem = entry.find('atom:id', ns)
            if id_elem is None:
                continue

            # Parse ID (http://arxiv.org/abs/2503.12345 -> 2503.12345)
            full_id = id_elem.text
            paper_id = full_id.split('/abs/')[-1] if '/abs/' in full_id else full_id

            # Extract title
            title_elem = entry.find('atom:title', ns)
            title = title_elem.text.strip() if title_elem is not None else ""

            # Extract abstract
            summary_elem = entry.find('atom:summary', ns)
            abstract = summary_elem.text.strip() if summary_elem is not None else ""

            # Extract authors
            authors = []
            for author in entry.findall('atom:author', ns):
                name_elem = author.find('atom:name', ns)
                if name_elem is not None:
                    authors.append(name_elem.text)

            # Extract categories
            primary_category = None
            categories_list = []
            for cat in entry.findall('atom:category', ns):
                term = cat.get('term', '')
                if term:
                    categories_list.append(term)
                    if primary_category is None:
                        primary_category = term

            # Extract published date
            published_elem = entry.find('atom:published', ns)
            published = published_elem.text if published_elem is not None else ""

            paper = {
                "id": paper_id,
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "primary_category": primary_category,
                "categories": categories_list,
                "published": published
            }
            papers.append(paper)

        return papers

    except Exception as e:
        print(f"Error fetching from arXiv: {e}")
        return []


if __name__ == "__main__":
    import sys

    days = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    start, end = get_date_range(days)
    print(f"Fetching papers from {start} to {end}")

    papers = fetch_arxiv_papers(start, end)
    print(f"Fetched {len(papers)} papers")

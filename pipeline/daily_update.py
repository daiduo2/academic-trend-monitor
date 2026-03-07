# pipeline/daily_update.py
"""Daily update script for fetching and tagging new papers."""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from pipeline.daily_fetch import get_date_range, fetch_arxiv_papers
from pipeline.tag_papers import tag_papers
from pipeline.utils.compact_format import compact_paper


def load_recent_papers(filepath: str, days: int = 7) -> list:
    """Load recent papers from JSONL file."""
    papers = []
    cutoff_date = datetime.now() - timedelta(days=days)

    if not os.path.exists(filepath):
        return papers

    with open(filepath) as f:
        for line in f:
            paper = json.loads(line.strip())
            # Parse compact date format YYMMDD
            paper_date = datetime.strptime("20" + paper["p"], "%Y%m%d")
            if paper_date >= cutoff_date:
                papers.append(paper)

    return papers


def save_recent_papers(papers: list, filepath: str):
    """Save papers to JSONL file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "w") as f:
        for paper in papers:
            f.write(json.dumps(paper, ensure_ascii=False) + "\n")


def main():
    data_dir = Path("data")
    recent_file = data_dir / "recent.jsonl"
    index_path = data_dir / "output" / "topic_index"

    # Fetch new papers
    start, end = get_date_range(days=1)
    print(f"Fetching papers from {start} to {end}")

    new_papers = fetch_arxiv_papers(start, end)
    print(f"Fetched {len(new_papers)} new papers")

    if not new_papers:
        print("No new papers to process")
        return

    # Tag papers
    print("Tagging papers...")
    tagged_papers = tag_papers(new_papers, str(index_path))

    # Convert to compact format
    compact_papers = [compact_paper(p) for p in tagged_papers]

    # Load existing recent papers (keep 14 days for weekly comparison)
    existing_papers = load_recent_papers(str(recent_file), days=14)

    # Merge and deduplicate
    paper_ids = {p["i"] for p in existing_papers}
    for paper in compact_papers:
        if paper["i"] not in paper_ids:
            existing_papers.append(paper)
            paper_ids.add(paper["i"])

    # Sort by date (newest first)
    existing_papers.sort(key=lambda p: p["p"], reverse=True)

    # Keep only last 14 days (for weekly trend comparison: this week + last week)
    cutoff = (datetime.now() - timedelta(days=14)).strftime("%y%m%d")
    existing_papers = [p for p in existing_papers if p["p"] >= cutoff]

    # Save
    save_recent_papers(existing_papers, str(recent_file))
    print(f"Saved {len(existing_papers)} papers to {recent_file}")


if __name__ == "__main__":
    main()

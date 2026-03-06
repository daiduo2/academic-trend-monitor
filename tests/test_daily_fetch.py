# tests/test_daily_fetch.py
from datetime import datetime, timedelta
import json

def test_get_date_range():
    from pipeline.daily_fetch import get_date_range

    start, end = get_date_range(days=7)

    assert len(start) == 10  # YYYY-MM-DD
    assert len(end) == 10

    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")

    assert (end_date - start_date).days == 7


def test_get_date_range_default():
    """Test default behavior with days=1"""
    from pipeline.daily_fetch import get_date_range

    start, end = get_date_range()

    assert len(start) == 10
    assert len(end) == 10

    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")

    assert (end_date - start_date).days == 1


def test_fetch_arxiv_papers_returns_list():
    """Test that fetch_arxiv_papers returns a list"""
    from pipeline.daily_fetch import fetch_arxiv_papers

    result = fetch_arxiv_papers("2025-03-01", "2025-03-07")

    assert isinstance(result, list)

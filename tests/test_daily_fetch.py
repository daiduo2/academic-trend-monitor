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

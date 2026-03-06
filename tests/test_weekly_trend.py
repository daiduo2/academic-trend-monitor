# tests/test_weekly_trend.py
import json
from datetime import datetime


def test_calculate_trend():
    from pipeline.weekly_trend import calculate_trend

    current = 100
    previous = 80

    trend = calculate_trend(current, previous)

    assert trend["change"] == 20
    assert trend["percent"] == 25.0
    assert trend["direction"] == "up"


def test_calculate_trend_down():
    from pipeline.weekly_trend import calculate_trend

    current = 60
    previous = 100

    trend = calculate_trend(current, previous)

    assert trend["change"] == -40
    assert trend["percent"] == -40.0
    assert trend["direction"] == "down"


def test_calculate_trend_stable():
    from pipeline.weekly_trend import calculate_trend

    current = 100
    previous = 100

    trend = calculate_trend(current, previous)

    assert trend["change"] == 0
    assert trend["percent"] == 0.0
    assert trend["direction"] == "stable"


def test_calculate_trend_zero_previous():
    from pipeline.weekly_trend import calculate_trend

    current = 50
    previous = 0

    trend = calculate_trend(current, previous)

    assert trend["change"] == 50
    assert trend["percent"] == 100.0
    assert trend["direction"] == "up"


def test_calculate_trend_zero_current():
    from pipeline.weekly_trend import calculate_trend

    current = 0
    previous = 100

    trend = calculate_trend(current, previous)

    assert trend["change"] == -100
    assert trend["percent"] == -100.0
    assert trend["direction"] == "down"


def test_calculate_trend_both_zero():
    from pipeline.weekly_trend import calculate_trend

    current = 0
    previous = 0

    trend = calculate_trend(current, previous)

    assert trend["change"] == 0
    assert trend["percent"] == 0.0
    assert trend["direction"] == "stable"

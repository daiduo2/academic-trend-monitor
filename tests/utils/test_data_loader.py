import pytest
from pipeline.utils.data_loader import load_monthly_data, get_available_periods

def test_load_monthly_data_returns_list():
    result = load_monthly_data("2025-02")
    assert isinstance(result, list)
    assert len(result) > 0

def test_load_monthly_data_has_required_fields():
    result = load_monthly_data("2025-02")
    first_doc = result[0]
    assert "id" in first_doc
    assert "title" in first_doc
    assert "abstract" in first_doc
    assert "categories" in first_doc

def test_get_available_periods():
    periods = get_available_periods()
    assert isinstance(periods, list)
    assert len(periods) > 0
    assert "2025-02" in periods

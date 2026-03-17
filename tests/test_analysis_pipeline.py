from datetime import date
from unittest.mock import patch


def test_normalize_analysis_defaults():
    from pipeline.daily_generate_analysis import normalize_analysis

    payload = {"summary": "Summary only"}
    normalized = normalize_analysis(payload, date(2026, 3, 8))

    assert normalized["date"] == "2026-03-08"
    assert normalized["title"] == "2026-03-08 学术趋势日报"
    assert normalized["summary"] == "Summary only"
    assert normalized["top_rising_topics"] == []
    assert normalized["signals"] == []


def test_analyze_weekly_trends_from_papers():
    from pipeline.weekly_trend import analyze_weekly_trends_from_papers

    papers = [
        {"i": "1", "p": "260307", "g": ["1", "2"]},
        {"i": "2", "p": "260306", "g": ["1"]},
        {"i": "3", "p": "260225", "g": ["2"]},
    ]
    topics = {
        "topics": {
            "1": {"n": "Topic One", "p": "AI"},
            "2": {"n": "Topic Two", "p": "CV"},
        }
    }

    report = analyze_weekly_trends_from_papers(papers, topics)

    assert report["window_days"] == 7
    assert report["trends"][0]["topic_name"] in {"Topic One", "Topic Two"}


def test_render_markdown_contains_sections():
    from pipeline.export_analysis_static import _render_markdown

    payload = {
        "title": "Daily Analysis",
        "summary": "Summary",
        "key_findings": ["Finding A"],
        "signals": [{"label": "Emerging", "summary": "Signal summary"}],
    }

    rendered = _render_markdown(payload)
    assert "# Daily Analysis" in rendered
    assert "## 主要发现" in rendered
    assert "## 关键信号" in rendered


def test_normalize_database_url_for_neon():
    from pipeline.db import normalize_database_url

    url = "postgresql://user:pass@ep-test.ap-southeast-1.aws.neon.tech/dbname"
    normalized = normalize_database_url(url)

    assert "sslmode=require" in normalized
    assert "application_name=academic_trend_monitor" in normalized


def test_normalize_database_url_keeps_existing_sslmode():
    from pipeline.db import normalize_database_url

    url = "postgresql://user:pass@localhost/dbname?sslmode=disable"
    normalized = normalize_database_url(url)

    assert "sslmode=disable" in normalized
    assert "application_name=academic_trend_monitor" in normalized


def test_prepare_anthropic_env_maps_issuelab_variables():
    from pipeline.utils.analysis_client import AnalysisClient

    with patch.dict(
        "os.environ",
        {
            "ANTHROPIC_AUTH_TOKEN": "token-123",
            "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
            "ANTHROPIC_MODEL": "MiniMax-M2.1",
        },
        clear=False,
    ):
        client = AnalysisClient()
        with patch.dict("os.environ", {}, clear=True):
            client._prepare_anthropic_env()
            import os

            assert os.environ["ANTHROPIC_API_KEY"] == "token-123"
            assert os.environ["ANTHROPIC_BASE_URL"] == "https://api.minimaxi.com/anthropic"
            assert os.environ["ANTHROPIC_MODEL"] == "MiniMax-M2.1"

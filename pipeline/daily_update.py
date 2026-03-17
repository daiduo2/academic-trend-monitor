"""Compatibility wrapper for the PostgreSQL-backed daily pipeline."""
from __future__ import annotations

import sys
from pathlib import Path


if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main():
    from pipeline.daily_fetch_and_tag import run_daily_fetch_and_tag
    from pipeline.export_recent_static import export_recent_static

    stored = run_daily_fetch_and_tag(days=1)
    if stored:
        export_recent_static(Path("data/recent.jsonl"))
        print("Exported static recent.jsonl after DB update")


if __name__ == "__main__":
    main()

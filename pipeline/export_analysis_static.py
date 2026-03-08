"""Export daily analysis results from PostgreSQL to static JSON/Markdown."""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path

from pipeline.db import connect, ensure_schema


def _render_markdown(payload: dict) -> str:
    lines = [f"# {payload['title']}", "", payload["summary"], ""]
    if payload.get("key_findings"):
        lines.append("## 主要发现")
        lines.extend(f"- {item}" for item in payload["key_findings"])
        lines.append("")
    if payload.get("signals"):
        lines.append("## 关键信号")
        lines.extend(f"- {item.get('label', 'Signal')}: {item.get('summary', '')}" for item in payload["signals"])
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def export_analysis_static(output_dir: Path, target_date: date | None = None, markdown: bool = True) -> Path:
    target_date = target_date or datetime.now(timezone.utc).date()
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload FROM daily_analyses WHERE analysis_date = %s",
                (target_date,),
            )
            row = cur.fetchone()
    if not row:
        raise RuntimeError(f"No analysis found for {target_date.isoformat()}")

    payload = row[0]
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"{target_date.isoformat()}.json"
    with open(json_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

    if markdown:
        md_path = output_dir / f"{target_date.isoformat()}.md"
        with open(md_path, "w", encoding="utf-8") as handle:
            handle.write(_render_markdown(payload))

    return json_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export daily analysis static artifacts")
    parser.add_argument("--output-dir", default="data/analysis/daily")
    parser.add_argument("--date")
    parser.add_argument("--no-markdown", action="store_true")
    args = parser.parse_args()

    target = date.fromisoformat(args.date) if args.date else None
    output = export_analysis_static(Path(args.output_dir), target_date=target, markdown=not args.no_markdown)
    print(f"Exported analysis to {output}")


if __name__ == "__main__":
    main()

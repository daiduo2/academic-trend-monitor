"""Export weekly trend snapshot from PostgreSQL to static JSON."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.weekly_trend import analyze_weekly_trends_from_papers


def _load_topic_index(conn, version_month: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT topic_id, name, keywords, layer, category_code
            FROM topics
            WHERE version_month = %s
            """,
            (version_month,),
        )
        rows = cur.fetchall()

    return {
        "version": version_month,
        "topics": {
            str(row[0]).replace("topic_", ""): {
                "n": row[1],
                "k": row[2] or [],
                "l": row[3],
                "p": row[4] or "Unknown",
            }
            for row in rows
        },
        "categories": {},
    }


def export_weekly_static(output_path: Path, days: int = 14) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)
        if not active:
            report = {
                "period": "",
                "week": datetime.now(timezone.utc).strftime("%Y-W%W"),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "total_papers": 0,
                "window_days": 7,
                "trends": [],
            }
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as handle:
                json.dump(report, handle, ensure_ascii=False, indent=2)
            print("No active topic version found, exported empty weekly snapshot")
            return report
        topics_payload = _load_topic_index(conn, active["version_month"])

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.arxiv_id,
                    p.published_at,
                    COALESCE(json_agg(replace(t.topic_id, 'topic_', '') ORDER BY t.rank) FILTER (WHERE t.topic_id IS NOT NULL), '[]'::json) AS tags
                FROM papers_recent p
                LEFT JOIN paper_topic_tags t
                    ON p.arxiv_id = t.arxiv_id
                   AND t.topic_version_month = %s
                WHERE p.published_at >= %s
                GROUP BY p.arxiv_id, p.published_at
                """
                ,
                (active["version_month"], cutoff),
            )
            rows = cur.fetchall()

    papers = []
    for row in rows:
        published_at = row[1]
        compact_date = published_at.strftime("%y%m%d") if published_at else ""
        papers.append({"i": row[0], "p": compact_date, "g": row[2] or []})

    report = analyze_weekly_trends_from_papers(papers, topics_payload)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO export_snapshots (export_name, payload)
                VALUES ('weekly.json', %s)
                ON CONFLICT (export_name) DO UPDATE SET
                    exported_at = NOW(),
                    payload = EXCLUDED.payload
                """,
                (json.dumps({"count": len(report.get("trends", [])), "output_path": str(output_path)}),),
            )

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Export rolling weekly trend report")
    parser.add_argument("--output")
    args = parser.parse_args()

    output = args.output or f"data/weekly/{datetime.now().strftime('%Y-%m-%d')}.json"
    report = export_weekly_static(Path(output))
    print(f"Exported {len(report['trends'])} topic trends to {output}")


if __name__ == "__main__":
    main()

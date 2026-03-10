"""Export recent tagged papers from PostgreSQL to static JSONL."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.utils.compact_format import compact_paper


def export_recent_static(output_path: Path, days: int = 14) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)
        if not active:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text("", encoding="utf-8")
            print("No active topic version found, exported empty recent snapshot")
            return 0

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.arxiv_id,
                    p.title,
                    p.authors,
                    p.primary_category,
                    p.published_at,
                    COALESCE(json_agg(replace(t.topic_id, 'topic_', '') ORDER BY t.rank) FILTER (WHERE t.topic_id IS NOT NULL), '[]'::json) AS tags,
                    COALESCE(json_agg(t.score ORDER BY t.rank) FILTER (WHERE t.topic_id IS NOT NULL), '[]'::json) AS scores
                FROM papers_recent p
                LEFT JOIN paper_topic_tags t
                    ON p.arxiv_id = t.arxiv_id
                   AND t.topic_version_month = %s
                WHERE p.published_at >= %s
                GROUP BY p.arxiv_id, p.title, p.authors, p.primary_category, p.published_at
                ORDER BY p.published_at DESC
                """,
                (active["version_month"], cutoff),
            )
            rows = cur.fetchall()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        for row in rows:
            paper = {
                "id": row[0],
                "title": row[1],
                "authors": row[2] or [],
                "primary_category": row[3],
                "published": row[4].isoformat() if row[4] else "",
                "tags": row[5] or [],
                "scores": row[6] or [],
            }
            handle.write(json.dumps(compact_paper(paper), ensure_ascii=False) + "\n")

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO export_snapshots (export_name, payload)
                VALUES ('recent.jsonl', %s)
                ON CONFLICT (export_name) DO UPDATE SET
                    exported_at = NOW(),
                    payload = EXCLUDED.payload
                """,
                (json.dumps({"count": len(rows), "output_path": str(output_path)}),),
            )

    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export recent tagged papers to static JSONL")
    parser.add_argument("--output", default="data/recent.jsonl")
    parser.add_argument("--days", type=int, default=14)
    args = parser.parse_args()

    count = export_recent_static(Path(args.output), days=args.days)
    print(f"Exported {count} papers to {args.output}")


if __name__ == "__main__":
    main()

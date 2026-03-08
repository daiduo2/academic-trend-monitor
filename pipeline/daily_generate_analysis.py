"""Generate daily LLM analysis from PostgreSQL-backed pipeline outputs."""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone

from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.utils.analysis_client import AnalysisClient


def _load_prompt_template() -> str:
    with open("config/prompts.yaml", "r", encoding="utf-8") as handle:
        import yaml

        prompts = yaml.safe_load(handle)
    return prompts["daily_analysis_json"]


def build_analysis_payload(target_date: date) -> dict:
    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)
        if not active:
            raise RuntimeError("No active topic version found")

        start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)
        prev_start = start_dt - timedelta(days=7)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.arxiv_id, p.title, p.primary_category, p.published_at,
                       COALESCE(json_agg(json_build_object('topic_id', replace(t.topic_id, 'topic_', ''), 'score', t.score)
                           ORDER BY t.rank) FILTER (WHERE t.topic_id IS NOT NULL), '[]'::json) AS tags
                FROM papers_recent p
                LEFT JOIN paper_topic_tags t
                  ON p.arxiv_id = t.arxiv_id
                 AND t.topic_version_month = %s
                WHERE p.published_at >= %s AND p.published_at < %s
                GROUP BY p.arxiv_id, p.title, p.primary_category, p.published_at
                ORDER BY p.published_at DESC
                """,
                (active["version_month"], start_dt, end_dt),
            )
            papers = cur.fetchall()

            cur.execute(
                """
                WITH current_window AS (
                    SELECT t.topic_id, COUNT(*) AS count_now
                    FROM papers_recent p
                    JOIN paper_topic_tags t ON p.arxiv_id = t.arxiv_id
                    WHERE t.topic_version_month = %s
                      AND p.published_at >= %s
                      AND p.published_at < %s
                    GROUP BY t.topic_id
                ),
                previous_window AS (
                    SELECT t.topic_id, COUNT(*) AS count_prev
                    FROM papers_recent p
                    JOIN paper_topic_tags t ON p.arxiv_id = t.arxiv_id
                    WHERE t.topic_version_month = %s
                      AND p.published_at >= %s
                      AND p.published_at < %s
                    GROUP BY t.topic_id
                )
                SELECT COALESCE(c.topic_id, p.topic_id) AS topic_id,
                       COALESCE(c.count_now, 0) AS count_now,
                       COALESCE(p.count_prev, 0) AS count_prev,
                       tp.name
                FROM current_window c
                FULL OUTER JOIN previous_window p ON c.topic_id = p.topic_id
                LEFT JOIN topics tp
                  ON tp.version_month = %s
                 AND tp.topic_id = COALESCE(c.topic_id, p.topic_id)
                ORDER BY count_now DESC, count_prev DESC
                LIMIT 10
                """,
                (
                    active["version_month"],
                    prev_start,
                    end_dt,
                    active["version_month"],
                    prev_start - timedelta(days=7),
                    prev_start,
                    active["version_month"],
                ),
            )
            trends = cur.fetchall()

        return {
            "date": target_date.isoformat(),
            "topic_version": active["version_month"],
            "paper_count": len(papers),
            "papers": [
                {
                    "arxiv_id": row[0],
                    "title": row[1],
                    "primary_category": row[2],
                    "published_at": row[3].isoformat() if row[3] else None,
                    "tags": row[4],
                }
                for row in papers[:30]
            ],
            "top_rising_topics": [
                {
                    "topic_id": str(row[0]).replace("topic_", ""),
                    "topic_name": row[3] or str(row[0]),
                    "paper_count": row[1],
                    "previous_count": row[2],
                    "change": row[1] - row[2],
                }
                for row in trends
            ],
        }


def normalize_analysis(payload: dict, target_date: date) -> dict:
    return {
        "date": payload.get("date", target_date.isoformat()),
        "title": payload.get("title", f"{target_date.isoformat()} 学术趋势日报"),
        "summary": payload.get("summary", "今日新增论文较少，暂无显著热点变化。"),
        "key_findings": payload.get("key_findings", []),
        "risks": payload.get("risks", []),
        "top_rising_topics": payload.get("top_rising_topics", []),
        "notable_papers": payload.get("notable_papers", []),
        "signals": payload.get("signals", []),
        "model_meta": payload.get("model_meta", {}),
    }


def save_analysis(analysis: dict) -> None:
    analysis_date = analysis["date"]
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_analyses (analysis_date, title, summary, key_findings, risks, model_meta, payload, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (analysis_date) DO UPDATE SET
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary,
                    key_findings = EXCLUDED.key_findings,
                    risks = EXCLUDED.risks,
                    model_meta = EXCLUDED.model_meta,
                    payload = EXCLUDED.payload,
                    updated_at = NOW()
                """,
                (
                    analysis_date,
                    analysis["title"],
                    analysis["summary"],
                    json.dumps(analysis["key_findings"]),
                    json.dumps(analysis["risks"]),
                    json.dumps(analysis["model_meta"]),
                    json.dumps(analysis),
                ),
            )
            cur.execute("DELETE FROM analysis_highlights WHERE analysis_date = %s", (analysis_date,))

            for highlight_type in ("top_rising_topics", "notable_papers", "signals"):
                for idx, item in enumerate(analysis.get(highlight_type, [])):
                    cur.execute(
                        """
                        INSERT INTO analysis_highlights (analysis_date, highlight_type, sort_order, payload)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (analysis_date, highlight_type, idx, json.dumps(item)),
                    )


def generate_daily_analysis(target_date: date | None = None) -> dict:
    target_date = target_date or datetime.now(timezone.utc).date()
    source_payload = build_analysis_payload(target_date)
    prompt = _load_prompt_template().format(payload=json.dumps(source_payload, ensure_ascii=False, indent=2))

    analysis_client = AnalysisClient()
    raw = analysis_client.complete_json(prompt)
    normalized = normalize_analysis(raw, target_date)
    if not normalized["model_meta"]:
        normalized["model_meta"] = {"provider": "unknown", "model": "unknown", "mode": "daily_analysis"}
    save_analysis(normalized)
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate daily LLM analysis")
    parser.add_argument("--date")
    args = parser.parse_args()
    target = date.fromisoformat(args.date) if args.date else None
    analysis = generate_daily_analysis(target)
    print(f"Generated analysis for {analysis['date']}")


if __name__ == "__main__":
    main()

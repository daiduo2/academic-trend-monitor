"""Generate daily LLM analysis from PostgreSQL-backed pipeline outputs."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import date, datetime, timedelta, timezone

from pipeline.db import connect, ensure_schema, get_active_topic_version
from pipeline.utils.analysis_client import AnalysisClient


def _load_prompt_template() -> str:
    with open("config/prompts.yaml", "r", encoding="utf-8") as handle:
        import yaml

        prompts = yaml.safe_load(handle)
    return prompts["daily_analysis_json"]


def _fetch_daily_papers(cur, start_dt: datetime, end_dt: datetime, version_month: str | None = None):
    topic_join = ""
    topic_select = "'[]'::json AS tags"
    params: list[object] = [start_dt, end_dt]
    if version_month:
        topic_join = """
                LEFT JOIN paper_topic_tags t
                  ON p.arxiv_id = t.arxiv_id
                 AND t.topic_version_month = %s
        """
        topic_select = """
               COALESCE(json_agg(json_build_object('topic_id', replace(t.topic_id, 'topic_', ''), 'score', t.score)
                   ORDER BY t.rank) FILTER (WHERE t.topic_id IS NOT NULL), '[]'::json) AS tags
        """
        params.insert(0, version_month)

    cur.execute(
        f"""
        SELECT p.arxiv_id, p.title, p.primary_category, p.published_at,
               {topic_select}
        FROM papers_recent p
        {topic_join}
        WHERE p.published_at >= %s AND p.published_at < %s
        GROUP BY p.arxiv_id, p.title, p.primary_category, p.published_at
        ORDER BY p.published_at DESC
        """,
        params,
    )
    return cur.fetchall()


def _fetch_topic_trends(cur, active_version: str, start_dt: datetime, end_dt: datetime, prev_start: datetime):
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
            active_version,
            prev_start,
            end_dt,
            active_version,
            prev_start - timedelta(days=7),
            prev_start,
            active_version,
        ),
    )
    return cur.fetchall()


def _fetch_category_trends(cur, start_dt: datetime, end_dt: datetime, prev_start: datetime):
    cur.execute(
        """
        SELECT primary_category, published_at
        FROM papers_recent
        WHERE published_at >= %s
          AND published_at < %s
          AND primary_category IS NOT NULL
        """,
        (prev_start - timedelta(days=7), end_dt),
    )
    counts_now: Counter[str] = Counter()
    counts_prev: Counter[str] = Counter()
    for category, published_at in cur.fetchall():
        if not category or not published_at:
            continue
        if published_at >= prev_start:
            counts_now[category] += 1
        else:
            counts_prev[category] += 1

    ranked = sorted(
        set(counts_now) | set(counts_prev),
        key=lambda category: (counts_now[category], counts_now[category] - counts_prev[category], counts_prev[category]),
        reverse=True,
    )
    return [
        {
            "topic_id": category,
            "topic_name": category,
            "paper_count": counts_now[category],
            "previous_count": counts_prev[category],
            "change": counts_now[category] - counts_prev[category],
        }
        for category in ranked[:10]
    ]


def build_analysis_payload(target_date: date) -> dict:
    with connect() as conn:
        ensure_schema(conn)
        active = get_active_topic_version(conn)

        start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)
        prev_start = start_dt - timedelta(days=7)

        with conn.cursor() as cur:
            papers = _fetch_daily_papers(cur, start_dt, end_dt, active["version_month"] if active else None)
            if active:
                trends = _fetch_topic_trends(cur, active["version_month"], start_dt, end_dt, prev_start)
                normalized_trends = [
                    {
                        "topic_id": str(row[0]).replace("topic_", ""),
                        "topic_name": row[3] or str(row[0]),
                        "paper_count": row[1],
                        "previous_count": row[2],
                        "change": row[1] - row[2],
                    }
                    for row in trends
                ]
                analysis_mode = "topic_version"
                topic_version = active["version_month"]
            else:
                normalized_trends = _fetch_category_trends(cur, start_dt, end_dt, prev_start)
                analysis_mode = "category_fallback"
                topic_version = None

        return {
            "date": target_date.isoformat(),
            "topic_version": topic_version,
            "analysis_mode": analysis_mode,
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
            "top_rising_topics": normalized_trends,
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


def build_fallback_analysis(source_payload: dict, target_date: date, reason: str) -> dict:
    top_topics = source_payload.get("top_rising_topics", [])[:5]
    papers = source_payload.get("papers", [])[:5]
    paper_count = source_payload.get("paper_count", 0)
    mode = source_payload.get("analysis_mode", "fallback")

    if top_topics:
        topic_labels = "、".join(item.get("topic_name") or item.get("topic_id", "") for item in top_topics[:3])
        summary = f"当日共采集到 {paper_count} 篇论文，主要活跃方向集中在 {topic_labels}。"
    else:
        summary = f"当日共采集到 {paper_count} 篇论文，暂未观察到显著的集中热点。"

    key_findings = [summary]
    if mode == "category_fallback":
        key_findings.append("当前缺少激活的 topic version，日报基于 primary category 聚合生成。")
    if papers:
        key_findings.append(f"最近论文中包括《{papers[0]['title']}》等值得继续跟踪。")

    notable_papers = [
        {
            "arxiv_id": item["arxiv_id"],
            "title": item["title"],
            "reason": "基于当日抓取结果自动纳入观察列表。",
        }
        for item in papers[:3]
    ]

    signals = []
    if top_topics:
        first_topic = top_topics[0]
        signals.append(
            {
                "kind": "emerging",
                "label": f"{first_topic.get('topic_name') or first_topic.get('topic_id')} 活跃度上升",
                "summary": f"近 7 天窗口内该方向论文数变化为 {first_topic.get('change', 0)}。",
            }
        )
    if mode == "category_fallback":
        signals.append(
            {
                "kind": "drift",
                "label": "使用分类回退分析",
                "summary": "由于缺少已发布主题版本，本日报未使用主题标签趋势，而是使用 primary category 统计。",
            }
        )

    return {
        "date": target_date.isoformat(),
        "title": f"{target_date.isoformat()} 学术趋势日报",
        "summary": summary,
        "key_findings": key_findings,
        "risks": [f"已启用本地兜底分析：{reason}"],
        "top_rising_topics": top_topics,
        "notable_papers": notable_papers,
        "signals": signals,
        "model_meta": {
            "provider": "local_fallback",
            "model": "deterministic-summary",
            "mode": "daily_analysis",
        },
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

    try:
        analysis_client = AnalysisClient()
        raw = analysis_client.complete_json(prompt)
    except Exception as exc:
        raw = build_fallback_analysis(source_payload, target_date, str(exc))
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

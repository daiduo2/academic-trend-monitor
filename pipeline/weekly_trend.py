# pipeline/weekly_trend.py
import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict


def calculate_trend(current: int, previous: int) -> dict:
    """Calculate trend statistics.

    Formula: (current - previous) / previous * 100%

    Args:
        current: Current period count
        previous: Previous period count

    Returns:
        Dict with change, percent, and direction ('up' | 'down' | 'stable')
    """
    change = current - previous

    if previous == 0:
        percent = 100.0 if current > 0 else 0.0
    else:
        percent = (change / previous) * 100

    if change > 0:
        direction = "up"
    elif change < 0:
        direction = "down"
    else:
        direction = "stable"

    return {
        "change": change,
        "percent": round(percent, 1),
        "direction": direction
    }


def parse_compact_date(date_str: str) -> datetime:
    """Parse compact date format (YYMMDD) to datetime."""
    # Prefix with '20' to get full year (assumes 2000-2099)
    year = 2000 + int(date_str[:2])
    month = int(date_str[2:4])
    day = int(date_str[4:6])
    return datetime(year, month, day)


def analyze_weekly_trends(recent_file: str, topics_file: str) -> dict:
    """Analyze weekly trends from recent papers using rolling 7-day windows."""
    # Load papers
    papers = []
    try:
        with open(recent_file) as f:
            for line in f:
                if line.strip():
                    papers.append(json.loads(line.strip()))
    except FileNotFoundError:
        print(f"Warning: {recent_file} not found, using empty list")

    # Load topics
    try:
        with open(topics_file) as f:
            topics_data = json.load(f)
            topics = topics_data.get("topics", {})
    except FileNotFoundError:
        print(f"Warning: {topics_file} not found, using empty topics")
        topics = {}

    # Get date ranges - rolling 7-day windows
    today = datetime.now()
    this_period_start = today - timedelta(days=7)   # Last 7 days
    last_period_start = today - timedelta(days=14)  # 7-14 days ago

    # Count papers per tag for each period
    this_period_counts = defaultdict(int)
    last_period_counts = defaultdict(int)

    for paper in papers:
        try:
            paper_date = parse_compact_date(paper["p"])
            tags = paper.get("g", [])

            for tag in tags:
                tag_id = str(tag)
                if paper_date >= this_period_start:
                    this_period_counts[tag_id] += 1
                elif paper_date >= last_period_start:
                    last_period_counts[tag_id] += 1
        except (KeyError, ValueError) as e:
            print(f"Warning: Skipping paper with invalid date: {e}")
            continue

    # Build trend report
    period_label = f"{this_period_start.strftime('%m/%d')}-{today.strftime('%m/%d')}"
    report = {
        "period": period_label,
        "week": today.strftime("%Y-W%W"),  # Kept for backward compatibility
        "generated_at": today.isoformat(),
        "total_papers": len(papers),
        "window_days": 7,  # Rolling window size
        "trends": []
    }

    all_tags = set(this_period_counts.keys()) | set(last_period_counts.keys())

    for tag_id in all_tags:
        this_count = this_period_counts.get(tag_id, 0)
        last_count = last_period_counts.get(tag_id, 0)

        topic_info = topics.get(tag_id, {})

        trend = calculate_trend(this_count, last_count)

        report["trends"].append({
            "topic_id": tag_id,
            "topic_name": topic_info.get("n", f"Topic {tag_id}"),
            "category": topic_info.get("p", "Unknown"),
            "this_period": this_count,
            "last_period": last_count,
            "this_week": this_count,  # Kept for backward compatibility
            "last_week": last_count,  # Kept for backward compatibility
            "trend": trend
        })

    # Sort by this week's count (descending)
    report["trends"].sort(key=lambda x: x["this_week"], reverse=True)

    return report


def main():
    data_dir = Path("data")
    recent_file = data_dir / "recent.jsonl"
    topics_file = data_dir / "output" / "topics.json"
    # Use date-based filename for rolling 7-day reports (YYYY-MM-DD format)
    output_file = data_dir / "weekly" / f"{datetime.now().strftime('%Y-%m-%d')}.json"

    print("Analyzing weekly trends...")
    report = analyze_weekly_trends(str(recent_file), str(topics_file))

    # Save report
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Saved weekly report to {output_file}")
    print(f"Period: {report['period']} (rolling 7-day window)")
    print(f"Total topics: {len(report['trends'])}")
    print(f"Total papers this period: {sum(t['this_period'] for t in report['trends'])}")


if __name__ == "__main__":
    main()

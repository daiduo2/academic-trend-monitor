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


def analyze_weekly_trends(recent_file: str, topics_file: str) -> dict:
    """Analyze weekly trends from recent papers."""
    # Load papers
    papers = []
    with open(recent_file) as f:
        for line in f:
            papers.append(json.loads(line.strip()))

    # Load topics
    with open(topics_file) as f:
        topics_data = json.load(f)
        topics = topics_data.get("topics", {})

    # Get date ranges
    today = datetime.now()
    this_week_start = (today - timedelta(days=today.weekday())).strftime("%y%m%d")
    last_week_start = (today - timedelta(days=today.weekday() + 7)).strftime("%y%m%d")

    # Count papers per tag for each week
    this_week_counts = defaultdict(int)
    last_week_counts = defaultdict(int)

    for paper in papers:
        paper_date = paper["p"]
        tags = paper.get("g", [])

        for tag in tags:
            tag_id = str(tag)
            if paper_date >= this_week_start:
                this_week_counts[tag_id] += 1
            elif paper_date >= last_week_start:
                last_week_counts[tag_id] += 1

    # Build trend report
    report = {
        "week": today.strftime("%Y-W%W"),
        "generated_at": today.isoformat(),
        "total_papers": len(papers),
        "trends": []
    }

    all_tags = set(this_week_counts.keys()) | set(last_week_counts.keys())

    for tag_id in all_tags:
        this_count = this_week_counts.get(tag_id, 0)
        last_count = last_week_counts.get(tag_id, 0)

        topic_info = topics.get(tag_id, {})

        trend = calculate_trend(this_count, last_count)

        report["trends"].append({
            "topic_id": tag_id,
            "topic_name": topic_info.get("n", f"Topic {tag_id}"),
            "category": topic_info.get("p", "Unknown"),
            "this_week": this_count,
            "last_week": last_count,
            "trend": trend
        })

    # Sort by this week's count (descending)
    report["trends"].sort(key=lambda x: x["this_week"], reverse=True)

    return report


def main():
    data_dir = Path("data")
    recent_file = data_dir / "recent.jsonl"
    topics_file = data_dir / "output" / "topics.json"
    output_file = data_dir / "weekly" / f"{datetime.now().strftime('%Y-W%W')}.json"

    print("Analyzing weekly trends...")
    report = analyze_weekly_trends(str(recent_file), str(topics_file))

    # Save report
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Saved weekly report to {output_file}")
    print(f"Total topics: {len(report['trends'])}")
    print(f"Total papers this week: {sum(t['this_week'] for t in report['trends'])}")


if __name__ == "__main__":
    main()

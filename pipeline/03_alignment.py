#!/usr/bin/env python3
"""Topic alignment and final export script - Phase 3 of pipeline."""

import json
from pathlib import Path
from pipeline.topic_aligner import TopicAligner
from pipeline.utils.data_loader import get_available_periods
from pipeline.utils.config import get_categories


def main():
    """Align topics across all periods and export final data."""
    hierarchy_dir = Path("data/output/hierarchy")
    output_dir = Path("data/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    periods = get_available_periods()
    print(f"Loading hierarchy data for {len(periods)} periods...")

    # Load all hierarchy data
    all_data = {}
    for period in periods:
        hierarchy_file = hierarchy_dir / f"{period}.json"
        if not hierarchy_file.exists():
            print(f"Hierarchy not found for {period}, skipping...")
            continue

        with open(hierarchy_file, "r", encoding="utf-8") as f:
            all_data[period] = json.load(f)

    # Build trends
    print("Building trend data...")
    aligner = TopicAligner()
    trends = aligner.build_trend_data(all_data)

    # Build final tree structure
    print("Building tree structure...")
    latest_period = max(all_data.keys())
    latest_data = all_data[latest_period]

    # Build tree from hierarchies
    tree = build_tree_from_hierarchies(latest_data, trends)

    # Export topics_tree.json
    topics_tree = {
        "version": latest_period,
        "topics": latest_data["topics"],
        "tree": tree
    }

    with open(output_dir / "topics_tree.json", "w", encoding="utf-8") as f:
        json.dump(topics_tree, f, ensure_ascii=False, indent=2)

    print(f"Exported topics_tree.json")

    # Export trend_stats.json
    trend_stats = {"trends": trends}
    with open(output_dir / "trend_stats.json", "w", encoding="utf-8") as f:
        json.dump(trend_stats, f, ensure_ascii=False, indent=2)

    print(f"Exported trend_stats.json")
    print(f"Total topics with trend data: {len(trends)}")


def build_tree_from_hierarchies(latest_data: dict, trends: dict) -> dict:
    """Build tree structure from hierarchies."""
    categories = get_categories()

    # Build root
    tree = {
        "id": "root",
        "name": "All Disciplines",
        "children": []
    }

    # Group by discipline
    disciplines = {}
    for topic_id, topic in latest_data["topics"].items():
        # Determine discipline from primary_category
        rep_docs = topic.get("representative_docs", [])
        if rep_docs:
            cat = rep_docs[0].get("primary_category", "")
            disc = cat.split(".")[0] if "." in cat else cat

            if disc not in disciplines:
                disciplines[disc] = {
                    "id": disc,
                    "name": disc.upper(),
                    "children": []
                }

            disciplines[disc]["children"].append({
                "id": topic_id,
                "name": topic.get("name", topic_id),
                "paper_count": topic.get("paper_count", 0),
                "children": []
            })

    tree["children"] = list(disciplines.values())
    return tree


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Topic alignment and final export script - Phase 3 of pipeline (FAST version)."""

import json
from pathlib import Path
from pipeline.topic_aligner_fast import TopicAlignerFast
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

    # Build trends using fast aligner (no LLM calls)
    print("\nBuilding trend data (fast keyword-based alignment)...")
    aligner = TopicAlignerFast(similarity_threshold=0.25)
    trends = aligner.build_trend_data(all_data)

    # Build final tree structure
    print("\nBuilding tree structure...")
    latest_period = max(all_data.keys())
    latest_data = all_data[latest_period]

    # Build tree from hierarchies
    tree = build_tree_from_hierarchies(latest_data, trends)

    # Export topics_tree.json
    topics_tree = {
        "version": latest_period,
        "generated_at": str(Path().stat().st_mtime),
        "topics": latest_data["topics"],
        "tree": tree
    }

    with open(output_dir / "topics_tree.json", "w", encoding="utf-8") as f:
        json.dump(topics_tree, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Exported topics_tree.json ({len(topics_tree['topics'])} topics)")

    # Export trend_stats.json
    trend_stats = {
        "periods": sorted(all_data.keys()),
        "total_topics": len(trends),
        "trends": trends
    }
    with open(output_dir / "trend_stats.json", "w", encoding="utf-8") as f:
        json.dump(trend_stats, f, ensure_ascii=False, indent=2)

    print(f"✅ Exported trend_stats.json ({len(trends)} topics with trend data)")

    # Print summary
    print("\n" + "="*50)
    print("FINAL EXPORT SUMMARY")
    print("="*50)
    print(f"Periods: {len(all_data)} ({min(all_data.keys())} to {max(all_data.keys())})")
    print(f"Latest period topics: {len(latest_data['topics'])}")
    print(f"Topics with trend history: {len(trends)}")

    # Count topics by discipline
    disciplines = {}
    for topic_id, topic in latest_data["topics"].items():
        cat = aligner.get_category(topic)
        if cat not in disciplines:
            disciplines[cat] = 0
        disciplines[cat] += 1

    print("\nTopics by discipline:")
    for disc, count in sorted(disciplines.items(), key=lambda x: -x[1]):
        print(f"  {disc.upper()}: {count}")


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

            # Get trend history for this topic
            trend_info = trends.get(topic_id, {})
            history = trend_info.get("history", [])

            disciplines[disc]["children"].append({
                "id": topic_id,
                "name": topic.get("name", topic_id),
                "paper_count": topic.get("paper_count", 0),
                "keywords": topic.get("keywords", [])[:5],
                "has_trend": len(history) > 1,
                "trend_months": len(history),
                "children": []
            })

    tree["children"] = list(disciplines.values())
    return tree


if __name__ == "__main__":
    main()

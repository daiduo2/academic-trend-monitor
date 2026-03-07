#!/usr/bin/env python3
"""Hierarchy building script - Phase 2 of pipeline."""

import json
from pathlib import Path
from pipeline.hierarchy_builder import CoarseClusterer, HierarchyBuilder
from pipeline.utils.data_loader import get_available_periods


def main():
    """Build hierarchy for all periods."""
    output_dir = Path("data/output/hierarchy")
    output_dir.mkdir(parents=True, exist_ok=True)

    bertopic_dir = Path("data/output/bertopic")

    periods = get_available_periods()

    for period in periods:
        print(f"\n{'='*60}")
        print(f"Building hierarchy for {period}...")
        print(f"{'='*60}")

        # Load BERTopic results
        bertopic_file = bertopic_dir / f"{period}.json"
        if not bertopic_file.exists():
            print(f"BERTopic results not found for {period}, skipping...")
            continue

        with open(bertopic_file, "r", encoding="utf-8") as f:
            bertopic_data = json.load(f)

        topics = bertopic_data["topics"]
        print(f"Processing {len(topics)} topics...")

        # Step 1: Generate names
        print("Generating topic names...")
        builder = HierarchyBuilder()
        named_topics = builder.generate_topic_names(topics)

        # Step 2: Coarse clustering by category
        print("Clustering by category...")
        clusterer = CoarseClusterer()
        category_clusters = clusterer.cluster_by_category(named_topics)

        print(f"Grouped into {len(category_clusters)} categories")

        # Step 3: Build hierarchy for each category
        all_hierarchies = {}
        for category, cat_topics in category_clusters.items():
            if len(cat_topics) < 2:
                continue

            print(f"  Building hierarchy for {category} ({len(cat_topics)} topics)...")
            hierarchy = builder.build_hierarchy(cat_topics, category)
            all_hierarchies[category] = hierarchy

        # Save results
        result = {
            "period": period,
            "topics": {f"topic_{t['topic_id']}": t for t in named_topics},
            "hierarchies": all_hierarchies
        }

        output_file = output_dir / f"{period}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"Saved hierarchy to {output_file}")


if __name__ == "__main__":
    main()

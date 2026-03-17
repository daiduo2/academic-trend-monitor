#!/usr/bin/env python3
"""Optimized hierarchy building script - Phase 2 of pipeline."""

import sys
sys.path.insert(0, '/Users/daiduo2/academic-trend-monitor')

import json
from pathlib import Path
from pipeline.hierarchy_builder_optimized import CoarseClusterer, HierarchyBuilder
from pipeline.utils.data_loader import get_available_periods

def main():
    """Build hierarchy for all periods."""
    output_dir = Path("data/output/hierarchy")
    output_dir.mkdir(parents=True, exist_ok=True)

    bertopic_dir = Path("data/output/bertopic")
    periods = get_available_periods()
    
    print(f"Processing {len(periods)} periods with BATCH optimization\n")
    print(f"Estimated API calls: ~{sum(26 for _ in periods)} (was ~3108)\n")

    for period in periods:
        print(f"\n{'='*60}")
        print(f"Building hierarchy for {period}...")
        print(f"{'='*60}")

        bertopic_file = bertopic_dir / f"{period}.json"
        if not bertopic_file.exists():
            print(f"Bertopic results not found for {period}, skipping...")
            continue

        with open(bertopic_file, "r", encoding="utf-8") as f:
            bertopic_data = json.load(f)

        topics = bertopic_data["topics"]
        print(f"Processing {len(topics)} topics...")

        # Step 1: Generate names in BATCHES
        print("Generating topic names in batches of 10...")
        builder = HierarchyBuilder()
        named_topics = builder.generate_topic_names_batch(topics, batch_size=10)
        print(f"  Generated {len(named_topics)} names")

        # Step 2: Coarse clustering
        print("Clustering by category...")
        clusterer = CoarseClusterer()
        category_clusters = clusterer.cluster_by_category(named_topics)
        print(f"  Grouped into {len(category_clusters)} categories")

        # Step 3: Build hierarchy for each category
        all_hierarchies = {}
        for category, cat_topics in category_clusters.items():
            if len(cat_topics) < 2:
                continue
            print(f"  Building hierarchy for {category} ({len(cat_topics)} topics)...")
            try:
                hierarchy = builder.build_hierarchy(cat_topics, category)
                all_hierarchies[category] = hierarchy
            except Exception as e:
                print(f"    Error: {e}")

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

    print(f"\n{'='*60}")
    print("ALL PERIODS COMPLETE!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()

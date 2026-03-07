#!/usr/bin/env python3
"""Add hierarchy information to aligned topics."""

import json
from pathlib import Path
from collections import defaultdict


def load_hierarchies():
    """Load all hierarchy files."""
    hierarchy_dir = Path("data/output/hierarchy")
    all_hierarchies = {}

    for f in hierarchy_dir.glob("*.json"):
        period = f.stem
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
            all_hierarchies[period] = data.get('hierarchies', {})

    return all_hierarchies


def find_topic_in_hierarchy(topic_id, category, hierarchies):
    """Find a topic's path in hierarchy."""
    # hierarchies is dict like { 'math.NT': { 'levels': [...] } }
    # We need to find which subcategory this topic belongs to
    # and then find its path in the hierarchy tree

    # For now, simplified: find the node with matching topic keywords
    # This is approximate since we don't have direct topic_id mapping in hierarchy

    subcategory = f"{category[0]}.{category[1]}" if isinstance(category, tuple) else category

    if subcategory not in hierarchies:
        return None

    hier = hierarchies[subcategory]
    return hier


def add_hierarchy_to_aligned():
    """Add hierarchy info to aligned topics."""

    # Load aligned data
    with open('data/output/aligned_topics.json', 'r', encoding='utf-8') as f:
        aligned = json.load(f)

    # Load all hierarchies
    all_hierarchies = load_hierarchies()
    print(f"Loaded hierarchies for {len(all_hierarchies)} periods")

    # For each global topic, try to find its hierarchy path
    for global_id, topic in aligned['trends'].items():
        category = topic['category']
        subcategory = topic['subcategory']

        # Build full subcategory code
        if subcategory == '_direct':
            full_code = category
        else:
            full_code = f"{category}.{subcategory}" if '.' not in subcategory else subcategory

        # Collect hierarchy info from all periods
        topic['hierarchy_paths'] = []
        topic['layer3'] = None  # Will store Layer 3 classification

        for period, period_hierarchies in all_hierarchies.items():
            if full_code in period_hierarchies:
                hier = period_hierarchies[full_code]
                # Extract level 3 nodes (the actual research topics)
                for level in hier.get('levels', []):
                    if level['level'] == 3:
                        for node in level['nodes']:
                            # Check if topic keywords match this node
                            if any(kw in node['name'].lower() or node['name'].lower() in kw
                                   for kw in topic['keywords'][:5]):
                                topic['layer3'] = node['name']
                                topic['hierarchy_paths'].append({
                                    'period': period,
                                    'path': node.get('path', []),
                                    'name': node['name']
                                })

    # Count topics with Layer 3
    with_layer3 = sum(1 for t in aligned['trends'].values() if t.get('layer3'))
    print(f"\nTopics with Layer 3 classification: {with_layer3}/{len(aligned['trends'])}")

    # Save enhanced data
    with open('data/output/aligned_topics_enhanced.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_dir = Path("frontend/public/data")
    with open(frontend_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    print("✅ Enhanced aligned_topics.json with hierarchy info")


if __name__ == "__main__":
    add_hierarchy_to_aligned()

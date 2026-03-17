#!/usr/bin/env python3
"""Add hierarchy information to aligned topics - Improved version."""

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
            all_hierarchies[period] = {
                'hierarchies': data.get('hierarchies', {}),
                'topics': data.get('topics', {})
            }

    return all_hierarchies


def extract_layer3_nodes(hierarchy):
    """Extract all level 3 nodes from hierarchy."""
    nodes = []
    for level_info in hierarchy.get('levels', []):
        if level_info['level'] == 3:
            for node in level_info['nodes']:
                nodes.append(node)
    return nodes


def match_topic_to_hierarchy(topic_name, topic_keywords, hierarchy_nodes):
    """Match a topic to its best hierarchy node."""
    best_match = None
    best_score = 0

    topic_text = (topic_name + ' ' + ' '.join(topic_keywords[:10])).lower()

    for node in hierarchy_nodes:
        node_name = node['name'].lower()

        # Calculate match score
        score = 0

        # Exact or substring match
        if node_name in topic_text or topic_text in node_name:
            score += 10

        # Keyword overlap
        node_words = set(node_name.split())
        topic_words = set(topic_text.split())
        overlap = len(node_words & topic_words)
        score += overlap * 2

        # Check representative docs keywords if available
        for kw in topic_keywords[:5]:
            if kw.lower() in node_name:
                score += 3

        if score > best_score and score > 5:  # Threshold
            best_score = score
            best_match = node

    return best_match, best_score


def add_hierarchy_to_aligned():
    """Add hierarchy info to aligned topics."""

    # Load aligned data
    with open('data/output/aligned_topics.json', 'r', encoding='utf-8') as f:
        aligned = json.load(f)

    # Load all hierarchies
    all_hierarchies = load_hierarchies()
    print(f"Loaded hierarchies for {len(all_hierarchies)} periods")

    # Build a map of subcategory -> all level 3 nodes across periods
    subcategory_nodes = defaultdict(list)
    for period, data in all_hierarchies.items():
        for subcat, hier in data['hierarchies'].items():
            nodes = extract_layer3_nodes(hier)
            subcategory_nodes[subcat].extend(nodes)

    print(f"Found {len(subcategory_nodes)} subcategories with hierarchy")

    # For each global topic, find best matching hierarchy node
    matched = 0
    for global_id, topic in aligned['trends'].items():
        category = topic['category']
        subcategory = topic['subcategory']

        # Build full subcategory code
        if subcategory == '_direct':
            full_code = category
        else:
            full_code = f"{category}.{subcategory}" if '.' not in subcategory else f"{category}.{subcategory}"

        if full_code not in subcategory_nodes:
            continue

        # Find best matching node
        best_node, score = match_topic_to_hierarchy(
            topic['name'],
            topic['keywords'],
            subcategory_nodes[full_code]
        )

        if best_node:
            matched += 1
            topic['layer3'] = best_node['name']
            topic['layer3_id'] = best_node['id']
            topic['hierarchy_path'] = best_node.get('path', [])
            topic['hierarchy_match_score'] = score

    print(f"\nTopics with Layer 3 classification: {matched}/{len(aligned['trends'])} ({matched/len(aligned['trends'])*100:.1f}%)")

    # Also update structure to include layer3 info
    for l1, l2s in aligned['structure'].items():
        for l2, topics in l2s.items():
            for topic in topics:
                tid = topic['id']
                if tid in aligned['trends'] and aligned['trends'][tid].get('layer3'):
                    topic['layer3'] = aligned['trends'][tid]['layer3']

    # Save enhanced data
    with open('data/output/aligned_topics_enhanced.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_dir = Path("frontend/public/data")
    with open(frontend_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    print("✅ Enhanced aligned_topics.json with hierarchy info")

    # Show examples
    print("\nSample topics with hierarchy:")
    for tid, topic in list(aligned['trends'].items())[:5]:
        if topic.get('layer3'):
            print(f"  {topic['name']}")
            print(f"    -> {topic['layer3']}")
            print(f"    Path: {' > '.join(topic.get('hierarchy_path', [])[:3])}")


if __name__ == "__main__":
    add_hierarchy_to_aligned()

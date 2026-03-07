#!/usr/bin/env python3
"""Reassign topics to hierarchy tree using improved keyword matching."""

import json
from pathlib import Path
from collections import defaultdict


def load_data():
    """Load hierarchy data."""
    with open('data/output/aligned_topics_hierarchy.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_tree_nodes(tree, current_path=None):
    """Extract all nodes from tree with their paths."""
    if current_path is None:
        current_path = []

    nodes = []
    node_path = current_path + [tree['name']]

    nodes.append({
        'name': tree['name'],
        'path': node_path,
        'depth': len(node_path),
        'is_leaf': not tree.get('children')
    })

    if tree.get('children'):
        for child in tree['children']:
            nodes.extend(extract_tree_nodes(child, node_path))

    return nodes


def calculate_match_score(topic, node_path):
    """Calculate how well a topic matches a node path."""
    topic_text = topic['name'].lower()
    keywords = [k.lower() for k in topic['keywords'][:10]]

    score = 0
    path_text = ' '.join(node_path).lower()

    # Direct name match
    if topic_text in path_text or any(p in topic_text for p in node_path):
        score += 10

    # Keyword matches in path
    for kw in keywords:
        if kw in path_text:
            score += 5

    # Word overlap
    topic_words = set(topic_text.split()) | set(keywords)
    path_words = set(path_text.split())
    overlap = len(topic_words & path_words)
    score += overlap * 2

    return score


def find_best_node(topic, tree_nodes):
    """Find the best matching node for a topic."""
    best_score = 0
    best_node = None

    for node in tree_nodes:
        score = calculate_match_score(topic, node['path'])

        # Prefer deeper nodes with good scores
        if node['depth'] >= 3:
            score += 2

        if score > best_score:
            best_score = score
            best_node = node

    return best_node, best_score


def reassign_topics():
    """Reassign all topics to hierarchy nodes."""
    data = load_data()

    print("Reassigning topics to hierarchy nodes...")

    # Group topics by Layer 2
    topics_by_layer2 = defaultdict(list)
    for tid, topic in data['trends'].items():
        layer2 = topic['subcategory']
        if layer2 == '_direct':
            layer2 = topic['category']
        else:
            layer2 = f"{topic['category']}.{layer2}" if '.' not in layer2 else layer2

        topic['global_id'] = tid
        topics_by_layer2[layer2].append(topic)

    total_reassigned = 0
    depth_distribution = defaultdict(int)

    # Process each Layer 2
    for layer2, topics in topics_by_layer2.items():
        if layer2 not in data.get('hierarchies', {}):
            continue

        hier = data['hierarchies'][layer2]
        tree = hier['tree']

        # Extract all nodes from tree
        tree_nodes = extract_tree_nodes(tree)

        # Skip if tree is too shallow
        max_depth = max(n['depth'] for n in tree_nodes) if tree_nodes else 1
        if max_depth < 3:
            # Just assign all to root
            for topic in topics:
                topic['hierarchy_path'] = [tree['name']]
                topic['hierarchy_depth'] = 1
                depth_distribution[1] += 1
            continue

        # Find best node for each topic
        for topic in topics:
            best_node, score = find_best_node(topic, tree_nodes)

            if best_node and score >= 3:  # Minimum threshold
                topic['hierarchy_path'] = best_node['path']
                topic['hierarchy_depth'] = best_node['depth']
            elif max_depth >= 3:
                # Assign to first level child if no good match but tree is deep
                if tree.get('children'):
                    child = tree['children'][0]
                    topic['hierarchy_path'] = [tree['name'], child['name']]
                    topic['hierarchy_depth'] = 2
                else:
                    topic['hierarchy_path'] = [tree['name']]
                    topic['hierarchy_depth'] = 1
            else:
                # Tree is shallow, assign to root
                topic['hierarchy_path'] = [tree['name']]
                topic['hierarchy_depth'] = 1

            depth_distribution[topic['hierarchy_depth']] += 1
            total_reassigned += 1

        print(f"  {layer2}: {len(topics)} topics reassigned")

    # Update trends in data
    missing = []
    for tid, topic in data['trends'].items():
        layer2 = topic['subcategory']
        if layer2 == '_direct':
            layer2 = topic['category']
        else:
            layer2 = f"{topic['category']}.{layer2}" if '.' not in layer2 else layer2

        # Find the updated topic
        found = False
        for t in topics_by_layer2.get(layer2, []):
            if t['global_id'] == tid:
                if 'hierarchy_path' in t:
                    data['trends'][tid]['hierarchy_path'] = t['hierarchy_path']
                    data['trends'][tid]['hierarchy_depth'] = t['hierarchy_depth']
                    found = True
                else:
                    missing.append((tid, layer2))
                break

        if not found:
            missing.append((tid, layer2))

    # Handle missing topics - assign default
    for tid, layer2 in missing:
        # Try to get root from hierarchy
        if layer2 in data.get('hierarchies', {}):
            tree = data['hierarchies'][layer2]['tree']
            data['trends'][tid]['hierarchy_path'] = [tree['name']]
        else:
            data['trends'][tid]['hierarchy_path'] = [layer2]
        data['trends'][tid]['hierarchy_depth'] = 1

    print(f"\n{'='*60}")
    print(f"Reassigned {total_reassigned} topics")
    print("\nNew depth distribution:")
    for d in sorted(depth_distribution.keys()):
        print(f"  Depth {d}: {depth_distribution[d]} topics")

    # Save
    output_path = Path('data/output/aligned_topics_hierarchy.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_path = Path('frontend/public/data/aligned_topics.json')
    with open(frontend_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved to {output_path} and {frontend_path}")

    # Show samples
    print("\nSample reassigned topics:")
    shown = 0
    for tid, topic in data['trends'].items():
        if topic.get('hierarchy_depth', 0) >= 3 and shown < 5:
            shown += 1
            print(f"  {topic['name']}")
            print(f"    Path: {' > '.join(topic['hierarchy_path'])}")


if __name__ == "__main__":
    reassign_topics()

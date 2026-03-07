#!/usr/bin/env python3
"""Add hierarchy information using LLM semantic matching."""

import json
from pathlib import Path
from collections import defaultdict
from pipeline.utils.llm_client import LLMClient


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


def extract_all_nodes(hierarchy):
    """Extract all nodes with their paths from hierarchy."""
    nodes = []

    for level_info in hierarchy.get('levels', []):
        level = level_info['level']
        for node in level_info['nodes']:
            nodes.append({
                'id': node['id'],
                'name': node['name'],
                'level': level,
                'path': node.get('path', []),
                'children': node.get('children', [])
            })

    return nodes


def batch_match_topics_llm(topics, hierarchy_nodes, llm, batch_size=5):
    """Use LLM to match multiple topics to hierarchy nodes in batch."""
    results = {}

    # Build candidate list (limit to avoid too long prompt)
    candidates = hierarchy_nodes[:30]  # Top 30 nodes by relevance

    for i in range(0, len(topics), batch_size):
        batch = topics[i:i+batch_size]

        prompt = f"""为以下研究主题找到最匹配的层次分类。从候选分类中选择最佳匹配。

候选分类列表:
"""
        for idx, node in enumerate(candidates, 1):
            prompt += f"{idx}. {node['name']} (路径: {' > '.join(node['path'][:2])})\n"

        prompt += f"""
研究主题列表:
"""
        for idx, topic in enumerate(batch, 1):
            prompt += f"""
[{idx}] 名称: {topic['name']}
    关键词: {', '.join(topic['keywords'][:8])}
"""

        prompt += f"""
为每个研究主题选择最匹配的候选分类编号。返回JSON格式:
{{"matches": [{{"topic_index": 1, "node_index": 3, "reason": "主题关于XX，匹配分类YY"}}, ...]}}

只返回JSON，不要其他内容。"""

        try:
            result = llm.complete_json(prompt)
            matches = result.get('matches', [])

            for match in matches:
                topic_idx = match.get('topic_index', 0) - 1
                node_idx = match.get('node_index', 0) - 1

                if 0 <= topic_idx < len(batch) and 0 <= node_idx < len(candidates):
                    topic_id = batch[topic_idx]['global_id']
                    results[topic_id] = {
                        'node': candidates[node_idx],
                        'reason': match.get('reason', '')
                    }

        except Exception as e:
            print(f"    LLM batch failed: {e}")

    return results


def add_hierarchy_with_llm():
    """Add hierarchy info using LLM semantic matching."""

    # Load aligned data
    with open('data/output/aligned_topics.json', 'r', encoding='utf-8') as f:
        aligned = json.load(f)

    # Load hierarchies
    all_hierarchies = load_hierarchies()
    print(f"Loaded hierarchies for {len(all_hierarchies)} periods")

    # Group topics by subcategory
    topics_by_subcat = defaultdict(list)
    for global_id, topic in aligned['trends'].items():
        category = topic['category']
        subcategory = topic['subcategory']

        if subcategory == '_direct':
            full_code = category
        else:
            full_code = f"{category}.{subcategory}" if '.' not in subcategory else subcategory

        topic['global_id'] = global_id
        topics_by_subcat[full_code].append(topic)

    print(f"Found {len(topics_by_subcat)} subcategories with topics")

    # Initialize LLM
    llm = LLMClient()

    # Process each subcategory
    matched_count = 0
    total_processed = 0

    for subcat, topics in topics_by_subcat.items():
        # Find hierarchy for this subcategory
        hier = None
        for period, hiers in all_hierarchies.items():
            if subcat in hiers:
                hier = hiers[subcat]
                break

        if not hier:
            continue

        # Extract all nodes
        nodes = extract_all_nodes(hier)
        if not nodes:
            continue

        print(f"\nProcessing {subcat}: {len(topics)} topics, {len(nodes)} hierarchy nodes")

        # Batch match with LLM
        matches = batch_match_topics_llm(topics, nodes, llm, batch_size=3)

        # Apply matches
        for global_id, match_info in matches.items():
            node = match_info['node']
            aligned['trends'][global_id]['layer3'] = node['name']
            aligned['trends'][global_id]['layer3_id'] = node['id']
            aligned['trends'][global_id]['hierarchy_path'] = node['path']
            aligned['trends'][global_id]['hierarchy_level'] = node['level']
            matched_count += 1

        total_processed += len(topics)
        print(f"  Matched: {len(matches)}/{len(topics)}")

    print(f"\n{'='*60}")
    print(f"Total matched with hierarchy: {matched_count}/{total_processed}")
    print(f"Match rate: {matched_count/total_processed*100:.1f}%")

    # Update structure
    for l1, l2s in aligned['structure'].items():
        for l2, topics in l2s.items():
            for topic in topics:
                tid = topic['id']
                if tid in aligned['trends'] and aligned['trends'][tid].get('layer3'):
                    topic['layer3'] = aligned['trends'][tid]['layer3']

    # Save
    with open('data/output/aligned_topics_with_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    frontend_dir = Path("frontend/public/data")
    with open(frontend_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    print("\n✅ Saved aligned_topics.json with LLM hierarchy matching")

    # Show samples
    print("\nSample matched topics:")
    shown = 0
    for tid, topic in aligned['trends'].items():
        if topic.get('layer3') and shown < 5:
            shown += 1
            print(f"  {topic['name']}")
            print(f"    -> Layer 3: {topic['layer3']}")
            print(f"    -> Path: {' > '.join(topic.get('hierarchy_path', [])[:3])}")


if __name__ == "__main__":
    add_hierarchy_with_llm()

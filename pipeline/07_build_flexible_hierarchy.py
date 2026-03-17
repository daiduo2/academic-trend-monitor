#!/usr/bin/env python3
"""Build flexible 2-5 layer hierarchy using LLM - generates unified tree per Layer 2."""

import json
from pathlib import Path
from collections import defaultdict
from pipeline.utils.llm_client import LLMClient
import yaml


class FlexibleHierarchyBuilder:
    """Build flexible depth hierarchy (2-5 layers) using LLM."""

    def __init__(self):
        self.llm = LLMClient()
        with open("config/prompts.yaml", "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)

    def collect_topics_by_layer2(self, aligned_data):
        """Collect all topics grouped by Layer 2 (across all periods)."""
        layer2_groups = defaultdict(list)

        for global_id, topic in aligned_data['trends'].items():
            layer1 = topic['category']
            layer2 = topic['subcategory']

            if layer2 == '_direct':
                key = layer1
            else:
                key = f"{layer1}.{layer2}" if '.' not in layer2 else layer2

            layer2_groups[key].append({
                'id': global_id,
                'name': topic['name'],
                'keywords': topic['keywords'],
                'total_papers': topic['total_papers'],
                'active_periods': topic['active_periods']
            })

        return layer2_groups

    def build_hierarchy_with_llm(self, layer2_code, topics):
        """Use LLM to build flexible hierarchy for a Layer 2."""
        print(f"\n  Building hierarchy for {layer2_code} ({len(topics)} topics)...")

        # Sort by paper count (importance)
        topics = sorted(topics, key=lambda x: x['total_papers'], reverse=True)

        # Take top 50 topics for hierarchy building (most important)
        top_topics = topics[:50]

        # Build prompt
        prompt = f"""你是一个学术研究分类专家。请为以下{layer2_code}领域的研究主题构建一个2-5层的层次分类树。

研究主题列表 (按重要性排序):
"""
        for i, t in enumerate(top_topics[:30], 1):  # Show top 30 in prompt
            prompt += f"{i}. {t['name']} (关键词: {', '.join(t['keywords'][:5])}, 论文数: {t['total_papers']})\n"

        prompt += f"""
要求:
1. 构建灵活的层次结构，深度为2-5层
2. 第一层(Layer 3)应该是该领域的主要研究方向
3. 根据主题自然聚类，不要强制填满5层
4. 相似的研究应该放在同一分支下
5. 每个节点应该有清晰的中文名称

输出格式 - JSON:
{{
  "tree": {{
    "name": "{layer2_code}研究",
    "children": [
      {{
        "name": "研究方向名称",
        "children": [
          {{
            "name": "子方向名称",
            "topic_ids": ["global_1", "global_2"]  // 相关的主题ID
          }}
        ]
      }}
    ]
  }},
  "topic_assignments": {{
    "global_topic_id": ["path", "to", "node"]  // 每个主题的路径
  }}
}}

注意:
- 只返回JSON，不要其他内容
- topic_ids应该引用上面列表中的主题编号(1-{len(top_topics)})
- 层次深度应该自然，复杂主题深一些，简单主题浅一些
"""

        try:
            result = self.llm.complete_json(prompt)
            return result
        except Exception as e:
            print(f"    LLM failed: {e}")
            return None

    def assign_topics_to_tree(self, tree, topics):
        """Assign all topics to the tree nodes."""
        # Build a mapping from topic name/keywords to path
        assignments = {}

        def find_best_path(topic, node, current_path):
            """Recursively find best path for a topic."""
            best_score = 0
            best_path = current_path + [node['name']]

            # Score current node
            node_text = node['name'].lower()
            topic_text = (topic['name'] + ' ' + ' '.join(topic['keywords'][:10])).lower()

            score = 0
            if node_text in topic_text or topic_text in node_text:
                score += 10

            node_words = set(node_text.split())
            topic_words = set(topic_text.split())
            overlap = len(node_words & topic_words)
            score += overlap * 2

            for kw in topic['keywords'][:5]:
                if kw.lower() in node_text:
                    score += 3

            if score > best_score:
                best_score = score

            # Check children
            if 'children' in node:
                for child in node['children']:
                    child_score, child_path = find_best_path(topic, child, current_path + [node['name']])
                    if child_score > best_score:
                        best_score = child_score
                        best_path = child_path

            return best_score, best_path

        # Assign each topic
        for topic in topics:
            _, path = find_best_path(topic, tree, [])
            assignments[topic['id']] = path if path else [tree['name']]

        return assignments

    def build_all_hierarchies(self):
        """Build hierarchies for all Layer 2 categories."""
        # Load aligned data
        with open('data/output/aligned_topics.json', 'r', encoding='utf-8') as f:
            aligned = json.load(f)

        # Group topics by Layer 2
        layer2_groups = self.collect_topics_by_layer2(aligned)
        print(f"Found {len(layer2_groups)} Layer 2 categories")

        # Build hierarchies
        all_hierarchies = {}

        for layer2_code, topics in layer2_groups.items():
            if len(topics) < 3:  # Skip very small categories
                print(f"  Skipping {layer2_code} (only {len(topics)} topics)")
                continue

            # Build hierarchy with LLM
            result = self.build_hierarchy_with_llm(layer2_code, topics)

            if result and 'tree' in result:
                tree = result['tree']

                # Use LLM's topic assignments if available, otherwise use keyword matching
                if 'topic_assignments' in result and result['topic_assignments']:
                    # Convert LLM's index-based assignments to topic IDs
                    llm_assignments = result['topic_assignments']
                    assignments = {}
                    for topic_idx, path in llm_assignments.items():
                        # topic_idx could be "1", "2", etc. (1-based index)
                        try:
                            idx = int(topic_idx) - 1 if isinstance(topic_idx, str) and topic_idx.isdigit() else int(topic_idx) - 1
                            if 0 <= idx < len(topics):
                                assignments[topics[idx]['id']] = path
                        except:
                            # If topic_idx is already a global_id
                            assignments[topic_idx] = path
                    # Add any missing topics
                    for topic in topics:
                        if topic['id'] not in assignments:
                            assignments[topic['id']] = [tree['name']]
                else:
                    # Fall back to keyword matching
                    assignments = self.assign_topics_to_tree(tree, topics)

                all_hierarchies[layer2_code] = {
                    'tree': tree,
                    'topic_assignments': assignments,
                    'total_topics': len(topics)
                }

                print(f"    ✓ Built tree with depth {self._get_tree_depth(tree)}")

        return all_hierarchies, aligned

    def _get_tree_depth(self, node, current=0):
        """Get tree depth."""
        if 'children' not in node or not node['children']:
            return current
        return max(self._get_tree_depth(c, current + 1) for c in node['children'])

    def enhance_aligned_data(self, all_hierarchies, aligned):
        """Add hierarchy info to aligned data."""
        # Add hierarchy path to each topic
        for layer2_code, hier in all_hierarchies.items():
            for topic_id, path in hier['topic_assignments'].items():
                if topic_id in aligned['trends']:
                    aligned['trends'][topic_id]['hierarchy_path'] = path
                    aligned['trends'][topic_id]['hierarchy_depth'] = len(path)

        # Add tree structure
        aligned['hierarchies'] = all_hierarchies

        return aligned


def main():
    """Run flexible hierarchy building."""
    builder = FlexibleHierarchyBuilder()

    # Build hierarchies
    all_hierarchies, aligned = builder.build_all_hierarchies()

    print(f"\n{'='*60}")
    print(f"Built hierarchies for {len(all_hierarchies)} Layer 2 categories")

    # Enhance aligned data
    enhanced = builder.enhance_aligned_data(all_hierarchies, aligned)

    # Count topics with hierarchy
    with_hier = sum(1 for t in enhanced['trends'].values() if t.get('hierarchy_path'))
    print(f"Topics with hierarchy: {with_hier}/{len(enhanced['trends'])}")

    # Save
    output_dir = Path("data/output")
    with open(output_dir / 'aligned_topics_hierarchy.json', 'w', encoding='utf-8') as f:
        json.dump(enhanced, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_dir = Path("frontend/public/data")
    with open(frontend_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(enhanced, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved aligned_topics.json with flexible hierarchies")

    # Show sample
    print("\nSample hierarchies:")
    for code, hier in list(all_hierarchies.items())[:3]:
        tree = hier['tree']
        depth = builder._get_tree_depth(tree)
        print(f"  {code}: depth={depth}, topics={hier['total_topics']}")
        print(f"    Root: {tree['name']}")
        if tree.get('children'):
            for child in tree['children'][:3]:
                print(f"      └─ {child['name']}")


if __name__ == "__main__":
    main()

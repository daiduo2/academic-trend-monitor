#!/usr/bin/env python3
"""Semantic topic alignment using LLM - Merge monthly topics into consistent yearly topics."""

import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from pipeline.utils.llm_client import LLMClient
from pipeline.utils.data_loader import get_available_periods
from collections import defaultdict
import yaml


class SemanticTopicAligner:
    """Align topics across months using LLM semantic comparison."""

    def __init__(self):
        self.llm = LLMClient()
        with open("config/prompts.yaml", "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)
        self.global_topics: Dict[str, Dict] = {}  # Global topic registry
        self.topic_counter = 0

    def calculate_keyword_similarity(self, keywords1: List[str], keywords2: List[str]) -> float:
        """Calculate Jaccard similarity between keyword sets."""
        set1 = set(k.lower() for k in keywords1)
        set2 = set(k.lower() for k in keywords2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0

    def llm_compare_topics(self, topic_a: Dict, topic_b: Dict) -> Dict:
        """Use LLM to compare if two topics are semantically the same."""
        prompt = f"""判断以下两个研究主题是否是同一个学术概念。请从研究内容、关键词、方法论等角度分析：

主题A:
- 名称: {topic_a.get('name', '')}
- 关键词: {', '.join(topic_a.get('keywords', [])[:8])}
- 代表性论文: {topic_a.get('representative_docs', [{}])[0].get('title', 'N/A')}

主题B:
- 名称: {topic_b.get('name', '')}
- 关键词: {', '.join(topic_b.get('keywords', [])[:8])}
- 代表性论文: {topic_b.get('representative_docs', [{}])[0].get('title', 'N/A')}

请判断这两个主题是否描述的是同一个研究方向（可能是同一概念的不同表述或细分领域）：
如果是同一主题，返回: {{"is_same": true, "confidence": 0.95, "reason": "理由"}}
如果是不同主题，返回: {{"is_same": false, "confidence": 0.85, "reason": "理由"}}

只返回JSON格式，不要其他内容。"""

        try:
            result = self.llm.complete_json(prompt)
            return result
        except Exception as e:
            print(f"    LLM comparison failed: {e}")
            return {"is_same": False, "confidence": 0, "reason": "API error"}

    def find_matching_global_topic(self, local_topic: Dict, category: str) -> Optional[str]:
        """Find if local topic matches any existing global topic."""
        local_keywords = set(k.lower() for k in local_topic.get('keywords', []))
        local_name = local_topic.get('name', '').lower()

        # First pass: keyword similarity filter
        candidates = []
        for global_id, global_topic in self.global_topics.items():
            # Only compare topics from the same category
            if global_topic.get('category') != category:
                continue

            global_keywords = set(k.lower() for k in global_topic.get('keywords', []))
            global_name = global_topic.get('name', '').lower()

            # Quick keyword overlap check
            keyword_sim = self.calculate_keyword_similarity(
                local_topic.get('keywords', []),
                global_topic.get('keywords', [])
            )

            # Name similarity (exact or substring)
            name_match = local_name == global_name or local_name in global_name or global_name in local_name

            if keyword_sim > 0.3 or name_match:
                candidates.append((global_id, keyword_sim, global_topic))

        if not candidates:
            return None

        # Sort by keyword similarity
        candidates.sort(key=lambda x: x[1], reverse=True)

        # Second pass: LLM semantic comparison for top candidates
        for global_id, keyword_sim, global_topic in candidates[:3]:  # Check top 3
            print(f"    Checking against global topic {global_id} (kw_sim={keyword_sim:.2f})")

            result = self.llm_compare_topics(local_topic, global_topic)

            if result.get('is_same') and result.get('confidence', 0) > 0.7:
                print(f"    ✅ Match! {result.get('reason', '')}")
                return global_id

        return None

    def align_all_topics(self):
        """Process all periods and align topics."""
        hierarchy_dir = Path("data/output/hierarchy")
        periods = get_available_periods()

        print(f"Processing {len(periods)} periods for semantic alignment...")
        print(f"Estimated API calls: ~{sum(len(json.load(open(hierarchy_dir / f'{p}.json'))['topics']) for p in periods) * 2}")

        # Track topic evolution across periods
        period_mappings: Dict[str, Dict[str, str]] = {}  # period -> local_id -> global_id

        for period in periods:
            print(f"\n{'='*60}")
            print(f"Processing {period}...")
            print(f"{'='*60}")

            with open(hierarchy_dir / f"{period}.json", "r", encoding="utf-8") as f:
                data = json.load(f)

            period_mappings[period] = {}
            local_topics = data.get("topics", {})

            for local_id, local_topic in local_topics.items():
                # Get category from primary_category
                rep_docs = local_topic.get("representative_docs", [])
                primary_cat = rep_docs[0].get("primary_category", "") if rep_docs else ""
                category = primary_cat.split(".")[0] if "." in primary_cat else primary_cat

                # Try to find matching global topic
                matching_global_id = self.find_matching_global_topic(local_topic, category)

                if matching_global_id:
                    # Merge into existing global topic
                    global_topic = self.global_topics[matching_global_id]

                    # Update keywords (union)
                    existing_keywords = set(global_topic.get('keywords', []))
                    new_keywords = existing_keywords | set(local_topic.get('keywords', []))
                    global_topic['keywords'] = list(new_keywords)[:15]

                    # Add period-specific data
                    if 'period_data' not in global_topic:
                        global_topic['period_data'] = {}

                    global_topic['period_data'][period] = {
                        'local_topic_id': local_id,
                        'paper_count': local_topic.get('paper_count', 0),
                        'representative_docs': local_topic.get('representative_docs', [])[:3]
                    }

                    period_mappings[period][local_id] = matching_global_id
                    print(f"  {local_id} -> {matching_global_id} (merged)")

                else:
                    # Create new global topic
                    self.topic_counter += 1
                    global_id = f"global_topic_{self.topic_counter}"

                    self.global_topics[global_id] = {
                        'global_id': global_id,
                        'name': local_topic.get('name', ''),
                        'keywords': local_topic.get('keywords', []),
                        'category': category,
                        'subcategory': primary_cat,
                        'period_data': {
                            period: {
                                'local_topic_id': local_id,
                                'paper_count': local_topic.get('paper_count', 0),
                                'representative_docs': local_topic.get('representative_docs', [])[:3]
                            }
                        }
                    }

                    period_mappings[period][local_id] = global_id
                    print(f"  {local_id} -> {global_id} (new)")

        print(f"\n{'='*60}")
        print(f"Alignment complete!")
        print(f"Total global topics: {len(self.global_topics)}")

        return self.global_topics, period_mappings

    def build_aligned_structure(self, global_topics: Dict, period_mappings: Dict):
        """Build the final aligned data structure."""
        periods = get_available_periods()

        # Build trend data for each global topic
        trends = {}
        for global_id, topic in global_topics.items():
            period_data = topic.get('period_data', {})

            history = []
            for period in periods:
                if period in period_data:
                    history.append({
                        'period': period,
                        'paper_count': period_data[period]['paper_count']
                    })

            trends[global_id] = {
                'name': topic['name'],
                'keywords': topic['keywords'],
                'category': topic['category'],
                'subcategory': topic['subcategory'],
                'history': history,
                'total_papers': sum(h['paper_count'] for h in history),
                'active_periods': len(history)
            }

        # Build domain structure (Layer 1 -> Layer 2 -> Topics)
        structure = defaultdict(lambda: defaultdict(list))

        for global_id, topic in global_topics.items():
            layer1 = topic['category']
            layer2 = topic['subcategory'].split('.')[1] if '.' in topic['subcategory'] else '_direct'

            # Get latest period data
            latest_period = max(topic.get('period_data', {}).keys()) if topic.get('period_data') else None

            structure[layer1][layer2].append({
                'id': global_id,
                'name': topic['name'],
                'keywords': topic['keywords'][:8],
                'latest_paper_count': topic.get('period_data', {}).get(latest_period, {}).get('paper_count', 0) if latest_period else 0,
                'active_months': len(topic.get('period_data', {}))
            })

        return trends, dict(structure)


def main():
    """Run semantic alignment."""
    output_dir = Path("data/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    aligner = SemanticTopicAligner()

    # Run alignment
    global_topics, period_mappings = aligner.align_all_topics()

    # Build final structures
    trends, structure = aligner.build_aligned_structure(global_topics, period_mappings)

    # Save results
    aligned_data = {
        'version': 'aligned_v1',
        'total_global_topics': len(global_topics),
        'periods': get_available_periods(),
        'structure': structure,
        'trends': trends
    }

    with open(output_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned_data, f, ensure_ascii=False, indent=2)

    # Save mappings for reference
    with open(output_dir / 'topic_mappings.json', 'w', encoding='utf-8') as f:
        json.dump(period_mappings, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved aligned_topics.json ({len(trends)} aligned topics)")
    print(f"✅ Saved topic_mappings.json")

    # Print summary
    print("\n" + "="*60)
    print("ALIGNMENT SUMMARY")
    print("="*60)

    # Count topics by active months
    active_months_dist = defaultdict(int)
    for topic_id, trend in trends.items():
        active_months_dist[trend['active_periods']] += 1

    print("\nTopics by active months:")
    for months, count in sorted(active_months_dist.items()):
        print(f"  {months} months: {count} topics")

    print(f"\nTotal topics with multi-month history: {sum(c for m, c in active_months_dist.items() if m > 1)}")


if __name__ == "__main__":
    main()

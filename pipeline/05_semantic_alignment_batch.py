#!/usr/bin/env python3
"""Semantic topic alignment using LLM - Batch version for cost efficiency."""

import json
from pathlib import Path
from typing import Dict, List, Optional
from pipeline.utils.llm_client import LLMClient
from pipeline.utils.data_loader import get_available_periods
from collections import defaultdict
import yaml
from typing import Tuple


class BatchSemanticAligner:
    """Align topics across months using LLM semantic comparison - batch mode."""

    def __init__(self, batch_size: int = 5):
        self.llm = LLMClient()
        with open("config/prompts.yaml", "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)
        self.global_topics: Dict[str, Dict] = {}
        self.topic_counter = 0
        self.batch_size = batch_size
        self.api_calls = 0

    def calculate_keyword_similarity(self, keywords1: List[str], keywords2: List[str]) -> float:
        """Calculate Jaccard similarity between keyword sets."""
        set1 = set(k.lower() for k in keywords1)
        set2 = set(k.lower() for k in keywords2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0

    def batch_compare_topics(self, local_topic: Dict, global_candidates: List[Tuple[str, Dict]]) -> Optional[str]:
        """Compare one local topic against multiple global candidates in batch."""
        if not global_candidates:
            return None

        # Build batch prompt
        prompt = f"""判断以下研究主题是否与候选列表中的某个主题是同一学术概念。

待匹配主题:
- 名称: {local_topic.get('name', '')}
- 关键词: {', '.join(local_topic.get('keywords', [])[:8])}
- 示例论文: {local_topic.get('representative_docs', [{}])[0].get('title', 'N/A')[:80]}...

候选主题列表:
"""

        for i, (global_id, global_topic) in enumerate(global_candidates, 1):
            prompt += f"""
[{i}] ID: {global_id}
    名称: {global_topic.get('name', '')}
    关键词: {', '.join(global_topic.get('keywords', [])[:6])}
"""

        prompt += f"""
请判断待匹配主题与哪个候选主题是同一概念（研究内容、方法、目标相似）：
- 如果有匹配，返回匹配候选的编号和置信度
- 如果没有匹配，返回 null

返回JSON格式：
{{"match_index": 1, "confidence": 0.92, "reason": "都是关于XXX的研究"}}
或
{{"match_index": null, "confidence": 0, "reason": "没有匹配主题"}}

只返回JSON，不要其他内容。"""

        try:
            result = self.llm.complete_json(prompt)
            self.api_calls += 1

            match_index = result.get('match_index')
            confidence = result.get('confidence', 0)

            if match_index and 1 <= match_index <= len(global_candidates) and confidence > 0.7:
                matched_id = global_candidates[match_index - 1][0]
                print(f"    ✅ Batch match: {matched_id} (conf={confidence:.2f})")
                return matched_id

        except Exception as e:
            print(f"    Batch comparison failed: {e}")

        return None

    def process_period(self, period: str, hierarchy_data: Dict):
        """Process one period and align topics."""
        print(f"\nProcessing {period}...")

        local_topics = hierarchy_data.get("topics", {})
        period_mappings = {}

        for local_id, local_topic in local_topics.items():
            # Get category
            rep_docs = local_topic.get("representative_docs", [])
            primary_cat = rep_docs[0].get("primary_category", "") if rep_docs else ""
            category = primary_cat.split(".")[0] if "." in primary_cat else primary_cat
            subcategory = primary_cat

            # Find candidates in same category
            candidates = []
            for global_id, global_topic in self.global_topics.items():
                if global_topic.get('category') != category:
                    continue

                keyword_sim = self.calculate_keyword_similarity(
                    local_topic.get('keywords', []),
                    global_topic.get('keywords', [])
                )

                # Name match check
                local_name = local_topic.get('name', '').lower()
                global_name = global_topic.get('name', '').lower()
                name_match = local_name == global_name or local_name in global_name or global_name in local_name

                if keyword_sim > 0.25 or name_match:
                    candidates.append((global_id, keyword_sim, global_topic))

            # Sort by keyword similarity
            candidates.sort(key=lambda x: x[1], reverse=True)
            top_candidates = [(cid, ct) for cid, _, ct in candidates[:self.batch_size]]

            # Try batch comparison
            matched_global_id = None
            if top_candidates:
                print(f"  {local_id}: {local_topic.get('name', '')[:30]}... - checking {len(top_candidates)} candidates")
                matched_global_id = self.batch_compare_topics(local_topic, top_candidates)

            if matched_global_id:
                # Merge into existing global topic
                global_topic = self.global_topics[matched_global_id]

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

                period_mappings[local_id] = matched_global_id

            else:
                # Create new global topic
                self.topic_counter += 1
                global_id = f"global_topic_{self.topic_counter}"

                self.global_topics[global_id] = {
                    'global_id': global_id,
                    'name': local_topic.get('name', ''),
                    'keywords': local_topic.get('keywords', []),
                    'category': category,
                    'subcategory': subcategory,
                    'period_data': {
                        period: {
                            'local_topic_id': local_id,
                            'paper_count': local_topic.get('paper_count', 0),
                            'representative_docs': local_topic.get('representative_docs', [])[:3]
                        }
                    }
                }

                period_mappings[local_id] = global_id

        return period_mappings

    def align_all_topics(self):
        """Process all periods."""
        hierarchy_dir = Path("data/output/hierarchy")
        periods = get_available_periods()

        print(f"Processing {len(periods)} periods with BATCH semantic alignment...")
        print(f"Batch size: {self.batch_size}")

        all_mappings = {}

        for period in periods:
            print(f"\n{'='*60}")
            print(f"Period: {period}")
            print(f"{'='*60}")

            with open(hierarchy_dir / f"{period}.json", "r", encoding="utf-8") as f:
                data = json.load(f)

            mappings = self.process_period(period, data)
            all_mappings[period] = mappings

            print(f"  Topics processed: {len(mappings)}")
            print(f"  Global topics so far: {len(self.global_topics)}")

        print(f"\n{'='*60}")
        print(f"Alignment complete!")
        print(f"Total API calls: ~{self.api_calls}")
        print(f"Total global topics: {len(self.global_topics)}")

        return self.global_topics, all_mappings

    def build_final_data(self, global_topics: Dict, all_mappings: Dict):
        """Build final output structures."""
        periods = get_available_periods()

        # Build trends
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

        # Build domain structure
        structure = defaultdict(lambda: defaultdict(list))

        for global_id, topic in global_topics.items():
            layer1 = topic['category']
            layer2 = topic['subcategory'].split('.')[1] if '.' in topic['subcategory'] else '_direct'

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
    """Run batch semantic alignment."""
    output_dir = Path("data/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    aligner = BatchSemanticAligner(batch_size=5)

    # Run alignment
    global_topics, all_mappings = aligner.align_all_topics()

    # Build final data
    trends, structure = aligner.build_final_data(global_topics, all_mappings)

    # Save aligned data
    aligned_data = {
        'version': 'aligned_batch_v1',
        'total_global_topics': len(global_topics),
        'periods': get_available_periods(),
        'taxonomy': load_taxonomy(),
        'structure': structure,
        'trends': trends
    }

    with open(output_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned_data, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_data_dir = Path("frontend/public/data")
    frontend_data_dir.mkdir(parents=True, exist_ok=True)

    with open(frontend_data_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved aligned_topics.json ({len(trends)} aligned topics)")
    print(f"✅ Copied to frontend/public/data/")

    # Print summary
    print("\n" + "="*60)
    print("ALIGNMENT SUMMARY")
    print("="*60)

    active_months_dist = defaultdict(int)
    for topic_id, trend in trends.items():
        active_months_dist[trend['active_periods']] += 1

    print("\nTopics by active months:")
    for months, count in sorted(active_months_dist.items()):
        pct = count / len(trends) * 100
        print(f"  {months:2d} months: {count:4d} topics ({pct:.1f}%)")

    multi_month = sum(c for m, c in active_months_dist.items() if m > 1)
    print(f"\nTopics with multi-month continuity: {multi_month} ({multi_month/len(trends)*100:.1f}%)")


def load_taxonomy():
    """Load arXiv taxonomy."""
    return {
        "cs": {"name": "Computer Science", "subcategories": ["AI", "CV", "LG", "CL", "RO", "CR", "DB", "DC", "DS", "GT", "HC", "IR", "IT", "MA", "NE", "NI", "OS", "PF", "PL", "SC", "SD", "SE", "SI", "SY"]},
        "math": {"name": "Mathematics", "subcategories": ["AG", "AT", "AP", "CT", "CA", "CO", "AC", "CV", "DG", "DS", "FA", "GM", "GN", "GT", "GR", "HO", "IT", "KT", "LO", "MP", "MG", "NT", "NA", "OA", "OC", "PR", "QA", "RT", "RA", "SP", "ST", "SG"]},
        "physics": {"name": "Physics", "subcategories": ["acc-ph", "ao-ph", "atom-ph", "atm-clus", "bio-ph", "chem-ph", "class-ph", "comp-ph", "data-an", "flu-dyn", "gen-ph", "geo-ph", "hist-ph", "ins-det", "med-ph", "optics", "ed-ph", "soc-ph", "plasm-ph", "pop-ph", "space-ph"]},
        "stat": {"name": "Statistics", "subcategories": ["AP", "CO", "ML", "ME", "OT", "TH"]},
        "q-bio": {"name": "Quantitative Biology", "subcategories": ["BM", "CB", "GN", "MN", "NC", "OT", "PE", "QM", "SC", "TO"]},
        "q-fin": {"name": "Quantitative Finance", "subcategories": ["CP", "EC", "GN", "MF", "PM", "PR", "RM", "ST", "TR"]},
        "eess": {"name": "Electrical Engineering", "subcategories": ["AS", "IV", "SP", "SY"]},
        "econ": {"name": "Economics", "subcategories": ["EM", "GN", "TH"]},
        "astro-ph": {"name": "Astrophysics", "subcategories": ["CO", "EP", "GA", "HE", "IM", "SR"]},
        "cond-mat": {"name": "Condensed Matter", "subcategories": ["dis-nn", "mes-hall", "mtrl-sci", "other", "quant-gas", "soft", "stat-mech", "str-el", "supr-con"]},
        "gr-qc": {"name": "General Relativity", "subcategories": []},
        "hep-ex": {"name": "High Energy Physics (Experiment)", "subcategories": []},
        "hep-lat": {"name": "High Energy Physics (Lattice)", "subcategories": []},
        "hep-ph": {"name": "High Energy Physics (Phenomenology)", "subcategories": []},
        "hep-th": {"name": "High Energy Physics (Theory)", "subcategories": []},
        "math-ph": {"name": "Mathematical Physics", "subcategories": []},
        "nlin": {"name": "Nonlinear Sciences", "subcategories": ["AO", "CD", "CG", "PS", "SI"]},
        "nucl-ex": {"name": "Nuclear Experiment", "subcategories": []},
        "nucl-th": {"name": "Nuclear Theory", "subcategories": []},
        "quant-ph": {"name": "Quantum Physics", "subcategories": []}
    }


if __name__ == "__main__":
    main()

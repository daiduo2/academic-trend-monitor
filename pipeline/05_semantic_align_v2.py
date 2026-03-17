#!/usr/bin/env python3
"""Semantic topic alignment - Optimized version with keyword pre-filtering."""

import json
from pathlib import Path
from collections import defaultdict
import numpy as np


def jaccard_similarity(list1, list2):
    """Calculate Jaccard similarity between two lists."""
    set1 = set(k.lower() for k in list1)
    set2 = set(k.lower() for k in list2)
    if not set1 or not set2:
        return 0.0
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0


def parse_arxiv_category(primary_category):
    """
    Parse arXiv category into layer1 and layer2.

    Examples:
    - cs.AI -> (cs, AI)
    - hep-th -> (hep, th)
    - nucl-ex -> (nucl, ex)
    - gr-qc -> (gr-qc, _direct)
    - quant-ph -> (quant-ph, _direct)
    """
    if not primary_category:
        return None, None

    cat = primary_category.strip()

    # Special cases: categories with dash but no dot (hep-th, nucl-th, gr-qc, etc.)
    if '-' in cat and '.' not in cat:
        # These are already the layer1, with implicit layer2
        # hep-th, hep-ph, hep-ex, hep-lat -> hep + subcategory
        # nucl-th, nucl-ex -> nucl + subcategory
        # gr-qc -> gr-qc (no subcategory)
        # quant-ph -> quant-ph (no subcategory)
        # math-ph -> math-ph (no subcategory)

        # Categories that have subcategories
        multi_layer = ['hep', 'nucl']

        parts = cat.split('-')
        base = parts[0]

        if base in multi_layer and len(parts) > 1:
            # hep-th -> layer1=hep, layer2=th
            return base, parts[1]
        else:
            # gr-qc, quant-ph, math-ph -> layer1=full_name, layer2=_direct
            return cat, '_direct'

    # Standard case with dot
    if '.' in cat:
        parts = cat.split('.')
        return parts[0], parts[1]

    # Simple category without subcategory
    return cat, '_direct'


def align_topics_by_similarity():
    """Align topics using keyword similarity (no LLM needed for basic alignment)."""
    hierarchy_dir = Path("data/output/hierarchy")
    periods = sorted([f.stem for f in hierarchy_dir.glob("*.json")])

    print(f"Processing {len(periods)} periods...")

    # Step 1: Collect all topics with their metadata
    all_topics = []
    topic_period_map = {}  # topic_idx -> {period: local_id}

    for period in periods:
        print(f"  Loading {period}...")
        with open(hierarchy_dir / f"{period}.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        for local_id, topic in data.get("topics", {}).items():
            # Get category
            rep_docs = topic.get("representative_docs", [])
            primary_cat = rep_docs[0].get("primary_category", "") if rep_docs else ""

            # Parse category correctly
            layer1, layer2 = parse_arxiv_category(primary_cat)

            topic_idx = len(all_topics)
            all_topics.append({
                'idx': topic_idx,
                'name': topic.get('name', ''),
                'keywords': topic.get('keywords', []),
                'category': layer1,
                'subcategory': layer2 if layer2 != '_direct' else primary_cat,
                'full_category': primary_cat,
                'period': period,
                'local_id': local_id,
                'paper_count': topic.get('paper_count', 0),
                'representative_docs': rep_docs[:3]
            })

            if topic_idx not in topic_period_map:
                topic_period_map[topic_idx] = {}
            topic_period_map[topic_idx][period] = {
                'local_id': local_id,
                'paper_count': topic.get('paper_count', 0)
            }

    print(f"\nTotal topics: {len(all_topics)}")

    # Step 2: Group by category first
    category_groups = defaultdict(list)
    for topic in all_topics:
        category_groups[topic['category']].append(topic)

    print(f"Categories: {list(category_groups.keys())}")

    # Step 3: Within each category, cluster by keyword similarity
    global_topics = []
    global_id = 0

    SIMILARITY_THRESHOLD = 0.3  # Minimum keyword overlap

    for category, topics in category_groups.items():
        print(f"\n  Processing {category}: {len(topics)} topics...")

        # Sort by name to get stable ordering
        topics = sorted(topics, key=lambda x: (x['period'], x['name']))

        # Greedy clustering
        clustered = set()

        for topic in topics:
            if topic['idx'] in clustered:
                continue

            # Start a new global topic
            global_id += 1
            global_topic = {
                'global_id': f'global_{global_id}',
                'name': topic['name'],
                'keywords': topic['keywords'],
                'category': category,
                'subcategory': topic['subcategory'],
                'periods': {topic['period']: {
                    'local_id': topic['local_id'],
                    'paper_count': topic['paper_count'],
                    'docs': topic['representative_docs']
                }}
            }
            clustered.add(topic['idx'])

            # Find similar topics in OTHER periods (not same period)
            for other in topics:
                if other['idx'] in clustered:
                    continue
                if other['period'] == topic['period']:
                    continue  # Skip same period

                sim = jaccard_similarity(topic['keywords'], other['keywords'])

                # Also check name similarity
                name_match = (topic['name'].lower() == other['name'].lower() or
                             topic['name'].lower() in other['name'].lower() or
                             other['name'].lower() in topic['name'].lower())

                if sim > SIMILARITY_THRESHOLD or name_match:
                    # Merge
                    global_topic['keywords'] = list(set(global_topic['keywords']) | set(other['keywords']))[:15]
                    global_topic['periods'][other['period']] = {
                        'local_id': other['local_id'],
                        'paper_count': other['paper_count'],
                        'docs': other['representative_docs']
                    }
                    clustered.add(other['idx'])

            global_topics.append(global_topic)

    print(f"\n{'='*60}")
    print(f"Aligned into {len(global_topics)} global topics")

    return global_topics, periods


def build_output(global_topics, periods):
    """Build final output structures."""

    # Build trends
    trends = {}
    for topic in global_topics:
        history = []
        for period in periods:
            if period in topic['periods']:
                history.append({
                    'period': period,
                    'paper_count': topic['periods'][period]['paper_count']
                })

        trends[topic['global_id']] = {
            'name': topic['name'],
            'keywords': topic['keywords'],
            'category': topic['category'],
            'subcategory': topic['subcategory'],
            'history': history,
            'total_papers': sum(h['paper_count'] for h in history),
            'active_periods': len(history)
        }

    # Build structure (Layer 1 -> Layer 2 -> Topics)
    structure = defaultdict(lambda: defaultdict(list))

    for topic in global_topics:
        layer1 = topic['category']
        # subcategory is already the layer2 value (e.g., 'th', 'ex', '_direct', or 'CO' for astro-ph.CO)
        layer2 = topic['subcategory']
        # For standard categories like cs.AI, subcategory is 'AI' - correct
        # For hep-th, subcategory is now 'th' - correct
        # For gr-qc, subcategory is 'gr-qc' with _direct - need to handle

        # Get latest period for paper count
        latest_period = max(topic['periods'].keys()) if topic['periods'] else None
        latest_count = topic['periods'].get(latest_period, {}).get('paper_count', 0) if latest_period else 0

        structure[layer1][layer2].append({
            'id': topic['global_id'],
            'name': topic['name'],
            'keywords': topic['keywords'][:8],
            'latest_paper_count': latest_count,
            'active_months': len(topic['periods'])
        })

    return trends, dict(structure)


def main():
    """Run alignment."""
    output_dir = Path("data/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Run alignment
    global_topics, periods = align_topics_by_similarity()

    # Build output
    trends, structure = build_output(global_topics, periods)

    # Save
    aligned_data = {
        'version': 'aligned_v2_keyword_based',
        'total_global_topics': len(global_topics),
        'periods': periods,
        'taxonomy': load_taxonomy(),
        'structure': structure,
        'trends': trends
    }

    with open(output_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned_data, f, ensure_ascii=False, indent=2)

    # Copy to frontend
    frontend_dir = Path("frontend/public/data")
    frontend_dir.mkdir(parents=True, exist_ok=True)
    with open(frontend_dir / 'aligned_topics.json', 'w', encoding='utf-8') as f:
        json.dump(aligned_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved aligned_topics.json ({len(trends)} topics)")
    print(f"✅ Copied to frontend/public/data/")

    # Summary
    print("\n" + "="*60)
    print("ALIGNMENT SUMMARY")
    print("="*60)

    dist = defaultdict(int)
    for tid, trend in trends.items():
        dist[trend['active_periods']] += 1

    print("\nTopics by active months:")
    for months, count in sorted(dist.items()):
        pct = count / len(trends) * 100
        print(f"  {months:2d} months: {count:4d} ({pct:.1f}%)")

    multi = sum(c for m, c in dist.items() if m > 1)
    print(f"\nMulti-month topics: {multi} ({multi/len(trends)*100:.1f}%)")


def load_taxonomy():
    return {
        "cs": {"name": "Computer Science", "subcategories": ["AI", "CV", "LG", "CL", "RO", "CR"]},
        "math": {"name": "Mathematics", "subcategories": ["CO", "AP", "NA", "NT", "OC", "PR"]},
        "physics": {"name": "Physics", "subcategories": ["acc-ph", "chem-ph", "flu-dyn", "optics"]},
        "stat": {"name": "Statistics", "subcategories": ["ML", "ME", "AP"]},
        "astro-ph": {"name": "Astrophysics", "subcategories": ["CO", "GA", "HE"]},
        "cond-mat": {"name": "Condensed Matter", "subcategories": ["mtrl-sci", "quant-gas", "soft"]},
        "quant-ph": {"name": "Quantum Physics", "subcategories": []},
        "gr-qc": {"name": "General Relativity", "subcategories": []},
        "hep-th": {"name": "High Energy Physics", "subcategories": []},
        "q-bio": {"name": "Quantitative Biology", "subcategories": []},
        "q-fin": {"name": "Quantitative Finance", "subcategories": []},
        "eess": {"name": "Electrical Engineering", "subcategories": []},
        "econ": {"name": "Economics", "subcategories": []},
    }


if __name__ == "__main__":
    main()

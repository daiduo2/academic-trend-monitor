#!/usr/bin/env python3
"""Rebuild data with correct Layer 1->2->3 hierarchy structure."""

import json
from pathlib import Path
from collections import defaultdict


def get_arxiv_taxonomy():
    """Return fixed arXiv category taxonomy."""
    return {
        "cs": {
            "name": "Computer Science",
            "subcategories": ["AI", "CV", "LG", "CL", "RO", "CR", "DB", "DC", "DS", "GT", "HC", "IR", "IT", "MA", "NE", "NI", "OS", "PF", "PL", "SC", "SD", "SE", "SI", "SY"]
        },
        "math": {
            "name": "Mathematics",
            "subcategories": ["AG", "AT", "AP", "CT", "CA", "CO", "AC", "CV", "DG", "DS", "FA", "GM", "GN", "GT", "GR", "HO", "IT", "KT", "LO", "MP", "MG", "NT", "NA", "OA", "OC", "PR", "QA", "RT", "RA", "SP", "ST", "SG"]
        },
        "physics": {
            "name": "Physics",
            "subcategories": ["acc-ph", "ao-ph", "atom-ph", "atm-clus", "bio-ph", "chem-ph", "class-ph", "comp-ph", "data-an", "flu-dyn", "gen-ph", "geo-ph", "hist-ph", "ins-det", "med-ph", "optics", "ed-ph", "soc-ph", "plasm-ph", "pop-ph", "space-ph"]
        },
        "stat": {
            "name": "Statistics",
            "subcategories": ["AP", "CO", "ML", "ME", "OT", "TH"]
        },
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


def parse_category(primary_category):
    """Parse primary_category into layer1 and layer2."""
    if not primary_category:
        return None, None

    cat = primary_category.strip()

    # Handle special cases
    if cat.startswith("astro-ph"):
        parts = cat.split(".")
        return "astro-ph", parts[1] if len(parts) > 1 else None
    elif cat.startswith("cond-mat"):
        parts = cat.split(".")
        return "cond-mat", parts[1] if len(parts) > 1 else None
    elif cat.startswith("hep-"):
        return cat, None
    elif cat.startswith("gr-qc"):
        return "gr-qc", None
    elif cat.startswith("nucl-"):
        return cat, None
    elif cat.startswith("math-ph"):
        return "math-ph", None
    elif cat.startswith("nlin"):
        parts = cat.split(".")
        return "nlin", parts[1] if len(parts) > 1 else None
    elif cat.startswith("q-"):
        parts = cat.split(".")
        return parts[0], parts[1] if len(parts) > 1 else None
    elif cat.startswith("eess"):
        parts = cat.split(".")
        return "eess", parts[1] if len(parts) > 1 else None
    elif cat.startswith("econ"):
        parts = cat.split(".")
        return "econ", parts[1] if len(parts) > 1 else None
    elif "." in cat:
        parts = cat.split(".")
        return parts[0], parts[1]
    else:
        return cat, None


def rebuild_structure():
    """Rebuild data with correct hierarchy."""
    hierarchy_dir = Path("data/output/hierarchy")
    output_dir = Path("data/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    taxonomy = get_arxiv_taxonomy()
    periods = sorted([f.stem for f in hierarchy_dir.glob("*.json")])

    print(f"Processing {len(periods)} periods...")

    # Structure: layer1 -> layer2 -> period -> topics
    structure = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    # Topic trends across periods
    topic_trends = defaultdict(lambda: {
        "name": "",
        "keywords": [],
        "layer1": "",
        "layer2": "",
        "history": []
    })

    for period in periods:
        print(f"  Processing {period}...")

        with open(hierarchy_dir / f"{period}.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        for topic_id, topic in data["topics"].items():
            # Get primary category from representative docs
            rep_docs = topic.get("representative_docs", [])
            if not rep_docs:
                continue

            primary_cat = rep_docs[0].get("primary_category", "")
            layer1, layer2 = parse_category(primary_cat)

            if not layer1:
                continue

            # Create unique topic key
            unique_key = f"{layer1}_{layer2}_{period}_{topic_id}" if layer2 else f"{layer1}_{period}_{topic_id}"

            # Add to structure
            if layer2:
                structure[layer1][layer2][period].append({
                    "id": unique_key,
                    "topic_id": topic_id,
                    "name": topic.get("name", ""),
                    "keywords": topic.get("keywords", []),
                    "paper_count": topic.get("paper_count", 0),
                    "representative_docs": rep_docs[:3]
                })
            else:
                # For categories without subcategories
                structure[layer1]["_direct"][period].append({
                    "id": unique_key,
                    "topic_id": topic_id,
                    "name": topic.get("name", ""),
                    "keywords": topic.get("keywords", []),
                    "paper_count": topic.get("paper_count", 0),
                    "representative_docs": rep_docs[:3]
                })

            # Track trend
            if not topic_trends[unique_key]["name"]:
                topic_trends[unique_key]["name"] = topic.get("name", "")
                topic_trends[unique_key]["keywords"] = topic.get("keywords", [])
                topic_trends[unique_key]["layer1"] = layer1
                topic_trends[unique_key]["layer2"] = layer2 or ""

            topic_trends[unique_key]["history"].append({
                "period": period,
                "paper_count": topic.get("paper_count", 0)
            })

    # Build output data
    output = {
        "version": periods[-1] if periods else "",
        "periods": periods,
        "taxonomy": taxonomy,
        "structure": dict(structure),
        "topic_count": len(topic_trends)
    }

    # Save structure
    with open(output_dir / "domain_structure.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Save trends
    trends_output = {
        "periods": periods,
        "trends": dict(topic_trends)
    }

    with open(output_dir / "trend_data.json", "w", encoding="utf-8") as f:
        json.dump(trends_output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved domain_structure.json")
    print(f"✅ Saved trend_data.json")

    # Print summary
    print("\n" + "="*50)
    print("HIERARCHY SUMMARY")
    print("="*50)

    for layer1 in sorted(structure.keys()):
        layer1_data = structure[layer1]
        total_topics = sum(len(topics) for period_topics in layer1_data.values() for topics in period_topics.values())
        print(f"\n{layer1.upper()} ({taxonomy.get(layer1, {}).get('name', '')}):")
        for layer2 in sorted(layer1_data.keys()):
            layer2_data = layer1_data[layer2]
            topic_count = sum(len(topics) for topics in layer2_data.values())
            period_count = len(layer2_data)
            layer2_display = layer2 if layer2 != "_direct" else "(direct)"
            print(f"  {layer1}.{layer2_display}: {topic_count} topics across {period_count} periods")

    return output, trends_output


if __name__ == "__main__":
    rebuild_structure()

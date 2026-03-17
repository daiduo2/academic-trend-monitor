#!/usr/bin/env python3
"""Convert topics_tree.json to compact topics.json format for frontend."""
import json
import argparse
from pathlib import Path


def convert_topics(input_file: str, output_file: str) -> dict:
    """Convert full topics format to compact format.

    Input format (topics_tree.json):
        {
            "topic_0": {
                "name": "Topic Name",
                "keywords": ["kw1", "kw2"],
                "primary_category": "cs.AI"
            }
        }

    Output format (topics.json):
        {
            "version": "2025-03",
            "topics": {
                "0": {"n": "Topic Name", "k": ["kw1"], "l": 3, "p": "AI"}
            },
            "categories": {"AI": "cs.AI"}
        }
    """
    with open(input_file) as f:
        data = json.load(f)

    # Category code mapping
    category_codes = {
        "cs.AI": "AI", "cs.CV": "CV", "cs.CL": "CL", "cs.LG": "LG",
        "cs.RO": "RO", "cs.DB": "DB", "cs.CR": "CR", "cs.DS": "DS",
        "cs.GT": "GT", "cs.HC": "HC", "cs.IR": "IR", "cs.MA": "MA",
        "cs.MM": "MM", "cs.NE": "NE", "cs.OS": "OS", "cs.PF": "PF",
        "cs.PL": "PL", "cs.SE": "SE", "cs.SC": "SC", "cs.SD": "SD",
        "cs.SY": "SY", "cs.NI": "NI", "cs.DC": "DC",
        "eess.SP": "SP", "eess.SY": "SY", "eess.IV": "IV",
        "math.OC": "MO", "stat.ML": "SM", "physics.chem-ph": "PH",
    }

    compact_topics = {
        "version": data.get("version", "2025-03"),
        "topics": {},
        "categories": {}
    }

    seen_categories = set()

    for topic_key, topic_data in data.get("topics", {}).items():
        # Extract numeric ID from "topic_0" -> "0"
        topic_id = topic_key.replace("topic_", "") if topic_key.startswith("topic_") else topic_key

        # Get category from representative docs
        category = "AI"  # default
        docs = topic_data.get("representative_docs", [])
        if docs:
            primary_cat = docs[0].get("primary_category", "cs.AI")
            category = category_codes.get(primary_cat, primary_cat.split(".")[-1] if "." in primary_cat else "AI")
            seen_categories.add((category, primary_cat))

        # Convert to compact format
        compact_topics["topics"][topic_id] = {
            "n": topic_data.get("name", f"Topic {topic_id}"),
            "k": topic_data.get("keywords", [])[:5],  # Limit to 5 keywords
            "l": 3,  # Layer 3 (dynamic topics)
            "p": category
        }

    # Build categories mapping
    for cat_code, full_name in seen_categories:
        compact_topics["categories"][cat_code] = full_name

    # Add default categories if none found
    if not compact_topics["categories"]:
        compact_topics["categories"] = {
            "AI": "cs.AI", "CV": "cs.CV", "CL": "cs.CL", "LG": "cs.LG"
        }

    # Save output
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(compact_topics, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(compact_topics['topics'])} topics")
    print(f"Output saved to: {output_file}")

    return compact_topics


def main():
    parser = argparse.ArgumentParser(description="Convert topics to compact format")
    parser.add_argument(
        "--input",
        default="data/output/topics_tree.json",
        help="Input topics file (full format)"
    )
    parser.add_argument(
        "--output",
        default="data/output/topics.json",
        help="Output topics file (compact format)"
    )
    args = parser.parse_args()

    convert_topics(args.input, args.output)


if __name__ == "__main__":
    main()

"""Export evolution data in Graphiti format (episodes, entities, relations).

Graphiti is a temporal knowledge graph framework that uses episodes to group
entities and relations at specific points in time.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def convert_period_to_date(period: str) -> str:
    """Convert period string (YYYY-MM) to ISO date."""
    try:
        return f"{period}-01T00:00:00Z"
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def build_episodes(periods: list[str], domain: str) -> list[dict[str, Any]]:
    """Build Graphiti episodes from time periods.

    Each episode represents a time slice of topic extraction.
    """
    episodes = []
    for i, period in enumerate(sorted(periods)):
        episode = {
            "uuid": f"ep-{domain}-{period}",
            "name": f"{domain.upper()} Topics - {period}",
            "content": f"Topic extraction from {domain} papers for period {period}",
            "created_at": convert_period_to_date(period),
            "period": period,
        }
        episodes.append(episode)
    return episodes


def build_entities(nodes: list[dict[str, Any]], domain: str) -> list[dict[str, Any]]:
    """Build Graphiti entities from topic nodes.

    Entities represent topics, research areas, and papers.
    """
    entities = []
    seen_names = set()

    for node in nodes:
        name = node.get("name", "")
        if not name or name in seen_names:
            continue

        seen_names.add(name)

        entity = {
            "name": name,
            "entity_type": "Topic",
            "summary": f"Research topic in {node.get('category', 'unknown')}",
            "created_at": convert_period_to_date(node.get("period", "")),
            "metadata": {
                "topic_id": node.get("topic_id", ""),
                "category": node.get("category", ""),
                "mode": node.get("mode", "hybrid"),
                "paper_count": node.get("paper_count", 0),
                "domain": domain,
            },
        }
        entities.append(entity)

    return entities


def build_relations(edges: list[dict[str, Any]], nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build Graphiti relations from evolution edges.

    Relations represent how topics evolve and relate to each other.
    """
    relations = []

    # Build node lookup for period information
    node_lookup = {n.get("id", ""): n for n in nodes}

    for edge in edges:
        source_id = edge.get("source", "")
        target_id = edge.get("target", "")

        source_node = node_lookup.get(source_id, {})
        target_node = node_lookup.get(target_id, {})

        # Map edge type to Graphiti relation type
        edge_type = edge.get("type", "unknown")
        relation_type_map = {
            "continued": "EVOLVED_FROM",
            "diffused_to_neighbor": "SIMILAR_TO",
            "diffused": "SIMILAR_TO",
            "specialized_into_child": "SPECIALIZED_INTO",
            "merged_from": "MERGED_FROM",
            "migrated_to_category": "BELONGS_TO",
        }
        relation_type = relation_type_map.get(edge_type, "RELATED_TO")

        relation = {
            "source": source_node.get("name", source_id),
            "target": target_node.get("name", target_id),
            "relation_type": relation_type,
            "confidence": edge.get("confidence", 0.5),
            "valid_from": convert_period_to_date(source_node.get("period", "")),
            "valid_to": convert_period_to_date(target_node.get("period", "")),
            "metadata": {
                "source_topic_id": source_node.get("topic_id", ""),
                "target_topic_id": target_node.get("topic_id", ""),
                "source_period": source_node.get("period", ""),
                "target_period": target_node.get("period", ""),
                "edge_type": edge_type,
            },
        }
        relations.append(relation)

    return relations


def export_graphiti_format(
    input_path: Path,
    output_path: Path,
    domain: str = "math",
) -> dict[str, Any]:
    """Export evolution data in Graphiti format.

    Args:
        input_path: Path to the evolution visualization JSON
        output_path: Path to save the Graphiti format JSON
        domain: Domain identifier (math, cs, physics)

    Returns:
        Export statistics
    """
    # Load input data
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    periods = data.get("metadata", {}).get("periods", [])

    print(f"Loaded {len(nodes)} nodes, {len(edges)} edges, {len(periods)} periods")

    # Build Graphiti structures
    episodes = build_episodes(periods, domain)
    entities = build_entities(nodes, domain)
    relations = build_relations(edges, nodes)

    # Build output
    output = {
        "version": "1.0",
        "format": "graphiti",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "domain": domain,
        "metadata": {
            "total_episodes": len(episodes),
            "total_entities": len(entities),
            "total_relations": len(relations),
            "periods": periods,
        },
        "episodes": episodes,
        "entities": entities,
        "relations": relations,
    }

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nExported to {output_path}")
    print(f"  - Episodes: {len(episodes)}")
    print(f"  - Entities: {len(entities)}")
    print(f"  - Relations: {len(relations)}")

    return {
        "output_path": str(output_path),
        "episodes": len(episodes),
        "entities": len(entities),
        "relations": len(relations),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export evolution data in Graphiti format"
    )
    parser.add_argument(
        "--input",
        default="data/output/evolution_graphs/math_visualization.json",
        help="Input visualization JSON file",
    )
    parser.add_argument(
        "--output",
        default="data/output/graphiti_math.json",
        help="Output Graphiti format JSON file",
    )
    parser.add_argument(
        "--domain",
        default="math",
        help="Domain identifier (math, cs, physics)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1

    stats = export_graphiti_format(input_path, output_path, args.domain)
    print(f"\nExport complete: {stats['entities']} entities, {stats['relations']} relations")
    return 0


if __name__ == "__main__":
    exit(main())

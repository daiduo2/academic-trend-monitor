"""Export Graphiti evolution data to static snapshot for frontend consumption."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.db import connect, ensure_schema


def fetch_evolution_data(domain: str) -> dict[str, Any] | None:
    """Fetch evolution data from PostgreSQL for a given domain."""
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            # Check if graphiti_evolution_nodes table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'graphiti_evolution_nodes'
                )
            """)
            table_exists = cur.fetchone()[0]

            if not table_exists:
                print(f"graphiti_evolution_nodes table does not exist yet")
                return None

            # Fetch nodes for the domain
            cur.execute(
                """
                SELECT
                    node_id,
                    topic_id,
                    name,
                    period,
                    category,
                    mode,
                    paper_count,
                    embedding,
                    metadata
                FROM graphiti_evolution_nodes
                WHERE domain = %s
                ORDER BY period, category, name
                """,
                (domain,),
            )
            node_rows = cur.fetchall()

            if not node_rows:
                print(f"No nodes found for domain: {domain}")
                return None

            # Fetch edges for the domain
            cur.execute(
                """
                SELECT
                    source_node_id,
                    target_node_id,
                    edge_type,
                    confidence,
                    metadata
                FROM graphiti_evolution_edges
                WHERE domain = %s
                ORDER BY source_node_id, target_node_id
                """,
                (domain,),
            )
            edge_rows = cur.fetchall()

            # Build nodes list
            nodes = []
            periods_set = set()
            categories_set = set()

            for row in node_rows:
                node = {
                    "id": row[0],
                    "topic_id": row[1],
                    "name": row[2],
                    "period": row[3],
                    "category": row[4],
                    "mode": row[5],
                    "paper_count": row[6],
                }
                nodes.append(node)
                periods_set.add(row[3])
                categories_set.add(row[4])

            # Build edges list
            edges = []
            for row in edge_rows:
                edge = {
                    "source": row[0],
                    "target": row[1],
                    "type": row[2],
                    "confidence": row[3],
                }
                edges.append(edge)

            # Build category tree
            category_tree: dict[str, dict[str, Any]] = {}
            for node in nodes:
                cat = node["category"]
                mode = node["mode"]
                if cat not in category_tree:
                    category_tree[cat] = {"count": 0, "modes": set()}
                category_tree[cat]["count"] += 1
                category_tree[cat]["modes"].add(mode)

            # Convert sets to lists for JSON serialization
            category_tree_serializable = {
                cat: {"count": info["count"], "modes": list(info["modes"])}
                for cat, info in category_tree.items()
            }

            return {
                "version": "1.0",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "domain": domain,
                "metadata": {
                    "total_nodes": len(nodes),
                    "total_edges": len(edges),
                    "periods": sorted(list(periods_set)),
                    "categories": sorted(list(categories_set)),
                },
                "nodes": nodes,
                "edges": edges,
                "category_tree": category_tree_serializable,
            }


def load_from_fallback(domain: str) -> dict[str, Any] | None:
    """Load evolution data from fallback JSON files if database is not available."""
    fallback_path = Path(f"data/output/evolution_graphs/{domain}_visualization.json")

    if not fallback_path.exists():
        return None

    try:
        with open(fallback_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Ensure the data has the expected structure
        if "nodes" not in data or "edges" not in data:
            print(f"Fallback data for {domain} missing required fields")
            return None

        print(f"Loaded fallback data from {fallback_path}")
        return data

    except (json.JSONDecodeError, IOError) as e:
        print(f"Failed to load fallback data: {e}")
        return None


def export_graphiti_snapshot(
    output_path: Path,
    domains: list[str] | None = None,
) -> dict[str, Any]:
    """Export Graphiti snapshot for all specified domains.

    Args:
        output_path: Path to save the snapshot JSON
        domains: List of domain IDs to export (default: ["math"])

    Returns:
        Dictionary with export statistics
    """
    if domains is None:
        domains = ["math"]

    snapshot = {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "domains": [],
    }

    total_nodes = 0
    total_edges = 0

    for domain in domains:
        print(f"Exporting domain: {domain}")

        # Try to fetch from database first
        domain_data = fetch_evolution_data(domain)

        # Fallback to JSON files if database fetch fails
        if domain_data is None:
            print(f"Falling back to JSON files for {domain}")
            domain_data = load_from_fallback(domain)

        if domain_data is None:
            print(f"No data available for domain: {domain}")
            continue

        domain_entry = {
            "id": domain,
            "name": _get_domain_name(domain),
            "periods": domain_data["metadata"]["periods"],
            "nodes": domain_data["nodes"],
            "edges": domain_data["edges"],
            "metadata": domain_data["metadata"],
        }

        snapshot["domains"].append(domain_entry)
        total_nodes += len(domain_data["nodes"])
        total_edges += len(domain_data["edges"])

        print(f"  - Nodes: {len(domain_data['nodes'])}")
        print(f"  - Edges: {len(domain_data['edges'])}")
        print(f"  - Periods: {domain_data['metadata']['periods']}")

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write snapshot
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    print(f"\nSnapshot exported to: {output_path}")
    print(f"Total domains: {len(snapshot['domains'])}")
    print(f"Total nodes: {total_nodes}")
    print(f"Total edges: {total_edges}")

    return {
        "output_path": str(output_path),
        "domains_exported": len(snapshot["domains"]),
        "total_nodes": total_nodes,
        "total_edges": total_edges,
    }


def _get_domain_name(domain_id: str) -> str:
    """Get human-readable domain name."""
    names = {
        "math": "Mathematics",
        "cs": "Computer Science",
        "physics": "Physics",
    }
    return names.get(domain_id, domain_id.title())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export Graphiti evolution data to static snapshot"
    )
    parser.add_argument(
        "--output",
        default="frontend/public/data/graphiti_snapshot.json",
        help="Output path for the snapshot JSON",
    )
    parser.add_argument(
        "--domains",
        nargs="+",
        default=["math"],
        help="Domains to export (default: math)",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    stats = export_graphiti_snapshot(output_path, domains=args.domains)

    print(f"\nExport complete: {stats['domains_exported']} domains")


if __name__ == "__main__":
    main()

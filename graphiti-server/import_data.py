"""Import pipeline data into Graphiti/Kuzu database."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import kuzu

KUZU_DB_DIR = os.getenv("KUZU_DATABASE_PATH", "./data/kuzu")
KUZU_DATABASE_PATH = os.path.join(KUZU_DB_DIR, "academic_trends.db")
PIPELINE_DATA_PATH = os.getenv("DATA_PIPELINE_PATH", "../data/output/evolution_graphs")


def init_database(db_dir: str) -> tuple[kuzu.Database, kuzu.Connection]:
    """Initialize Kuzu database with schema."""
    db_path = os.path.join(db_dir, "academic_trends.db")
    Path(db_dir).mkdir(parents=True, exist_ok=True)
    db = kuzu.Database(db_path)
    conn = kuzu.Connection(db)

    # Create node table for Topics
    try:
        conn.execute("""
            CREATE NODE TABLE Topic(
                id STRING,
                topic_id STRING,
                name STRING,
                period STRING,
                category STRING,
                mode STRING,
                paper_count INT64,
                PRIMARY KEY (id)
            )
        """)
        print("Created Topic table")
    except Exception as e:
        print(f"Topic table may already exist: {e}")

    # Create node table for ResearchArea
    try:
        conn.execute("""
            CREATE NODE TABLE ResearchArea(
                id STRING,
                name STRING,
                category STRING,
                PRIMARY KEY (id)
            )
        """)
        print("Created ResearchArea table")
    except Exception as e:
        print(f"ResearchArea table may already exist: {e}")

    # Create edge table for EVOLVED_FROM
    try:
        conn.execute("""
            CREATE REL TABLE EVOLVED_FROM(
                FROM Topic TO Topic,
                confidence DOUBLE,
                MANY_MANY
            )
        """)
        print("Created EVOLVED_FROM relationship")
    except Exception as e:
        print(f"EVOLVED_FROM relationship may already exist: {e}")

    # Create edge table for SIMILAR_TO
    try:
        conn.execute("""
            CREATE REL TABLE SIMILAR_TO(
                FROM Topic TO Topic,
                confidence DOUBLE,
                MANY_MANY
            )
        """)
        print("Created SIMILAR_TO relationship")
    except Exception as e:
        print(f"SIMILAR_TO relationship may already exist: {e}")

    # Create edge table for BELONGS_TO
    try:
        conn.execute("""
            CREATE REL TABLE BELONGS_TO(
                FROM Topic TO ResearchArea,
                MANY_MANY
            )
        """)
        print("Created BELONGS_TO relationship")
    except Exception as e:
        print(f"BELONGS_TO relationship may already exist: {e}")

    return db, conn


def import_graph_json(conn: kuzu.Connection, graph_path: Path, domain: str) -> dict[str, Any]:
    """Import a graph JSON file into Kuzu.

    Args:
        conn: Kuzu connection
        graph_path: Path to the graph JSON file
        domain: Domain identifier

    Returns:
        Import statistics
    """
    print(f"\nImporting graph from {graph_path}")

    with open(graph_path, "r", encoding="utf-8") as f:
        graph = json.load(f)

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    print(f"  - Found {len(nodes)} nodes, {len(edges)} edges")

    # Import nodes using COPY for bulk insert
    node_count = 0
    if nodes:
        # Create CSV for bulk import
        csv_path = Path("/tmp/topic_nodes.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("id,topic_id,name,period,category,mode,paper_count\n")
            for node in nodes:
                # Escape quotes in name
                name = node.get("name", "").replace('"', '""')
                f.write(f'"{node["id"]}","{node.get("topic_id", "")}","{name}",'
                        f'"{node.get("period", "")}","{node.get("category", "")}",'
                        f'"{node.get("mode", "")}",{node.get("paper_count", 0)}\n')

        try:
            conn.execute(f'COPY Topic FROM "{csv_path}" (header=true)')
            node_count = len(nodes)
            print(f"  - Imported {node_count} nodes")
        except Exception as e:
            print(f"  - Error importing nodes: {e}")
            # Fallback to individual inserts
            for node in nodes:
                try:
                    conn.execute("""
                        CREATE (t:Topic {
                            id: $id,
                            topic_id: $topic_id,
                            name: $name,
                            period: $period,
                            category: $category,
                            mode: $mode,
                            paper_count: $paper_count
                        })
                    """, {
                        "id": node["id"],
                        "topic_id": node.get("topic_id", ""),
                        "name": node.get("name", ""),
                        "period": node.get("period", ""),
                        "category": node.get("category", ""),
                        "mode": node.get("mode", ""),
                        "paper_count": node.get("paper_count", 0),
                    })
                    node_count += 1
                except Exception as e2:
                    print(f"    Error importing node {node.get('id')}: {e2}")

    # Import edges
    edge_count = 0
    if edges:
        # Group edges by type
        evolved_edges = [e for e in edges if e.get("relation_type") == "EVOLVED_FROM"]
        similar_edges = [e for e in edges if e.get("relation_type") == "SIMILAR_TO"]

        # Import EVOLVED_FROM edges
        for edge in evolved_edges:
            try:
                conn.execute("""
                    MATCH (a:Topic {id: $source}), (b:Topic {id: $target})
                    CREATE (a)-[:EVOLVED_FROM {confidence: $confidence}]->(b)
                """, {
                    "source": edge["source"],
                    "target": edge["target"],
                    "confidence": edge.get("confidence", 0.5),
                })
                edge_count += 1
            except Exception as e:
                print(f"    Error importing edge {edge.get('source')} -> {edge.get('target')}: {e}")

        # Import SIMILAR_TO edges
        for edge in similar_edges:
            try:
                conn.execute("""
                    MATCH (a:Topic {id: $source}), (b:Topic {id: $target})
                    CREATE (a)-[:SIMILAR_TO {confidence: $confidence}]->(b)
                """, {
                    "source": edge["source"],
                    "target": edge["target"],
                    "confidence": edge.get("confidence", 0.5),
                })
                edge_count += 1
            except Exception as e:
                print(f"    Error importing edge {edge.get('source')} -> {edge.get('target')}: {e}")

        print(f"  - Imported {edge_count}/{len(edges)} edges")

    return {
        "domain": domain,
        "nodes_imported": node_count,
        "edges_imported": edge_count,
    }


def import_from_pipeline(
    pipeline_path: str | None = None,
    db_dir: str | None = None,
    domain: str | None = None,
) -> dict[str, Any]:
    """Import data from pipeline output into Kuzu database.

    Args:
        pipeline_path: Path to pipeline output directory
        db_dir: Path to Kuzu database directory
        domain: Specific domain to import (None = all available)

    Returns:
        Import statistics
    """
    pipeline_path = pipeline_path or PIPELINE_DATA_PATH
    db_dir = db_dir or KUZU_DB_DIR

    pipeline_dir = Path(pipeline_path)
    if not pipeline_dir.exists():
        raise FileNotFoundError(f"Pipeline directory not found: {pipeline_path}")

    # Initialize database
    print(f"Initializing database at {db_dir}")
    db, conn = init_database(db_dir)

    stats = {
        "domains_imported": 0,
        "total_nodes": 0,
        "total_edges": 0,
        "details": [],
    }

    # Load manifest if exists
    manifest_path = pipeline_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        domains_to_import = [
            d for d in manifest.get("domains", [])
            if d.get("available") and (domain is None or d["id"] == domain)
        ]
    else:
        # Default: look for math_graph.json
        domains_to_import = [{"id": "math", "data_file": "math_graph.json"}]

    # Import each domain
    for domain_info in domains_to_import:
        domain_id = domain_info["id"]
        data_file = domain_info.get("data_file", f"{domain_id}_graph.json")
        graph_path = pipeline_dir / data_file

        if not graph_path.exists():
            print(f"Warning: Graph file not found for domain {domain_id}: {graph_path}")
            continue

        domain_stats = import_graph_json(conn, graph_path, domain_id)
        stats["domains_imported"] += 1
        stats["total_nodes"] += domain_stats["nodes_imported"]
        stats["total_edges"] += domain_stats["edges_imported"]
        stats["details"].append(domain_stats)

    print(f"\n{'='*50}")
    print("Import complete:")
    print(f"  - Domains: {stats['domains_imported']}")
    print(f"  - Total nodes: {stats['total_nodes']}")
    print(f"  - Total edges: {stats['total_edges']}")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Import pipeline data into Graphiti/Kuzu database"
    )
    parser.add_argument(
        "--pipeline-path",
        default=os.getenv("DATA_PIPELINE_PATH", "../data/output/evolution_graphs"),
        help="Path to pipeline output directory",
    )
    parser.add_argument(
        "--db-dir",
        default=os.getenv("KUZU_DATABASE_PATH", "./data/kuzu"),
        help="Path to Kuzu database directory",
    )
    parser.add_argument(
        "--domain",
        default=None,
        help="Specific domain to import (default: all available)",
    )
    args = parser.parse_args()

    import_from_pipeline(args.pipeline_path, args.db_dir, args.domain)


if __name__ == "__main__":
    main()

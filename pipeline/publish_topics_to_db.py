"""Publish monthly topic outputs to PostgreSQL."""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from pipeline.db import activate_topic_version, connect, ensure_schema


def _load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _extract_category(topic_data: dict) -> str | None:
    docs = topic_data.get("representative_docs", [])
    if not docs:
        return None
    return docs[0].get("primary_category")


def _extract_relations(tree: dict, relations: list[tuple[str, str]]) -> None:
    if not isinstance(tree, dict):
        return

    node_id = tree.get("id")
    children = tree.get("children", [])
    for child in children:
        child_id = child.get("id")
        if node_id and child_id:
            relations.append((node_id, child_id))
        _extract_relations(child, relations)


def publish_topics(
    topics_tree_path: Path,
    hierarchy_path: Path | None,
    version_month: str | None,
    topic_index_path: str,
    topic_index_hash: str,
    source_commit: str,
) -> str:
    topics_tree = _load_json(topics_tree_path)
    version = version_month or topics_tree.get("version") or datetime.now(timezone.utc).strftime("%Y-%m")
    generated_at = topics_tree.get("generated_at") or datetime.now(timezone.utc).isoformat()

    topic_items = topics_tree.get("topics", {})
    relations: list[tuple[str, str]] = []
    _extract_relations(topics_tree.get("tree", {}), relations)

    hierarchy_payload = _load_json(hierarchy_path) if hierarchy_path and hierarchy_path.exists() else {}
    related_edges = []
    for entry in hierarchy_payload.get("hierarchies", {}).values():
        for relation in entry.get("related_paths", []):
            parent_id = relation.get("from")
            child_id = relation.get("to")
            if parent_id and child_id:
                related_edges.append((parent_id, child_id, relation))

    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO topic_versions (
                    version_month, generated_at, source_commit, topic_index_path, topic_index_hash, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (version_month) DO UPDATE SET
                    generated_at = EXCLUDED.generated_at,
                    source_commit = EXCLUDED.source_commit,
                    topic_index_path = EXCLUDED.topic_index_path,
                    topic_index_hash = EXCLUDED.topic_index_hash,
                    metadata = EXCLUDED.metadata
                """,
                (
                    version,
                    generated_at,
                    source_commit or None,
                    topic_index_path or None,
                    topic_index_hash or None,
                    json.dumps(
                        {
                            "topics_tree_path": str(topics_tree_path),
                            "hierarchy_path": str(hierarchy_path) if hierarchy_path else None,
                        }
                    ),
                ),
            )

            cur.execute("DELETE FROM topics WHERE version_month = %s", (version,))
            cur.execute("DELETE FROM topic_relations WHERE version_month = %s", (version,))

            for topic_key, topic_data in topic_items.items():
                cur.execute(
                    """
                    INSERT INTO topics (
                        version_month, topic_id, name, keywords, paper_count, layer, primary_parent, category_code, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        version,
                        topic_key,
                        topic_data.get("name") or topic_key,
                        json.dumps(topic_data.get("keywords", [])),
                        topic_data.get("paper_count", 0),
                        3,
                        None,
                        _extract_category(topic_data),
                        json.dumps(topic_data),
                    ),
                )

            for parent_id, child_id in relations:
                cur.execute(
                    """
                    INSERT INTO topic_relations (version_month, parent_topic_id, child_topic_id, relation_type, metadata)
                    VALUES (%s, %s, %s, 'tree', %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (version, parent_id, child_id, json.dumps({})),
                )

            for parent_id, child_id, relation in related_edges:
                cur.execute(
                    """
                    INSERT INTO topic_relations (version_month, parent_topic_id, child_topic_id, relation_type, metadata)
                    VALUES (%s, %s, %s, 'related_path', %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (version, parent_id, child_id, json.dumps(relation)),
                )

        activate_topic_version(conn, version)

    return version


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish monthly topics to PostgreSQL")
    parser.add_argument("--topics-tree", default="data/output/topics_tree.json")
    parser.add_argument("--hierarchy", default="data/output/aligned_topics_hierarchy.json")
    parser.add_argument("--version")
    parser.add_argument(
        "--topic-index-path",
        default=(
            os.getenv("TOPIC_INDEX_URL")
            or os.getenv("TOPIC_INDEX_PATH")
            or "https://raw.githubusercontent.com/daiduo2/academic-trend-monitor/main/data/output/topic_index"
        ),
    )
    parser.add_argument("--topic-index-hash", default=os.getenv("TOPIC_INDEX_HASH") or "")
    parser.add_argument("--source-commit", default=os.getenv("GITHUB_SHA") or "")
    args = parser.parse_args()

    version = publish_topics(
        topics_tree_path=Path(args.topics_tree),
        hierarchy_path=Path(args.hierarchy) if args.hierarchy else None,
        version_month=args.version,
        topic_index_path=args.topic_index_path,
        topic_index_hash=args.topic_index_hash,
        source_commit=args.source_commit,
    )
    print(f"Published topic version {version}")


if __name__ == "__main__":
    main()

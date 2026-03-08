"""PostgreSQL schema and helpers for the production data pipeline."""
from __future__ import annotations

import os
from contextlib import contextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS topic_versions (
    version_month TEXT PRIMARY KEY,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_commit TEXT,
    topic_index_path TEXT,
    topic_index_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS topic_versions_single_active_idx
ON topic_versions ((is_active))
WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS topics (
    version_month TEXT NOT NULL REFERENCES topic_versions(version_month) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    paper_count INTEGER NOT NULL DEFAULT 0,
    layer INTEGER NOT NULL DEFAULT 3,
    primary_parent TEXT,
    category_code TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (version_month, topic_id)
);

CREATE TABLE IF NOT EXISTS topic_relations (
    version_month TEXT NOT NULL REFERENCES topic_versions(version_month) ON DELETE CASCADE,
    parent_topic_id TEXT NOT NULL,
    child_topic_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'tree',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (version_month, parent_topic_id, child_topic_id, relation_type)
);

CREATE TABLE IF NOT EXISTS papers_recent (
    arxiv_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_category TEXT,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    pdf_url TEXT,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS paper_topic_tags (
    arxiv_id TEXT NOT NULL REFERENCES papers_recent(arxiv_id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    topic_version_month TEXT NOT NULL REFERENCES topic_versions(version_month) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL,
    rank INTEGER NOT NULL DEFAULT 1,
    tagger_version TEXT NOT NULL DEFAULT 'embedding-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (arxiv_id, topic_id, topic_version_month)
);

CREATE TABLE IF NOT EXISTS daily_analyses (
    analysis_date DATE PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_highlights (
    analysis_date DATE NOT NULL REFERENCES daily_analyses(analysis_date) ON DELETE CASCADE,
    highlight_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (analysis_date, highlight_type, sort_order)
);

CREATE TABLE IF NOT EXISTS export_snapshots (
    export_name TEXT PRIMARY KEY,
    exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
"""


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL is not configured")
    return normalize_database_url(database_url)


def normalize_database_url(database_url: str) -> str:
    """Normalize DATABASE_URL for hosted PostgreSQL providers such as Neon."""
    parsed = urlsplit(database_url)
    if not parsed.scheme.startswith("postgres"):
        return database_url

    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
    hostname = parsed.hostname or ""

    if hostname.endswith("neon.tech") and "sslmode" not in query_items:
        query_items["sslmode"] = "require"

    if "application_name" not in query_items:
        query_items["application_name"] = "academic_trend_monitor"

    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query_items), parsed.fragment))


def get_connection():
    try:
        import psycopg
    except ImportError as exc:
        raise ImportError("psycopg is required for PostgreSQL operations") from exc

    return psycopg.connect(get_database_url(), autocommit=False)


@contextmanager
def connect():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(SCHEMA_SQL)


def activate_topic_version(conn, version_month: str) -> None:
    with conn.cursor() as cur:
        cur.execute("UPDATE topic_versions SET is_active = FALSE WHERE is_active = TRUE")
        cur.execute(
            "UPDATE topic_versions SET is_active = TRUE WHERE version_month = %s",
            (version_month,),
        )


def get_active_topic_version(conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT version_month, topic_index_path, topic_index_hash, metadata
            FROM topic_versions
            WHERE is_active = TRUE
            """
        )
        row = cur.fetchone()

    if not row:
        return None

    return {
        "version_month": row[0],
        "topic_index_path": row[1],
        "topic_index_hash": row[2],
        "metadata": row[3] or {},
    }


def main() -> None:
    with connect() as conn:
        ensure_schema(conn)
    print("Initialized PostgreSQL schema")


if __name__ == "__main__":
    main()

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Optional

import requests


DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_BATCH_SIZE = 200


@dataclass(frozen=True)
class LiteratureApiConfig:
    base_url: str
    token: str
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS
    batch_size: int = DEFAULT_BATCH_SIZE


def get_literature_api_config() -> Optional[LiteratureApiConfig]:
    base_url = os.getenv("LITERATURE_API_BASE_URL", "").strip()
    if not base_url:
        return None

    token = os.getenv("LITERATURE_API_TOKEN", "").strip()
    timeout_seconds = int(os.getenv("LITERATURE_API_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS)))
    batch_size = int(os.getenv("LITERATURE_API_BATCH_SIZE", str(DEFAULT_BATCH_SIZE)))

    return LiteratureApiConfig(
        base_url=base_url.rstrip("/"),
        token=token,
        timeout_seconds=timeout_seconds,
        batch_size=batch_size,
    )


def chunked(items: list[dict], size: int) -> Iterator[list[dict]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def _build_pdf_url(paper_id: str) -> str:
    return f"https://arxiv.org/pdf/{paper_id}.pdf"


def normalize_paper_record(paper: dict) -> dict:
    paper_id = str(paper["id"])
    published = paper.get("published") or paper.get("created") or ""
    updated = paper.get("updated") or paper.get("created") or published
    primary_category = paper.get("primary_category") or (paper.get("categories") or [""])[0]

    return {
        "id": paper_id,
        "title": paper["title"],
        "abstract": paper.get("abstract", ""),
        "authors": paper.get("authors", []),
        "primary_category": primary_category,
        "categories": paper.get("categories", []),
        "published": published,
        "updated": updated,
        "pdf_url": paper.get("pdf_url") or _build_pdf_url(paper_id),
        "doi": paper.get("doi"),
        "journal_ref": paper.get("journal_ref"),
        "comment": paper.get("comment"),
    }


def post_batch(config: LiteratureApiConfig, path: str, payload: dict) -> dict:
    headers = {"Content-Type": "application/json"}
    if config.token:
        headers["x-ingest-token"] = config.token

    response = requests.post(
        f"{config.base_url}{path}",
        headers=headers,
        data=json.dumps(payload, ensure_ascii=False),
        timeout=config.timeout_seconds,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"{path} failed with {response.status_code}: {response.text[:500]}")
    return response.json()


def upload_papers(config: LiteratureApiConfig, papers: Iterable[dict]) -> list[dict]:
    normalized = [normalize_paper_record(paper) for paper in papers]
    responses = []
    for batch in chunked(normalized, config.batch_size):
        responses.append(post_batch(config, "/api/v1/literature/papers/batch", {"papers": batch}))
    return responses


def upload_recent_entries(config: LiteratureApiConfig, entries: list[dict]) -> list[dict]:
    responses = []
    for batch in chunked(entries, config.batch_size):
        responses.append(post_batch(config, "/api/v1/literature/recent/batch", {"entries": batch}))
    return responses


def upload_topic_run(config: LiteratureApiConfig, payload: dict) -> dict:
    return post_batch(config, "/api/v1/literature/topic-runs", payload)


def load_jsonl(path: Path) -> list[dict]:
    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

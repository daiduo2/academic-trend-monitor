from pipeline.utils.literature_api import normalize_paper_record


def test_normalize_paper_record_builds_required_fields():
    record = normalize_paper_record(
        {
            "id": "2603.11048v1",
            "title": "Paper Title",
            "abstract": "Paper abstract",
            "authors": ["Alice", "Bob"],
            "categories": ["cs.CV", "cs.AI"],
            "published": "2026-03-11T17:59:59+00:00",
            "created": "2026-03-11T17:59:59+00:00",
        }
    )

    assert record["id"] == "2603.11048v1"
    assert record["primary_category"] == "cs.CV"
    assert record["updated"] == "2026-03-11T17:59:59+00:00"
    assert record["pdf_url"] == "https://arxiv.org/pdf/2603.11048v1.pdf"


def test_normalize_paper_record_keeps_optional_fields():
    record = normalize_paper_record(
        {
            "id": "2603.11048v1",
            "title": "Paper Title",
            "abstract": "Paper abstract",
            "authors": [],
            "primary_category": "cs.AI",
            "categories": ["cs.AI"],
            "published": "2026-03-11T17:59:59+00:00",
            "updated": "2026-03-12T00:00:00+00:00",
            "pdf_url": "https://example.com/paper.pdf",
            "doi": "10.1000/test",
            "journal_ref": "Journal Ref",
            "comment": "Test comment",
        }
    )

    assert record["pdf_url"] == "https://example.com/paper.pdf"
    assert record["doi"] == "10.1000/test"
    assert record["journal_ref"] == "Journal Ref"
    assert record["comment"] == "Test comment"

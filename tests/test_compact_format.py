# tests/test_compact_format.py
def test_compact_paper_format():
    from pipeline.utils.compact_format import compact_paper

    paper = {
        "id": "2503.12345",
        "title": "Test Paper Title",
        "authors": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "primary_category": "cs.AI",
        "published": "2025-03-07T10:30:00Z",
        "tags": [5, 12]
    }

    result = compact_paper(paper)

    assert result == {
        "i": "2503.12345",
        "t": "Test Paper Title",
        "a": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "c": "AI",
        "p": "250307",
        "g": [5, 12],
        "s": []
    }

def test_compact_truncate_authors():
    from pipeline.utils.compact_format import compact_paper

    paper = {
        "id": "2503.12345",
        "title": "Test",
        "authors": ["A", "B", "C", "D", "E"],
        "primary_category": "cs.CV",
        "published": "2025-03-07T10:30:00Z",
        "tags": []
    }

    result = compact_paper(paper)

    assert result["a"] == ["A", "B", "C"]

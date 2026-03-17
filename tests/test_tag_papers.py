# tests/test_tag_papers.py
import numpy as np

def test_tag_paper_with_mock_index():
    from pipeline.tag_papers import tag_paper

    paper = {
        "title": "Large Language Model Alignment with RLHF",
        "abstract": "We propose a method for aligning LLMs using human feedback"
    }

    # Mock topic IDs
    topic_ids = ["topic_0", "topic_1", "topic_2"]

    # When no index is provided, should return empty tags
    result = tag_paper(paper, topic_ids, index=None, model=None, threshold=0.6)

    assert "tags" in result
    assert "scores" in result
    assert isinstance(result["tags"], list)
    assert result["tags"] == []  # Empty when no index

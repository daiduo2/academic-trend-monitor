# tests/test_topic_index.py
import json
import tempfile
import os

def test_build_topic_index():
    from pipeline.build_topic_index import build_topic_index

    topics = {
        "topic_0": {
            "name": "Test Topic",
            "keywords": ["test", "example"],
            "representative_docs": [{"title": "Test Doc", "abstract": "Test abstract"}]
        }
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = os.path.join(tmpdir, "index")

        result = build_topic_index(topics, output_path)

        # If faiss is not available, it returns count 0
        # If faiss is available, it creates the files
        try:
            import faiss
            assert os.path.exists(f"{output_path}.json")
            assert os.path.exists(f"{output_path}.faiss")
            assert result["count"] == 1
        except ImportError:
            assert result["count"] == 0
            assert result["path"] is None

# pipeline/tag_papers.py
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple


def load_topic_index(index_path: str) -> Tuple:
    """Load FAISS index and topic mapping."""
    try:
        import faiss
    except ImportError:
        raise ImportError("faiss is required for tag matching")

    index = faiss.read_index(f"{index_path}.faiss")

    with open(f"{index_path}.json") as f:
        mapping = json.load(f)

    return index, mapping["topic_ids"]


def tag_paper(paper: dict, topic_ids: list, index=None, threshold: float = 0.6) -> dict:
    """Tag a single paper with matching topics."""
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Combine title and abstract
    text = paper.get("title", "") + " " + paper.get("abstract", "")
    embedding = model.encode(text)

    if index is None:
        # Return empty tags if no index (for testing)
        return {**paper, "tags": [], "scores": []}

    # Search index
    import faiss
    vector = np.array([embedding]).astype("float32")
    faiss.normalize_L2(vector)

    scores, indices = index.search(vector, k=min(10, len(topic_ids)))

    # Filter by threshold
    matched_tags = []
    matched_scores = []

    for score, idx in zip(scores[0], indices[0]):
        if score >= threshold and idx < len(topic_ids):
            matched_tags.append(topic_ids[idx])
            matched_scores.append(float(score))

    return {
        **paper,
        "tags": matched_tags,
        "scores": matched_scores
    }


def tag_papers(papers: list, index_path: str, threshold: float = 0.6) -> list:
    """Tag multiple papers."""
    index, topic_ids = load_topic_index(index_path)

    results = []
    for paper in papers:
        tagged = tag_paper(paper, topic_ids, index, threshold)
        results.append(tagged)

    return results


if __name__ == "__main__":
    import sys

    papers_file = sys.argv[1] if len(sys.argv) > 1 else "data/daily_papers.json"
    index_path = sys.argv[2] if len(sys.argv) > 2 else "data/output/topic_index"
    output_file = sys.argv[3] if len(sys.argv) > 3 else "data/daily_tagged.jsonl"

    with open(papers_file) as f:
        papers = json.load(f)

    tagged = tag_papers(papers, index_path)

    with open(output_file, "w") as f:
        for paper in tagged:
            f.write(json.dumps(paper) + "\n")

    print(f"Tagged {len(tagged)} papers")

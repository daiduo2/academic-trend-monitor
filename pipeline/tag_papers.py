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


def tag_paper(paper: dict, topic_ids: list, index=None, model=None, threshold: float = 0.6) -> dict:
    """Tag a single paper with matching topics.

    Args:
        paper: Paper dict with title and abstract
        topic_ids: List of topic IDs
        index: FAISS index (loaded once by tag_papers)
        model: SentenceTransformer model (loaded once by tag_papers)
        threshold: Minimum similarity score to include tag

    Returns:
        Paper dict with added tags and scores fields
    """
    # If no index provided, return empty tags (for testing or when index not available)
    if index is None:
        return {**paper, "tags": [], "scores": []}

    if model is None:
        raise ValueError("Model must be provided when index is provided - load it once in tag_papers()")

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
    """Tag multiple papers.

    Loads the model and index once, then processes all papers efficiently.
    """
    # Load index and model once
    index, topic_ids = load_topic_index(index_path)
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print(f"Loaded index with {len(topic_ids)} topics, tagging {len(papers)} papers...")

    results = []
    for i, paper in enumerate(papers):
        tagged = tag_paper(paper, topic_ids, index, model, threshold)
        results.append(tagged)

        if (i + 1) % 10 == 0:
            print(f"  Tagged {i + 1}/{len(papers)} papers...")

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

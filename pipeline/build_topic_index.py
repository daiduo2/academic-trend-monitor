# pipeline/build_topic_index.py
import json
import numpy as np
from sentence_transformers import SentenceTransformer

def build_topic_index(topics: dict, output_path: str) -> dict:
    """Build FAISS index for topic vectors."""
    try:
        import faiss
    except ImportError:
        print("Warning: faiss not available, skipping index build")
        return {"count": 0, "path": None}

    model = SentenceTransformer("all-MiniLM-L6-v2")

    topic_ids = []
    topic_vectors = []

    for topic_id, topic_data in topics.items():
        # Use topic name + keywords as text representation
        text = topic_data.get("name", "") + " " + " ".join(topic_data.get("keywords", []))

        embedding = model.encode(text)
        topic_ids.append(topic_id)
        topic_vectors.append(embedding)

    # Build FAISS index
    vectors = np.array(topic_vectors).astype("float32")
    index = faiss.IndexFlatIP(vectors.shape[1])  # Inner product (cosine similarity)
    faiss.normalize_L2(vectors)  # Normalize for cosine similarity
    index.add(vectors)

    # Save index and mapping
    faiss.write_index(index, f"{output_path}.faiss")

    with open(f"{output_path}.json", "w") as f:
        json.dump({"topic_ids": topic_ids, "count": len(topic_ids)}, f)

    return {"count": len(topic_ids), "path": output_path}


if __name__ == "__main__":
    import sys

    # Load topics from file
    topics_file = sys.argv[1] if len(sys.argv) > 1 else "data/output/topics_tree.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "data/output/topic_index"

    with open(topics_file) as f:
        data = json.load(f)
        topics = data.get("topics", {})

    result = build_topic_index(topics, output_path)
    print(f"Built index with {result['count']} topics")

from typing import List, Dict, Tuple
import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from pipeline.utils.config import get_topic_modeling_config


def preprocess_documents(documents: List[Dict]) -> List[str]:
    """Preprocess documents for BERTopic."""
    texts = []
    for doc in documents:
        # Combine title and abstract
        title = doc.get("title", "").strip()
        abstract = doc.get("abstract", "").strip()

        if title and abstract:
            text = f"{title}. {abstract}"
        elif title:
            text = title
        else:
            text = abstract

        texts.append(text)

    return texts


def run_bertopic_for_period(period: str) -> Tuple[BERTopic, List[int], np.ndarray, List[Dict]]:
    """Run BERTopic for a specific period."""
    from pipeline.utils.data_loader import load_monthly_data

    # Load data
    documents = load_monthly_data(period)
    texts = preprocess_documents(documents)

    # Get config
    config = get_topic_modeling_config()

    # Initialize embedding model
    embedding_model = SentenceTransformer(config["embedding_model"])

    # Initialize and fit BERTopic
    topic_model = BERTopic(
        embedding_model=embedding_model,
        min_topic_size=config["min_topic_size"],
        verbose=True
    )

    topics, probs = topic_model.fit_transform(texts)

    return topic_model, topics, probs, documents

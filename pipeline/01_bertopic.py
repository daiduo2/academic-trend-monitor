#!/usr/bin/env python3
"""BERTopic modeling script - Phase 1 of pipeline."""

import json
import pickle
from pathlib import Path
from pipeline.bertopic_modeling import run_bertopic_for_period
from pipeline.utils.data_loader import get_available_periods


def main():
    """Run BERTopic for all available periods."""
    output_dir = Path("data/output/bertopic")
    output_dir.mkdir(parents=True, exist_ok=True)

    periods = get_available_periods()
    print(f"Found {len(periods)} periods: {periods}")

    for period in periods:
        print(f"\n{'='*60}")
        print(f"Processing {period}...")
        print(f"{'='*60}")

        # Run BERTopic
        topic_model, topics, probs, documents = run_bertopic_for_period(period)

        # Save results
        result = {
            "period": period,
            "n_topics": len(set(topics)) - 1,  # Exclude -1 (outliers)
            "n_documents": len(documents),
            "topics": []
        }

        # Extract topic info
        topic_info = topic_model.get_topic_info()

        for topic_id in topic_info.Topic:
            if topic_id == -1:
                continue  # Skip outliers

            topic_words = topic_model.get_topic(topic_id)
            keywords = [word for word, _ in topic_words[:10]]

            # Get representative documents
            doc_indices = [i for i, t in enumerate(topics) if t == topic_id]
            rep_docs = [documents[i] for i in doc_indices[:5]]

            result["topics"].append({
                "topic_id": int(topic_id),
                "keywords": keywords,
                "paper_count": len(doc_indices),
                "representative_docs": [
                    {"id": d["id"], "title": d["title"], "primary_category": d.get("primary_category", "")} for d in rep_docs
                ]
            })

        # Save JSON
        output_file = output_dir / f"{period}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"Saved {len(result['topics'])} topics to {output_file}")

        # Save model for later use
        model_file = output_dir / f"{period}.pkl"
        with open(model_file, "wb") as f:
            pickle.dump(topic_model, f)

        print(f"Saved model to {model_file}")


if __name__ == "__main__":
    main()

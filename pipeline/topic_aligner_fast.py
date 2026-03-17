import json
from typing import Dict, List, Set, Tuple
from collections import Counter


class TopicAlignerFast:
    """Fast topic alignment using keyword similarity - no LLM calls."""

    def __init__(self, similarity_threshold: float = 0.3):
        self.similarity_threshold = similarity_threshold

    def jaccard_similarity(self, set1: Set[str], set2: Set[str]) -> float:
        """Calculate Jaccard similarity between two sets."""
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0

    def tokenize(self, text: str) -> Set[str]:
        """Tokenize text into keywords."""
        # Convert to lowercase and split
        text = text.lower()
        # Simple tokenization - split by non-alphanumeric
        import re
        tokens = set(re.findall(r'\b[a-z]{3,}\b', text))
        return tokens

    def get_topic_keywords_set(self, topic: Dict) -> Set[str]:
        """Extract keyword set from topic."""
        keywords = set()

        # Add explicit keywords
        for kw in topic.get("keywords", []):
            keywords.add(kw.lower())

        # Add keywords from name
        name = topic.get("name", "")
        keywords.update(self.tokenize(name))

        # Add keywords from representative docs
        for doc in topic.get("representative_docs", [])[:3]:
            title = doc.get("title", "")
            keywords.update(self.tokenize(title))

        return keywords

    def calculate_similarity(self, topic_a: Dict, topic_b: Dict) -> float:
        """Calculate similarity between two topics."""
        keywords_a = self.get_topic_keywords_set(topic_a)
        keywords_b = self.get_topic_keywords_set(topic_b)

        # Jaccard similarity on keywords
        keyword_sim = self.jaccard_similarity(keywords_a, keywords_b)

        # Also check category match
        cat_a = self.get_category(topic_a)
        cat_b = self.get_category(topic_b)
        category_bonus = 0.1 if cat_a and cat_b and cat_a == cat_b else 0

        return min(1.0, keyword_sim + category_bonus)

    def get_category(self, topic: Dict) -> str:
        """Get primary category from topic."""
        docs = topic.get("representative_docs", [])
        if docs:
            cat = docs[0].get("primary_category", "")
            return cat.split(".")[0] if "." in cat else cat
        return ""

    def find_best_match(self, topic: Dict, candidates: Dict[str, Dict]) -> Tuple[str, float]:
        """Find best matching topic from candidates."""
        best_match = None
        best_score = 0

        for cand_id, cand_topic in candidates.items():
            score = self.calculate_similarity(topic, cand_topic)
            if score > best_score and score >= self.similarity_threshold:
                best_score = score
                best_match = cand_id

        return best_match, best_score

    def align_topics(self, prev_topics: Dict, curr_topics: Dict) -> Dict[str, Dict]:
        """Align topics between two periods."""
        alignments = {}

        for prev_id, prev_topic in prev_topics.items():
            best_match, score = self.find_best_match(prev_topic, curr_topics)

            alignments[prev_id] = {
                "next_id": best_match,
                "confidence": score,
                "continues": best_match is not None
            }

        return alignments

    def build_trend_data(self, all_periods_data: Dict[str, Dict]) -> Dict:
        """Build trend data for all topics across all periods."""
        trends = {}

        periods = sorted(all_periods_data.keys())
        if not periods:
            return trends

        print(f"Building trends across {len(periods)} periods...")

        # Initialize trends with all topics from first period
        first_period = periods[0]
        print(f"  Initializing from {first_period}...")

        for topic_id, topic in all_periods_data[first_period]["topics"].items():
            trends[topic_id] = {
                "name": topic.get("name", ""),
                "keywords": topic.get("keywords", []),
                "category": self.get_category(topic),
                "history": [{"period": first_period, "paper_count": topic.get("paper_count", 0)}]
            }

        # Propagate through periods
        for i in range(1, len(periods)):
            prev_period = periods[i-1]
            curr_period = periods[i]

            print(f"  Aligning {prev_period} -> {curr_period}...")

            prev_data = all_periods_data[prev_period]
            curr_data = all_periods_data[curr_period]

            # Align topics
            alignments = self.align_topics(prev_data["topics"], curr_data["topics"])

            # Track which current topics have been matched
            matched_curr = set()

            # Update trends for continuing topics
            for prev_id, alignment in alignments.items():
                if alignment["continues"] and prev_id in trends:
                    curr_id = alignment["next_id"]
                    matched_curr.add(curr_id)

                    curr_topic = curr_data["topics"][curr_id]

                    trends[prev_id]["history"].append({
                        "period": curr_period,
                        "paper_count": curr_topic.get("paper_count", 0)
                    })

            # Add new topics from current period
            new_count = 0
            for curr_id, curr_topic in curr_data["topics"].items():
                if curr_id not in matched_curr:
                    trends[curr_id] = {
                        "name": curr_topic.get("name", ""),
                        "keywords": curr_topic.get("keywords", []),
                        "category": self.get_category(curr_topic),
                        "history": [{"period": curr_period, "paper_count": curr_topic.get("paper_count", 0)}]
                    }
                    new_count += 1

            print(f"    {new_count} new topics in {curr_period}")

        return trends

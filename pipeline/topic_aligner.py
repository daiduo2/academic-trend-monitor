import json
import yaml
from typing import Dict, List, Tuple
from pipeline.utils.llm_client import LLMClient


class TopicAligner:
    """Align topics across months."""

    def __init__(self):
        self.llm = LLMClient()
        with open("config/prompts.yaml", "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)

    def compare_topics(self, topic_a: Dict, topic_b: Dict) -> Dict:
        """Compare two topics using LLM."""
        prompt_template = self.prompts.get("topic_alignment", "")

        prompt = prompt_template.format(
            name_1=topic_a.get("name", ""),
            keywords_1=", ".join(topic_a.get("keywords", [])),
            papers_1=json.dumps([d.get("title", "") for d in topic_a.get("representative_docs", [])[:3]]),
            name_2=topic_b.get("name", ""),
            keywords_2=", ".join(topic_b.get("keywords", [])),
            papers_2=json.dumps([d.get("title", "") for d in topic_b.get("representative_docs", [])[:3]])
        )

        result = self.llm.complete_json(prompt)
        return result

    def align_topics(self, prev_topics: Dict, curr_topics: Dict) -> Dict[str, Dict]:
        """Align topics between two periods."""
        alignments = {}

        for prev_id, prev_topic in prev_topics.items():
            best_match = None
            best_confidence = 0

            for curr_id, curr_topic in curr_topics.items():
                comparison = self.compare_topics(prev_topic, curr_topic)

                if comparison.get("is_same_concept") and comparison.get("confidence", 0) > best_confidence:
                    best_match = curr_id
                    best_confidence = comparison.get("confidence", 0)

            alignments[prev_id] = {
                "next_id": best_match,
                "confidence": best_confidence,
                "continues": best_match is not None
            }

        return alignments

    def build_trend_data(self, all_periods_data: Dict[str, Dict]) -> Dict:
        """Build trend data for all topics across all periods."""
        trends = {}

        periods = sorted(all_periods_data.keys())

        # Initialize trends with all topics from first period
        first_period = periods[0]
        for topic_id, topic in all_periods_data[first_period]["topics"].items():
            trends[topic_id] = {
                "name": topic.get("name", ""),
                "keywords": topic.get("keywords", []),
                "history": [{"period": first_period, "paper_count": topic.get("paper_count", 0)}]
            }

        # Propagate through periods
        for i in range(1, len(periods)):
            prev_period = periods[i-1]
            curr_period = periods[i]

            prev_data = all_periods_data[prev_period]
            curr_data = all_periods_data[curr_period]

            # Align topics
            alignments = self.align_topics(prev_data["topics"], curr_data["topics"])

            # Update trends
            for prev_id, alignment in alignments.items():
                if alignment["continues"] and prev_id in trends:
                    curr_id = alignment["next_id"]
                    curr_topic = curr_data["topics"][curr_id]

                    trends[prev_id]["history"].append({
                        "period": curr_period,
                        "paper_count": curr_topic.get("paper_count", 0)
                    })

        return trends

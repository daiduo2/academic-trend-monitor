import json
import yaml
from typing import List, Dict
from collections import defaultdict
from pipeline.utils.llm_client import LLMClient
from pipeline.utils.config import get_categories


class CoarseClusterer:
    """Cluster topics by arXiv category."""

    def __init__(self):
        self.categories = get_categories()

    def cluster_by_category(self, topics: List[Dict]) -> Dict[str, List[Dict]]:
        """Group topics by their primary arXiv category."""
        clusters = defaultdict(list)

        for topic in topics:
            # Get category from representative docs
            rep_docs = topic.get("representative_docs", [])
            if not rep_docs:
                continue

            primary_cat = rep_docs[0].get("primary_category", "")

            # Map to our category list
            if primary_cat in self.categories:
                clusters[primary_cat].append(topic)
            else:
                # Try to find parent category
                parent = primary_cat.split(".")[0]
                if parent == "cs":
                    clusters["cs.AI"].append(topic)  # Default to AI
                elif parent == "math":
                    clusters["math.AG"].append(topic)
                elif parent == "physics":
                    clusters["physics.acc-ph"].append(topic)
                elif parent == "stat":
                    clusters["stat.ML"].append(topic)

        return dict(clusters)


class HierarchyBuilder:
    """Build hierarchical topic structure using LLM."""

    def __init__(self):
        self.llm = LLMClient()
        self.load_prompts()

    def load_prompts(self):
        """Load prompts from config."""
        with open("config/prompts.yaml", "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)

    def build_hierarchy(self, topics: List[Dict], category: str) -> Dict:
        """Build hierarchical structure for topics in a category."""

        # Format topics for prompt
        topics_str = json.dumps(topics, ensure_ascii=False, indent=2)

        # Get prompt template
        prompt_template = self.prompts.get("build_hierarchy", "")

        # Fill prompt
        prompt = prompt_template.format(
            category=category,
            topics=topics_str
        )

        # Call LLM
        result = self.llm.complete_json(prompt)

        return result

    def generate_topic_names(self, topics: List[Dict]) -> List[Dict]:
        """Generate human-readable names for topics."""
        prompt_template = self.prompts.get("topic_name_generation", "")

        named_topics = []
        for topic in topics:
            keywords = ", ".join(topic["keywords"][:5])
            prompt = prompt_template.format(keywords=keywords)

            name = self.llm.complete(prompt, temperature=0.3, max_tokens=50)
            topic["name"] = name.strip()
            named_topics.append(topic)

        return named_topics

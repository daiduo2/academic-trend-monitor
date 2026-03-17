"""Optimized hierarchy builder with batch name generation."""
import json
from typing import List, Dict
from collections import defaultdict
from pipeline.utils.llm_client import LLMClient
import yaml

class CoarseClusterer:
    """Cluster topics by arXiv category."""
    
    def __init__(self):
        from pipeline.utils.config import get_categories
        self.categories = get_categories()
    
    def cluster_by_category(self, topics: List[Dict]) -> Dict[str, List[Dict]]:
        """Group topics by their primary arXiv category."""
        clusters = defaultdict(list)
        
        for topic in topics:
            rep_docs = topic.get("representative_docs", [])
            if not rep_docs:
                continue
            
            primary_cat = rep_docs[0].get("primary_category", "")
            
            if primary_cat in self.categories:
                clusters[primary_cat].append(topic)
            else:
                parent = primary_cat.split(".")[0]
                if parent == "cs":
                    clusters["cs.AI"].append(topic)
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
    
    def generate_topic_names_batch(self, topics: List[Dict], batch_size: int = 10) -> List[Dict]:
        """Generate names for topics in batches (optimized)."""
        prompt_template = self.prompts.get("topic_name_generation", "")
        
        named_topics = []
        
        # Process in batches
        for i in range(0, len(topics), batch_size):
            batch = topics[i:i+batch_size]
            
            # Build batch prompt
            batch_prompt = "为以下研究主题生成中文名称（每个不超过10个字）：\n\n"
            for idx, topic in enumerate(batch):
                keywords = ", ".join(topic["keywords"][:5])
                batch_prompt += f"{idx+1}. 关键词: {keywords}\n"
            
            batch_prompt += "\n请按编号返回名称，每行一个：\n1. xxx\n2. xxx\n..."
            
            try:
                response = self.llm.complete(batch_prompt, temperature=0.3, max_tokens=200)
                
                # Parse response
                names = self._parse_batch_response(response, len(batch))
                
                # Assign names
                for topic, name in zip(batch, names):
                    topic["name"] = name if name else f"主题_{topic['topic_id']}"
                    named_topics.append(topic)
                    
            except Exception as e:
                print(f"  Batch error: {e}, using fallback names")
                for topic in batch:
                    topic["name"] = f"主题_{topic['topic_id']}"
                    named_topics.append(topic)
        
        return named_topics
    
    def _parse_batch_response(self, response: str, expected_count: int) -> List[str]:
        """Parse batch response to extract names."""
        names = []
        lines = response.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            # Remove numbering like "1. " or "1) "
            if '. ' in line:
                line = line.split('. ', 1)[1]
            elif ') ' in line:
                line = line.split(') ', 1)[1]
            names.append(line[:20])  # Limit length
        
        # Pad if needed
        while len(names) < expected_count:
            names.append("")
        
        return names[:expected_count]
    
    def build_hierarchy(self, topics: List[Dict], category: str) -> Dict:
        """Build hierarchical structure for topics in a category."""
        topics_str = json.dumps(topics, ensure_ascii=False, indent=2)
        prompt_template = self.prompts.get("build_hierarchy", "")
        prompt = prompt_template.format(category=category, topics=topics_str)
        
        result = self.llm.complete_json(prompt)
        return result

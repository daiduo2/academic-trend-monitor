# Academic Trend Monitor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a BERTopic + LLM powered academic trend analysis dashboard with hierarchical topic modeling and GitHub Pages deployment.

**Architecture:** Monthly data pipeline processes arXiv JSONL files through BERTopic for flat topic extraction, then LLM for hierarchical structuring and cross-month alignment. Static JSON output is visualized by a React + D3.js frontend deployed to GitHub Pages.

**Tech Stack:** Python (BERTopic, OpenAI), React 18, D3.js, Vite, Tailwind CSS, GitHub Actions

---

## Prerequisites

Before starting, copy data from original project:
```bash
cp ~/arxiv-trend-monitor/data/raw/*.jsonl ~/academic-trend-monitor/data/raw/
```

---

## Phase 1: Data Pipeline Foundation

### Task 1: Data Loading Utilities

**Files:**
- Create: `pipeline/utils/data_loader.py`
- Create: `tests/utils/test_data_loader.py`

**Step 1: Write the failing test**

```python
import pytest
from pipeline.utils.data_loader import load_monthly_data

def test_load_monthly_data_returns_list():
    result = load_monthly_data("2025-02")
    assert isinstance(result, list)
    assert len(result) > 0

def test_load_monthly_data_has_required_fields():
    result = load_monthly_data("2025-02")
    first_doc = result[0]
    assert "id" in first_doc
    assert "title" in first_doc
    assert "abstract" in first_doc
    assert "categories" in first_doc
```

**Step 2: Run test to verify it fails**
```bash
cd ~/academic-trend-monitor
pytest tests/utils/test_data_loader.py -v
```
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Write minimal implementation**

```python
# pipeline/utils/data_loader.py
import json
from pathlib import Path

def load_monthly_data(period: str) -> list[dict]:
    """Load raw arXiv data for a given period (YYYY-MM)."""
    data_path = Path("data/raw") / f"{period}.jsonl"
    
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    documents = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            doc = json.loads(line.strip())
            documents.append({
                "id": doc["id"],
                "title": doc["title"],
                "abstract": doc["abstract"],
                "categories": doc["categories"],
                "primary_category": doc.get("primary_category", doc["categories"][0] if doc["categories"] else ""),
                "created": doc["created"]
            })
    
    return documents

def get_available_periods() -> list[str]:
    """Get list of available data periods."""
    raw_dir = Path("data/raw")
    if not raw_dir.exists():
        return []
    
    periods = []
    for f in sorted(raw_dir.glob("*.jsonl")):
        periods.append(f.stem)
    return periods
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/utils/test_data_loader.py -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/utils/test_data_loader.py pipeline/utils/data_loader.py
git commit -m "feat: add data loading utilities"
```

**After completion:** Call `/geb-docs` to update documentation

---

### Task 2: Configuration Loader

**Files:**
- Create: `pipeline/utils/config.py`
- Create: `tests/utils/test_config.py`

**Step 1: Write the failing test**

```python
import pytest
from pipeline.utils.config import load_config, get_llm_config

def test_load_config_returns_dict():
    config = load_config()
    assert isinstance(config, dict)
    assert "llm" in config
    assert "topic_modeling" in config

def test_get_llm_config():
    llm_config = get_llm_config()
    assert "provider" in llm_config
    assert "model" in llm_config
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/utils/test_config.py -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/utils/config.py
import os
import yaml
from pathlib import Path

def load_config() -> dict:
    """Load configuration from config/settings.yaml."""
    config_path = Path("config/settings.yaml")
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    
    # Override with environment variables
    if os.getenv("LLM_API_KEY"):
        config["llm"]["api_key"] = os.getenv("LLM_API_KEY")
    
    return config

def get_llm_config() -> dict:
    """Get LLM configuration."""
    return load_config()["llm"]

def get_topic_modeling_config() -> dict:
    """Get topic modeling configuration."""
    return load_config()["topic_modeling"]

def get_categories() -> dict:
    """Get arXiv categories mapping."""
    return load_config()["categories"]
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/utils/test_config.py -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/utils/test_config.py pipeline/utils/config.py
git commit -m "feat: add configuration loader"
```

**After completion:** Call `/geb-docs`

---

### Task 3: LLM Client

**Files:**
- Create: `pipeline/utils/llm_client.py`
- Create: `tests/utils/test_llm_client.py`

**Step 1: Write the failing test**

```python
import pytest
from unittest.mock import patch, MagicMock
from pipeline.utils.llm_client import LLMClient

def test_llm_client_initialization():
    client = LLMClient()
    assert client.provider == "deepseek"

def test_llm_client_complete():
    with patch("pipeline.utils.llm_client.OpenAI") as mock_openai:
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content='{"result": "test"}'))
        ]
        
        client = LLMClient()
        result = client.complete("Test prompt")
        assert result == '{"result": "test"}'
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/utils/test_llm_client.py -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/utils/llm_client.py
import os
from openai import OpenAI
from pipeline.utils.config import get_llm_config

class LLMClient:
    """LLM client for calling DeepSeek API."""
    
    def __init__(self):
        config = get_llm_config()
        self.provider = config["provider"]
        self.model = config["model"]
        self.base_url = config["base_url"]
        self.api_key = config.get("api_key") or os.getenv("LLM_API_KEY")
        
        if not self.api_key:
            raise ValueError("LLM API key not configured")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
    
    def complete(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> str:
        """Call LLM with prompt and return response."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    def complete_json(self, prompt: str, temperature: float = 0.3) -> dict:
        """Call LLM and parse response as JSON."""
        response = self.complete(prompt, temperature)
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            import re
            json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            raise
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/utils/test_llm_client.py -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/utils/test_llm_client.py pipeline/utils/llm_client.py
git commit -m "feat: add LLM client"
```

**After completion:** Call `/geb-docs`

---

## Phase 2: BERTopic Modeling (01_bertopic.py)

### Task 4: Document Preprocessor

**Files:**
- Create: `pipeline/01_bertopic.py` (initial structure)
- Modify: `pipeline/01_bertopic.py` (add preprocessing)
- Create: `tests/test_bertopic.py`

**Step 1: Write the failing test**

```python
import pytest
from pipeline.bertopic_modeling import preprocess_documents

def test_preprocess_documents():
    docs = [
        {"id": "1", "title": "Test Title", "abstract": "Test abstract."},
        {"id": "2", "title": "Another Title", "abstract": "Another abstract."}
    ]
    
    result = preprocess_documents(docs)
    assert len(result) == 2
    assert result[0] == "Test Title. Test abstract."
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/test_bertopic.py -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/bertopic_modeling.py
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

def run_bertopic_for_period(period: str) -> Tuple[BERTopic, List[int], np.ndarray]:
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
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/test_bertopic.py::test_preprocess_documents -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/test_bertopic.py pipeline/bertopic_modeling.py
git commit -m "feat: add document preprocessing for BERTopic"
```

**After completion:** Call `/geb-docs`

---

### Task 5: BERTopic Runner Script

**Files:**
- Create: `pipeline/01_bertopic.py` (main script)
- Modify: `Makefile` (add bertopic target)

**Step 1: Create main script**

```python
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
                    {"id": d["id"], "title": d["title"]} for d in rep_docs
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
```

**Step 2: Make executable and test**
```bash
chmod +x pipeline/01_bertopic.py
python pipeline/01_bertopic.py
```
Expected: Runs and generates data/output/bertopic/*.json files

**Step 3: Commit**
```bash
git add pipeline/01_bertopic.py
git commit -m "feat: add BERTopic modeling script"
```

**After completion:** Call `/geb-docs`

---

## Phase 3: LLM Hierarchy Building (02_hierarchy.py)

### Task 6: Coarse Clustering by Category

**Files:**
- Create: `pipeline/hierarchy_builder.py`
- Create: `pipeline/02_hierarchy.py`
- Create: `tests/test_hierarchy.py`

**Step 1: Write the failing test**

```python
import pytest
from pipeline.hierarchy_builder import CoarseClusterer

def test_coarse_clusterer_groups_by_category():
    topics = [
        {"topic_id": 1, "keywords": ["neural", "network"], "representative_docs": [
            {"categories": ["cs.AI"], "primary_category": "cs.AI"}
        ]},
        {"topic_id": 2, "keywords": ["image", "classification"], "representative_docs": [
            {"categories": ["cs.CV"], "primary_category": "cs.CV"}
        ]}
    ]
    
    clusterer = CoarseClusterer()
    result = clusterer.cluster_by_category(topics)
    
    assert "cs.AI" in result
    assert "cs.CV" in result
    assert len(result["cs.AI"]) == 1
    assert result["cs.AI"][0]["topic_id"] == 1
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/test_hierarchy.py -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/hierarchy_builder.py
import json
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
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/test_hierarchy.py::test_coarse_clusterer_groups_by_category -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/test_hierarchy.py pipeline/hierarchy_builder.py
git commit -m "feat: add coarse clustering by category"
```

**After completion:** Call `/geb-docs`

---

### Task 7: LLM-Based Hierarchy Building

**Files:**
- Modify: `pipeline/hierarchy_builder.py` (add hierarchy building)
- Modify: `tests/test_hierarchy.py`

**Step 1: Write the failing test**

```python
def test_build_hierarchy():
    from unittest.mock import patch, MagicMock
    
    topics = [
        {"topic_id": 1, "keywords": ["neural", "network"], "name": "Neural Networks"},
        {"topic_id": 2, "keywords": ["cnn", "convolution"], "name": "CNN"},
        {"topic_id": 3, "keywords": ["transformer", "attention"], "name": "Transformer"}
    ]
    
    with patch("pipeline.hierarchy_builder.LLMClient") as mock_llm:
        mock_client = MagicMock()
        mock_llm.return_value = mock_client
        mock_client.complete_json.return_value = {
            "levels": [
                {"level": 3, "nodes": [{"id": "topic_1", "name": "Deep Learning", "children": ["topic_2", "topic_3"], "primary_parent": None}]}
            ]
        }
        
        builder = HierarchyBuilder()
        result = builder.build_hierarchy(topics, "cs.AI")
        
        assert "levels" in result
        assert len(result["levels"]) > 0
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/test_hierarchy.py::test_build_hierarchy -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# Add to pipeline/hierarchy_builder.py

import yaml

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
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/test_hierarchy.py::test_build_hierarchy -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/test_hierarchy.py pipeline/hierarchy_builder.py
git commit -m "feat: add LLM-based hierarchy building"
```

**After completion:** Call `/geb-docs`

---

### Task 8: Hierarchy Runner Script

**Files:**
- Create: `pipeline/02_hierarchy.py`

**Step 1: Create main script**

```python
#!/usr/bin/env python3
"""Hierarchy building script - Phase 2 of pipeline."""

import json
from pathlib import Path
from pipeline.hierarchy_builder import CoarseClusterer, HierarchyBuilder
from pipeline.utils.data_loader import get_available_periods

def main():
    """Build hierarchy for all periods."""
    output_dir = Path("data/output/hierarchy")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    bertopic_dir = Path("data/output/bertopic")
    
    periods = get_available_periods()
    
    for period in periods:
        print(f"\n{'='*60}")
        print(f"Building hierarchy for {period}...")
        print(f"{'='*60}")
        
        # Load BERTopic results
        bertopic_file = bertopic_dir / f"{period}.json"
        if not bertopic_file.exists():
            print(f"BERTopic results not found for {period}, skipping...")
            continue
        
        with open(bertopic_file, "r", encoding="utf-8") as f:
            bertopic_data = json.load(f)
        
        topics = bertopic_data["topics"]
        print(f"Processing {len(topics)} topics...")
        
        # Step 1: Generate names
        print("Generating topic names...")
        builder = HierarchyBuilder()
        named_topics = builder.generate_topic_names(topics)
        
        # Step 2: Coarse clustering by category
        print("Clustering by category...")
        clusterer = CoarseClusterer()
        category_clusters = clusterer.cluster_by_category(named_topics)
        
        print(f"Grouped into {len(category_clusters)} categories")
        
        # Step 3: Build hierarchy for each category
        all_hierarchies = {}
        for category, cat_topics in category_clusters.items():
            if len(cat_topics) < 2:
                continue
            
            print(f"  Building hierarchy for {category} ({len(cat_topics)} topics)...")
            hierarchy = builder.build_hierarchy(cat_topics, category)
            all_hierarchies[category] = hierarchy
        
        # Save results
        result = {
            "period": period,
            "topics": {f"topic_{t['topic_id']}": t for t in named_topics},
            "hierarchies": all_hierarchies
        }
        
        output_file = output_dir / f"{period}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"Saved hierarchy to {output_file}")

if __name__ == "__main__":
    main()
```

**Step 2: Make executable and test**
```bash
chmod +x pipeline/02_hierarchy.py
# Note: This requires LLM API key to run
export LLM_API_KEY=your_key
python pipeline/02_hierarchy.py
```

**Step 3: Commit**
```bash
git add pipeline/02_hierarchy.py
git commit -m "feat: add hierarchy building script"
```

**After completion:** Call `/geb-docs`

---

## Phase 4: Cross-Month Alignment (03_alignment.py)

### Task 9: Topic Alignment

**Files:**
- Create: `pipeline/topic_aligner.py`
- Create: `pipeline/03_alignment.py`
- Create: `tests/test_aligner.py`

**Step 1: Write the failing test**

```python
import pytest
from pipeline.topic_aligner import TopicAligner

def test_align_topics():
    from unittest.mock import patch, MagicMock
    
    prev_topics = {
        "topic_1": {"name": "Neural Networks", "keywords": ["neural", "network"]}
    }
    curr_topics = {
        "topic_2": {"name": "Deep Learning", "keywords": ["deep", "learning", "neural"]}
    }
    
    with patch("pipeline.topic_aligner.LLMClient") as mock_llm:
        mock_client = MagicMock()
        mock_llm.return_value = mock_client
        mock_client.complete_json.return_value = {
            "is_same_concept": True,
            "confidence": 0.85,
            "relationship": "same",
            "suggested_name": "Neural Networks"
        }
        
        aligner = TopicAligner()
        result = aligner.align_topics(prev_topics, curr_topics)
        
        assert "topic_1" in result
        assert result["topic_1"]["next_id"] == "topic_2"
```

**Step 2: Run test to verify it fails**
```bash
pytest tests/test_aligner.py -v
```
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/topic_aligner.py
import json
from typing import Dict, List, Tuple
from pipeline.utils.llm_client import LLMClient
import yaml

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
```

**Step 4: Run test to verify it passes**
```bash
pytest tests/test_aligner.py::test_align_topics -v
```
Expected: PASS

**Step 5: Commit**
```bash
git add tests/test_aligner.py pipeline/topic_aligner.py
git commit -m "feat: add topic alignment"
```

**After completion:** Call `/geb-docs`

---

### Task 10: Alignment Runner and Final Export

**Files:**
- Create: `pipeline/03_alignment.py`

**Step 1: Create main script**

```python
#!/usr/bin/env python3
"""Topic alignment and final export script - Phase 3 of pipeline."""

import json
from pathlib import Path
from pipeline.topic_aligner import TopicAligner
from pipeline.utils.data_loader import get_available_periods

def main():
    """Align topics across all periods and export final data."""
    hierarchy_dir = Path("data/output/hierarchy")
    output_dir = Path("data/output")
    
    periods = get_available_periods()
    print(f"Loading hierarchy data for {len(periods)} periods...")
    
    # Load all hierarchy data
    all_data = {}
    for period in periods:
        hierarchy_file = hierarchy_dir / f"{period}.json"
        if not hierarchy_file.exists():
            print(f"Hierarchy not found for {period}, skipping...")
            continue
        
        with open(hierarchy_file, "r", encoding="utf-8") as f:
            all_data[period] = json.load(f)
    
    # Build trends
    print("Building trend data...")
    aligner = TopicAligner()
    trends = aligner.build_trend_data(all_data)
    
    # Build final tree structure
    print("Building tree structure...")
    latest_period = max(all_data.keys())
    latest_data = all_data[latest_period]
    
    # Build tree from hierarchies
    tree = build_tree_from_hierarchies(latest_data, trends)
    
    # Export topics_tree.json
    topics_tree = {
        "version": latest_period,
        "topics": latest_data["topics"],
        "tree": tree
    }
    
    with open(output_dir / "topics_tree.json", "w", encoding="utf-8") as f:
        json.dump(topics_tree, f, ensure_ascii=False, indent=2)
    
    print(f"Exported topics_tree.json")
    
    # Export trend_stats.json
    trend_stats = {"trends": trends}
    with open(output_dir / "trend_stats.json", "w", encoding="utf-8") as f:
        json.dump(trend_stats, f, ensure_ascii=False, indent=2)
    
    print(f"Exported trend_stats.json")
    print(f"Total topics with trend data: {len(trends)}")

def build_tree_from_hierarchies(latest_data: Dict, trends: Dict) -> Dict:
    """Build tree structure from hierarchies."""
    # This is a simplified version - full implementation would parse
    # the hierarchy levels and build proper tree
    
    from pipeline.utils.config import get_categories
    categories = get_categories()
    
    # Build root
    tree = {
        "id": "root",
        "name": "All Disciplines",
        "children": []
    }
    
    # Group by discipline
    disciplines = {}
    for topic_id, topic in latest_data["topics"].items():
        # Determine discipline from primary_category
        rep_docs = topic.get("representative_docs", [])
        if rep_docs:
            cat = rep_docs[0].get("primary_category", "")
            disc = cat.split(".")[0] if "." in cat else cat
            
            if disc not in disciplines:
                disciplines[disc] = {
                    "id": disc,
                    "name": disc.upper(),
                    "children": []
                }
            
            disciplines[disc]["children"].append({
                "id": topic_id,
                "name": topic.get("name", topic_id),
                "paper_count": topic.get("paper_count", 0),
                "children": []
            })
    
    tree["children"] = list(disciplines.values())
    return tree

if __name__ == "__main__":
    main()
```

**Step 2: Make executable**
```bash
chmod +x pipeline/03_alignment.py
```

**Step 3: Commit**
```bash
git add pipeline/03_alignment.py
git commit -m "feat: add alignment and export script"
```

**After completion:** Call `/geb-docs`

---

## Phase 5: Frontend Implementation

### Task 11: Data Loading Hook

**Files:**
- Create: `frontend/src/hooks/useData.js`

**Step 1: Write the hook**

```javascript
// frontend/src/hooks/useData.js
import { useState, useEffect } from 'react';

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        const [treeResponse, trendsResponse] = await Promise.all([
          fetch('/academic-trend-monitor/data/topics_tree.json'),
          fetch('/academic-trend-monitor/data/trend_stats.json')
        ]);
        
        if (!treeResponse.ok || !trendsResponse.ok) {
          throw new Error('Failed to load data');
        }
        
        const treeData = await treeResponse.json();
        const trendsData = await trendsResponse.json();
        
        setData({
          topics: treeData.topics,
          tree: treeData.tree,
          trends: trendsData.trends,
          version: treeData.version
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  return { data, loading, error };
}

export function useTopic(topicId) {
  const { data, loading, error } = useData();
  
  if (!data || loading) {
    return { topic: null, trend: null, loading, error };
  }
  
  const topic = data.topics[topicId];
  const trend = data.trends[topicId];
  
  return { topic, trend, loading, error };
}
```

**Step 2: Commit**
```bash
git add frontend/src/hooks/useData.js
git commit -m "feat: add data loading hook"
```

**After completion:** Call `/geb-docs`

---

### Task 12: Trend View Component

**Files:**
- Create: `frontend/src/views/TrendView.jsx`
- Create: `frontend/src/components/TrendChart.jsx`

**Step 1: Write TrendChart component**

```javascript
// frontend/src/components/TrendChart.jsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function TrendChart({ data, width = 800, height = 400 }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.period))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.paper_count) * 1.1])
      .range([innerHeight, 0]);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(y));

    // Line
    const line = d3.line()
      .x(d => x(d.period) + x.bandwidth() / 2)
      .y(d => y(d.paper_count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Dots
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.period) + x.bandwidth() / 2)
      .attr('cy', d => y(d.paper_count))
      .attr('r', 4)
      .attr('fill', '#3b82f6');

  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-white rounded-lg shadow"
    />
  );
}
```

**Step 2: Write TrendView**

```javascript
// frontend/src/views/TrendView.jsx
import { useState } from 'react';
import { useData } from '../hooks/useData';
import { TrendChart } from '../components/TrendChart';

export default function TrendView() {
  const { data, loading, error } = useData();
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;

  // Get disciplines
  const disciplines = ['all', ...new Set(
    Object.values(data.topics).map(t => {
      const cat = t.representative_docs?.[0]?.primary_category || '';
      return cat.split('.')[0];
    }).filter(Boolean)
  )];

  // Filter and sort trends
  const trendData = Object.entries(data.trends)
    .filter(([id, trend]) => {
      if (selectedDiscipline === 'all') return true;
      const topic = data.topics[id];
      const cat = topic?.representative_docs?.[0]?.primary_category || '';
      return cat.startsWith(selectedDiscipline);
    })
    .sort((a, b) => {
      const countA = a[1].history?.[a[1].history.length - 1]?.paper_count || 0;
      const countB = b[1].history?.[b[1].history.length - 1]?.paper_count || 0;
      return countB - countA;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium">学科筛选:</label>
        <select
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="all">全部</option>
          {disciplines.filter(d => d !== 'all').map(d => (
            <option key={d} value={d}>{d.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Trend List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trendData.map(([topicId, trend]) => (
          <div key={topicId} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">
              {trend.name || topicId}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              关键词: {trend.keywords?.slice(0, 5).join(', ')}
            </p>
            {trend.history && (
              <TrendChart
                data={trend.history}
                width={400}
                height={200}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add frontend/src/components/TrendChart.jsx frontend/src/views/TrendView.jsx
git commit -m "feat: add trend view with chart"
```

**After completion:** Call `/geb-docs`

---

### Task 13: Tree View Component

**Files:**
- Create: `frontend/src/views/TreeView.jsx`
- Create: `frontend/src/components/TreeNode.jsx`

**Step 1: Write TreeNode component**

```javascript
// frontend/src/components/TreeNode.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function TreeNode({ node, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        className="flex items-center py-2 cursor-pointer hover:bg-gray-50 rounded"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="mr-2 text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-2 w-4" />}
        
        <span className="font-medium">{node.name}</span>
        
        {node.paper_count && (
          <span className="ml-2 text-sm text-gray-500">
            ({node.paper_count}篇)
          </span>
        )}
        
        {!hasChildren && (
          <Link
            to={`/topic/${node.id}`}
            className="ml-4 text-blue-500 hover:text-blue-700 text-sm"
          >
            详情 →
          </Link>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div className="border-l border-gray-200 ml-2">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Write TreeView**

```javascript
// frontend/src/views/TreeView.jsx
import { useData } from '../hooks/useData';
import { TreeNode } from '../components/TreeNode';

export default function TreeView() {
  const { data, loading, error } = useData();

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">领域层次浏览</h2>
      <p className="text-gray-500 mb-6">
        点击节点展开/折叠，点击"详情"查看主题详情
      </p>
      
      {data.tree && (
        <TreeNode node={data.tree} />
      )}
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add frontend/src/components/TreeNode.jsx frontend/src/views/TreeView.jsx
git commit -m "feat: add tree view for hierarchical browsing"
```

**After completion:** Call `/geb-docs`

---

### Task 14: Topic Detail View

**Files:**
- Create: `frontend/src/views/TopicDetail.jsx`

**Step 1: Write TopicDetail**

```javascript
// frontend/src/views/TopicDetail.jsx
import { useParams, Link } from 'react-router-dom';
import { useTopic } from '../hooks/useData';
import { TrendChart } from '../components/TrendChart';

export default function TopicDetail() {
  const { topicId } = useParams();
  const { topic, trend, loading, error } = useTopic(topicId);

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>;
  if (!topic) return <div className="p-8 text-center">主题未找到</div>;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/tree"
        className="text-blue-500 hover:text-blue-700"
      >
        ← 返回领域浏览
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2">{topic.name || topicId}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>论文数: {topic.paper_count}</span>
          <span>月份: {topic.period}</span>
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">关键词</h2>
        <div className="flex flex-wrap gap-2">
          {topic.keywords?.map((kw, i) => (
            <span
              key={i}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      {trend?.history && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">趋势分析</h2>
          <TrendChart data={trend.history} width={700} height={300} />
        </div>
      )}

      {/* Representative Papers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">代表性论文</h2>
        <div className="space-y-3">
          {topic.representative_docs?.map((doc, i) => (
            <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-medium">{doc.title}</p>
              <p className="text-sm text-gray-500">ID: {doc.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add frontend/src/views/TopicDetail.jsx
git commit -m "feat: add topic detail view"
```

**After completion:** Call `/geb-docs`

---

### Task 15: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      
      - name: Copy data files
        run: |
          mkdir -p frontend/public/data
          cp data/output/*.json frontend/public/data/ || echo "No data files yet"
      
      - name: Build
        run: |
          cd frontend
          npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deployment workflow"
```

**After completion:** Call `/geb-docs`

---

## Final Integration

### Task 16: Complete Makefile

**Files:**
- Modify: `Makefile`

**Step 1: Update Makefile**

```makefile
.PHONY: help pipeline deploy clean install test frontend-install

help:
	@echo "Academic Trend Monitor - 可用命令:"
	@echo ""
	@echo "  make install          - 安装 Python 依赖"
	@echo "  make frontend-install - 安装前端依赖"
	@echo "  make test             - 运行测试"
	@echo "  make pipeline         - 运行完整数据处理流水线"
	@echo "  make deploy           - 本地构建并部署到 GitHub Pages"
	@echo "  make clean            - 清理生成的数据"
	@echo ""

install:
	pip install -r requirements.txt

frontend-install:
	cd frontend && npm install

test:
	pytest tests/ -v

pipeline:
	@echo "运行数据处理流水线..."
	@echo "Step 1/3: BERTopic modeling..."
	python pipeline/01_bertopic.py
	@echo "Step 2/3: Building hierarchy..."
	python pipeline/02_hierarchy.py
	@echo "Step 3/3: Aligning topics..."
	python pipeline/03_alignment.py
	@echo "流水线完成，数据已生成到 data/output/"

deploy:
	@echo "构建前端并部署..."
	@mkdir -p frontend/public/data
	@cp data/output/*.json frontend/public/data/
	cd frontend && npm run build
	@echo "构建完成。请推送代码触发 GitHub Actions 自动部署。"
	@echo "或手动部署: cd frontend && npm run deploy"

clean:
	@echo "清理生成的数据..."
	rm -rf data/output/*.json
	rm -rf data/output/bertopic/*
	rm -rf data/output/hierarchy/*
	rm -rf pipeline/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	@echo "清理完成"
```

**Step 2: Commit**
```bash
git add Makefile
git commit -m "chore: complete Makefile with all commands"
```

**After completion:** Call `/geb-docs`

---

## Summary

This implementation plan includes:

1. **Phase 1**: Data pipeline foundation (data loading, config, LLM client)
2. **Phase 2**: BERTopic modeling with monthly processing
3. **Phase 3**: LLM-based hierarchy building with dynamic depth
4. **Phase 4**: Cross-month topic alignment and trend data generation
5. **Phase 5**: React frontend with D3.js visualizations
6. **Phase 6**: GitHub Actions deployment

Each task follows TDD principles with specific test steps and commits.

**Plan complete and saved to `docs/plans/2026-03-04-implementation.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you prefer?

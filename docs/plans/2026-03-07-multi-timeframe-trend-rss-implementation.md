# 多时间粒度趋势分析与 RSS 订阅系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现日度 RSS 订阅、周度趋势分析功能，支持用户在前端选择感兴趣的主题标签并生成个性化 RSS Feed

**Architecture:** 三层时间粒度系统 (日度/周度 GitHub Actions + 月度本地建模)，精简数据格式存储，纯前端 RSS 生成

**Tech Stack:** Python, BERTopic, FAISS, GitHub Actions, React, LocalStorage

---

## 前置准备

### 检查当前项目结构

```bash
ls -la /Users/daiduo2/claude-code-offline/academic-trend-monitor/
# 确认: pipeline/, frontend/, config/, data/ 目录存在
```

---

## Phase 1: 数据存储与格式基础

### Task 1: 创建精简数据格式工具

**Files:**
- Create: `pipeline/utils/compact_format.py`
- Create: `tests/test_compact_format.py`

**Step 1: Write the failing test**

```python
# tests/test_compact_format.py
def test_compact_paper_format():
    from pipeline.utils.compact_format import compact_paper

    paper = {
        "id": "2503.12345",
        "title": "Test Paper Title",
        "authors": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "primary_category": "cs.AI",
        "published": "2025-03-07T10:30:00Z",
        "tags": [5, 12]
    }

    result = compact_paper(paper)

    assert result == {
        "i": "2503.12345",
        "t": "Test Paper Title",
        "a": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "c": "AI",
        "p": "250307",
        "g": [5, 12]
    }

def test_compact_truncate_authors():
    from pipeline.utils.compact_format import compact_paper

    paper = {
        "id": "2503.12345",
        "title": "Test",
        "authors": ["A", "B", "C", "D", "E"],
        "primary_category": "cs.CV",
        "published": "2025-03-07T10:30:00Z",
        "tags": []
    }

    result = compact_paper(paper)

    assert result["a"] == ["A", "B", "C"]
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_compact_format.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'pipeline.utils'"

**Step 3: Write minimal implementation**

```python
# pipeline/utils/__init__.py
# Empty file

# pipeline/utils/compact_format.py
CATEGORY_MAP = {
    "cs.AI": "AI",
    "cs.CV": "CV",
    "cs.CL": "CL",
    "cs.LG": "LG",
    "cs.RO": "RO",
    "cs.DB": "DB",
    "cs.CR": "CR",
    "cs.DS": "DS",
    "cs.GT": "GT",
    "cs.HC": "HC",
    "cs.IR": "IR",
    "cs.MA": "MA",
    "cs.MM": "MM",
    "cs.NE": "NE",
    "cs.OS": "OS",
    "cs.PF": "PF",
    "cs.PL": "PL",
    "cs.SE": "SE",
    "cs.SC": "SC",
    "cs.SD": "SD",
    "cs.SY": "SY",
}

def compact_paper(paper: dict) -> dict:
    """Convert full paper metadata to compact format."""
    category = paper.get("primary_category", "")
    cat_code = CATEGORY_MAP.get(category, category.split(".")[0] if "." in category else category)

    published = paper.get("published", "")
    if "T" in published:
        date_str = published.split("T")[0].replace("-", "")[2:]  # 250307
    else:
        date_str = published.replace("-", "")[2:]

    return {
        "i": paper["id"],
        "t": paper["title"],
        "a": paper.get("authors", [])[:3],
        "c": cat_code,
        "p": date_str,
        "g": paper.get("tags", [])
    }
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_compact_format.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/utils/ tests/test_compact_format.py
git commit -m "feat: add compact paper format utilities"
```

---

### Task 2: 创建主题向量索引

**Files:**
- Create: `pipeline/build_topic_index.py`
- Create: `tests/test_topic_index.py`

**Step 1: Write the failing test**

```python
# tests/test_topic_index.py
import json
import tempfile
import os

def test_build_topic_index():
    from pipeline.build_topic_index import build_topic_index

    topics = {
        "topic_0": {
            "name": "Test Topic",
            "keywords": ["test", "example"],
            "representative_docs": [{"title": "Test Doc", "abstract": "Test abstract"}]
        }
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = os.path.join(tmpdir, "index")

        result = build_topic_index(topics, output_path)

        assert os.path.exists(f"{output_path}.json")
        assert os.path.exists(f"{output_path}.faiss")
        assert result["count"] == 1
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_topic_index.py -v`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
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
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_topic_index.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/build_topic_index.py tests/test_topic_index.py
git commit -m "feat: add topic vector index builder"
```

---

## Phase 2: 日度更新流水线

### Task 3: 创建日度文献获取脚本

**Files:**
- Create: `pipeline/daily_fetch.py`
- Create: `tests/test_daily_fetch.py`

**Step 1: Write the failing test**

```python
# tests/test_daily_fetch.py
from datetime import datetime, timedelta
import json

def test_get_date_range():
    from pipeline.daily_fetch import get_date_range

    start, end = get_date_range(days=7)

    assert len(start) == 10  # YYYY-MM-DD
    assert len(end) == 10

    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")

    assert (end_date - start_date).days == 7
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_daily_fetch.py::test_get_date_range -v`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/daily_fetch.py
from datetime import datetime, timedelta
from typing import Tuple


def get_date_range(days: int = 1) -> Tuple[str, str]:
    """Get date range for fetching papers."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    return (
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d")
    )


def fetch_arxiv_papers(start_date: str, end_date: str, categories: list = None) -> list:
    """Fetch papers from arXiv API."""
    # This will be implemented with actual arXiv API calls
    # For now, return empty list as placeholder
    return []


if __name__ == "__main__":
    import sys

    days = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    start, end = get_date_range(days)
    print(f"Fetching papers from {start} to {end}")

    papers = fetch_arxiv_papers(start, end)
    print(f"Fetched {len(papers)} papers")
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_daily_fetch.py::test_get_date_range -v`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/daily_fetch.py tests/test_daily_fetch.py
git commit -m "feat: add daily fetch skeleton"
```

---

### Task 4: 创建文献标签匹配脚本

**Files:**
- Create: `pipeline/tag_papers.py`
- Create: `tests/test_tag_papers.py`

**Step 1: Write the failing test**

```python
# tests/test_tag_papers.py
import numpy as np

def test_tag_paper_with_mock_index():
    from pipeline.tag_papers import tag_paper

    paper = {
        "title": "Large Language Model Alignment with RLHF",
        "abstract": "We propose a method for aligning LLMs using human feedback"
    }

    # Mock topic IDs
    topic_ids = ["topic_0", "topic_1", "topic_2"]

    # This test will use mock embeddings
    result = tag_paper(paper, topic_ids, threshold=0.6)

    assert "tags" in result
    assert "scores" in result
    assert isinstance(result["tags"], list)
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_tag_papers.py -v`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
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
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_tag_papers.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/tag_papers.py tests/test_tag_papers.py
git commit -m "feat: add paper tagging with vector matching"
```

---

### Task 5: 创建日度更新主脚本

**Files:**
- Create: `pipeline/daily_update.py`
- Modify: `.github/workflows/daily.yml` (Create if not exists)

**Step 1: Create GitHub Actions workflow**

```yaml
# .github/workflows/daily.yml
name: Daily Paper Update

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt

    - name: Run daily update
      run: |
        python pipeline/daily_update.py
      env:
        LLM_API_KEY: ${{ secrets.LLM_API_KEY }}

    - name: Commit and push
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add data/recent.jsonl
        git diff --staged --quiet || git commit -m "daily: update papers"
        git push
```

**Step 2: Write daily update script**

```python
# pipeline/daily_update.py
"""Daily update script for fetching and tagging new papers."""
import json
import os
from datetime import datetime
from pathlib import Path

from daily_fetch import get_date_range, fetch_arxiv_papers
from tag_papers import tag_papers
from utils.compact_format import compact_paper


def load_recent_papers(filepath: str, days: int = 7) -> list:
    """Load recent papers from JSONL file."""
    papers = []
    cutoff_date = datetime.now() - __import__('datetime').timedelta(days=days)

    if not os.path.exists(filepath):
        return papers

    with open(filepath) as f:
        for line in f:
            paper = json.loads(line.strip())
            # Parse compact date format YYMMDD
            paper_date = datetime.strptime("20" + paper["p"], "%Y%m%d")
            if paper_date >= cutoff_date:
                papers.append(paper)

    return papers


def save_recent_papers(papers: list, filepath: str):
    """Save papers to JSONL file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "w") as f:
        for paper in papers:
            f.write(json.dumps(paper, ensure_ascii=False) + "\n")


def main():
    data_dir = Path("data")
    recent_file = data_dir / "recent.jsonl"
    index_path = data_dir / "output" / "topic_index"

    # Fetch new papers
    start, end = get_date_range(days=1)
    print(f"Fetching papers from {start} to {end}")

    new_papers = fetch_arxiv_papers(start, end)
    print(f"Fetched {len(new_papers)} new papers")

    if not new_papers:
        print("No new papers to process")
        return

    # Tag papers
    print("Tagging papers...")
    tagged_papers = tag_papers(new_papers, str(index_path))

    # Convert to compact format
    compact_papers = [compact_paper(p) for p in tagged_papers]

    # Load existing recent papers
    existing_papers = load_recent_papers(str(recent_file), days=7)

    # Merge and deduplicate
    paper_ids = {p["i"] for p in existing_papers}
    for paper in compact_papers:
        if paper["i"] not in paper_ids:
            existing_papers.append(paper)
            paper_ids.add(paper["i"])

    # Sort by date (newest first)
    existing_papers.sort(key=lambda p: p["p"], reverse=True)

    # Keep only last 7 days
    cutoff = (datetime.now() - __import__('datetime').timedelta(days=7)).strftime("%y%m%d")
    existing_papers = [p for p in existing_papers if p["p"] >= cutoff]

    # Save
    save_recent_papers(existing_papers, str(recent_file))
    print(f"Saved {len(existing_papers)} papers to {recent_file}")


if __name__ == "__main__":
    main()
```

**Step 3: Commit**

```bash
git add .github/workflows/daily.yml pipeline/daily_update.py
git commit -m "feat: add daily update workflow and script"
```

---

## Phase 3: 周度趋势分析

### Task 6: 创建周度趋势分析脚本

**Files:**
- Create: `pipeline/weekly_trend.py`
- Create: `tests/test_weekly_trend.py`
- Create: `.github/workflows/weekly.yml`

**Step 1: Write the failing test**

```python
# tests/test_weekly_trend.py
import json
from datetime import datetime

def test_calculate_trend():
    from pipeline.weekly_trend import calculate_trend

    current = 100
    previous = 80

    trend = calculate_trend(current, previous)

    assert trend["change"] == 20
    assert trend["percent"] == 25.0
    assert trend["direction"] == "up"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_weekly_trend.py -v`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/weekly_trend.py
import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict


def calculate_trend(current: int, previous: int) -> dict:
    """Calculate trend statistics."""
    change = current - previous

    if previous == 0:
        percent = 100.0 if current > 0 else 0.0
    else:
        percent = (change / previous) * 100

    if change > 0:
        direction = "up"
    elif change < 0:
        direction = "down"
    else:
        direction = "stable"

    return {
        "change": change,
        "percent": round(percent, 1),
        "direction": direction
    }


def analyze_weekly_trends(recent_file: str, topics_file: str) -> dict:
    """Analyze weekly trends from recent papers."""
    # Load papers
    papers = []
    with open(recent_file) as f:
        for line in f:
            papers.append(json.loads(line.strip()))

    # Load topics
    with open(topics_file) as f:
        topics_data = json.load(f)
        topics = topics_data.get("topics", {})

    # Get date ranges
    today = datetime.now()
    this_week_start = (today - timedelta(days=today.weekday())).strftime("%y%m%d")
    last_week_start = (today - timedelta(days=today.weekday() + 7)).strftime("%y%m%d")

    # Count papers per tag for each week
    this_week_counts = defaultdict(int)
    last_week_counts = defaultdict(int)

    for paper in papers:
        paper_date = paper["p"]
        tags = paper.get("g", [])

        for tag in tags:
            tag_id = str(tag)
            if paper_date >= this_week_start:
                this_week_counts[tag_id] += 1
            elif paper_date >= last_week_start:
                last_week_counts[tag_id] += 1

    # Build trend report
    report = {
        "week": today.strftime("%Y-W%W"),
        "generated_at": today.isoformat(),
        "total_papers": len(papers),
        "trends": []
    }

    all_tags = set(this_week_counts.keys()) | set(last_week_counts.keys())

    for tag_id in all_tags:
        this_count = this_week_counts.get(tag_id, 0)
        last_count = last_week_counts.get(tag_id, 0)

        topic_info = topics.get(tag_id, {})

        trend = calculate_trend(this_count, last_count)

        report["trends"].append({
            "topic_id": tag_id,
            "topic_name": topic_info.get("n", f"Topic {tag_id}"),
            "category": topic_info.get("p", "Unknown"),
            "this_week": this_count,
            "last_week": last_count,
            "trend": trend
        })

    # Sort by this week's count (descending)
    report["trends"].sort(key=lambda x: x["this_week"], reverse=True)

    return report


def main():
    data_dir = Path("data")
    recent_file = data_dir / "recent.jsonl"
    topics_file = data_dir / "output" / "topics.json"
    output_file = data_dir / "weekly" / f"{datetime.now().strftime('%Y-W%W')}.json"

    print("Analyzing weekly trends...")
    report = analyze_weekly_trends(str(recent_file), str(topics_file))

    # Save report
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Saved weekly report to {output_file}")
    print(f"Total topics: {len(report['trends'])}")
    print(f"Total papers this week: {sum(t['this_week'] for t in report['trends'])}")


if __name__ == "__main__":
    main()
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_weekly_trend.py -v`
Expected: PASS

**Step 5: Create weekly workflow**

```yaml
# .github/workflows/weekly.yml
name: Weekly Trend Analysis

on:
  schedule:
    - cron: '0 3 * * 0'  # Sundays at 3 AM UTC
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt

    - name: Run weekly analysis
      run: |
        python pipeline/weekly_trend.py

    - name: Commit and push
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add data/weekly/
        git diff --staged --quiet || git commit -m "weekly: update trend analysis"
        git push
```

**Step 6: Commit**

```bash
git add pipeline/weekly_trend.py tests/test_weekly_trend.py .github/workflows/weekly.yml
git commit -m "feat: add weekly trend analysis"
```

---

## Phase 4: 前端 RSS 订阅页面

### Task 7: 创建前端数据类型定义

**Files:**
- Create: `frontend/src/types/rss.ts`

```typescript
// frontend/src/types/rss.ts

export interface CompactPaper {
  i: string;    // id
  t: string;    // title
  a: string[];  // authors (max 3)
  c: string;    // category code
  p: string;    // published date (YYMMDD)
  g: number[];  // topic tags
}

export interface CompactTopic {
  n: string;    // name
  k: string[];  // keywords
  l: number;    // layer
  p: string;    // parent category code
}

export interface TopicIndex {
  version: string;
  topics: Record<string, CompactTopic>;
  categories: Record<string, string>;
}

export interface WeeklyTrend {
  topic_id: string;
  topic_name: string;
  category: string;
  this_week: number;
  last_week: number;
  trend: {
    change: number;
    percent: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface WeeklyReport {
  week: string;
  generated_at: string;
  total_papers: number;
  trends: WeeklyTrend[];
}

export interface UserPreferences {
  subscribedTags: string[];
  rssFormat: 'atom' | 'json';
  minScore: number;
  digestMode: 'daily' | 'realtime';
  lastSync: string;
}

export interface RSSEntry {
  id: string;
  title: string;
  authors: string[];
  category: string;
  published: string;
  tags: string[];
  link: string;
}
```

**Commit:**

```bash
git add frontend/src/types/rss.ts
git commit -m "feat: add RSS types"
```

---

### Task 8: 创建数据加载 Hooks

**Files:**
- Create: `frontend/src/hooks/useTopics.ts`
- Create: `frontend/src/hooks/useRecentPapers.ts`
- Create: `frontend/src/hooks/useWeeklyTrends.ts`

**Step 1: useTopics hook**

```typescript
// frontend/src/hooks/useTopics.ts
import { useState, useEffect } from 'react';
import type { TopicIndex } from '../types/rss';

export function useTopics() {
  const [topics, setTopics] = useState<TopicIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/output/topics.json')
      .then(res => res.json())
      .then((data: TopicIndex) => {
        setTopics(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { topics, loading, error };
}
```

**Step 2: useRecentPapers hook**

```typescript
// frontend/src/hooks/useRecentPapers.ts
import { useState, useEffect } from 'react';
import type { CompactPaper } from '../types/rss';

export function useRecentPapers() {
  const [papers, setPapers] = useState<CompactPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/recent.jsonl')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const parsed = lines.map(line => JSON.parse(line));
        setPapers(parsed);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { papers, loading, error };
}
```

**Step 3: useWeeklyTrends hook**

```typescript
// frontend/src/hooks/useWeeklyTrends.ts
import { useState, useEffect } from 'react';
import type { WeeklyReport } from '../types/rss';

function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export function useWeeklyTrends() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const week = getCurrentWeek();
    fetch(`/data/weekly/${week}.json`)
      .then(res => res.json())
      .then((data: WeeklyReport) => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { report, loading, error };
}
```

**Step 4: Commit**

```bash
git add frontend/src/hooks/useTopics.ts frontend/src/hooks/useRecentPapers.ts frontend/src/hooks/useWeeklyTrends.ts
git commit -m "feat: add RSS data loading hooks"
```

---

### Task 9: 创建用户偏好存储 Hook

**Files:**
- Create: `frontend/src/hooks/usePreferences.ts`

```typescript
// frontend/src/hooks/usePreferences.ts
import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences } from '../types/rss';

const STORAGE_KEY = 'academic-trend-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  subscribedTags: [],
  rssFormat: 'atom',
  minScore: 0.6,
  digestMode: 'daily',
  lastSync: new Date().toISOString(),
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch {
        console.error('Failed to parse preferences');
      }
    }
    setLoaded(true);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, loaded]);

  const subscribeTag = useCallback((tagId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedTags: [...new Set([...prev.subscribedTags, tagId])],
      lastSync: new Date().toISOString(),
    }));
  }, []);

  const unsubscribeTag = useCallback((tagId: string) => {
    setPreferences(prev => ({
      ...prev,
      subscribedTags: prev.subscribedTags.filter(id => id !== tagId),
      lastSync: new Date().toISOString(),
    }));
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setPreferences(prev => {
      const isSubscribed = prev.subscribedTags.includes(tagId);
      return {
        ...prev,
        subscribedTags: isSubscribed
          ? prev.subscribedTags.filter(id => id !== tagId)
          : [...prev.subscribedTags, tagId],
        lastSync: new Date().toISOString(),
      };
    });
  }, []);

  const updateFormat = useCallback((format: 'atom' | 'json') => {
    setPreferences(prev => ({ ...prev, rssFormat: format }));
  }, []);

  const updateMinScore = useCallback((score: number) => {
    setPreferences(prev => ({ ...prev, minScore: score }));
  }, []);

  return {
    preferences,
    loaded,
    subscribeTag,
    unsubscribeTag,
    toggleTag,
    updateFormat,
    updateMinScore,
  };
}
```

**Commit:**

```bash
git add frontend/src/hooks/usePreferences.ts
git commit -m "feat: add user preferences hook with LocalStorage"
```

---

### Task 10: 创建 RSS 生成器

**Files:**
- Create: `frontend/src/utils/rssGenerator.ts`
- Create: `frontend/src/utils/__tests__/rssGenerator.test.ts`

**Step 1: Write the test**

```typescript
// frontend/src/utils/__tests__/rssGenerator.test.ts
import { generateAtomFeed, generateJSONFeed } from '../rssGenerator';
import type { CompactPaper, CompactTopic } from '../../types/rss';

describe('rssGenerator', () => {
  const mockPaper: CompactPaper = {
    i: '2503.12345',
    t: 'Test Paper Title',
    a: ['Alice', 'Bob'],
    c: 'AI',
    p: '250307',
    g: [5, 12],
  };

  const mockTopics: Record<string, CompactTopic> = {
    '5': { n: 'Test Topic', k: ['test'], l: 3, p: 'AI' },
  };

  test('generateAtomFeed creates valid XML', () => {
    const feed = generateAtomFeed([mockPaper], mockTopics);

    expect(feed).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('Test Paper Title');
    expect(feed).toContain('2503.12345');
  });

  test('generateJSONFeed creates valid JSON', () => {
    const feed = generateJSONFeed([mockPaper], mockTopics);
    const parsed = JSON.parse(feed);

    expect(parsed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].title).toBe('Test Paper Title');
  });
});
```

**Step 2: Implement RSS generator**

```typescript
// frontend/src/utils/rssGenerator.ts
import type { CompactPaper, CompactTopic, RSSEntry } from '../types/rss';

function formatDate(dateStr: string): string {
  // Convert YYMMDD to ISO date
  const year = '20' + dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4);
  const day = dateStr.slice(4, 6);
  return new Date(`${year}-${month}-${day}`).toISOString();
}

function paperToRSSEntry(paper: CompactPaper, topics: Record<string, CompactTopic>): RSSEntry {
  const categoryMap: Record<string, string> = {
    'AI': 'cs.AI',
    'CV': 'cs.CV',
    'CL': 'cs.CL',
    'LG': 'cs.LG',
  };

  return {
    id: paper.i,
    title: paper.t,
    authors: paper.a,
    category: categoryMap[paper.c] || `cs.${paper.c}`,
    published: formatDate(paper.p),
    tags: paper.g.map(tagId => topics[tagId]?.n || `Topic ${tagId}`),
    link: `https://arxiv.org/abs/${paper.i}`,
  };
}

export function generateAtomFeed(
  papers: CompactPaper[],
  topics: Record<string, CompactTopic>,
  options: { title?: string; description?: string } = {}
): string {
  const { title = 'Academic Trend Monitor', description = 'Personalized Academic RSS Feed' } = options;
  const now = new Date().toISOString();

  const entries = papers.map(paper => {
    const entry = paperToRSSEntry(paper, topics);
    return `
    <entry>
      <title>${escapeXml(entry.title)}</title>
      <id>${entry.link}</id>
      <link href="${entry.link}" />
      <published>${entry.published}</published>
      <updated>${entry.published}</updated>
      <author>
        <name>${entry.authors.join(', ')}</name>
      </author>
      <category term="${entry.category}" />
      ${entry.tags.map(tag => `<category term="${escapeXml(tag)}" />`).join('\n      ')}
    </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="https://your-github-pages-url/rss.xml" rel="self" />
  <updated>${now}</updated>
  <id>urn:uuid:academic-trend-monitor</id>
  ${entries}
</feed>`;
}

export function generateJSONFeed(
  papers: CompactPaper[],
  topics: Record<string, CompactTopic>,
  options: { title?: string; description?: string } = {}
): string {
  const { title = 'Academic Trend Monitor', description = 'Personalized Academic RSS Feed' } = options;

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    description,
    home_page_url: 'https://your-github-pages-url',
    feed_url: 'https://your-github-pages-url/feed.json',
    items: papers.map(paper => {
      const entry = paperToRSSEntry(paper, topics);
      return {
        id: entry.id,
        title: entry.title,
        content_text: `Authors: ${entry.authors.join(', ')}\nCategories: ${entry.tags.join(', ')}`,
        url: entry.link,
        date_published: entry.published,
        authors: entry.authors.map(name => ({ name })),
        tags: entry.tags,
      };
    }),
  };

  return JSON.stringify(feed, null, 2);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadFeed(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
```

**Step 3: Run tests**

```bash
cd frontend && npm test -- rssGenerator.test.ts
```
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/utils/rssGenerator.ts frontend/src/utils/__tests__/rssGenerator.test.ts
git commit -m "feat: add RSS feed generator"
```

---

### Task 11: 创建标签选择器组件

**Files:**
- Create: `frontend/src/components/TagSelector.tsx`

```tsx
// frontend/src/components/TagSelector.tsx
import React, { useState, useMemo } from 'react';
import type { TopicIndex } from '../types/rss';

interface TagSelectorProps {
  topics: TopicIndex | null;
  subscribedTags: string[];
  onToggleTag: (tagId: string) => void;
  paperCounts?: Record<string, number>;
}

export function TagSelector({ topics, subscribedTags, onToggleTag, paperCounts }: TagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const groupedTopics = useMemo(() => {
    if (!topics) return {};

    const groups: Record<string, { code: string; topics: Array<{ id: string; name: string; count: number }> }> = {};

    Object.entries(topics.topics).forEach(([id, topic]) => {
      const catCode = topic.p;
      const catName = topics.categories[catCode] || catCode;

      if (!groups[catName]) {
        groups[catName] = { code: catCode, topics: [] };
      }

      groups[catName].topics.push({
        id,
        name: topic.n,
        count: paperCounts?.[id] || 0,
      });
    });

    // Sort topics by count within each category
    Object.values(groups).forEach(group => {
      group.topics.sort((a, b) => b.count - a.count);
    });

    return groups;
  }, [topics, paperCounts]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedTopics;

    const filtered: typeof groupedTopics = {};
    const lowerSearch = searchTerm.toLowerCase();

    Object.entries(groupedTopics).forEach(([catName, group]) => {
      const matchingTopics = group.topics.filter(
        t => t.name.toLowerCase().includes(lowerSearch) || t.id.includes(searchTerm)
      );
      if (matchingTopics.length > 0) {
        filtered[catName] = { ...group, topics: matchingTopics };
      }
    });

    return filtered;
  }, [groupedTopics, searchTerm]);

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  if (!topics) {
    return <div className="tag-selector loading">Loading topics...</div>;
  }

  return (
    <div className="tag-selector">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="categories">
        {Object.entries(filteredGroups).map(([catName, group]) => (
          <div key={catName} className="category">
            <button
              className="category-header"
              onClick={() => toggleCategory(catName)}
            >
              <span className="expand-icon">
                {expandedCategories.has(catName) ? '▼' : '▶'}
              </span>
              <span className="category-name">{catName}</span>
              <span className="category-code">({group.code})</span>
            </button>

            {expandedCategories.has(catName) && (
              <div className="topics">
                {group.topics.map(topic => {
                  const isSubscribed = subscribedTags.includes(topic.id);
                  return (
                    <label key={topic.id} className={`topic ${isSubscribed ? 'subscribed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSubscribed}
                        onChange={() => onToggleTag(topic.id)}
                      />
                      <span className="topic-name">{topic.name}</span>
                      <span className="topic-id">({topic.id})</span>
                      {topic.count > 0 && (
                        <span className="topic-count">{topic.count} papers/week</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="selection-summary">
        Selected: {subscribedTags.length} topics
      </div>
    </div>
  );
}
```

**Commit:**

```bash
git add frontend/src/components/TagSelector.tsx
git commit -m "feat: add TagSelector component"
```

---

### Task 12: 创建 RSS 订阅页面

**Files:**
- Create: `frontend/src/pages/RSSSubscription.tsx`

```tsx
// frontend/src/pages/RSSSubscription.tsx
import React, { useMemo } from 'react';
import { TagSelector } from '../components/TagSelector';
import { useTopics } from '../hooks/useTopics';
import { useRecentPapers } from '../hooks/useRecentPapers';
import { useWeeklyTrends } from '../hooks/useWeeklyTrends';
import { usePreferences } from '../hooks/usePreferences';
import { generateAtomFeed, generateJSONFeed, downloadFeed, copyToClipboard } from '../utils/rssGenerator';

export function RSSSubscription() {
  const { topics, loading: topicsLoading } = useTopics();
  const { papers, loading: papersLoading } = useRecentPapers();
  const { report: weeklyReport, loading: trendsLoading } = useWeeklyTrends();
  const { preferences, loaded: prefsLoaded, toggleTag, updateFormat } = usePreferences();

  // Calculate paper counts per topic
  const paperCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    papers.forEach(paper => {
      paper.g.forEach(tagId => {
        counts[tagId] = (counts[tagId] || 0) + 1;
      });
    });
    return counts;
  }, [papers]);

  // Filter papers by subscribed tags
  const filteredPapers = useMemo(() => {
    if (!preferences.subscribedTags.length) return [];
    return papers.filter(paper =>
      paper.g.some(tagId => preferences.subscribedTags.includes(String(tagId)))
    );
  }, [papers, preferences.subscribedTags]);

  const handleGenerateRSS = () => {
    if (!topics) return;

    const topicRecord = Object.entries(topics.topics).reduce((acc, [id, t]) => {
      acc[id] = t;
      return acc;
    }, {} as Record<string, typeof topics.topics[string]>);

    if (preferences.rssFormat === 'atom') {
      const feed = generateAtomFeed(filteredPapers, topicRecord);
      downloadFeed(feed, 'academic-trend-feed.xml', 'application/atom+xml');
    } else {
      const feed = generateJSONFeed(filteredPapers, topicRecord);
      downloadFeed(feed, 'academic-trend-feed.json', 'application/json');
    }
  };

  const handleCopyLink = async () => {
    // In a real implementation, this would generate a unique subscription URL
    await copyToClipboard('https://your-github-pages-url/api/rss?tags=' + preferences.subscribedTags.join(','));
    alert('Subscription link copied to clipboard!');
  };

  if (topicsLoading || papersLoading || trendsLoading || !prefsLoaded) {
    return <div className="rss-subscription loading">Loading...</div>;
  }

  return (
    <div className="rss-subscription">
      <header>
        <h1>Academic Trend RSS Subscription</h1>
        <p>Subscribe to personalized academic paper feeds based on your interests</p>
      </header>

      <div className="content">
        <section className="topic-selection">
          <h2>Select Topics</h2>
          <TagSelector
            topics={topics}
            subscribedTags={preferences.subscribedTags}
            onToggleTag={toggleTag}
            paperCounts={paperCounts}
          />
        </section>

        <section className="settings">
          <h2>Feed Settings</h2>

          <div className="setting">
            <label>RSS Format:</label>
            <select
              value={preferences.rssFormat}
              onChange={e => updateFormat(e.target.value as 'atom' | 'json')}
            >
              <option value="atom">Atom/XML (RSS Readers)</option>
              <option value="json">JSON Feed (Apps)</option>
            </select>
          </div>

          <div className="preview">
            <h3>Preview</h3>
            <p>Subscribed to: {preferences.subscribedTags.length} topics</p>
            <p>Matching papers (7 days): {filteredPapers.length}</p>
            {weeklyReport && (
              <p>Weekly trend: {weeklyReport.trends.filter(t => preferences.subscribedTags.includes(t.topic_id)).length} topics tracked</p>
            )}
          </div>

          <div className="actions">
            <button
              onClick={handleGenerateRSS}
              disabled={filteredPapers.length === 0}
              className="primary"
            >
              📥 Download Feed
            </button>
            <button
              onClick={handleCopyLink}
              disabled={preferences.subscribedTags.length === 0}
            >
              📋 Copy Subscription Link
            </button>
          </div>
        </section>

        {weeklyReport && (
          <section className="trends">
            <h2>Weekly Trends</h2>
            <div className="trend-list">
              {weeklyReport.trends
                .filter(t => preferences.subscribedTags.includes(t.topic_id))
                .slice(0, 10)
                .map(trend => (
                  <div key={trend.topic_id} className={`trend-item ${trend.trend.direction}`}>
                    <span className="topic-name">{trend.topic_name}</span>
                    <span className="counts">
                      {trend.this_week} this week
                      {trend.last_week > 0 && ` (${trend.trend.direction === 'up' ? '+' : ''}${trend.trend.percent}%)`}
                    </span>
                    <span className={`direction ${trend.trend.direction}`}>
                      {trend.trend.direction === 'up' ? '↑' : trend.trend.direction === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
```

**Commit:**

```bash
git add frontend/src/pages/RSSSubscription.tsx
git commit -m "feat: add RSS subscription page"
```

---

### Task 13: 添加路由和样式

**Files:**
- Modify: `frontend/src/App.tsx` (Add route)
- Create: `frontend/src/styles/rss.css`

**Step 1: Update App.tsx**

```tsx
// Add to frontend/src/App.tsx
import { RSSSubscription } from './pages/RSSSubscription';

// Add route
<Route path="/rss" element={<RSSSubscription />} />

// Add navigation link
<nav>
  <Link to="/">Dashboard</Link>
  <Link to="/rss">RSS Subscription</Link>
</nav>
```

**Step 2: Add basic styles**

```css
/* frontend/src/styles/rss.css */
.rss-subscription {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.rss-subscription header {
  text-align: center;
  margin-bottom: 30px;
}

.rss-subscription .content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.tag-selector {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.tag-selector .search-box input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 15px;
}

.category-header {
  width: 100%;
  text-align: left;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  cursor: pointer;
  margin-top: 5px;
}

.topic {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
}

.topic:hover {
  background: #f0f0f0;
}

.topic.subscribed {
  background: #e3f2fd;
}

.topic input {
  margin-right: 10px;
}

.topic-name {
  flex: 1;
}

.topic-id {
  color: #666;
  font-size: 0.85em;
  margin-left: 5px;
}

.topic-count {
  color: #888;
  font-size: 0.85em;
}

.settings {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions button.primary {
  background: #1976d2;
  color: white;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trend-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.trend-item.up .direction {
  color: green;
}

.trend-item.down .direction {
  color: red;
}
```

**Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/styles/rss.css
git commit -m "feat: integrate RSS page into app with routing and styles"
```

---

## Phase 5: 测试与部署

### Task 14: 完整流程测试

**Files:**
- Run tests: All pipeline and frontend tests

```bash
# Backend tests
cd /Users/daiduo2/claude-code-offline/academic-trend-monitor
pytest tests/ -v

# Frontend tests
cd frontend
npm test

# Build check
npm run build
```

**Commit:**

```bash
git add .
git commit -m "test: verify complete RSS subscription system"
```

---

### Task 15: 部署验证

**Files:**
- Verify: `.github/workflows/daily.yml`
- Verify: `.github/workflows/weekly.yml`

**Steps:**

1. Push to GitHub
```bash
git push origin main
```

2. Enable GitHub Actions
- Go to Repository Settings > Actions
- Enable workflows

3. Test manual trigger
- Go to Actions tab
- Run "Daily Paper Update" manually
- Verify `data/recent.jsonl` is updated

4. Test weekly workflow
- Schedule will run automatically on Sundays
- Or trigger manually for testing

---

## 后续优化

### 可选增强功能

1. **邮件订阅**: 使用 SendGrid/AWS SES 发送每日/每周摘要
2. **Web Push**: 浏览器推送通知新文献
3. **移动端适配**: 优化移动端 RSS 订阅体验
4. **主题推荐**: 基于用户订阅推荐相关主题
5. **协作过滤**: 相似用户的订阅推荐

### 监控与维护

- 监控 GitHub Actions 运行状态
- 定期检查数据文件大小
- 监控 GitHub Pages 带宽使用

---

*Plan created: 2026-03-07*
*Total Tasks: 15*
*Estimated Implementation Time: 4-6 hours*

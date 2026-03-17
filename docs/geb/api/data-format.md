<!-- docs/geb/api/data-format.md -->
@geb-leaf #api-data-format
@mirror ./data/output/final_topics.json
@loop #architecture
@loop #topic-hierarchy
@invariant "Schema matches actual output"
@invariant "All fields documented"
@emerge "update all refs on format change"
@reflect "on_data_change"

# 数据格式规范

## 输出文件

| 文件 | 路径 | 说明 |
|------|------|------|
| final_topics.json | `data/output/final_topics.json` | 主题数据 |
| timeline.json | `data/output/timeline.json` | 时间线数据 |

## 主题数据结构

```typescript
interface TopicData {
  // 基础信息
  id: string;           // 唯一标识: "{category}-{year}-{month}-{seq}"
  name: string;         // 主题名称
  layer: number;        // 层级 (1-4+)

  // 层次关系
  parent_id: string | null;     // 父节点ID
  children_ids: string[];       // 子节点ID列表
  related_paths: string[];      // 跨学科关联

  // 统计信息
  paper_count: number;          // 论文数量
  keywords: string[];           // 关键词

  // 时间序列
  timeline: TimelinePoint[];    // 跨月数据

  // 元数据
  description?: string;         // LLM生成的描述
  sample_papers: Paper[];       // 示例论文
}

interface TimelinePoint {
  month: string;        // "YYYY-MM"
  paper_count: number;  // 该月论文数
  trend: 'up' | 'down' | 'stable';  // 趋势
}

interface Paper {
  id: string;           // arXiv ID
  title: string;        // 论文标题
  authors: string[];    // 作者列表
  abstract: string;     // 摘要
  url: string;          // arXiv URL
}
```

## 完整示例

```json
{
  "id": "cs.AI-2024-01-001",
  "name": "大语言模型对齐技术",
  "layer": 3,
  "parent_id": "cs.AI",
  "children_ids": ["cs.AI-2024-01-001-001", "cs.AI-2024-01-001-002"],
  "related_paths": ["cs.CL-2024-01-005", "cs.LG-2024-01-012"],
  "paper_count": 45,
  "keywords": ["RLHF", "指令微调", "安全对齐", "人类反馈"],
  "timeline": [
    {"month": "2024-01", "paper_count": 45, "trend": "up"},
    {"month": "2024-02", "paper_count": 52, "trend": "up"},
    {"month": "2024-03", "paper_count": 78, "trend": "up"}
  ],
  "description": "研究如何通过人类反馈强化学习(RLHF)等技术使大语言模型与人类意图对齐",
  "sample_papers": [
    {
      "id": "2401.12345",
      "title": "Advanced RLHF Techniques for LLM Alignment",
      "authors": ["Alice Smith", "Bob Jones"],
      "abstract": "We propose a novel approach to...",
      "url": "https://arxiv.org/abs/2401.12345"
    }
  ]
}
```

## 数据约束

1. **ID 格式**: `{category}-{year}-{month}-{sequence}`
2. **层级范围**: 1 <= layer <= 6 (实际通常 1-4)
3. **时间格式**: 严格 `YYYY-MM`
4. **关键词数量**: 3-10 个

## 前端消费

```typescript
// React Hook 示例
function useTopicData() {
  const [data, setData] = useState<TopicData[]>([]);

  useEffect(() => {
    fetch('/data/final_topics.json')
      .then(r => r.json())
      .then(setData);
  }, []);

  return data;
}
```

## 相关节点

- @geb-node #architecture - 架构总览
- @geb-leaf #topic-hierarchy - 层次结构模型
- @geb-node #frontend - 前端消费方式

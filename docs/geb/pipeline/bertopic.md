<!-- docs/geb/pipeline/bertopic.md -->
@geb-leaf #bertopic
@mirror ./pipeline/01_bertopic.py
@loop #pipeline
@invariant "Documents all BERTopic parameters"
@invariant "Matches config/settings.yaml"
@emerge "update #pipeline on parameter change"

# BERTopic 主题建模

## 功能

使用 BERTopic 库对 arXiv 论文进行主题建模，提取每月研究主题。

## 输入输出

| 类型 | 路径 | 格式 |
|------|------|------|
| 输入 | `data/raw/*.jsonl` | JSON Lines |
| 输出 | `data/output/topics_raw.json` | JSON |

## 处理流程

1. 读取原始论文数据
2. 文本预处理（标题 + 摘要）
3. 嵌入向量生成 (Sentence-BERT)
4. BERTopic 主题建模
5. 导出主题数据

## 关键参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| min_topic_size | 10 | 最小主题大小 |
| embedding_model | all-MiniLM-L6-v2 | 嵌入模型 |
| calculate_probabilities | false | 是否计算概率 |

## 配置来源

- @mirror ./config/settings.yaml

```yaml
topic_modeling:
  min_topic_size: 10
  embedding_model: "all-MiniLM-L6-v2"
  nr_topics: "auto"
```

## 输出格式

```json
{
  "month": "2024-01",
  "topics": [
    {
      "id": "topic_0",
      "name": "大语言模型",
      "keywords": ["LLM", "GPT", "transformer"],
      "paper_count": 128
    }
  ]
}
```

## 同构代码

- @mirror ./pipeline/01_bertopic.py
- @mirror ./pipeline/bertopic_modeling.py

## 相关节点

- @geb-node #pipeline - 返回流水线总览
- @geb-leaf #hierarchy - 下一步：层次构建

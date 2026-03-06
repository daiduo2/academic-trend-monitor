<!-- docs/geb/pipeline/alignment.md -->
@geb-leaf #alignment
@mirror ./pipeline/03_alignment.py
@mirror ./pipeline/03_alignment_fast.py
@loop #pipeline
@invariant "Similarity threshold documented"
@emerge "update #pipeline on algorithm change"

# 主题对齐

## 功能

将相邻月份的主题进行对齐，识别同一主题在不同月份的出现，构建时间序列。

## 输入输出

| 类型 | 路径 | 格式 |
|------|------|------|
| 输入 | `data/output/hierarchy.json` | JSON |
| 输出 | `data/output/aligned.json` | JSON |

## 对齐策略

### 1. 关键词匹配
- 计算主题关键词的 Jaccard 相似度
- 阈值: 0.6

### 2. 语义相似度
- 使用 Sentence-BERT 计算主题名称的语义相似度
- 阈值: 0.75

### 3. 组合评分
```
similarity = 0.4 * keyword_jaccard + 0.6 * semantic_similarity
```

## 时间对齐表

对齐后的主题包含跨月时间序列：

```json
{
  "topic_id": "cs.AI-001",
  "name": "大语言模型",
  "timeline": [
    {"month": "2024-01", "paper_count": 45},
    {"month": "2024-02", "paper_count": 52},
    {"month": "2024-03", "paper_count": 78}
  ]
}
```

## 优化版本

- `03_alignment.py` - 基础版本
- `03_alignment_fast.py` - 向量化加速版

## 同构代码

- @mirror ./pipeline/03_alignment.py
- @mirror ./pipeline/03_alignment_fast.py

## 相关节点

- @geb-leaf #hierarchy - 上一步：层次构建
- @geb-leaf #rebuild - 下一步：结构重建

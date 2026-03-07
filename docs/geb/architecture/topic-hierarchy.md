<!-- docs/geb/architecture/topic-hierarchy.md -->
@geb-leaf #topic-hierarchy
@mirror ./pipeline/07_build_flexible_hierarchy.py
@loop #architecture
@invariant "Documents all hierarchy rules"
@invariant "Matches actual output structure"
@emerge "update #architecture on rule change"
@reflect "on_hierarchy_change"

# 主题层次结构模型

## 核心概念

主题层次结构是系统的核心数据结构，采用树形结构组织学术研究主题。

## 节点结构

```typescript
interface TopicNode {
  id: string;              // 唯一标识符
  name: string;            // 主题名称
  layer: number;           // 层级 (1-4+)
  parent_id: string | null; // 父节点ID
  related_paths: string[]; // 跨学科关联路径
  paper_count: number;     // 论文数量
  keywords: string[];      // 关键词
  description?: string;    // 描述（LLM生成）
}
```

## 层次规则

### Layer 1: Discipline (学科)
- **来源**: arXiv 顶级分类
- **示例**: `cs` (计算机科学), `physics` (物理学)
- **特性**: 固定不变

### Layer 2: Category (领域)
- **来源**: arXiv 二级分类
- **示例**: `cs.AI`, `cs.LG`
- **特性**: 固定不变

### Layer 3+: Dynamic Topics (动态主题)
- **来源**: BERTopic + LLM
- **特性**:
  - 深度不固定（可达 Layer 5+）
  - 每月动态生成
  - 通过语义对齐关联跨月主题

## 父节点选择规则

1. **语义特异性优先级**: 选择最具体的父节点
2. **单一主父**: 每个主题只能有一个主父
3. **跨学科关联**: 通过 `related_paths` 记录其他关联

## 数据示例

```json
{
  "id": "cs.AI-2024-01-001",
  "name": "大语言模型对齐技术",
  "layer": 3,
  "parent_id": "cs.AI",
  "related_paths": ["cs.CL-2024-01-005", "cs.LG-2024-01-012"],
  "paper_count": 45,
  "keywords": ["RLHF", "指令微调", "安全对齐"]
}
```

## 同构代码

- @mirror ./pipeline/07_build_flexible_hierarchy.py
- @mirror ./pipeline/08_reassign_topics.py

## 相关节点

- @geb-node #architecture - 返回架构总览
- @geb-leaf #api-data-format - 查看完整数据格式

<!-- docs/geb/architecture/README.md -->
@geb-node #architecture
@mirror ./pipeline/
@loop #overview
@invariant "Diagrams match code structure"
@invariant "Pipeline steps accurately documented"
@emerge "update_diagrams on pipeline change"

# 系统架构

## 架构概览

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Raw Data  │────▶│   Pipeline  │────▶│   Output    │
│  (arXiv)    │     │  (Python)   │     │  (JSON)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Frontend  │
                                        │  (React)    │
                                        └─────────────┘
```

## 数据流

1. **输入**: arXiv 论文数据 (JSONL)
2. **处理**: Python 流水线处理
3. **输出**: 静态 JSON 文件
4. **展示**: React + D3.js 前端

## 流水线阶段

| 阶段 | 脚本 | @geb-leaf | 功能 |
|------|------|-----------|------|
| 1 | 01_bertopic.py | @geb-leaf #bertopic | BERTopic 主题建模 |
| 2 | 02_hierarchy*.py | @geb-leaf #hierarchy | LLM 层次构建 |
| 3 | 03_alignment*.py | @geb-leaf #alignment | 跨月主题对齐 |
| 4 | 04_rebuild_structure.py | @geb-leaf #rebuild | 重建结构 |
| 5 | 05_semantic_alignment*.py | @geb-leaf #semantic | 语义对齐 |
| 6 | 06_add_hierarchy*.py | @geb-leaf #add-hierarchy | 添加层次 |
| 7 | 07_build_flexible_hierarchy.py | @geb-leaf #flexible | 灵活层次 |
| 8 | 08_reassign_topics.py | @geb-leaf #reassign | 主题重分配 |

## 主题层次模型

```
Layer 1: Discipline (学科) - arXiv 固定分类
    │
    ├── Layer 2: Category (领域) - arXiv 固定分类
    │       │
    │       └── Layer 3+: Topics (主题) - LLM 动态构建
    │               │
    │               ├── Sub-topic 1
    │               └── Sub-topic 2
    │
    └── ... (其他 Category)
```

### 关键设计

- **Layer 1-2**: arXiv 固定分类（计算机科学、物理学等）
- **Layer 3+**: LLM 动态构建，深度不固定
- **单一主父**: 每个主题只有一个主父节点（基于语义特异性优先级）
- **跨学科关联**: 通过 related_paths 字段引用相关主题

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 数据处理 | Python + BERTopic | 主题建模 |
| LLM | DeepSeek API | 层次构建、对齐 |
| 前端 | React + Vite | UI 框架 |
| 可视化 | D3.js | 图表渲染 |
| 部署 | GitHub Pages | 静态托管 |

## 子节点

- @geb-leaf #topic-hierarchy - 主题层次结构详解
- @geb-node #pipeline - 流水线详细文档
- @geb-node #frontend - 前端架构文档

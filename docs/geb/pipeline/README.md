<!-- docs/geb/pipeline/README.md -->
@geb-node #pipeline
@mirror ./pipeline/
@loop #architecture
@invariant "Step count matches actual scripts"
@invariant "Dependencies documented accurately"
@emerge "update flowchart on script change"

# 数据处理流水线

## 流水线概览

```
Raw Data ──▶ BERTopic ──▶ Hierarchy ──▶ Alignment ──▶ Output
            (01_)        (02_)         (03-08)
```

## 执行顺序

| 顺序 | 脚本 | @geb-leaf | 输入 | 输出 |
|------|------|-----------|------|------|
| 1 | 01_bertopic.py | #bertopic | raw/*.jsonl | topics_raw.json |
| 2 | 02_hierarchy.py | #hierarchy | topics_raw.json | hierarchy.json |
| 3 | 03_alignment.py | #alignment | hierarchy.json | aligned.json |
| 4 | 04_rebuild_structure.py | #rebuild | aligned.json | rebuilt.json |
| 5 | 05_semantic_alignment.py | #semantic | rebuilt.json | semantic_aligned.json |
| 6 | 06_add_hierarchy.py | #add-hierarchy | semantic_aligned.json | with_hierarchy.json |
| 7 | 07_build_flexible_hierarchy.py | #flexible | with_hierarchy.json | flexible.json |
| 8 | 08_reassign_topics.py | #reassign | flexible.json | final_topics.json |

## 依赖关系

```
01_bertopic
    │
    ▼
02_hierarchy ──┐
    │          │
    ▼          │
03_alignment ◀─┘
    │
    ▼
04_rebuild_structure
    │
    ▼
05_semantic_alignment
    │
    ▼
06_add_hierarchy
    │
    ▼
07_build_flexible_hierarchy
    │
    ▼
08_reassign_topics
```

## 常用命令

```bash
# 运行完整流水线
make pipeline

# 或分步运行
python pipeline/01_bertopic.py
python pipeline/02_hierarchy.py
# ... etc
```

## 子节点

- @geb-leaf #bertopic - BERTopic 主题建模详解
- @geb-leaf #hierarchy - 层次构建详解
- @geb-leaf #alignment - 主题对齐详解

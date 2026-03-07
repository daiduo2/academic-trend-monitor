<!-- docs/geb/pipeline/hierarchy.md -->
@geb-leaf #hierarchy
@mirror ./pipeline/02_hierarchy.py
@mirror ./pipeline/02_hierarchy_optimized.py
@loop #pipeline
@invariant "LLM prompt documented"
@invariant "Output structure matches topic-hierarchy.md"
@emerge "update #topic-hierarchy on structure change"

# 层次构建

## 功能

使用 LLM (DeepSeek) 构建主题的层次结构，将扁平主题组织成树形结构。

## 输入输出

| 类型 | 路径 | 格式 |
|------|------|------|
| 输入 | `data/output/topics_raw.json` | JSON |
| 输出 | `data/output/hierarchy.json` | JSON |

## 处理流程

1. 读取 BERTopic 输出的主题
2. 按 Category 分组主题
3. 调用 LLM 构建层次
4. 解析并验证层次结构
5. 导出层次数据

## LLM 角色

### 输入 Prompt

```
给定以下研究主题列表，请构建层次结构：
- 主题应该按学科领域组织
- 识别主题间的父子关系
- 返回 JSON 格式的层次结构

主题列表：
[topics...]
```

### 输出格式

```json
{
  "hierarchy": [
    {
      "layer": 1,
      "name": "Computer Science",
      "children": [
        {
          "layer": 2,
          "name": "Artificial Intelligence",
          "children": [...]
        }
      ]
    }
  ]
}
```

## 优化版本

- `02_hierarchy.py` - 基础版本
- `02_hierarchy_optimized.py` - 批量处理优化版

## 配置来源

- @mirror ./config/prompts.yaml

## 同构代码

- @mirror ./pipeline/02_hierarchy.py
- @mirror ./pipeline/02_hierarchy_optimized.py
- @mirror ./pipeline/hierarchy_builder_optimized.py

## 相关节点

- @geb-leaf #bertopic - 上一步：主题建模
- @geb-leaf #alignment - 下一步：主题对齐
- @geb-leaf #topic-hierarchy - 层次结构模型

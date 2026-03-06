<!-- PROJECT.md - GEB Meta Configuration -->
@geb-meta {
  "project": "academic-trend-monitor",
  "name": "学术热点趋势分析仪表盘",
  "description": "基于 BERTopic + LLM 的学术研究热点分析工具",
  "root": "./docs/geb/README.md",
  "version": "1.0.0",
  "invariants": [
    "每个 @geb-leaf 必须有对应的代码文件 (@mirror)",
    "流水线文档步骤数必须与实际脚本数一致",
    "API 文档必须与 actual output 格式匹配",
    "前端组件文档必须与实现同步"
  ],
  "loops": [
    {
      "name": "overview-architecture-cycle",
      "from": "#overview",
      "to": "#architecture",
      "bidirectional": true,
      "description": "概览与架构相互引用"
    },
    {
      "name": "pipeline-data-cycle",
      "from": "#pipeline",
      "to": "#api-data-format",
      "bidirectional": true,
      "description": "流水线输出格式约束"
    },
    {
      "name": "hierarchy-topic-cycle",
      "from": "#topic-hierarchy",
      "to": "#api-data-format",
      "bidirectional": true,
      "description": "层次模型与数据格式互锁"
    }
  ],
  "emergence_rules": [
    {
      "trigger": "pipeline/*.py 变更",
      "action": "update docs/geb/pipeline/ 对应文档"
    },
    {
      "trigger": "config/*.yaml 变更",
      "action": "update所有引用配置的文档"
    },
    {
      "trigger": "frontend/src/* 变更",
      "action": "update docs/geb/frontend/ 对应文档"
    },
    {
      "trigger": "数据格式变更",
      "action": "级联更新 #api-data-format 及所有依赖节点"
    }
  ],
  "emergence_depth": 3,
  "reflection_schedule": [
    {
      "trigger": "on_structure_change",
      "check": ["层级结构", "同构映射"]
    },
    {
      "trigger": "on_code_change",
      "check": ["mirror 有效性", "参数一致性"]
    },
    {
      "trigger": "weekly",
      "check": ["完整一致性检查"]
    }
  ],
  "mirrors": [
    {
      "doc": "docs/geb/README.md",
      "code": "./README.md"
    },
    {
      "doc": "docs/geb/architecture/topic-hierarchy.md",
      "code": "./pipeline/07_build_flexible_hierarchy.py"
    },
    {
      "doc": "docs/geb/pipeline/bertopic.md",
      "code": "./pipeline/01_bertopic.py"
    },
    {
      "doc": "docs/geb/pipeline/hierarchy.md",
      "code": "./pipeline/02_hierarchy.py"
    },
    {
      "doc": "docs/geb/pipeline/alignment.md",
      "code": "./pipeline/03_alignment.py"
    },
    {
      "doc": "docs/geb/api/data-format.md",
      "code": "./data/output/final_topics.json"
    }
  ],
  "commands": {
    "geb": "显示 GEB 状态",
    "geb reflect": "自检一致性",
    "geb isomorph": "检查代码-文档同构",
    "geb map": "可视化文档地图"
  }
}

# PROJECT.md - 项目元数据

## GEB 文档系统

本项目使用 GEB (Gödel, Escher, Bach) 自指文档架构。

### 快速导航

- [GEB 文档根节点](docs/geb/README.md) - @geb-root #overview
- [架构文档](docs/geb/architecture/README.md) - @geb-node #architecture
- [流水线文档](docs/geb/pipeline/README.md) - @geb-node #pipeline
- [前端文档](docs/geb/frontend/README.md) - @geb-node #frontend
- [API 数据格式](docs/geb/api/data-format.md) - @geb-leaf #api-data-format

### 文档节点层次

```
#overview (@geb-root)
├── #architecture (@geb-node)
│   └── #topic-hierarchy (@geb-leaf)
├── #pipeline (@geb-node)
│   ├── #bertopic (@geb-leaf)
│   ├── #hierarchy (@geb-leaf)
│   └── #alignment (@geb-leaf)
├── #frontend (@geb-node)
└── #api-data-format (@geb-leaf)
```

### 维护指南

**重要**: 每次重大代码变更后，调用 `/geb-docs` 维护文档同步。

1. 代码变更后检查对应的 @mirror 文档
2. 更新影响的所有 @geb-leaf 节点
3. 触发 @emerge 规则传播变更
4. 运行 `geb reflect` 检查一致性

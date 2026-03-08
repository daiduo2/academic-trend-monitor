# Academic Trend Monitor

学术热点趋势分析仪表盘。这个项目围绕 arXiv 论文构建一个静态部署的数据产品：月度做主题建模与层级结构构建，周度做滚动趋势统计，日度做新论文打标与 RSS 订阅支持，并通过 PostgreSQL 主存储 + GitHub Pages 静态导出的方式发布。

> GEB 文档入口：[`PROJECT.md`](PROJECT.md)、[`docs/geb/`](docs/geb/)

## 项目目标

这个仓库解决的是两个问题：

1. 用 BERTopic + LLM 把连续多个月的 arXiv 论文组织成可浏览的层级主题体系。
2. 用纯前端的方式展示趋势、支持 drill-down 浏览，并提供轻量 RSS 订阅能力。

项目不引入常驻 API 服务。PostgreSQL 负责承接月度主题版本、日更标签和日报分析，前端继续消费本地或 GitHub Actions 导出的静态 JSON / JSONL 文件。

## 当前能力

- 月度主题建模：按月对 arXiv 数据做 BERTopic 建模。
- 层级主题构建：在固定的 Layer 1-2 学科分类之上，生成动态 Layer 3+ 主题层级。
- 跨月主题对齐：把不同月份的局部主题对齐成全局主题。
- 领域热度分析：在某个学科 / 子类下 drill-down 浏览主题热度。
- 时间趋势分析：查看单个主题或聚合主题的历史趋势。
- RSS 订阅中心：按主题标签过滤最近论文并生成可下载的 feed。
- 日更 / 周更脚本：支持最近论文更新和滚动 7 天趋势报告生成。
- PostgreSQL 发布链路：支持把月度主题版本、日更标签和日报分析写入数据库。
- 日报分析：支持调用 Claude Code / LLM 生成结构化热点解读，并导出到静态页面。

## 架构概览

### 数据侧

```text
arXiv raw JSONL
  -> BERTopic（月度局部主题）
  -> hierarchy / alignment（全局主题与层级）
  -> PostgreSQL（主题版本 / 标签 / 分析）
  -> static outputs（JSON）
  -> frontend/public/data
  -> GitHub Pages
```

### 展示侧

```text
React + Vite + Recharts
  -> 领域热度视图
  -> 趋势追踪视图
  -> RSS 订阅视图
```

### 时间粒度分工

- 月度：本地运行重型建模与主题对齐。
- 周度：从 PostgreSQL 导出滚动 7 天趋势报告。
- 日度：抓取新增论文、做 topic tagging，并生成日报分析。

## 目录结构

```text
academic-trend-monitor/
├── config/                 # 配置与 prompt
├── data/
│   ├── raw/                # 原始 arXiv JSONL
│   └── output/             # 月度建模输出
├── docs/
│   ├── geb/                # GEB 自指文档
│   └── plans/              # 设计与实现计划
├── frontend/               # React 前端
├── pipeline/               # Python 数据流水线
├── tests/                  # Python 测试
├── Makefile
└── requirements.txt
```

## 数据模型

### 固定层级

- Layer 1：学科，如 `cs`、`math`、`physics`
- Layer 2：arXiv 子类，如 `cs.AI`、`math.OA`

### 动态层级

- Layer 3+：由 BERTopic + LLM 构建的粗主题 / 细主题层级
- 每个全局 topic 会被放入唯一主路径
- 树叶节点可能对应 1 个或多个全局 topic

### 关键输出文件

- `data/output/aligned_topics_hierarchy.json`
  统一前端消费入口，包含结构、趋势、层级树。
- `data/output/topics.json`
  RSS / 日更 / 周更流程使用的压缩主题索引。
- `data/recent.jsonl`
  最近论文的压缩格式索引。
- `data/weekly/*.json`
  滚动 7 天趋势报告。
- `data/analysis/daily/*.json`
  每日结构化 LLM 分析结果。

## 环境准备

### 1. Python 依赖

```bash
make install
```

### 2. 前端依赖

```bash
make frontend-install
```

### 3. LLM 配置

项目默认读取环境变量中的 `LLM_API_KEY`：

```bash
export LLM_API_KEY=your_deepseek_key
```

LLM 与主题建模相关参数见 [`config/settings.yaml`](config/settings.yaml)。

如果使用和 `IssueLab` 一致的第三方 Claude / coding-plan 接法，额外需要：

```bash
export ANTHROPIC_AUTH_TOKEN=your_model_api_token
export ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
export ANTHROPIC_MODEL=MiniMax-M2.1
npm install -g @anthropic-ai/claude-code
```

当前实现对齐 `IssueLab` 的变量约定：

- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`
- `PAT_TOKEN`

分析客户端会优先读取这组变量，并兼容映射到本地 SDK 运行环境；失败时再回退到 `CLAUDE_CODE_COMMAND` 或现有 API 客户端。

### 4. PostgreSQL / Neon 配置

推荐直接使用 Neon 提供的 `DATABASE_URL`，保留其池化 host，并确保带有 `sslmode=require`。

示例：

```bash
export DATABASE_URL='postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/dbname?sslmode=require'
```

### 5. 原始数据

把原始 arXiv 月度 JSONL 放到 `data/raw/`，文件名应为 `YYYY-MM.jsonl`。

示例：

```bash
cp /path/to/arxiv-trend-monitor/data/raw/*.jsonl data/raw/
```

## 快速开始

### 运行完整月度流水线

```bash
make pipeline
```

这个命令按顺序执行：

1. `pipeline/01_bertopic.py`
2. `pipeline/02_hierarchy.py`
3. `pipeline/03_alignment.py`

输出写入 `data/output/`。

### 启动本地前端

```bash
cd frontend
npm run dev
```

默认 Vite 路径基于 GitHub Pages 子路径配置，开发时访问形如：

```text
http://127.0.0.1:4173/academic-trend-monitor/
```

### 构建前端

```bash
cd frontend
npm run build
```

### 部署

```bash
make deploy
```

`make deploy` 会先把 `data/output/`、`data/recent.jsonl`、`data/weekly/`、`data/analysis/daily/` 同步到 `frontend/public/data/`，再执行前端构建。静态资源推送后可由 GitHub Pages 发布。

## 日更 / 周更工作流

### 日更：抓取并打标最近论文

```bash
python -m pipeline.daily_fetch_and_tag
python -m pipeline.export_recent_static
```

内部步骤：

1. 从 arXiv 抓取最近论文
2. 使用 topic index 打标签
3. 写入 PostgreSQL
4. 导出 `data/recent.jsonl`

### 周更：生成滚动 7 天趋势报告

```bash
python -m pipeline.export_weekly_static
```

输出格式为：

```text
data/weekly/YYYY-MM-DD.json
```

### 主题索引构建

如果要支持日更打标，需要先有 topic index：

```bash
python pipeline/build_topic_index.py
```

当前仓库默认将 topic index 固定发布到同一路径，并由日更任务直接下载：

```text
https://raw.githubusercontent.com/daiduo2/academic-trend-monitor/main/data/output/topic_index
```

也就是每月更新时直接覆盖：

- `data/output/topic_index.faiss`
- `data/output/topic_index.json`

### 月度发布到 PostgreSQL

```bash
make db-init
python -m pipeline.publish_topics_to_db \
  --topics-tree data/output/topics_tree.json \
  --hierarchy data/output/aligned_topics_hierarchy.json
```

### 日报分析

```bash
python -m pipeline.daily_generate_analysis
python -m pipeline.export_analysis_static
```

默认优先读取 `ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL / ANTHROPIC_MODEL` 调用 Anthropic-compatible Claude 提供方；若 `claude-agent-sdk` 和 Claude CLI 都可用，则优先走 SDK。

## 前端页面说明

### 领域热度分析

- 入口：`/`
- 作用：按学科 / 子类浏览主题树
- 特性：支持 Layer 3/4 drill-down、面包屑、详情弹窗

### 趋势追踪分析

- 入口：`/trends`
- 作用：查看单个全局 topic 或聚合主题的历史趋势
- 特性：支持从领域视图直接跳转并恢复上下文

### RSS 订阅

- 入口：`/rss`
- 作用：按 topic tag 过滤最近论文并生成本地可下载 feed
- 特性：支持从 URL 恢复订阅参数、展示滚动趋势摘要

### 日报分析

- 入口：`/analysis`
- 作用：展示每日生成的结构化热点分析、代表论文和关键信号
- 特性：消费 `data/analysis/daily/*.json`，不依赖在线 API

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `make install` | 安装 Python 依赖 |
| `make frontend-install` | 安装前端依赖 |
| `make test` | 运行 Python 测试 |
| `make db-init` | 初始化 PostgreSQL schema |
| `make pipeline` | 运行月度数据流水线 |
| `make publish-topics` | 发布月度主题版本到 PostgreSQL |
| `make daily-tag` | 抓取并打标新论文到 PostgreSQL |
| `make daily-analysis` | 生成每日结构化分析 |
| `make export-static` | 从 PostgreSQL 导出静态文件 |
| `make deploy` | 构建前端并准备部署 |
| `make clean` | 清理生成物 |
| `cd frontend && npm test` | 运行前端测试 |
| `cd frontend && npm run build` | 构建前端 |

## 配置说明

核心配置文件：

- [`config/settings.yaml`](config/settings.yaml)
  包含 arXiv 分类、BERTopic、LLM、流水线参数。
- `config/prompts.yaml`
  包含层级构建与语义对齐相关 prompt。

其中比较关键的配置项：

- `topic_modeling.min_topic_size`
- `topic_modeling.embedding_model`
- `llm.provider`
- `llm.model`
- `pipeline.alignment.similarity_threshold`
- `pipeline.tagging.score_threshold`
- `database.topic_index_path`
- `analysis.command`

## 测试与校验

### Python

```bash
make test
```

### Frontend

```bash
cd frontend
npm test
```

### 推荐的提交前检查

```bash
make test
cd frontend && npm test
cd frontend && npm run build
```

## 已知约束

- 项目当前依赖静态文件分发，不提供在线后端 API。
- 日更抓取依赖本地 Python 环境与外部网络可用性。
- `arxiv` / `requests` 在某些 macOS Python 环境下会出现 LibreSSL 兼容告警；当前代码会输出详细错误日志并在失败时返回空结果，避免污染 daily pipeline。
- 前端构建产物较大，Vite 可能提示 chunk size warning，但不影响功能。

## 文档与设计记录

如果你要理解这个项目为什么会长成现在这样，优先看这些文档：

- [`docs/plans/2026-03-04-design.md`](docs/plans/2026-03-04-design.md)
- [`docs/plans/2026-03-06-drill-down-dashboard-design.md`](docs/plans/2026-03-06-drill-down-dashboard-design.md)
- [`docs/plans/2026-03-07-multi-timeframe-trend-rss-design.md`](docs/plans/2026-03-07-multi-timeframe-trend-rss-design.md)

## License

MIT

# Academic Trend Monitor

学术热点趋势分析仪表盘

> **GEB 文档**: 本项目使用自指文档系统，详见 [PROJECT.md](PROJECT.md) 和 [docs/geb/](docs/geb/)

## 简介

基于 BERTopic + LLM 的学术研究热点分析工具，支持：
- 按月对 arXiv 论文进行主题建模
- LLM 自动构建主题层次结构
- 时间切片和领域切片双视角展示
- 部署到 GitHub Pages

## 快速开始

### 1. 复制数据

```bash
cp /path/to/arxiv-trend-monitor/data/raw/*.jsonl data/raw/
```

### 2. 配置环境

```bash
# 安装依赖
pip install -r requirements.txt

# 配置 LLM API Key
export LLM_API_KEY=your_deepseek_key
```

### 3. 运行流水线

```bash
# 运行完整流水线
make pipeline

# 或分步运行
python pipeline/01_bertopic.py
python pipeline/02_hierarchy.py
python pipeline/03_alignment.py
```

### 4. 启动前端开发服务器

```bash
cd frontend
npm install
npm run dev
```

### 5. 部署

```bash
make deploy
```

## 项目结构

```
├── data/
│   ├── raw/              # 原始论文数据
│   └── output/           # 生成的主题数据
├── pipeline/             # 数据处理流水线
├── frontend/             # React 前端
├── config/               # 配置文件
└── docs/                 # 文档
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `make pipeline` | 运行完整数据处理流水线 |
| `make deploy` | 部署到 GitHub Pages |
| `make clean` | 清理生成的数据 |

## 配置

编辑 `config/settings.yaml`：

```yaml
# LLM 配置
llm:
  provider: "deepseek"
  model: "deepseek-chat"
  base_url: "https://api.deepseek.com/v1"

# 主题建模配置
topic_modeling:
  min_topic_size: 10
  embedding_model: "all-MiniLM-L6-v2"
```

## 许可证

MIT

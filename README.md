<p align="center">
  <a href="https://tashan.ac.cn" target="_blank" rel="noopener noreferrer">
    <img src="docs/assets/tashan.svg" alt="他山 Logo" width="280" />
  </a>
</p>

<p align="center">
  <strong>学术趋势监测</strong><br>
  <em>Academic Trend Monitor</em>
</p>

<p align="center">
  <a href="#项目简介">项目简介</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#数据与可视化">数据与可视化</a> •
  <a href="#部署">部署</a> •
  <a href="#代码结构">代码结构</a> •
  <a href="#生态位置">生态位置</a> •
  <a href="README.en.md">English</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

围绕学术主题演化构建的静态趋势分析与可视化仪表盘。

---

## 项目简介

「人—智能体混合数字世界」研究关心人类知识、智能体工具与数字表达之间如何形成可复查、可积累的协同系统。本项目对应其中的**学术知识观测层**：它把论文数据、主题建模、演化判断与交互式可视化组织成一个可部署的静态数据产品。没有这类观测层，学术热点只能停留在零散检索和主观印象；有了它，研究方向的热度、结构与相似关系可以被持续追踪和复查。

本仓库最早以 arXiv 数据为基座，使用 BERTopic 与 LLM 构建月度主题、层级结构和跨月趋势；当前版本在保留原有两个 arXiv 仪表盘的基础上，补充了基于 OpenAlex 全量数学论文切片的两个可视化页面：文献点云图与领域热力图。

**核心思想**

- **静态优先**：所有前端数据均以 JSON / JSONL 静态文件发布，不依赖后端服务。
- **双数据基座**：arXiv 用于时间序列和层级趋势，OpenAlex 用于更宽的论文空间与领域结构观察。
- **可读可视化**：前端不只展示图表，还强调颜色区分、空间尺度、候选列表和影响力表达的 human-readable 体验。

**适合以下场景与读者**

- 研究者：观察数学和相关方向的主题变化、热点扩散与领域结构。
- 数据产品设计者：参考静态学术数据产品的前端组织方式。
- 工程师：复用 React + Vite + D3 / Three.js 的 GitHub Pages 部署模式。

---

## 功能特性

- **领域热度分析**：按 arXiv 学科与子类 drill-down 浏览主题层级、论文数和趋势变化。
- **趋势追踪分析**：查看主题在不同月份中的热度变化和层级上下文。
- **文献点云图**：基于 OpenAlex 数学论文标题嵌入，展示主题之间的语义相似度与局部论文分布。
- **领域热力图**：用山峰地形表达 OpenAlex 主题影响力，让高影响力区域在高度和视觉权重上更直观。
- **统一视觉系统**：四个页面保持独立路由，但共享深色仪表盘风格、指标卡、面板和导航语言。
- **静态部署**：GitHub Actions 构建 `frontend/dist` 并发布到 GitHub Pages。

---

## 快速开始

### 1. 安装依赖

```bash
# 安装 Python 依赖
make install

# 安装前端依赖
make frontend-install
```

### 2. 启动前端

```bash
cd frontend
npm run dev
```

默认访问地址：

```text
http://localhost:5173/academic-trend-monitor/
```

### 3. 运行测试

```bash
# Python 测试
make test

# 前端测试
cd frontend
npm test
```

### 4. 构建前端

```bash
cd frontend
npm run build
```

构建产物位于 `frontend/dist/`，其中 `404.html` 用于 GitHub Pages 的 SPA 路由 fallback。

---

## 数据与可视化

### arXiv 数据链路

```text
arXiv raw JSONL
  -> BERTopic 月度主题建模
  -> LLM 层级结构构建
  -> 跨月主题对齐
  -> data/output/*.json
  -> frontend/public/data
  -> GitHub Pages
```

### OpenAlex 可视化链路

```text
OpenAlex works
  -> 数学论文切片
  -> 标题嵌入与主题结构
  -> 文献点云 bundle / 主题山峰地形 bundle
  -> data/output/openalex_full_paper_*
  -> frontend/public/data/output
  -> GitHub Pages
```

### 当前四个主页面

| 页面 | 路由 | 数据基座 | 说明 |
|------|------|----------|------|
| 领域热度分析 | `/` | arXiv | 按学科层级查看主题热度 |
| 趋势追踪分析 | `/trends` | arXiv | 查看主题跨月变化 |
| 文献点云图 | `/openalex-paper-cloud` | OpenAlex | 查看论文点云与主题相似度 |
| 领域热力图 | `/openalex-field-heat` | OpenAlex | 查看主题山峰地形与领域影响力 |

---

## 部署

本仓库使用 GitHub Actions 发布 GitHub Pages。部署工作流位于 `.github/workflows/deploy.yml`。

### 本地准备部署产物

```bash
make deploy
```

该命令会把 `data/output/` 中的 arXiv 与 OpenAlex 静态数据复制到 `frontend/public/data/`，然后执行前端构建。

### GitHub Pages 自动发布

```bash
git push origin main
```

当 `main` 更新后，GitHub Actions 会：

1. 安装前端依赖。
2. 复制静态数据到 `frontend/public/data/`。
3. 运行 `npm run build`。
4. 上传 `frontend/dist`。
5. 发布到 GitHub Pages。

线上入口：

```text
https://daiduo2.github.io/academic-trend-monitor/
```

---

## 代码结构

```text
academic-trend-monitor/
├── .github/workflows/          # GitHub Actions，包含 Pages 部署流程
├── config/                     # Topic modeling 与 LLM prompt 配置
├── data/
│   ├── raw/                    # 原始数据，本地生成或下载
│   └── output/                 # 前端消费的静态 JSON / JSONL 输出
├── docs/
│   ├── assets/                 # README 与文档静态资产
│   ├── geb/                    # GEB 自指文档
│   ├── plans/                  # 设计、实现与运行记录
│   └── superpowers/            # 本轮前端设计与实施计划
├── frontend/                   # React + Vite 前端
│   ├── public/                 # 构建前复制进入的静态数据目录
│   └── src/
│       ├── components/         # 通用组件与 OpenAlex 可视化组件
│       ├── hooks/              # 静态数据加载 hooks
│       ├── utils/              # 数据归一化与场景布局算法
│       └── views/              # 页面级视图
├── pipeline/                   # arXiv / OpenAlex 数据处理脚本
├── tests/                      # Python 数据流水线测试
├── Makefile                    # 常用开发、测试、部署命令
├── README.md                   # 中文说明
└── README.en.md                # English README
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [`PROJECT.md`](PROJECT.md) | 项目更高层的定位说明 |
| [`docs/geb/`](docs/geb/) | GEB 自指文档入口 |
| [`docs/plans/`](docs/plans/) | 数据流水线、OpenAlex 迁移与可视化设计记录 |
| [`docs/superpowers/plans/2026-04-28-github-pages-openalex-deploy.md`](docs/superpowers/plans/2026-04-28-github-pages-openalex-deploy.md) | 本次 Pages 部署计划 |
| [`frontend/src/views/`](frontend/src/views/) | 四个主要页面入口 |

---

## 生态位置

本项目是「人—智能体混合数字世界」大项目中的学术知识观测与可视化节点。

```text
人—智能体混合数字世界
├── 理论与框架层
├── 智能体协作与任务执行层
├── 学术知识观测层
│   └── Academic Trend Monitor（本仓库）
└── 面向用户的知识产品层
```

### 相关仓库

| 仓库 | 定位 | 链接 |
|------|------|------|
| Academic Trend Monitor | 学术趋势监测与可视化 | 当前页面 |
| Tashan 相关项目 | 大项目生态入口 | [https://tashan.ac.cn](https://tashan.ac.cn) |

---

## 贡献

建议遵循以下流程：

1. 从 `main` 创建特性分支，例如 `feature/openalex-visualization`。
2. 保持提交信息符合 `<类型>(<范围>): <简短描述>` 格式。
3. 前端改动至少运行相关 Vitest 测试与 `npm run build`。
4. 数据流水线改动至少运行相关 Python 测试。
5. 通过 PR 合并到 `main` 后触发 GitHub Pages 自动部署。

---

## 更新日志

当前仓库仍处于快速演进阶段。重要变更记录在 `docs/plans/` 与后续 `CHANGELOG.md` 中维护。

---

## 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT)。

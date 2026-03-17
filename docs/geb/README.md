<!-- docs/geb/README.md -->
@geb-root #overview
@mirror ./README.md
@loop #architecture
@invariant "Links to all major sections"
@invariant " Mirrors project structure exactly"
@reflect "on_structure_change"

# Academic Trend Monitor - GEB Documentation

## 自指声明

本文档系统使用 GEB (Gödel, Escher, Bach) 自指文档架构，具有以下特性：
- **自指性**: 文档可以描述自身的结构
- **怪圈**: 层级不是严格的自上而下
- **同构**: 代码与文档一一对应
- **涌现**: 局部变更会全局传播

## 导航地图

### 架构层
- @geb-node #architecture - 系统架构总览
- @geb-node #data-flow - 数据流向
- @geb-leaf #topic-hierarchy - 主题层次结构模型

### 流水线层
- @geb-node #pipeline - 数据处理流水线
- @geb-leaf #bertopic - BERTopic 主题建模
- @geb-leaf #hierarchy - LLM 层次构建
- @geb-leaf #alignment - 跨月对齐

### 前端层
- @geb-node #frontend - React 前端架构
- @geb-leaf #visualization - D3.js 可视化
- @geb-leaf #components - React 组件

### API 层
- @geb-leaf #api-data-format - 数据格式规范

## 项目概览

学术热点趋势分析仪表盘，基于 BERTopic + LLM 的学术研究热点分析工具。

### 核心功能
1. 按月对 arXiv 论文进行主题建模
2. LLM 自动构建主题层次结构
3. 时间切片和领域切片双视角展示
4. 部署到 GitHub Pages

### 快速链接
- [项目根目录](../../README.md)
- [CLAUDE.md](../../CLAUDE.md) - Claude Code 工作指南
- [Plans](../plans/) - 设计文档

## 同构映射

| 文档节点 | 代码镜像 | 描述 |
|----------|----------|------|
| #overview | @mirror ./README.md | 项目概览 |
| #architecture | @mirror ./pipeline/ | 系统架构 |
| #bertopic | @mirror ./pipeline/01_bertopic.py | 主题建模 |
| #hierarchy | @mirror ./pipeline/02_hierarchy*.py | 层次构建 |
| #alignment | @mirror ./pipeline/03_alignment*.py | 主题对齐 |
| #frontend | @mirror ./frontend/src/ | 前端代码 |

## 怪圈 (Strange Loops)

- #overview ↔ #architecture: 概览链接到架构，架构反馈到概览
- #pipeline ↔ #data-format: 流水线输出格式，格式约束流水线

## 不变量 (Invariants)

1. 每个 @geb-leaf 必须有对应的代码文件 (@mirror)
2. 流水线文档必须与代码步骤一致
3. API 文档必须与实际输出格式匹配
4. 前端文档必须与组件实现同步

## 涌现规则 (Emergence)

- 当 pipeline 代码变更时，自动更新 #pipeline 文档
- 当数据格式变更时，级联更新 #api-data-format
- 当架构变更时，触发全文档反射检查

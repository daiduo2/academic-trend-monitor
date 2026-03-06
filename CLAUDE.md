# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Academic Trend Monitor - 学术热点趋势分析仪表盘

基于 BERTopic + LLM 的学术研究热点分析工具，支持从时间切片和领域切片两个维度展示研究热点。

## Architecture

- **Data Pipeline**: Python scripts that run monthly to process arXiv data
- **Frontend**: React + D3.js static site deployed to GitHub Pages
- **Storage**: Static JSON files (no backend)

## Common Commands

```bash
# Install dependencies
make install

# Run data pipeline (monthly update)
make pipeline

# Deploy to GitHub Pages
make deploy

# Clean generated data
make clean
```

## Project Structure

```
├── data/
│   ├── raw/              # Raw arXiv data (JSONL files)
│   └── output/           # Generated topic data (JSON)
├── pipeline/             # Python data processing scripts
├── frontend/             # React + Vite frontend
├── config/               # Configuration files
└── docs/plans/           # Design documents
```

## Development Workflow

**CRITICAL**: After each development step is completed, you MUST call `/geb-docs` to maintain documentation synchronization.

1. **After each development step**: Call `/geb-docs` to maintain documentation
2. **Before committing**: Run `make test` to verify data integrity
3. **Monthly update**: Run `make pipeline` then `make deploy`

## Data Flow

1. BERTopic extracts flat topics from monthly arXiv data
2. LLM (DeepSeek) builds hierarchical structure and aligns topics across months
3. Export static JSON files
4. Frontend loads JSON and visualizes trends

## Configuration

- `config/settings.yaml` - Topic modeling and LLM settings
- `config/prompts.yaml` - LLM prompts for hierarchy building

## Important Notes

- Layer 1-2 (Discipline/Category) are fixed arXiv classifications
- Layer 3+ are dynamically built by LLM with dynamic depth
- Each topic has one primary parent (semantic specificity priority)
- Cross-disciplinary topics have related_paths for reference
- **Documentation**: Use `/geb-docs` after every significant code change

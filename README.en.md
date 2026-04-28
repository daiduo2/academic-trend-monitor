<p align="center">
  <a href="https://tashan.ac.cn" target="_blank" rel="noopener noreferrer">
    <img src="docs/assets/tashan.svg" alt="Tashan Logo" width="280" />
  </a>
</p>

<p align="center">
  <strong>学术趋势监测</strong><br>
  <em>Academic Trend Monitor</em>
</p>

<p align="center">
  <a href="#project-overview">Project Overview</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#data-and-visualizations">Data</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#repository-structure">Structure</a> •
  <a href="#ecosystem-position">Ecosystem</a> •
  <a href="README.md">中文</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A static dashboard for monitoring academic topic trends and research-field structure.

---

## Project Overview

The broader “human-agent hybrid digital world” agenda needs auditable interfaces between human knowledge, agent workflows, and digital representations. This repository sits in the **academic knowledge observation layer**: it turns paper metadata, topic modeling, evolution analysis, and interactive visualization into a deployable static data product. Without this layer, academic trends remain fragmented across search results and subjective impressions; with it, research heat, hierarchy, and semantic proximity can be tracked and reviewed over time.

The project originally used arXiv data as its base, with BERTopic and LLM-assisted hierarchy construction for monthly topics and cross-month trends. The current version keeps the original two arXiv dashboards and adds two OpenAlex-based visualizations over a broad mathematics paper slice: a paper cloud and a field heat map.

**Core Ideas**

- **Static first**: Frontend data is served as JSON / JSONL files, with no backend service required.
- **Dual data base**: arXiv supports time-series and hierarchy views; OpenAlex supports broader paper-space and field-structure views.
- **Readable visualization**: The UI prioritizes distinguishable colors, spatial scale, candidate lists, and intuitive influence encoding.

**Intended users**

- Researchers who want to inspect topic shifts, field structure, and emerging research areas.
- Data-product designers looking for a static academic dashboard pattern.
- Engineers reusing a React + Vite + D3 / Three.js GitHub Pages deployment setup.

---

## Features

- **Domain heat analysis**: Drill down through arXiv disciplines and subcategories to inspect topic hierarchy, paper counts, and trends.
- **Trend tracking**: Inspect monthly changes for selected topics and their hierarchy context.
- **Paper cloud**: Use OpenAlex title embeddings to show topic-level semantic proximity and sampled paper distributions.
- **Field heat map**: Use a mountain-like terrain to express topic influence across OpenAlex mathematics fields.
- **Unified visual system**: Four independent routes share the same dark dashboard language, metrics, panels, and navigation style.
- **Static deployment**: GitHub Actions builds `frontend/dist` and deploys it to GitHub Pages.

---

## Quick Start

### 1. Install dependencies

```bash
# Install Python dependencies
make install

# Install frontend dependencies
make frontend-install
```

### 2. Run the frontend

```bash
cd frontend
npm run dev
```

Default local URL:

```text
http://localhost:5173/academic-trend-monitor/
```

### 3. Run tests

```bash
# Python tests
make test

# Frontend tests
cd frontend
npm test
```

### 4. Build the frontend

```bash
cd frontend
npm run build
```

The production output is written to `frontend/dist/`. The generated `404.html` supports GitHub Pages SPA route fallback.

---

## Data and Visualizations

### arXiv pipeline

```text
arXiv raw JSONL
  -> monthly BERTopic modeling
  -> LLM-assisted hierarchy construction
  -> cross-month topic alignment
  -> data/output/*.json
  -> frontend/public/data
  -> GitHub Pages
```

### OpenAlex visualization pipeline

```text
OpenAlex works
  -> mathematics paper slice
  -> title embeddings and topic structure
  -> paper cloud bundle / topic peak terrain bundle
  -> data/output/openalex_full_paper_*
  -> frontend/public/data/output
  -> GitHub Pages
```

### Main pages

| Page | Route | Data base | Description |
|------|------|-----------|-------------|
| Domain Heat Analysis | `/` | arXiv | Inspect topic heat by discipline hierarchy |
| Trend Tracking | `/trends` | arXiv | Inspect cross-month topic changes |
| Paper Cloud | `/openalex-paper-cloud` | OpenAlex | Inspect paper-cloud layout and topic similarity |
| Field Heat Map | `/openalex-field-heat` | OpenAlex | Inspect topic terrain and field influence |

---

## Deployment

This repository deploys GitHub Pages through `.github/workflows/deploy.yml`.

### Prepare a local deployment build

```bash
make deploy
```

This copies arXiv and OpenAlex static data from `data/output/` into `frontend/public/data/`, then builds the frontend.

### Automatic GitHub Pages deployment

```bash
git push origin main
```

When `main` is updated, GitHub Actions:

1. Installs frontend dependencies.
2. Copies static data into `frontend/public/data/`.
3. Runs `npm run build`.
4. Uploads `frontend/dist`.
5. Deploys the artifact to GitHub Pages.

Public URL:

```text
https://daiduo2.github.io/academic-trend-monitor/
```

---

## Repository Structure

```text
academic-trend-monitor/
├── .github/workflows/          # GitHub Actions, including Pages deployment
├── config/                     # Topic modeling and LLM prompt configuration
├── data/
│   ├── raw/                    # Raw local/downloaded data
│   └── output/                 # Static JSON / JSONL consumed by the frontend
├── docs/
│   ├── assets/                 # README and documentation assets
│   ├── geb/                    # GEB self-reference documentation
│   ├── plans/                  # Design, implementation, and run logs
│   └── superpowers/            # Current frontend design and implementation plans
├── frontend/                   # React + Vite frontend
│   ├── public/                 # Static data copied before build
│   └── src/
│       ├── components/         # Shared and OpenAlex visualization components
│       ├── hooks/              # Static data loading hooks
│       ├── utils/              # Normalization and scene layout algorithms
│       └── views/              # Page-level views
├── pipeline/                   # arXiv / OpenAlex data processing scripts
├── tests/                      # Python data pipeline tests
├── Makefile                    # Development, test, and deployment commands
├── README.md                   # Chinese README
└── README.en.md                # English README
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`PROJECT.md`](PROJECT.md) | Higher-level project positioning |
| [`docs/geb/`](docs/geb/) | GEB documentation entry |
| [`docs/plans/`](docs/plans/) | Data pipeline, OpenAlex migration, and visualization design records |
| [`docs/superpowers/plans/2026-04-28-github-pages-openalex-deploy.md`](docs/superpowers/plans/2026-04-28-github-pages-openalex-deploy.md) | Current Pages deployment plan |
| [`frontend/src/views/`](frontend/src/views/) | Four main page entry points |

---

## Ecosystem Position

This project is the academic knowledge observation and visualization node of the broader “human-agent hybrid digital world” ecosystem.

```text
Human-agent hybrid digital world
├── Theory and framework layer
├── Agent collaboration and execution layer
├── Academic knowledge observation layer
│   └── Academic Trend Monitor (this repository)
└── User-facing knowledge product layer
```

### Related repositories

| Repository | Role | Link |
|------------|------|------|
| Academic Trend Monitor | Academic trend monitoring and visualization | Current page |
| Tashan projects | Ecosystem entry | [https://tashan.ac.cn](https://tashan.ac.cn) |

---

## Contributing

Recommended workflow:

1. Create a feature branch from `main`, for example `feature/openalex-visualization`.
2. Keep commit messages in the `<type>(<scope>): <short description>` format.
3. For frontend changes, run the relevant Vitest tests and `npm run build`.
4. For data pipeline changes, run the relevant Python tests.
5. Merge through a PR into `main` to trigger GitHub Pages deployment.

---

## Changelog

This repository is still evolving quickly. Important changes are tracked in `docs/plans/` and a future `CHANGELOG.md`.

---

## License

This project is released under the [MIT License](https://opensource.org/licenses/MIT).

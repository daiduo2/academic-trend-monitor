.PHONY: help pipeline deploy clean install frontend-install test db-init publish-topics daily-tag daily-analysis export-static evolution-analysis math-lo-benchmark math-ag-benchmark evolution-graph evolution-analytics evolution-loop evolution-test viz-prep viz graphiti-up graphiti-down graphiti-import graphiti-export

help:
	@echo "Academic Trend Monitor - 可用命令:"
	@echo ""
	@echo "  make install              - 安装 Python 依赖"
	@echo "  make frontend-install     - 安装前端依赖"
	@echo "  make test                 - 运行测试"
	@echo "  make pipeline             - 运行完整数据处理流水线"
	@echo "  make db-init              - 初始化 PostgreSQL schema"
	@echo "  make publish-topics       - 发布月度主题到 PostgreSQL"
	@echo "  make daily-tag            - 抓取并打标新论文到 PostgreSQL"
	@echo "  make daily-analysis       - 生成每日 LLM 分析并写入 PostgreSQL"
	@echo "  make export-static        - 从 PostgreSQL 导出静态 JSON/JSONL"
	@echo "  make deploy               - 部署到 GitHub Pages"
	@echo "  make clean                - 清理生成的数据"
	@echo "  make evolution-analysis   - 运行历史主题演化分析"
	@echo "  make math-lo-benchmark    - 运行 Math.LO benchmark 检查"
	@echo "  make math-ag-benchmark    - 运行 Math.AG benchmark 检查"
	@echo "  make evolution-graph      - 生成演化图"
	@echo "  make evolution-analytics  - 运行演化分析"
	@echo "  make evolution-loop       - 运行自主演化循环"
	@echo "  make evolution-test       - 运行演化测试"
	@echo "  make viz-prep             - 准备可视化数据"
	@echo "  make viz                  - 准备并确认可视化"
	@echo "  make graphiti-up          - 启动 Graphiti Docker Compose"
	@echo "  make graphiti-down        - 停止 Graphiti Docker Compose"
	@echo "  make graphiti-import      - 导入数据到 Graphiti"
	@echo "  make graphiti-export      - 导出 Graphiti 静态快照"
	@echo ""

install:
	pip install -r requirements.txt

frontend-install:
	cd frontend && npm install

test:
	pytest tests/ -v

db-init:
	uv run python -m pipeline.db

pipeline:
	@echo "运行数据处理流水线..."
	@echo "Step 1/3: BERTopic modeling..."
	python pipeline/01_bertopic.py
	@echo "Step 2/3: Building hierarchy..."
	python pipeline/02_hierarchy.py
	@echo "Step 3/3: Aligning topics..."
	python pipeline/03_alignment.py
	@echo "流水线完成，数据已生成到 data/output/"

publish-topics:
	uv run python -m pipeline.publish_topics_to_db

daily-tag:
	uv run python -m pipeline.daily_tag_metadata

daily-fetch:
	uv run python -m pipeline.daily_fetch_metadata

daily-analysis:
	uv run python -m pipeline.daily_generate_analysis

export-static:
	uv run python -m pipeline.export_recent_static
	uv run python -m pipeline.export_weekly_static
	uv run python -m pipeline.export_analysis_static

evolution-analysis:
	@echo "运行历史主题演化分析..."
	python3 pipeline/evolution_analysis.py
	@echo "分析完成，结果已生成到 data/output/"

math-lo-benchmark:
	@echo "运行 Math.LO benchmark 检查..."
	python3 pipeline/math_lo_benchmark.py
	@echo "Math.LO benchmark 完成，结果已生成到 data/output/benchmarks/math_lo/"

math-ag-benchmark:
	@echo "运行 Math.AG benchmark 检查..."
	python3 pipeline/math_ag_benchmark.py
	@echo "Math.AG benchmark 完成"

deploy:
	@echo "构建前端并部署..."
	@mkdir -p frontend/public/data frontend/public/data/output frontend/public/data/weekly frontend/public/data/analysis/daily
	@cp data/output/*.json frontend/public/data/ || echo "No data files yet"
	@cp data/output/*.json frontend/public/data/output/ || echo "No output data files yet"
	@mkdir -p frontend/public/data/evolution_case_detail
	@cp -r data/output/evolution_case_detail/. frontend/public/data/evolution_case_detail/ || echo "No evolution case detail yet"
	@mkdir -p frontend/public/data/output/evolution_graphs
	@cp -r data/output/evolution_graphs/. frontend/public/data/output/evolution_graphs/ 2>/dev/null || echo "No evolution_graphs files yet"
	@cp data/recent.jsonl frontend/public/data/ || echo "No recent data yet"
	@cp -r data/weekly/. frontend/public/data/weekly/ || echo "No weekly data yet"
	@cp -r data/analysis/daily/. frontend/public/data/analysis/daily/ || echo "No analysis data yet"
	cd frontend && npm run build
	@echo "构建完成。请推送代码触发 GitHub Pages 静态部署。"

clean:
	@echo "清理生成的数据..."
	rm -rf data/output/*.json
	rm -rf data/output/evolution_case_detail
	rm -f data/output/evolution_report.md
	rm -rf data/output/bertopic/*
	rm -rf data/output/hierarchy/*
	rm -rf pipeline/__pycache__
	rm -rf frontend/dist
	@echo "清理完成"

# Evolution Analysis Loop
GRAPH_OUTPUT_DIR=data/output/evolution_graphs

evolution-graph:
	@mkdir -p $(GRAPH_OUTPUT_DIR)
	python3 -m pipeline.evolution_loop \
		--domain=math \
		--config=config/evolution_domains/math.yaml \
		--cases=data/output/evolution_cases.json

evolution-analytics:
	python3 -m pipeline.evolution_analytics \
		--graph=$(GRAPH_OUTPUT_DIR)/math_graph.json \
		--output=data/output/evolution_anomalies.json

evolution-loop:
	python3 -m pipeline.evolution_loop --mode=autonomous --domain=math

evolution-test:
	pytest tests/test_evolution_*.py -v

viz-prep:
	python3 pipeline/evolution_viz_prep.py

viz: viz-prep
	@echo "Visualization data prepared"

# Graphiti Docker targets
GRAPHITI_DIR=graphiti-server

graphiti-up:
	@echo "Starting Graphiti Docker Compose..."
	cd $(GRAPHITI_DIR) && docker-compose up -d
	@echo "Graphiti server starting on http://localhost:8000"

graphiti-down:
	@echo "Stopping Graphiti Docker Compose..."
	cd $(GRAPHITI_DIR) && docker-compose down

graphiti-import:
	@echo "Importing data into Graphiti..."
	cd $(GRAPHITI_DIR) && python import_data.py --snapshot ../frontend/public/data/graphiti_snapshot.json

graphiti-export:
	@echo "Exporting Graphiti snapshot..."
	mkdir -p frontend/public/data
	uv run python -m pipeline.export_graphiti_snapshot --output frontend/public/data/graphiti_snapshot.json --domains math cs physics

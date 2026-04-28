.PHONY: help pipeline deploy clean install frontend-install test evolution-analysis math-benchmark math-lo-benchmark math-ag-benchmark openalex-math-ingest

help:
	@echo "Academic Trend Monitor - 可用命令:"
	@echo ""
	@echo "  make install          - 安装 Python 依赖"
	@echo "  make frontend-install - 安装前端依赖"
	@echo "  make test             - 运行测试"
	@echo "  make pipeline         - 运行完整数据处理流水线"
	@echo "  make evolution-analysis - 运行历史主题演化分析"
	@echo "  make math-benchmark   - 运行统一 Math 基准检查 (math_lo + math_ag)"
	@echo "  make math-lo-benchmark - 运行 Math.LO 基准检查"
	@echo "  make math-ag-benchmark - 运行 Math.AG 基准检查"
	@echo "  make openalex-math-ingest - 运行 OpenAlex 2025 数学原始数据抓取"
	@echo "  make deploy           - 部署到 GitHub Pages"
	@echo "  make clean            - 清理生成的数据"
	@echo ""

install:
	pip install -r requirements.txt

frontend-install:
	cd frontend && npm install

test:
	pytest tests/ -v

pipeline:
	@echo "运行数据处理流水线..."
	@echo "Step 1/3: BERTopic modeling..."
	python pipeline/01_bertopic.py
	@echo "Step 2/3: Building hierarchy..."
	python pipeline/02_hierarchy.py
	@echo "Step 3/3: Aligning topics..."
	python pipeline/03_alignment.py
	@echo "流水线完成，数据已生成到 data/output/"

evolution-analysis:
	@echo "运行历史主题演化分析..."
	python3 pipeline/evolution_analysis.py
	@echo "分析完成，结果已生成到 data/output/"

math-benchmark:
	@echo "运行统一 Math benchmark..."
	python3 pipeline/math_benchmark.py --domain math_lo
	python3 pipeline/math_benchmark.py --domain math_ag
	@echo "统一 Math benchmark 完成，结果已生成到 data/output/benchmarks/"

math-lo-benchmark:
	@echo "运行 Math.LO benchmark..."
	python3 pipeline/math_lo_benchmark.py
	@echo "Math.LO benchmark 完成，结果已生成到 data/output/benchmarks/math_lo/"

math-ag-benchmark:
	@echo "运行 Math.AG benchmark..."
	python3 pipeline/math_ag_benchmark.py
	@echo "Math.AG benchmark 完成，结果已生成到 data/output/benchmarks/math_ag/"

openalex-math-ingest:
	@echo "运行 OpenAlex 2025 数学原始数据抓取..."
	python3 pipeline/openalex_ingest.py $(OPENALEX_INGEST_ARGS)
	@echo "OpenAlex 原始数据抓取完成，结果已生成到 data/raw/openalex/"

deploy:
	@echo "构建前端并部署..."
	@mkdir -p frontend/public/data frontend/public/data/output frontend/public/data/weekly frontend/public/data/analysis/daily
	@cp data/output/*.json frontend/public/data/ || echo "No data files yet"
	@cp data/output/*.json frontend/public/data/output/ || echo "No output data files yet"
	@rm -rf frontend/public/data/output/kg_v1_visualization frontend/public/data/output/kg_v1_pr_conditional_visualization frontend/public/data/output/openalex_graph_v1_visualization frontend/public/data/output/openalex_topic_embeddings frontend/public/data/output/openalex_full_paper_light_paper_cloud frontend/public/data/output/openalex_full_paper_topic_peak_globe
	@mkdir -p frontend/public/data/output/kg_v1_visualization frontend/public/data/output/kg_v1_pr_conditional_visualization frontend/public/data/output/openalex_graph_v1_visualization frontend/public/data/output/openalex_topic_embeddings frontend/public/data/output/openalex_full_paper_light_paper_cloud frontend/public/data/output/openalex_full_paper_topic_peak_globe
	@cp -r data/output/kg_v1_visualization/. frontend/public/data/output/kg_v1_visualization/ || echo "No baseline KG bundle yet"
	@cp -r data/output/kg_v1_pr_conditional_visualization/. frontend/public/data/output/kg_v1_pr_conditional_visualization/ || echo "No preview KG bundle yet"
	@cp -r data/output/openalex_graph_v1_visualization/. frontend/public/data/output/openalex_graph_v1_visualization/ || echo "No OpenAlex graph visualization bundle yet"
	@cp -r data/output/openalex_topic_embeddings/. frontend/public/data/output/openalex_topic_embeddings/ || echo "No OpenAlex topic embeddings bundle yet"
	@cp -r data/output/openalex_full_paper_light_paper_cloud/. frontend/public/data/output/openalex_full_paper_light_paper_cloud/ || echo "No OpenAlex light paper cloud bundle yet"
	@cp -r data/output/openalex_full_paper_topic_peak_globe/. frontend/public/data/output/openalex_full_paper_topic_peak_globe/ || echo "No OpenAlex topic peak globe bundle yet"
	@mkdir -p frontend/public/data/evolution_case_detail
	@cp -r data/output/evolution_case_detail/. frontend/public/data/evolution_case_detail/ || echo "No evolution case detail yet"
	@cp data/recent.jsonl frontend/public/data/ || echo "No recent data yet"
	@cp -r data/weekly/. frontend/public/data/weekly/ || echo "No weekly data yet"
	@cp -r data/analysis/daily/. frontend/public/data/analysis/daily/ || echo "No analysis data yet"
	cd frontend && npm run build
	@echo "构建完成。请推送代码触发 GitHub Actions 自动部署。"

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

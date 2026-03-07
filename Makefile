.PHONY: help pipeline deploy clean install frontend-install test

help:
	@echo "Academic Trend Monitor - 可用命令:"
	@echo ""
	@echo "  make install          - 安装 Python 依赖"
	@echo "  make frontend-install - 安装前端依赖"
	@echo "  make test             - 运行测试"
	@echo "  make pipeline         - 运行完整数据处理流水线"
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

deploy:
	@echo "构建前端并部署..."
	@mkdir -p frontend/public/data
	@cp data/output/*.json frontend/public/data/ || echo "No data files yet"
	cd frontend && npm run build
	@echo "构建完成。请推送代码触发 GitHub Actions 自动部署。"

clean:
	@echo "清理生成的数据..."
	rm -rf data/output/*.json
	rm -rf data/output/bertopic/*
	rm -rf data/output/hierarchy/*
	rm -rf pipeline/__pycache__
	rm -rf frontend/dist
	@echo "清理完成"

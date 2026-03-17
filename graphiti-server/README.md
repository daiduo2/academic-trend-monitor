# Graphiti Backend Server

FastAPI backend server with Kuzu graph database for academic trend evolution analysis.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **Kuzu** - Embedded graph database (no external service needed)
- **Graphiti** - Temporal knowledge graph for tracking topic evolution

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/domains` | List available domains |
| `GET /api/evolution/timeline?topic_id=` | Get evolution path for a topic |
| `GET /api/evolution/network?period=` | Get network for a time period |

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Import data from pipeline
python import_data.py --pipeline-path ../data/output/evolution_graphs

# Run server
uvicorn main:app --reload
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or manually
docker build -t graphiti-server .
docker run -p 8000:8000 -v $(pwd)/data:/app/data graphiti-server
```

## Data Import

Import pipeline JSON files into Kuzu database:

```bash
python import_data.py \
    --pipeline-path ../data/output/evolution_graphs \
    --db-dir ./data/kuzu \
    --domain math
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KUZU_DATABASE_PATH` | `./data/kuzu` | Kuzu database directory |
| `DATA_PIPELINE_PATH` | `../data/output/evolution_graphs` | Pipeline output path |

## Project Structure

```
graphiti-server/
├── main.py              # FastAPI application
├── import_data.py       # Data import script
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container image
├── docker-compose.yml   # Docker Compose config
└── data/kuzu/          # Kuzu database files
```

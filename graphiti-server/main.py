"""
Graphiti + Kuzu Backend Server
FastAPI server for academic trend evolution graph queries.
"""

import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import kuzu

# Configuration
KUZU_DB_DIR = os.getenv("KUZU_DATABASE_PATH", "./data/kuzu")
KUZU_DB_PATH = os.path.join(KUZU_DB_DIR, "academic_trends.db")
PIPELINE_DATA_PATH = os.getenv("DATA_PIPELINE_PATH", "../data/output/evolution_graphs")

# Pydantic Models
class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: str

class NodeData(BaseModel):
    id: str
    topic_id: str
    name: str
    period: str
    category: str
    mode: str
    paper_count: int

class EdgeData(BaseModel):
    source: str
    target: str
    relation_type: str
    confidence: float

class TimelineResponse(BaseModel):
    topic_id: str
    topic_name: str
    start_date: Optional[str]
    end_date: Optional[str]
    nodes: List[NodeData]
    edges: List[EdgeData]

class NetworkNode(BaseModel):
    id: str
    topic_id: str
    name: str
    category: str
    mode: str
    paper_count: int
    x: Optional[float] = None
    y: Optional[float] = None

class NetworkEdge(BaseModel):
    source: str
    target: str
    relation_type: str
    confidence: float

class NetworkResponse(BaseModel):
    period: str
    category: Optional[str]
    total_nodes: int
    total_edges: int
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]

class DomainInfo(BaseModel):
    id: str
    name: str
    available: bool

class DomainsResponse(BaseModel):
    domains: List[DomainInfo]
    default_domain: str

# Global database connection
db = None

def get_db():
    """Get or initialize database connection."""
    global db
    if db is None:
        os.makedirs(KUZU_DB_DIR, exist_ok=True)
        db = kuzu.Database(KUZU_DB_PATH)
        conn = kuzu.Connection(get_db())
        _init_schema(conn)
    return db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle."""
    # Startup: Initialize Kuzu database
    get_db()

    yield

    # Shutdown: Cleanup
    global db
    db = None

app = FastAPI(
    title="Graphiti Academic Trend API",
    description="Backend API for academic research trend evolution analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _init_schema(conn: kuzu.Connection):
    """Initialize Kuzu database schema."""
    # Create node tables
    try:
        conn.execute("""
            CREATE NODE TABLE IF NOT EXISTS Topic(
                id STRING,
                topic_id STRING,
                name STRING,
                period STRING,
                category STRING,
                mode STRING,
                paper_count INT64,
                PRIMARY KEY (id)
            )
        """)
    except Exception:
        pass  # Table may already exist

    try:
        conn.execute("""
            CREATE NODE TABLE IF NOT EXISTS ResearchArea(
                id STRING,
                name STRING,
                category STRING,
                PRIMARY KEY (id)
            )
        """)
    except Exception:
        pass

    # Create relationship tables
    try:
        conn.execute("""
            CREATE REL TABLE IF NOT EXISTS EVOLVED_FROM(
                FROM Topic TO Topic,
                confidence DOUBLE,
                MANY_MANY
            )
        """)
    except Exception:
        pass

    try:
        conn.execute("""
            CREATE REL TABLE IF NOT EXISTS SIMILAR_TO(
                FROM Topic TO Topic,
                confidence DOUBLE,
                MANY_MANY
            )
        """)
    except Exception:
        pass

    try:
        conn.execute("""
            CREATE REL TABLE IF NOT EXISTS BELONGS_TO(
                FROM Topic TO ResearchArea,
                MANY_MANY
            )
        """)
    except Exception:
        pass

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    db_instance = get_db()
    return HealthResponse(
        status="healthy",
        database="connected" if db_instance else "disconnected",
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/api/domains", response_model=DomainsResponse)
async def list_domains():
    """List available domains."""
    manifest_path = Path(PIPELINE_DATA_PATH) / "manifest.json"

    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        return DomainsResponse(
            domains=[DomainInfo(**d) for d in manifest.get("domains", [])],
            default_domain=manifest.get("default_domain", "math")
        )

    # Default fallback
    return DomainsResponse(
        domains=[
            DomainInfo(id="math", name="Mathematics", available=True),
            DomainInfo(id="cs", name="Computer Science", available=False),
            DomainInfo(id="physics", name="Physics", available=False)
        ],
        default_domain="math"
    )

@app.get("/api/evolution/timeline", response_model=TimelineResponse)
async def get_timeline(
    topic_id: str = Query(..., description="Topic ID to get evolution for"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM)")
):
    """Get evolution timeline for a specific topic."""
    conn = kuzu.Connection(get_db())

    # Build query to get topic nodes across periods
    query = """
        MATCH (t:Topic)
        WHERE t.topic_id = $topic_id
    """

    if start_date:
        query += " AND t.period >= $start_date"
    if end_date:
        query += " AND t.period <= $end_date"

    query += " RETURN t.id, t.topic_id, t.name, t.period, t.category, t.mode, t.paper_count ORDER BY t.period"

    params = {"topic_id": topic_id}
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    result = conn.execute(query, params)

    nodes = []
    node_ids = set()

    while result.has_next():
        row = result.get_next()
        node = NodeData(
            id=row[0],
            topic_id=row[1],
            name=row[2],
            period=row[3],
            category=row[4],
            mode=row[5],
            paper_count=row[6]
        )
        nodes.append(node)
        node_ids.add(node.id)

    if not nodes:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} not found")

    # Get edges between these nodes
    edges = []
    if len(node_ids) > 1:
        edge_query = """
            MATCH (a:Topic)-[r:EVOLVED_FROM]->(b:Topic)
            WHERE a.topic_id = $topic_id AND b.topic_id = $topic_id
            RETURN a.id, b.id, r.confidence
        """
        edge_result = conn.execute(edge_query, {"topic_id": topic_id})

        while edge_result.has_next():
            row = edge_result.get_next()
            edges.append(EdgeData(
                source=row[1],  # b is earlier (target of EVOLVED_FROM)
                target=row[0],  # a is later (source of EVOLVED_FROM)
                relation_type="EVOLVED_FROM",
                confidence=row[2]
            ))

    return TimelineResponse(
        topic_id=topic_id,
        topic_name=nodes[0].name if nodes else "",
        start_date=start_date or (nodes[0].period if nodes else None),
        end_date=end_date or (nodes[-1].period if nodes else None),
        nodes=nodes,
        edges=edges
    )

@app.get("/api/evolution/network", response_model=NetworkResponse)
async def get_network(
    period: str = Query(..., description="Time period (YYYY-MM)"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Get network graph for a specific time period."""
    conn = kuzu.Connection(get_db())

    # Build query for nodes
    query = "MATCH (t:Topic) WHERE t.period = $period"
    params = {"period": period}

    if category:
        query += " AND t.category = $category"
        params["category"] = category

    query += " RETURN t.id, t.topic_id, t.name, t.category, t.mode, t.paper_count"

    result = conn.execute(query, params)

    nodes = []
    node_ids = set()

    while result.has_next():
        row = result.get_next()
        node = NetworkNode(
            id=row[0],
            topic_id=row[1],
            name=row[2],
            category=row[3],
            mode=row[4],
            paper_count=row[5]
        )
        nodes.append(node)
        node_ids.add(node.id)

    # Get edges between nodes in this period
    edges = []
    if node_ids:
        # Query for SIMILAR_TO edges
        edge_query = """
            MATCH (a:Topic)-[r:SIMILAR_TO]->(b:Topic)
            WHERE a.period = $period AND b.period = $period
            RETURN a.id, b.id, r.confidence
        """
        edge_result = conn.execute(edge_query, {"period": period})

        while edge_result.has_next():
            row = edge_result.get_next()
            source_id = row[0]
            target_id = row[1]
            if source_id in node_ids and target_id in node_ids:
                edges.append(NetworkEdge(
                    source=source_id,
                    target=target_id,
                    relation_type="SIMILAR_TO",
                    confidence=row[2]
                ))

    return NetworkResponse(
        period=period,
        category=category,
        total_nodes=len(nodes),
        total_edges=len(edges),
        nodes=nodes,
        edges=edges
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import json
from pathlib import Path

def load_monthly_data(period: str) -> list[dict]:
    """Load raw arXiv data for a given period (YYYY-MM)."""
    data_path = Path("data/raw") / f"{period}.jsonl"

    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    documents = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            doc = json.loads(line.strip())
            documents.append({
                "id": doc["id"],
                "title": doc["title"],
                "abstract": doc["abstract"],
                "categories": doc["categories"],
                "primary_category": doc.get("primary_category", doc["categories"][0] if doc["categories"] else ""),
                "created": doc["created"]
            })

    return documents

def get_available_periods() -> list[str]:
    """Get list of available data periods."""
    raw_dir = Path("data/raw")
    if not raw_dir.exists():
        return []

    periods = []
    for f in sorted(raw_dir.glob("*.jsonl")):
        periods.append(f.stem)
    return periods

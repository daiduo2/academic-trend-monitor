# pipeline/utils/compact_format.py
CATEGORY_MAP = {
    "cs.AI": "AI",
    "cs.CV": "CV",
    "cs.CL": "CL",
    "cs.LG": "LG",
    "cs.RO": "RO",
    "cs.DB": "DB",
    "cs.CR": "CR",
    "cs.DS": "DS",
    "cs.GT": "GT",
    "cs.HC": "HC",
    "cs.IR": "IR",
    "cs.MA": "MA",
    "cs.MM": "MM",
    "cs.NE": "NE",
    "cs.OS": "OS",
    "cs.PF": "PF",
    "cs.PL": "PL",
    "cs.SE": "SE",
    "cs.SC": "SC",
    "cs.SD": "SD",
    "cs.SY": "SY",
}

def compact_paper(paper: dict) -> dict:
    """Convert full paper metadata to compact format."""
    category = paper.get("primary_category", "")
    cat_code = CATEGORY_MAP.get(category, category.split(".")[0] if "." in category else category)

    published = paper.get("published", "")
    if "T" in published:
        date_str = published.split("T")[0].replace("-", "")[2:]  # 250307
    else:
        date_str = published.replace("-", "")[2:]

    return {
        "i": paper["id"],
        "t": paper["title"],
        "a": paper.get("authors", [])[:3],
        "c": cat_code,
        "p": date_str,
        "g": paper.get("tags", []),
        "s": paper.get("scores", [])  # Add scores for each tag
    }

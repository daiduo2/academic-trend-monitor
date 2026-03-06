import os
import yaml
from pathlib import Path

def load_config() -> dict:
    """Load configuration from config/settings.yaml."""
    config_path = Path("config/settings.yaml")

    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Override with environment variables
    if os.getenv("LLM_API_KEY"):
        config["llm"]["api_key"] = os.getenv("LLM_API_KEY")

    return config

def get_llm_config() -> dict:
    """Get LLM configuration."""
    return load_config()["llm"]

def get_topic_modeling_config() -> dict:
    """Get topic modeling configuration."""
    return load_config()["topic_modeling"]

def get_categories() -> dict:
    """Get arXiv categories mapping."""
    return load_config()["categories"]

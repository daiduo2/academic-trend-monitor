import pytest
from pipeline.utils.config import load_config, get_llm_config, get_topic_modeling_config, get_categories

def test_load_config_returns_dict():
    config = load_config()
    assert isinstance(config, dict)
    assert "llm" in config
    assert "topic_modeling" in config

def test_get_llm_config():
    llm_config = get_llm_config()
    assert "provider" in llm_config
    assert "model" in llm_config
    assert llm_config["provider"] == "deepseek"

def test_get_topic_modeling_config():
    config = get_topic_modeling_config()
    assert "embedding_model" in config
    assert "min_topic_size" in config

def test_get_categories():
    categories = get_categories()
    assert isinstance(categories, dict)
    assert "cs.AI" in categories
    assert "math.AG" in categories

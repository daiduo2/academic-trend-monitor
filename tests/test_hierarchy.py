import pytest
from unittest.mock import patch, MagicMock
from pipeline.hierarchy_builder import CoarseClusterer, HierarchyBuilder


def test_coarse_clusterer_groups_by_category():
    topics = [
        {"topic_id": 1, "keywords": ["neural", "network"], "representative_docs": [
            {"categories": ["cs.AI"], "primary_category": "cs.AI"}
        ]},
        {"topic_id": 2, "keywords": ["image", "classification"], "representative_docs": [
            {"categories": ["cs.CV"], "primary_category": "cs.CV"}
        ]}
    ]

    with patch("pipeline.hierarchy_builder.get_categories") as mock_get_cat:
        mock_get_cat.return_value = {
            "cs.AI": "Artificial Intelligence",
            "cs.CV": "Computer Vision"
        }
        clusterer = CoarseClusterer()
        result = clusterer.cluster_by_category(topics)

        assert "cs.AI" in result
        assert "cs.CV" in result
        assert len(result["cs.AI"]) == 1
        assert result["cs.AI"][0]["topic_id"] == 1


def test_build_hierarchy():
    topics = [
        {"topic_id": 1, "keywords": ["neural", "network"], "name": "Neural Networks"},
        {"topic_id": 2, "keywords": ["cnn", "convolution"], "name": "CNN"},
        {"topic_id": 3, "keywords": ["transformer", "attention"], "name": "Transformer"}
    ]

    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        with patch("pipeline.hierarchy_builder.LLMClient") as mock_llm:
            mock_client = MagicMock()
            mock_llm.return_value = mock_client
            mock_client.complete_json.return_value = {
                "levels": [
                    {"level": 3, "nodes": [{"id": "topic_1", "name": "Deep Learning", "children": ["topic_2", "topic_3"], "primary_parent": None}]}
                ]
            }

            builder = HierarchyBuilder()
            result = builder.build_hierarchy(topics, "cs.AI")

            assert "levels" in result
            assert len(result["levels"]) > 0

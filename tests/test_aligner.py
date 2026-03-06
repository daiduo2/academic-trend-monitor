import pytest
from unittest.mock import patch, MagicMock
from pipeline.topic_aligner import TopicAligner


def test_align_topics():
    prev_topics = {
        "topic_1": {"name": "Neural Networks", "keywords": ["neural", "network"]}
    }
    curr_topics = {
        "topic_2": {"name": "Deep Learning", "keywords": ["deep", "learning", "neural"]}
    }

    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        with patch("pipeline.topic_aligner.LLMClient") as mock_llm:
            mock_client = MagicMock()
            mock_llm.return_value = mock_client
            mock_client.complete_json.return_value = {
                "is_same_concept": True,
                "confidence": 0.85,
                "relationship": "same",
                "suggested_name": "Neural Networks"
            }

            aligner = TopicAligner()
            result = aligner.align_topics(prev_topics, curr_topics)

            assert "topic_1" in result
            assert result["topic_1"]["next_id"] == "topic_2"


def test_compare_topics():
    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        with patch("pipeline.topic_aligner.LLMClient") as mock_llm:
            mock_client = MagicMock()
            mock_llm.return_value = mock_client
            mock_client.complete_json.return_value = {
                "is_same_concept": False,
                "confidence": 0.3,
                "relationship": "different"
            }

            aligner = TopicAligner()
            topic_a = {"name": "Quantum Physics", "keywords": ["quantum", "physics"]}
            topic_b = {"name": "Machine Learning", "keywords": ["ml", "ai"]}

            result = aligner.compare_topics(topic_a, topic_b)

            assert "is_same_concept" in result
            assert result["is_same_concept"] == False

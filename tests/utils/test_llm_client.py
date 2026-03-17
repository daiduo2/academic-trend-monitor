import pytest
from unittest.mock import patch, MagicMock
from pipeline.utils.llm_client import LLMClient

def test_llm_client_initialization():
    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        client = LLMClient()
        assert client.provider == "deepseek"

def test_llm_client_complete():
    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        with patch("pipeline.utils.llm_client.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create.return_value.choices = [
                MagicMock(message=MagicMock(content='{"result": "test"}'))
            ]

            client = LLMClient()
            result = client.complete("Test prompt")
            assert result == '{"result": "test"}'

def test_llm_client_complete_json():
    with patch("pipeline.utils.llm_client.get_llm_config") as mock_config:
        mock_config.return_value = {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "test-key"
        }
        with patch("pipeline.utils.llm_client.OpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create.return_value.choices = [
                MagicMock(message=MagicMock(content='{"result": "test"}'))
            ]

            client = LLMClient()
            result = client.complete_json("Test prompt")
            assert result == {"result": "test"}

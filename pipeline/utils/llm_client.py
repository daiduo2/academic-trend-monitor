import os
import json
import re
from openai import OpenAI
from pipeline.utils.config import get_llm_config


class LLMClient:
    """LLM client for calling DeepSeek API."""

    def __init__(self):
        config = get_llm_config()
        self.provider = config["provider"]
        self.model = config["model"]
        self.base_url = config["base_url"]
        self.api_key = config.get("api_key") or os.getenv("LLM_API_KEY")

        if not self.api_key:
            raise ValueError("LLM API key not configured")

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

    def complete(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2000) -> str:
        """Call LLM with prompt and return response."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

    def complete_json(self, prompt: str, temperature: float = 0.3) -> dict:
        """Call LLM and parse response as JSON."""
        response = self.complete(prompt, temperature)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            raise

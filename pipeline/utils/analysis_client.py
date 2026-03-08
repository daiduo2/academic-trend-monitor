"""LLM analysis client adapters."""
from __future__ import annotations

import asyncio
import json
import os
import re
import shlex
import subprocess
from pathlib import Path
from typing import Any

from pipeline.utils.config import get_llm_config, load_config
from pipeline.utils.llm_client import LLMClient


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


class AnalysisClient:
    """Adapter that prefers Claude SDK, then CLI shell, then API fallback."""

    def __init__(self) -> None:
        config = load_config()
        analysis_config = config.get("analysis", {})
        llm_config = get_llm_config()

        self.command = os.getenv("CLAUDE_CODE_COMMAND") or analysis_config.get("command", "")
        self.fallback_to_api = bool(analysis_config.get("fallback_to_api", True))
        self.provider = analysis_config.get("provider", "claude_code")
        self.api_model = llm_config.get("model", "unknown")
        self.sdk_max_turns = int(os.getenv("CLAUDE_SDK_MAX_TURNS") or analysis_config.get("sdk_max_turns", 6))
        self.sdk_cwd = Path(os.getenv("CLAUDE_SDK_CWD") or analysis_config.get("sdk_cwd", ".")).resolve()
        self.anthropic_auth_token = os.getenv("ANTHROPIC_AUTH_TOKEN", "")
        self.anthropic_base_url = os.getenv("ANTHROPIC_BASE_URL") or analysis_config.get("anthropic_base_url", "")
        self.anthropic_model = os.getenv("ANTHROPIC_MODEL") or analysis_config.get("anthropic_model", "")

    def _prepare_anthropic_env(self) -> None:
        """Mirror IssueLab's Anthropic-compatible env contract for local SDK usage."""
        if self.anthropic_auth_token and not os.getenv("ANTHROPIC_API_KEY"):
            os.environ["ANTHROPIC_API_KEY"] = self.anthropic_auth_token
        if self.anthropic_base_url and not os.getenv("ANTHROPIC_BASE_URL"):
            os.environ["ANTHROPIC_BASE_URL"] = self.anthropic_base_url
        if self.anthropic_model and not os.getenv("ANTHROPIC_MODEL"):
            os.environ["ANTHROPIC_MODEL"] = self.anthropic_model

    async def _run_sdk_async(self, prompt: str) -> dict[str, Any]:
        self._prepare_anthropic_env()
        try:
            from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ResultMessage, TextBlock, query
        except ImportError as exc:
            raise RuntimeError("claude-agent-sdk is not installed") from exc

        response_chunks: list[str] = []
        metadata: dict[str, Any] = {
            "provider": "claude_agent_sdk",
            "mode": "daily_analysis",
            "max_turns": self.sdk_max_turns,
            "base_url": self.anthropic_base_url or os.getenv("ANTHROPIC_BASE_URL", ""),
            "model": self.anthropic_model or os.getenv("ANTHROPIC_MODEL", ""),
        }

        options_kwargs: dict[str, Any] = {"max_turns": self.sdk_max_turns}
        if self.sdk_cwd:
            options_kwargs["cwd"] = self.sdk_cwd

        try:
            options = ClaudeAgentOptions(**options_kwargs)
        except TypeError:
            options_kwargs.pop("cwd", None)
            options = ClaudeAgentOptions(**options_kwargs)

        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in getattr(message, "content", []):
                    if isinstance(block, TextBlock):
                        response_chunks.append(block.text)
            elif isinstance(message, ResultMessage):
                metadata["session_id"] = getattr(message, "session_id", "") or ""
                metadata["cost_usd"] = getattr(message, "total_cost_usd", 0.0) or 0.0
                metadata["num_turns"] = getattr(message, "num_turns", 0) or 0
                usage = getattr(message, "usage", {}) or {}
                metadata["usage"] = usage

        response_text = "".join(response_chunks).strip()
        if not response_text:
            raise RuntimeError("Claude SDK returned empty output")

        payload = _extract_json(response_text)
        payload.setdefault("model_meta", metadata)
        return payload

    def _run_sdk(self, prompt: str) -> dict[str, Any]:
        return asyncio.run(self._run_sdk_async(prompt))

    def _run_command(self, prompt: str) -> dict[str, Any]:
        self._prepare_anthropic_env()
        if not self.command:
            raise RuntimeError("CLAUDE_CODE_COMMAND is not configured")

        completed = subprocess.run(
            shlex.split(self.command),
            input=prompt,
            capture_output=True,
            text=True,
            check=True,
        )
        response_text = completed.stdout.strip() or completed.stderr.strip()
        if not response_text:
            raise RuntimeError("Claude Code command returned empty output")
        payload = _extract_json(response_text)
        payload.setdefault(
            "model_meta",
            {
                "provider": "claude_code_cli",
                "mode": "daily_analysis",
                "base_url": self.anthropic_base_url or os.getenv("ANTHROPIC_BASE_URL", ""),
                "model": self.anthropic_model or os.getenv("ANTHROPIC_MODEL", ""),
            },
        )
        return payload

    def complete_json(self, prompt: str) -> dict[str, Any]:
        try:
            return self._run_sdk(prompt)
        except Exception:
            if not self.fallback_to_api and not self.command:
                raise

        if self.command:
            try:
                return self._run_command(prompt)
            except Exception:
                if not self.fallback_to_api:
                    raise

        client = LLMClient()
        payload = client.complete_json(prompt)
        if "model_meta" not in payload:
            payload["model_meta"] = {
                "provider": client.provider,
                "model": self.api_model,
                "mode": "daily_analysis",
            }
        return payload

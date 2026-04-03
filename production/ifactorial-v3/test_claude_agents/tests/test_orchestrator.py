"""Tests for orchestrator.py — agent loop without needing Anthropic API."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from agent_runtime.orchestrator import (
    AgentRunResult,
    Orchestrator,
    StopReason,
    ToolCall,
    ToolResult,
)
from tests.conftest import MockContentBlock, MockResponse, make_text_response, make_tool_use_response
from tools.tool_dispatch import LocalToolDispatcher


class TestOrchestratorSimpleCall:
    def test_simple_agent_returns_text(self) -> None:
        orch = Orchestrator()
        mock_client = MagicMock()
        mock_client.messages.create.return_value = make_text_response("Hello world")
        orch._client = mock_client

        result = orch.run_agent(
            "ambiguity-scanner",
            system_prompt="You are a scanner.",
            user_message="Scan this spec.",
        )

        assert result.succeeded
        assert result.stop_reason == StopReason.COMPLETE
        assert result.final_text == "Hello world"
        assert result.total_tool_calls == 0
        assert len(result.turns) == 1


class TestOrchestratorMultiStep:
    def test_tool_use_loop_completes(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("read_file", lambda params: {"content": "file data"})

        orch = Orchestrator(tool_dispatcher=dispatcher)
        mock_client = MagicMock()

        # Turn 1: agent calls a tool
        # Turn 2: agent produces final text
        mock_client.messages.create.side_effect = [
            make_tool_use_response("read_file", {"path": "test.py"}),
            make_text_response("Done reading file."),
        ]
        orch._client = mock_client

        result = orch.run_agent(
            "socratic-validator",
            system_prompt="You are a validator.",
            user_message="Resolve this gap.",
            tools=[{"name": "read_file", "description": "Read a file", "input_schema": {}}],
        )

        assert result.succeeded
        assert result.total_tool_calls == 1
        assert len(result.turns) == 2
        assert result.turns[0].tool_calls[0].tool_name == "read_file"

    def test_tool_not_in_allowlist_rejected(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("dangerous_tool", lambda p: {"ok": True})

        orch = Orchestrator(tool_dispatcher=dispatcher)
        mock_client = MagicMock()

        # Agent tries to call a tool not in its allowlist
        mock_client.messages.create.side_effect = [
            make_tool_use_response("dangerous_tool", {}),
            make_text_response("Ok, I'll stop."),
        ]
        orch._client = mock_client

        result = orch.run_agent(
            "socratic-validator",
            system_prompt="Test",
            user_message="Test",
            tools=[{"name": "dangerous_tool", "description": "Bad", "input_schema": {}}],
        )

        # The tool call was made but should have returned an error
        assert result.turns[0].tool_results[0].is_error
        assert "TOOL_NOT_ALLOWED" in result.turns[0].tool_results[0].content

    def test_max_turns_stops_loop(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("db_query", lambda p: {"rows": []})

        orch = Orchestrator(tool_dispatcher=dispatcher)
        mock_client = MagicMock()

        # Agent keeps calling tools every turn, never finishes
        mock_client.messages.create.return_value = make_tool_use_response(
            "db_query", {"sql": "SELECT 1"}
        )
        orch._client = mock_client

        result = orch.run_agent(
            "socratic-validator",
            system_prompt="Test",
            user_message="Test",
            tools=[{"name": "db_query", "description": "Query", "input_schema": {}}],
        )

        assert result.stop_reason == StopReason.MAX_TURNS
        assert len(result.turns) == 5  # socratic-validator max_turns=5

    def test_max_tool_calls_stops_loop(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("db_query", lambda p: {"rows": []})

        orch = Orchestrator(tool_dispatcher=dispatcher)
        mock_client = MagicMock()

        # Return many tool calls in a single response
        multi_tool_response = MockResponse(
            content=[
                MockContentBlock(
                    type="tool_use", name="db_query", input={"sql": f"SELECT {i}"}, id=f"t{i}"
                )
                for i in range(20)  # Way more than socratic-validator's max_tool_calls=15
            ],
            stop_reason="tool_use",
        )
        mock_client.messages.create.return_value = multi_tool_response
        orch._client = mock_client

        result = orch.run_agent(
            "socratic-validator",
            system_prompt="Test",
            user_message="Test",
            tools=[{"name": "db_query", "description": "Query", "input_schema": {}}],
        )

        assert result.stop_reason == StopReason.MAX_TOOL_CALLS


class TestToolDispatcher:
    def test_dispatch_registered_tool(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("echo", lambda p: {"echo": p.get("msg", "")})

        result = dispatcher.dispatch(
            ToolCall(tool_name="echo", tool_input={"msg": "hi"}, tool_use_id="t1")
        )
        assert not result.is_error
        assert '"echo": "hi"' in result.content

    def test_dispatch_unknown_tool_returns_error(self) -> None:
        dispatcher = LocalToolDispatcher()
        result = dispatcher.dispatch(
            ToolCall(tool_name="nonexistent", tool_input={}, tool_use_id="t1")
        )
        assert result.is_error
        assert "UNKNOWN_TOOL" in result.content

    def test_dispatch_handler_exception_returns_error(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("bad_tool", lambda p: 1 / 0)

        result = dispatcher.dispatch(
            ToolCall(tool_name="bad_tool", tool_input={}, tool_use_id="t1")
        )
        assert result.is_error
        assert "TOOL_EXECUTION_ERROR" in result.content

    def test_registered_tools_returns_sorted(self) -> None:
        dispatcher = LocalToolDispatcher()
        dispatcher.register("zebra", lambda p: {})
        dispatcher.register("alpha", lambda p: {})
        assert dispatcher.registered_tools == ["alpha", "zebra"]

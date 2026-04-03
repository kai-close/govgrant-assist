"""Shared mock infrastructure for orchestrator tests."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

@dataclass
class MockUsage:
    input_tokens: int = 100
    output_tokens: int = 50

@dataclass
class MockContentBlock:
    type: str
    text: str = ""
    name: str = ""
    input: dict[str, Any] | None = None
    id: str = ""

@dataclass
class MockResponse:
    content: list[MockContentBlock] = field(default_factory=list)
    stop_reason: str = "end_turn"
    usage: MockUsage | None = None

def make_text_response(text: str, input_tokens: int = 100, output_tokens: int = 50) -> MockResponse:
    return MockResponse(
        content=[MockContentBlock(type="text", text=text)],
        usage=MockUsage(input_tokens=input_tokens, output_tokens=output_tokens),
    )

def make_tool_use_response(tool_name: str, tool_input: dict[str, Any], tool_id: str = "tool_1", input_tokens: int = 200, output_tokens: int = 100) -> MockResponse:
    return MockResponse(
        content=[MockContentBlock(type="tool_use", name=tool_name, input=tool_input, id=tool_id)],
        stop_reason="tool_use",
        usage=MockUsage(input_tokens=input_tokens, output_tokens=output_tokens),
    )

def make_multi_tool_response(tools: list[tuple[str, dict[str, Any], str]], input_tokens: int = 200, output_tokens: int = 100) -> MockResponse:
    return MockResponse(
        content=[MockContentBlock(type="tool_use", name=name, input=inp, id=tid) for name, inp, tid in tools],
        stop_reason="tool_use",
        usage=MockUsage(input_tokens=input_tokens, output_tokens=output_tokens),
    )

def make_mixed_response(text: str, tools: list[tuple[str, dict[str, Any], str]], input_tokens: int = 200, output_tokens: int = 100) -> MockResponse:
    content: list[MockContentBlock] = [MockContentBlock(type="text", text=text)]
    for name, inp, tid in tools:
        content.append(MockContentBlock(type="tool_use", name=name, input=inp, id=tid))
    return MockResponse(content=content, stop_reason="tool_use", usage=MockUsage(input_tokens=input_tokens, output_tokens=output_tokens))

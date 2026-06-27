"""Tests for fleet_runner.util: extract_json, maker_identity, checker_identity."""

from __future__ import annotations

import pytest

from fleet_runner.util import checker_identity, extract_json, maker_identity

# ---------------------------------------------------------------------------
# extract_json
# ---------------------------------------------------------------------------


class TestExtractJsonBareString:
    def test_simple_object(self):
        result = extract_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_integer_values(self):
        result = extract_json('{"requested_changes": false, "questions_raised": 2}')
        assert result["questions_raised"] == 2
        assert result["requested_changes"] is False

    def test_nested_object(self):
        result = extract_json('{"outer": {"inner": 1}}')
        assert result == {"outer": {"inner": 1}}

    def test_extra_whitespace(self):
        result = extract_json('   {"a": 1}   ')
        assert result == {"a": 1}


class TestExtractJsonFenced:
    def test_json_fenced_block(self):
        text = '```json\n{"foo": "bar"}\n```'
        result = extract_json(text)
        assert result == {"foo": "bar"}

    def test_plain_fenced_block_no_lang(self):
        text = '```\n{"foo": "bar"}\n```'
        result = extract_json(text)
        assert result == {"foo": "bar"}

    def test_fenced_with_surrounding_newlines(self):
        text = '\n```json\n{"x": 42}\n```\n'
        result = extract_json(text)
        assert result == {"x": 42}

    def test_fenced_multiline_value(self):
        text = '```json\n{"lines": "one\\ntwo"}\n```'
        result = extract_json(text)
        assert result["lines"] == "one\ntwo"


class TestExtractJsonEmbeddedInProse:
    def test_json_after_prose(self):
        text = 'Here is the result: {"status": "ok"} and that is all.'
        result = extract_json(text)
        assert result == {"status": "ok"}

    def test_json_before_prose(self):
        text = '{"done": true} is the answer.'
        result = extract_json(text)
        assert result == {"done": True}

    def test_json_in_middle_of_long_paragraph(self):
        text = (
            "The model output is as follows. "
            '{"requested_changes": false, "questions_raised": 0, "summary": "all good"} '
            "End of output."
        )
        result = extract_json(text)
        assert result["requested_changes"] is False
        assert result["summary"] == "all good"

    def test_json_with_nested_braces_in_prose(self):
        text = 'prefix {"outer": {"inner": "val"}} suffix'
        result = extract_json(text)
        assert result == {"outer": {"inner": "val"}}


class TestExtractJsonErrors:
    def test_none_raises(self):
        with pytest.raises(ValueError, match="no text"):
            extract_json(None)

    def test_no_json_in_string_raises(self):
        with pytest.raises(ValueError, match="no JSON"):
            extract_json("no JSON here at all")

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            extract_json("")


# ---------------------------------------------------------------------------
# maker_identity / checker_identity
# ---------------------------------------------------------------------------


class TestMakerIdentity:
    def test_format(self):
        result = maker_identity("run-001", "qwen2.5-coder-32b")
        assert result == "maker:fleet:run-001:qwen2.5-coder-32b"

    def test_parts(self):
        result = maker_identity("abc", "some-model")
        parts = result.split(":")
        assert parts[0] == "maker"
        assert parts[1] == "fleet"
        assert parts[2] == "abc"
        assert parts[3] == "some-model"

    def test_returns_string(self):
        assert isinstance(maker_identity("x", "y"), str)


class TestCheckerIdentity:
    def test_format(self):
        result = checker_identity("run-002", "claude-cli")
        assert result == "checker:fleet:run-002:claude-cli"

    def test_parts(self):
        result = checker_identity("rid", "claude-3")
        parts = result.split(":")
        assert parts[0] == "checker"
        assert parts[1] == "fleet"
        assert parts[2] == "rid"
        assert parts[3] == "claude-3"

    def test_returns_string(self):
        assert isinstance(checker_identity("x", "y"), str)

    def test_maker_and_checker_differ(self):
        mk = maker_identity("r", "model")
        ck = checker_identity("r", "model")
        assert mk != ck
        assert mk.startswith("maker:")
        assert ck.startswith("checker:")

"""Tests for fleet_runner.briefs: strip_frontmatter, load_brief."""

from __future__ import annotations

from pathlib import Path

import pytest

from fleet_runner.briefs import DEFAULT_BRIEFS, load_brief, strip_frontmatter

# ---------------------------------------------------------------------------
# strip_frontmatter
# ---------------------------------------------------------------------------


class TestStripFrontmatter:
    def test_removes_leading_frontmatter_block(self):
        text = "---\nrole: developer\ndescription: test\n---\nThis is the body."
        result = strip_frontmatter(text)
        assert result == "This is the body."

    def test_multiline_body_preserved(self):
        text = "---\nkey: val\n---\nLine one.\nLine two.\nLine three."
        result = strip_frontmatter(text)
        assert result == "Line one.\nLine two.\nLine three."

    def test_no_frontmatter_returns_stripped_text(self):
        text = "Just a plain markdown body."
        result = strip_frontmatter(text)
        assert result == "Just a plain markdown body."

    def test_empty_frontmatter_block(self):
        text = "---\n---\nBody here."
        result = strip_frontmatter(text)
        assert result == "Body here."

    def test_blank_body_after_frontmatter(self):
        text = "---\nkey: value\n---\n"
        result = strip_frontmatter(text)
        assert result == ""

    def test_leading_whitespace_stripped_from_body(self):
        text = "---\nx: 1\n---\n\n  Body with indent."
        result = strip_frontmatter(text)
        assert result == "Body with indent."

    def test_no_trailing_frontmatter_delimiter_is_left_as_is(self):
        # only one --- means no frontmatter block is detected
        text = "---\nThis is NOT frontmatter because there's no closing ---."
        result = strip_frontmatter(text)
        # the function returns it unchanged (stripped)
        assert result == text.strip()

    def test_empty_string(self):
        result = strip_frontmatter("")
        assert result == ""


# ---------------------------------------------------------------------------
# load_brief
# ---------------------------------------------------------------------------


class TestLoadBrief:
    def _make_repo(self, tmp_path: Path, role: str, content: str) -> Path:
        roles_dir = tmp_path / ".claude" / "agents" / "roles"
        roles_dir.mkdir(parents=True)
        (roles_dir / f"{role}.md").write_text(content, encoding="utf-8")
        return tmp_path

    def test_returns_file_body_when_role_file_exists(self, tmp_path):
        repo = self._make_repo(
            tmp_path,
            "developer",
            "---\nrole: developer\n---\nYou are a dev.",
        )
        result = load_brief(repo, "developer")
        assert result == "You are a dev."

    def test_returns_file_body_without_frontmatter_when_no_fm(self, tmp_path):
        repo = self._make_repo(tmp_path, "tester", "You are a tester persona.")
        result = load_brief(repo, "tester")
        assert result == "You are a tester persona."

    def test_falls_back_to_default_developer_when_file_absent(self, tmp_path):
        # no .claude directory at all
        result = load_brief(tmp_path, "developer")
        assert result == DEFAULT_BRIEFS["developer"]
        assert "developer" in result.lower() or "maker" in result.lower()

    def test_falls_back_to_default_tester_when_file_absent(self, tmp_path):
        result = load_brief(tmp_path, "tester")
        assert result == DEFAULT_BRIEFS["tester"]
        assert "checker" in result.lower() or "tester" in result.lower()

    def test_raises_when_role_unknown_and_no_file(self, tmp_path):
        with pytest.raises(FileNotFoundError, match="no brief for role"):
            load_brief(tmp_path, "nonexistent_role")

    def test_file_takes_priority_over_default(self, tmp_path):
        custom_text = "Custom developer brief, totally different."
        repo = self._make_repo(
            tmp_path,
            "developer",
            custom_text,
        )
        result = load_brief(repo, "developer")
        assert result == custom_text
        assert result != DEFAULT_BRIEFS["developer"]

    def test_strip_frontmatter_applied_to_file(self, tmp_path):
        repo = self._make_repo(
            tmp_path,
            "tester",
            "---\ntitle: Tester Brief\nversion: 1\n---\nYou review diffs carefully.",
        )
        result = load_brief(repo, "tester")
        assert "---" not in result
        assert result == "You review diffs carefully."

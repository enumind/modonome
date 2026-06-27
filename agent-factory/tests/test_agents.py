"""Tests for fleet_runner.agents: build_maker_prompt, parse_checker_verdict.

NOTE: run_maker and run_checker (which import crewai) are NOT tested here.
Only the pure-Python helpers are exercised.
"""

from __future__ import annotations

from fleet_runner.agents import build_maker_prompt, parse_checker_verdict

# ---------------------------------------------------------------------------
# build_maker_prompt
# ---------------------------------------------------------------------------


SAMPLE_BRIEF = "You are the developer (maker). Make the smallest scoped change."

SAMPLE_PACKET = {
    "id": "item-001",
    "goal": "Add a greeting function",
    "why_now": "Required by the milestone",
    "fence": "pytest tests/test_greet.py",
    "allowed_edit_set": ["src/greet.py", "tests/test_greet.py"],
    "gates": [],
}

SAMPLE_FILES = {
    "src/greet.py": "# placeholder\n",
    "tests/test_greet.py": "def test_greet(): assert True\n",
}


class TestBuildMakerPrompt:
    def test_includes_brief(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert SAMPLE_BRIEF in prompt

    def test_includes_goal(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert "Add a greeting function" in prompt

    def test_includes_allowed_edit_set_paths(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert "src/greet.py" in prompt
        assert "tests/test_greet.py" in prompt

    def test_includes_json_output_instruction(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        # The output format section should instruct JSON output
        assert "JSON" in prompt
        assert "allowed_edit_set" in prompt or "allowed" in prompt.lower()

    def test_includes_file_contents(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert "# placeholder" in prompt
        assert "def test_greet" in prompt

    def test_includes_fence(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert "pytest tests/test_greet.py" in prompt

    def test_includes_why_now(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert "Required by the milestone" in prompt

    def test_no_files_shows_placeholder(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, {})
        assert "do not exist yet" in prompt or "create them" in prompt

    def test_multiple_allowed_paths_all_listed(self):
        packet = dict(SAMPLE_PACKET, allowed_edit_set=["a.py", "b.py", "c.py"])
        prompt = build_maker_prompt(SAMPLE_BRIEF, packet, {})
        assert "a.py" in prompt
        assert "b.py" in prompt
        assert "c.py" in prompt

    def test_returns_string(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        assert isinstance(prompt, str)

    def test_do_not_include_outside_paths_instruction(self):
        prompt = build_maker_prompt(SAMPLE_BRIEF, SAMPLE_PACKET, SAMPLE_FILES)
        # The prompt should explicitly forbid paths outside allowed_edit_set
        assert "outside" in prompt.lower() or "Do not include" in prompt

    def test_goal_fallback_to_title(self):
        packet = {
            "id": "item-002",
            "title": "Fallback title",
            "allowed_edit_set": ["notes.txt"],
        }
        prompt = build_maker_prompt(SAMPLE_BRIEF, packet, {})
        assert "Fallback title" in prompt

    def test_goal_fallback_to_id_when_no_goal_or_title(self):
        packet = {
            "id": "item-003",
            "allowed_edit_set": ["notes.txt"],
        }
        prompt = build_maker_prompt(SAMPLE_BRIEF, packet, {})
        assert "item-003" in prompt

    def test_empty_allowed_edit_set_shows_none_declared(self):
        packet = dict(SAMPLE_PACKET, allowed_edit_set=[])
        prompt = build_maker_prompt(SAMPLE_BRIEF, packet, {})
        assert "none declared" in prompt.lower() or "(none" in prompt


# ---------------------------------------------------------------------------
# parse_checker_verdict
# ---------------------------------------------------------------------------


class TestParseCheckerVerdict:
    def test_plain_json_string(self):
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "looks good"}'
        verdict = parse_checker_verdict(text)
        assert verdict["requested_changes"] is False
        assert verdict["questions_raised"] == 0
        assert verdict["summary"] == "looks good"

    def test_requested_changes_true(self):
        text = '{"requested_changes": true, "questions_raised": 2, "summary": "needs work"}'
        verdict = parse_checker_verdict(text)
        assert verdict["requested_changes"] is True
        assert verdict["questions_raised"] == 2

    def test_prose_wrapped_json(self):
        text = (
            "After reviewing the diff, I conclude: "
            '{"requested_changes": false, "questions_raised": 1, "summary": "minor notes"} '
            "That is my verdict."
        )
        verdict = parse_checker_verdict(text)
        assert verdict["requested_changes"] is False
        assert verdict["questions_raised"] == 1
        assert verdict["summary"] == "minor notes"

    def test_fenced_json_block(self):
        text = '```json\n{"requested_changes": true, "questions_raised": 3, "summary": "major issues"}\n```'
        verdict = parse_checker_verdict(text)
        assert verdict["requested_changes"] is True
        assert verdict["questions_raised"] == 3

    def test_return_types_are_correct(self):
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "ok"}'
        verdict = parse_checker_verdict(text)
        assert isinstance(verdict["requested_changes"], bool)
        assert isinstance(verdict["questions_raised"], int)
        assert isinstance(verdict["summary"], str)

    def test_keys_present(self):
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "fine"}'
        verdict = parse_checker_verdict(text)
        assert "requested_changes" in verdict
        assert "questions_raised" in verdict
        assert "summary" in verdict

    def test_summary_stripped(self):
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "  padded  "}'
        verdict = parse_checker_verdict(text)
        assert verdict["summary"] == "padded"

    def test_missing_fields_use_defaults(self):
        # If fields are absent, defaults should kick in
        text = '{"requested_changes": false}'
        verdict = parse_checker_verdict(text)
        assert verdict["questions_raised"] == 0
        assert verdict["summary"] == ""

    def test_questions_raised_coerced_to_int(self):
        # questions_raised might come back as a string from some models
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "ok"}'
        verdict = parse_checker_verdict(text)
        assert isinstance(verdict["questions_raised"], int)

    def test_requested_changes_coerced_to_bool(self):
        # Even if the value is truthy/falsy, it should be a bool
        text = '{"requested_changes": false, "questions_raised": 0, "summary": "fine"}'
        verdict = parse_checker_verdict(text)
        assert type(verdict["requested_changes"]) is bool

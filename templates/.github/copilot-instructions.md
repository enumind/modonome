# Copilot review guidance: gate integrity

When reviewing a pull request, flag any change that weakens a test or a gate to make it
pass, and name the category. These map to the Modonome gate-integrity check
(`modonome/gate-integrity`), which blocks them in CI, so calling them out early saves a
round trip:

- MR101 assertion-removal: a test loses assertions without an equivalent replacement.
- MR102 skip-injection: a test is skipped or focused (`.skip`, `.only`, `xit`, `@Disabled`, `@pytest.mark.skip`, or `xfail`).
- MR103 vacuous-assertion: an assertion can never fail (it asserts a literal against itself).
- MR104 coverage-lowering: a coverage threshold is removed or lowered.
- MR105 type-escape: a broad type escape is added (`any`, a ts-ignore directive, `@SuppressWarnings`, a pragma-warning-disable) or TypeScript strictness is weakened.
- MR106 assertion-strength-downgrade: a value check (`toBe`, `assertEquals`) is replaced by an existence-only check (`toBeDefined`, `assertNotNull`).
- MR107 homoglyph-disguise: a gate construct is disguised with Unicode homoglyphs.

If you see one of these, ask for the change to be reverted or sent to an owner for review,
and cite the category. Fix the root cause behind a failing gate. Do not weaken the gate to
go green. See https://modonome.com/codes for detail.

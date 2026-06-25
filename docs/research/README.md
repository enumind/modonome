# Modonome Research Directions

This directory contains exploratory architectural research and design proposals that are
**not part of the committed roadmap** (Milestones 1-6).

Research items are organized by topic and marked with their maturity status.

## Directory Structure

### `agentic-governance-mesh/`

**Status:** Exploratory research  
**Timeline:** Proof of concept Q4 2026; decision point Q2 2027

Explores how Modonome could evolve from a single-repo governance tool into a global mesh
where repositories share governance knowledge without central authority.

**Start here:**
1. `00-RESEARCH-PLAN.md`: Research hypothesis, scope, and v0.1 experiment plan
2. `governance-mesh-vision.md`: Strategic vision and architectural layers (for reference)
3. `ADR-027` through `ADR-032`: Detailed design proposals for each architectural layer

**Key questions this research answers:**
- Can we define an open protocol for governance packets?
- Can repositories safely validate and adopt external governance knowledge?
- Do decentralized trust networks work better than central catalogs?
- What are the failure modes and mitigations?

**No commitment yet.** This is investigation. The v0.1 experiment will determine whether
to proceed with a full mesh roadmap.

---

## How Research Differs from Roadmap

| Aspect | Roadmap (M1-6) | Research |
|--------|---------|----------|
| **Status** | Committed | Exploratory |
| **Timeline** | Fixed milestones | Flexible, ends with decision gate |
| **Implementation** | In progress | Specification only (no code yet) |
| **ADR status** | Accepted | Exploratory or Proposed |
| **Audience** | Users and integrators | Contributors and architects |
| **Decision** | Shipping | Go/no-go based on evidence |

Research does NOT block the roadmap. Milestones 1-6 ship on schedule while research
happens in parallel.

---

## Contributing to Research

If you want to provide feedback on research proposals:

1. Read the research plan document first (e.g., `agentic-governance-mesh/00-RESEARCH-PLAN.md`)
2. File an issue or discussion with the specific proposal (e.g., "Feedback on GPP v1 format")
3. Reference the ADR number if your feedback is about a specific decision

Do not assume research proposals are committed. Always check the status and timeline.

---

## Future Research Directions (Potential)

Modonome may explore other directions in the future:
- Enterprise governance integrations (SAP, Oracle, Salesforce)
- Cross-organization compliance auditing
- AI-driven governance pattern discovery
- Real-time governance metrics and dashboards

These will be documented here as they are formally researched.

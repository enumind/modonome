"""agent-factory: a shared CrewAI + local-LLM substrate that drives modonome-governed repos.

The factory builds and maintains fleets. Common workers (a local maker model and a
claude-CLI checker) are shared across repos; each repo is a fleet binding in the
registry. modonome owns governance per repo; the factory owns model invocation and
sequencing, with no metered API and no autonomous merge.
"""

__version__ = "0.1.0"

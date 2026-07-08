---
name: preflight
description: Pre-push readiness check for this repo. Classifies the working diff by deliverable type, runs the applicable gates in fast-fail order, maps every failure id to its concrete fix, regenerates derived files, and ends with a push verdict. Use before every commit and push, and whenever CI is red and you need to reproduce the failure locally.
---

This skill is a thin adapter. The procedure is a vendor-neutral runbook shared by
every agent that works in this repo.

Read [docs/ops/preflight.md](../../../docs/ops/preflight.md) and follow it exactly.

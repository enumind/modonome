# Workflow Push Event Fix

## Problem
The CI workflow was failing on all push events to main with: atal: invalid reference: origin/

This occurred because the workflow attempted to checkout files using github.base_ref, which is only available during pull request events. On push events, github.base_ref is empty.

## Solution
Added if: github.event_name == 'pull_request' conditions to base branch checkout steps.

## Impact
- Push events now complete successfully
- Pull request validation is unchanged
- CI stable across both trigger types

## Reference
PR: https://github.com/nateshpp/modonome/pull/57

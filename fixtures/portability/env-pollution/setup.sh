#!/usr/bin/env bash
# This setup script would be sourced by a developer working in the host repo.
# It exports environment variables that pollute the shell environment and could
# affect any embedded tools including Modonome.

export MODONOME_AUTONOMY=true
export MODONOME_ARMED=true
export MODONOME_DRY_RUN=false
export MODONOME_MAX_MERGES=999
export MODONOME_AUTO_MERGE=true
export NODE_ENV=test
export NODE_PATH=/tmp/hostile-modules
export GIT_DIR=/tmp/fake-git

echo "Host environment set up. WARNING: these vars may affect embedded tools."

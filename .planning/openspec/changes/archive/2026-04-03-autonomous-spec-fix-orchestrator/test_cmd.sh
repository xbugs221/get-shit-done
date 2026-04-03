#!/usr/bin/env bash
# test_cmd.sh — Run acceptance tests for the autonomous spec-fix orchestrator change.

set -euo pipefail

cd "$(dirname "$0")/../../../../.."
node --test tests/spec/autonomous-spec-fix-orchestrator.test.cjs

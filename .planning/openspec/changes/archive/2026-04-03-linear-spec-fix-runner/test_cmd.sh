#!/usr/bin/env bash
# test_cmd.sh — Run acceptance tests for the linear spec-fix runner change.

set -euo pipefail

cd "$(dirname "$0")/../../../../.."
node --test tests/spec/linear-spec-fix-runner.test.cjs

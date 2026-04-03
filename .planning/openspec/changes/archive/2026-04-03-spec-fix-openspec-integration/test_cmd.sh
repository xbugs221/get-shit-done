#!/usr/bin/env bash
# test_cmd.sh — Run acceptance tests for the spec-fix/OpenSpec integration change.

set -euo pipefail

cd "$(dirname "$0")/../../../.."
node --test tests/spec/spec-fix-openspec-integration.test.cjs

/**
 * Acceptance tests for the autonomous spec-fix orchestrator change.
 *
 * These tests define the target user experience: one natural-language command
 * starts the workflow, the runner advances automatically, and OpenSpec is no
 * longer a startup prerequisite.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  createTempGitProject,
  cleanup,
  runGsdTools,
} = require('../helpers.cjs');

/**
 * Normalize process output before assertion messages.
 *
 * @param {string} value - Raw stdout or stderr.
 * @returns {string} Output with normalized newlines.
 */
function normalizeOutput(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

/**
 * Read one workflow document from the first generated fix workspace.
 *
 * @param {string} cwd - Repository root.
 * @returns {object} Parsed workflow JSON.
 */
function readWorkflow(cwd) {
  const workflowPath = path.join(cwd, '.planning', 'fixes', 'fix-001', 'workflow.json');
  return JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
}

test('spec-fix accepts a natural-language bug report without a pre-created OpenSpec change', () => {
  const cwd = createTempGitProject('gsd-autonomous-spec-fix-start-');

  try {
    assert.equal(fs.existsSync(path.join(cwd, '.openspec-root.json')), false, 'expected no pre-created OpenSpec locator');

    const result = runGsdTools([
      'spec-fix',
      '--problem',
      'Login loop on callback',
    ], cwd, {
      HOME: cwd,
      GSD_SPEC_FIX_TEST_MODE: 'success',
    });

    assert.equal(result.success, true, normalizeOutput(result.error));

    const fixDir = path.join(cwd, '.planning', 'fixes', 'fix-001');
    assert.equal(fs.existsSync(path.join(fixDir, 'PROBLEM.md')), true, 'expected PROBLEM.md to exist');
    assert.equal(fs.existsSync(path.join(fixDir, 'workflow.json')), true, 'expected workflow.json to exist');

    const workflow = readWorkflow(cwd);
    assert.equal(workflow.problem_subject, '问题：Login loop on callback');
    assert.equal(workflow.current_stage, 'archived');
    assert.equal(workflow.blocked, false);
    assert.equal(workflow.execution_state, 'completed');
    assert.equal(workflow.openspec_sync_state, 'unavailable');
  } finally {
    cleanup(cwd);
  }
});

test('spec-fix automatically commits each successful stage and exposes the final status without manual complete-stage commands', () => {
  const cwd = createTempGitProject('gsd-autonomous-spec-fix-success-');

  try {
    const result = runGsdTools([
      'spec-fix',
      '--problem',
      'Callback loop still happens after token refresh',
    ], cwd, {
      HOME: cwd,
      GSD_SPEC_FIX_TEST_MODE: 'success',
    });

    assert.equal(result.success, true, normalizeOutput(result.error));

    const workflow = readWorkflow(cwd);
    assert.equal(workflow.current_stage, 'archived');
    assert.match(workflow.commits.problem || '', /^[0-9a-f]+$/i);
    assert.match(workflow.commits.analysis || '', /^[0-9a-f]+$/i);
    assert.match(workflow.commits.proposal_review || '', /^[0-9a-f]+$/i);
    assert.match(workflow.commits.coding || '', /^[0-9a-f]+$/i);
    assert.match(workflow.commits.code_review || '', /^[0-9a-f]+$/i);
    assert.match(workflow.commits.archive || '', /^[0-9a-f]+$/i);

    const status = runGsdTools(['spec-fix', 'status', 'fix-001'], cwd, { HOME: cwd });
    assert.equal(status.success, true, normalizeOutput(status.error));

    const payload = JSON.parse(status.output);
    assert.equal(payload.current_stage, 'archived');
    assert.equal(payload.blocked, false);
    assert.equal(payload.execution_state, 'completed');
    assert.equal(payload.openspec_sync_state, 'unavailable');
    assert.ok(payload.commits.archive, 'expected archive commit in status output');

    const subjects = execSync('git log --format=%s -6', { cwd, encoding: 'utf8', stdio: 'pipe' })
      .trim()
      .split('\n');
    assert.ok(subjects.some(line => line === '问题：Callback loop still happens after token refresh'));
    assert.ok(subjects.some(line => /^analysis\(fix-001\):/.test(line)));
    assert.ok(subjects.some(line => /^review\(fix-001\): refine proposal$/.test(line)));
    assert.ok(subjects.some(line => /^fix\(fix-001\): implement approved proposal$/.test(line)));
    assert.ok(subjects.some(line => /^review\(fix-001\): verify against problem and proposal$/.test(line)));
    assert.ok(subjects.some(line => /^chore\(fix-001\): archive workflow$/.test(line)));
  } finally {
    cleanup(cwd);
  }
});

test('spec-fix automatically loops back from code review to coding and auto-accepts after the third review round', () => {
  const cwd = createTempGitProject('gsd-autonomous-spec-fix-review-loop-');

  try {
    const result = runGsdTools([
      'spec-fix',
      '--problem',
      'Callback loop still happens for expired sessions',
    ], cwd, {
      HOME: cwd,
      GSD_SPEC_FIX_TEST_MODE: 'changes_requested_3x',
    });

    assert.equal(result.success, true, normalizeOutput(result.error));

    const workflow = readWorkflow(cwd);
    assert.equal(workflow.current_stage, 'archived');
    assert.equal(workflow.review_attempt, 3);
    assert.equal(workflow.review_resolution, 'accepted_after_round_3');
    assert.equal(workflow.auto_accept_after_round_3, true);

    const status = runGsdTools(['spec-fix', 'status', 'fix-001'], cwd, { HOME: cwd });
    assert.equal(status.success, true, normalizeOutput(status.error));

    const payload = JSON.parse(status.output);
    assert.equal(payload.review_attempt, 3);
    assert.equal(payload.review_resolution, 'accepted_after_round_3');
    assert.equal(payload.execution_state, 'completed');
  } finally {
    cleanup(cwd);
  }
});

/**
 * Acceptance tests for the spec-fix/OpenSpec integration change.
 *
 * These tests define the user-visible contract for linking one spec-fix
 * workflow to a repository-local OpenSpec state tree.
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
  scaffoldOpenSpecChange,
  writeNestedOpenSpecLocator,
} = require('../helpers.cjs');

/**
 * Normalize line endings in process output before matching.
 *
 * @param {string} value - Raw process output.
 * @returns {string} Output with LF-only line endings.
 */
function normalizeOutput(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

/**
 * Seed one workflow state file that points at an OpenSpec change.
 *
 * @param {string} cwd - Repository root.
 * @param {object} options - Workflow options.
 * @param {string} options.changeName - Linked OpenSpec change name.
 * @param {string} [options.currentStage='archive-ready'] - Workflow stage.
 */
function writeWorkflow(cwd, options) {
  const { changeName, currentStage = 'archive-ready' } = options;
  const fixDir = path.join(cwd, '.planning', 'fixes', 'fix-001');
  const archiveDir = path.join(fixDir, 'artifacts', 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'SUMMARY.md'), '# Archive Summary\n\nReady to archive.\n', 'utf8');
  fs.writeFileSync(path.join(fixDir, 'PROBLEM.md'), '# Problem\n\nLogin loop on callback\n', 'utf8');
  fs.writeFileSync(path.join(fixDir, 'workflow.json'), JSON.stringify({
    id: 'fix-001',
    mux: 'tmux',
    change_name: changeName,
    current_stage: currentStage,
    review_attempt: 1,
    review_resolution: 'accepted',
    auto_accept_after_round_3: false,
    blocked: false,
    problem_subject: '问题：Login loop on callback',
    mux_metadata: {
      type: 'tmux',
      session_name: 'spec-fix-test-fix-001',
    },
    panes: [],
    agent_providers: {},
    provider_resolutions: {},
    openspec: {
      change_name: changeName,
      state_root: '.planning/openspec',
      change_dir: `.planning/openspec/changes/${changeName}`,
      is_complete: true,
      apply_requires: ['tasks'],
      artifacts: {
        proposal: { status: 'done', output_path: 'proposal.md', missing_dependencies: [] },
        design: { status: 'done', output_path: 'design.md', missing_dependencies: [] },
        specs: { status: 'done', output_path: 'specs/**/*.md', missing_dependencies: [] },
        tasks: { status: 'done', output_path: 'tasks.md', missing_dependencies: [] },
      },
      last_synced_at: '2026-04-03T00:05:00.000Z',
    },
    commits: {
      problem: 'abc1234',
      analysis: 'bcd2345',
      proposal_review: 'cde3456',
      coding: 'def4567',
      code_review: 'efg5678',
      archive: null,
    },
    timestamps: {
      problem_captured: '2026-04-03T00:00:00.000Z',
      analysis: '2026-04-03T00:01:00.000Z',
      proposal_review: '2026-04-03T00:02:00.000Z',
      coding: '2026-04-03T00:03:00.000Z',
      code_review: '2026-04-03T00:04:00.000Z',
      archive: null,
    },
    stages: {
      analysis: { unlocked: false, status: 'completed' },
      proposal_review: { unlocked: false, status: 'completed' },
      coding: { unlocked: false, status: 'completed' },
      code_review: { unlocked: false, status: 'completed' },
      archive: { unlocked: true, status: 'ready' },
    },
  }, null, 2), 'utf8');
}

test('spec-fix start rejects a missing OpenSpec change before it creates a fix workspace', () => {
  const cwd = createTempGitProject('gsd-openspec-start-');

  try {
    writeNestedOpenSpecLocator(cwd);
    fs.mkdirSync(path.join(cwd, '.planning', 'openspec', 'changes'), { recursive: true });

    const result = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'tmux',
      '--problem',
      'Login loop on callback',
      '--change',
      'missing-change',
    ], cwd, { HOME: cwd });

    assert.equal(result.success, false, 'expected missing change validation to fail');
    assert.match(normalizeOutput(result.error), /openspec/i);
    assert.match(normalizeOutput(result.error), /missing-change/);

    const fixesRoot = path.join(cwd, '.planning', 'fixes');
    const workspaces = fs.existsSync(fixesRoot)
      ? fs.readdirSync(fixesRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())
      : [];
    assert.equal(workspaces.length, 0, 'expected no fix workspace to be created');
  } finally {
    cleanup(cwd);
  }
});

test('spec-fix status reports linked OpenSpec metadata from the configured nested state root', () => {
  const cwd = createTempGitProject('gsd-openspec-status-');

  try {
    scaffoldOpenSpecChange(cwd, 'callback-login-loop', { complete: true });
    writeWorkflow(cwd, { changeName: 'callback-login-loop' });

    const result = runGsdTools(['spec-fix', 'status', 'fix-001'], cwd, { HOME: cwd });
    assert.equal(result.success, true, normalizeOutput(result.error));

    const status = JSON.parse(result.output);
    assert.equal(status.change_name, 'callback-login-loop');
    assert.equal(status.openspec.state_root, '.planning/openspec');
    assert.match(status.openspec.change_dir, /\.planning\/openspec\/changes\/callback-login-loop$/);
    assert.deepEqual(status.openspec.apply_requires, ['tasks']);
    assert.equal(status.openspec.is_complete, true);
    assert.equal(status.openspec.artifacts.proposal.status, 'done');
    assert.equal(status.openspec.artifacts.design.status, 'done');
    assert.equal(status.openspec.artifacts.specs.status, 'done');
    assert.equal(status.openspec.artifacts.tasks.status, 'done');
  } finally {
    cleanup(cwd);
  }
});

test('spec-fix archive archives the linked OpenSpec change before marking the workflow archived', () => {
  const cwd = createTempGitProject('gsd-openspec-archive-');

  try {
    scaffoldOpenSpecChange(cwd, 'callback-login-loop', { complete: true });
    writeWorkflow(cwd, { changeName: 'callback-login-loop' });

    const result = runGsdTools([
      'spec-fix',
      'complete-stage',
      'fix-001',
      '--stage',
      'archive',
    ], cwd, { HOME: cwd });

    assert.equal(result.success, true, normalizeOutput(result.error));

    const workflow = JSON.parse(fs.readFileSync(
      path.join(cwd, '.planning', 'fixes', 'fix-001', 'workflow.json'),
      'utf8'
    ));
    assert.equal(workflow.current_stage, 'archived');

    const activeChangeDir = path.join(cwd, '.planning', 'openspec', 'changes', 'callback-login-loop');
    assert.equal(fs.existsSync(activeChangeDir), false, 'expected active change directory to be removed');

    const archiveRoot = path.join(cwd, '.planning', 'openspec', 'changes', 'archive');
    const archivedNames = fs.readdirSync(archiveRoot);
    assert.ok(
      archivedNames.some(name => name.endsWith('-callback-login-loop')),
      `expected archive entry for callback-login-loop, got: ${archivedNames.join(', ')}`
    );

    const gitSubject = execSync('git log -1 --pretty=%s', { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
    assert.match(gitSubject, /^chore\(fix-001\): archive workflow$/);
  } finally {
    cleanup(cwd);
  }
});

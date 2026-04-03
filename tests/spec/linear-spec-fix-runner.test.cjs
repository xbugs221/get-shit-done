/**
 * Acceptance tests for the linear spec-fix runner change.
 *
 * These tests capture the user-visible contract for the proposed workflow.
 * They are expected to fail until the spec-fix runner is implemented.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  createTempGitProject,
  cleanup,
  runGsdTools,
  scaffoldOpenSpecChange,
} = require('../helpers.cjs');

/**
 * Normalize line endings to keep commit-subject assertions stable.
 *
 * @param {string} value - Raw command output.
 * @returns {string} Output with normalized line endings.
 */
function normalizeOutput(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

/**
 * Detect whether a required binary exists on PATH for integration tests.
 *
 * @param {string} command - Binary name.
 * @returns {boolean} True when the command is available.
 */
function hasCommand(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove ANSI escape sequences from terminal output.
 *
 * @param {string} value - Raw terminal output.
 * @returns {string} Sanitized output.
 */
function stripAnsi(value) {
  return String(value || '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Mirror the runner's repo-scoped mux session naming rule for collision tests.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixId - Fix workspace id.
 * @returns {string} Expected mux session name.
 */
function buildExpectedSessionName(cwd, fixId) {
  const repoSlug = path.basename(path.resolve(cwd))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'repo';
  const repoHash = crypto
    .createHash('sha1')
    .update(path.resolve(cwd))
    .digest('hex')
    .slice(0, 8);
  return `spec-fix-${repoSlug}-${repoHash}-${fixId}`;
}

/**
 * Kill one started spec-fix mux session during test cleanup.
 *
 * @param {object|null} workflow - Workflow state read from workflow.json.
 */
function cleanupMuxSession(workflow) {
  if (!workflow?.mux_metadata?.session_name || !workflow?.mux) return;

  try {
    if (workflow.mux === 'zellij') {
      execSync(`zellij kill-session "${workflow.mux_metadata.session_name}"`, { stdio: 'pipe' });
      return;
    }

    if (workflow.mux === 'tmux') {
      execSync(`tmux kill-session -t "${workflow.mux_metadata.session_name}"`, { stdio: 'pipe' });
    }
  } catch {
    // Best-effort cleanup only.
  }
}

const hasZellijStack = hasCommand('zellij') && hasCommand('script') && hasCommand('lazygit');
const hasTmuxStack = hasCommand('tmux') && hasCommand('lazygit');

(hasZellijStack ? test : test.skip)('spec-fix start creates a fixed zellij run with lazygit in pane 1 and resolves per-agent providers from config', () => {
  const cwd = createTempGitProject('gsd-spec-fix-start-');
  let workflow = null;

  try {
    scaffoldOpenSpecChange(cwd, 'callback-login-loop', { complete: true });
    fs.writeFileSync(path.join(cwd, '.planning', 'config.json'), JSON.stringify({
      workflow: {
        spec_fix_agent_providers: {
          analysis: 'codex',
          proposal_review: 'claude',
          coding: 'codex',
          code_review: 'claude',
          archive: 'gemini',
        },
      },
    }, null, 2), 'utf8');

    const result = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'zellij',
      '--problem',
      'Login loop on callback',
      '--change',
      'callback-login-loop',
    ], cwd, { HOME: cwd });

    assert.equal(result.success, true, normalizeOutput(result.error));

    const planningRoot = path.join(cwd, '.planning', 'fixes');
    assert.equal(fs.existsSync(planningRoot), true, 'expected .planning/fixes to be created');

    const fixDirs = fs.readdirSync(planningRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    assert.equal(fixDirs.length, 1, 'expected one fix workspace');

    const fixDir = path.join(planningRoot, fixDirs[0]);
    const problemPath = path.join(fixDir, 'PROBLEM.md');
    const workflowPath = path.join(fixDir, 'workflow.json');

    assert.equal(fs.existsSync(problemPath), true, 'expected PROBLEM.md to exist');
    assert.equal(fs.existsSync(workflowPath), true, 'expected workflow.json to exist');

    const problem = fs.readFileSync(problemPath, 'utf8');
    assert.match(problem, /Login loop on callback/);

    workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    assert.equal(workflow.mux, 'zellij');
    assert.equal(workflow.review_attempt, 0);
    assert.equal(workflow.mux_metadata.launched, true);
    assert.ok(workflow.mux_metadata.session_name, 'expected zellij session name');
    assert.match(workflow.commits.problem || '', /^[0-9a-f]+$/i);
    assert.equal(workflow.change_name, 'callback-login-loop');
    assert.equal(workflow.openspec.state_root, '.planning/openspec');
    assert.deepEqual(workflow.agent_providers, {
      analysis: 'codex',
      proposal_review: 'claude',
      coding: 'codex',
      code_review: 'claude',
      archive: 'gemini',
    });
    assert.deepEqual(workflow.panes.map(p => p.role), [
      'lazygit',
      'analysis',
      'proposal-review',
      'coding',
      'code-review',
      'archive',
    ]);
    const sessions = stripAnsi(execSync('zellij list-sessions', { encoding: 'utf8', stdio: 'pipe' }));
    assert.ok(
      sessions.includes(workflow.mux_metadata.session_name),
      `expected zellij session ${workflow.mux_metadata.session_name} to exist`
    );

    const log = runGsdTools(['status'], cwd, { HOME: cwd });
    assert.equal(log.success, true, normalizeOutput(log.error));
    assert.match(log.output, /问题：Login loop on callback/);
  } finally {
    cleanupMuxSession(workflow);
    cleanup(cwd);
  }
});

test('spec-fix status reports third-round auto-acceptance and resolved provider mapping', () => {
  const cwd = createTempGitProject('gsd-spec-fix-status-');

  try {
    scaffoldOpenSpecChange(cwd, 'callback-login-loop', { complete: true });
    const planningDir = path.join(cwd, '.planning', 'fixes', 'fix-001');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'PROBLEM.md'), '# Problem\n\nLogin loop on callback\n', 'utf8');
    fs.writeFileSync(path.join(planningDir, 'workflow.json'), JSON.stringify({
      id: 'fix-001',
      mux: 'zellij',
      change_name: 'callback-login-loop',
      current_stage: 'archive-ready',
      review_attempt: 3,
      review_resolution: 'accepted_after_round_3',
      blocked: false,
      agent_providers: {
        analysis: 'codex',
        proposal_review: 'claude',
        coding: 'codex',
        code_review: 'claude',
        archive: 'gemini',
      },
      panes: [
        { role: 'lazygit', pane_id: '1' },
        { role: 'analysis', pane_id: '2' },
        { role: 'proposal-review', pane_id: '3' },
        { role: 'coding', pane_id: '4' },
        { role: 'code-review', pane_id: '5' },
        { role: 'archive', pane_id: '6' },
      ],
      commits: {
        problem: 'a1b2c3d',
        analysis: 'b2c3d4e',
        proposal_review: 'c3d4e5f',
        coding: 'd4e5f6a',
        code_review: 'e5f6a7b',
      },
      openspec: {
        change_name: 'callback-login-loop',
        state_root: '.planning/openspec',
        change_dir: '.planning/openspec/changes/callback-login-loop',
      },
    }, null, 2), 'utf8');

    const result = runGsdTools(['spec-fix', 'status', 'fix-001'], cwd, { HOME: cwd });
    const output = JSON.parse(result.output);

    assert.equal(result.success, true, normalizeOutput(result.error));
    assert.equal(output.current_stage, 'archive-ready');
    assert.equal(output.review_attempt, 3);
    assert.equal(output.review_resolution, 'accepted_after_round_3');
    assert.equal(output.openspec.state_root, '.planning/openspec');
    assert.equal(output.openspec.artifacts.tasks.status, 'done');
    assert.equal(output.agent_providers.archive, 'gemini');
    assert.equal(output.panes[0].role, 'lazygit');
  } finally {
    cleanup(cwd);
  }
});

(hasTmuxStack ? test : test.skip)('spec-fix complete-stage records the current stage hash immediately and blocks duplicate completion', () => {
  const cwd = createTempGitProject('gsd-spec-fix-complete-');
  let workflow = null;

  try {
    scaffoldOpenSpecChange(cwd, 'callback-loop-refresh', { complete: true });
    const start = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'tmux',
      '--problem',
      'Callback loop still happens after token refresh',
      '--change',
      'callback-loop-refresh',
    ], cwd, { HOME: cwd });
    assert.equal(start.success, true, normalizeOutput(start.error));

    const fixDir = path.join(cwd, '.planning', 'fixes', 'fix-001');
    const workflowPath = path.join(fixDir, 'workflow.json');
    const analysisPath = path.join(fixDir, 'artifacts', 'analysis', 'RESULT.md');

    fs.writeFileSync(analysisPath, '# Analysis Result\n\nConfirmed the callback loop and isolated the redirect bug.\n', 'utf8');

    const complete = runGsdTools([
      'spec-fix',
      'complete-stage',
      'fix-001',
      '--stage',
      'analysis',
    ], cwd, { HOME: cwd });
    assert.equal(complete.success, true, normalizeOutput(complete.error));

    workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const headHash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
    assert.equal(workflow.current_stage, 'analysis-done');
    assert.equal(workflow.commits.analysis, headHash);
    assert.equal(workflow.stages.analysis.unlocked, false);
    assert.equal(workflow.stages.analysis.status, 'completed');

    const repeat = runGsdTools([
      'spec-fix',
      'complete-stage',
      'fix-001',
      '--stage',
      'analysis',
    ], cwd, { HOME: cwd });
    assert.equal(repeat.success, false, 'expected duplicate completion to fail');
    assert.match(normalizeOutput(repeat.error), /already been completed/i);
  } finally {
    cleanupMuxSession(workflow);
    cleanup(cwd);
  }
});

(hasTmuxStack ? test : test.skip)('spec-fix start uses repo-scoped session names and injects provider/runtime into pane commands', () => {
  const cwdA = createTempGitProject('gsd-spec-fix-repo-a-');
  const cwdB = createTempGitProject('gsd-spec-fix-repo-b-');
  let workflowA = null;
  let workflowB = null;

  try {
    scaffoldOpenSpecChange(cwdA, 'repo-a-change', { complete: true });
    scaffoldOpenSpecChange(cwdB, 'repo-b-change', { complete: true });
    fs.writeFileSync(path.join(cwdA, '.planning', 'config.json'), JSON.stringify({
      workflow: {
        spec_fix_agent_providers: {
          analysis: 'codex:gpt-5',
          proposal_review: { provider: 'claude', runtime: 'sonnet' },
          coding: 'codex:o4',
          code_review: 'claude:opus',
          archive: 'gemini:2.5-pro',
        },
      },
    }, null, 2), 'utf8');

    const startA = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'tmux',
      '--problem',
      'Session name collision probe A',
      '--change',
      'repo-a-change',
    ], cwdA, { HOME: cwdA });
    const startB = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'tmux',
      '--problem',
      'Session name collision probe B',
      '--change',
      'repo-b-change',
    ], cwdB, { HOME: cwdB });

    assert.equal(startA.success, true, normalizeOutput(startA.error));
    assert.equal(startB.success, true, normalizeOutput(startB.error));

    workflowA = JSON.parse(fs.readFileSync(path.join(cwdA, '.planning', 'fixes', 'fix-001', 'workflow.json'), 'utf8'));
    workflowB = JSON.parse(fs.readFileSync(path.join(cwdB, '.planning', 'fixes', 'fix-001', 'workflow.json'), 'utf8'));

    assert.equal(workflowA.mux_metadata.session_name, buildExpectedSessionName(cwdA, 'fix-001'));
    assert.equal(workflowB.mux_metadata.session_name, buildExpectedSessionName(cwdB, 'fix-001'));
    assert.notEqual(workflowA.mux_metadata.session_name, workflowB.mux_metadata.session_name);
    assert.match(workflowA.mux_metadata.launch_commands[0], /tmux.*new-session/);
    assert.ok(
      workflowA.mux_metadata.launch_commands.some(line => line.includes('split-window')),
      'expected tmux launch log to include split-window'
    );
    assert.ok(
      workflowA.mux_metadata.launch_commands.some(line => line.includes('send-keys')),
      'expected tmux launch log to include send-keys'
    );

    assert.match(workflowA.panes[1].injected_command, /GSD_SPEC_FIX_PROVIDER='codex'/);
    assert.match(workflowA.panes[1].injected_command, /GSD_SPEC_FIX_RUNTIME='gpt-5'/);
    assert.match(workflowA.panes[2].injected_command, /GSD_SPEC_FIX_PROVIDER='claude'/);
    assert.match(workflowA.panes[2].injected_command, /GSD_SPEC_FIX_RUNTIME='sonnet'/);

    const analysisPrompt = fs.readFileSync(path.join(cwdA, '.planning', 'fixes', 'fix-001', 'prompts', 'analysis.md'), 'utf8');
    assert.match(analysisPrompt, /Provider: codex/);
    assert.match(analysisPrompt, /Runtime: gpt-5/);
  } finally {
    cleanupMuxSession(workflowA);
    cleanupMuxSession(workflowB);
    cleanup(cwdA);
    cleanup(cwdB);
  }
});

(hasTmuxStack ? test : test.skip)('spec-fix start rolls back workspace artifacts when mux launch fails', () => {
  const cwd = createTempGitProject('gsd-spec-fix-rollback-');
  const sessionName = buildExpectedSessionName(cwd, 'fix-001');

  try {
    scaffoldOpenSpecChange(cwd, 'rollback-change', { complete: true });
    execSync(`tmux new-session -d -s "${sessionName}" -c "${cwd}" 'sleep 30'`, { stdio: 'pipe' });

    const result = runGsdTools([
      'spec-fix',
      'start',
      '--mux',
      'tmux',
      '--problem',
      'Rollback on failed tmux session creation',
      '--change',
      'rollback-change',
    ], cwd, { HOME: cwd });

    assert.equal(result.success, false, 'expected start failure when tmux session already exists');
    assert.match(normalizeOutput(result.error), /duplicate session|session .* exists|duplicate/i);

    const fixesRoot = path.join(cwd, '.planning', 'fixes');
    const fixEntries = fs.existsSync(fixesRoot)
      ? fs.readdirSync(fixesRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())
      : [];
    assert.equal(fixEntries.length, 0, 'expected failed start to leave no fix workspace behind');

    const gitignorePath = path.join(fixesRoot, '.gitignore');
    assert.equal(fs.existsSync(gitignorePath), false, 'expected .gitignore rollback on failed start');

    const status = execSync('git status --short', { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
    assert.equal(status, '', `expected clean git status after rollback, got: ${status}`);
    execSync(`tmux has-session -t "${sessionName}"`, { stdio: 'pipe' });
  } finally {
    try {
      execSync(`tmux kill-session -t "${sessionName}"`, { stdio: 'pipe' });
    } catch {}
    cleanup(cwd);
  }
});

test('spec-fix latest workspace selection uses numeric ordering instead of string ordering', () => {
  const cwd = createTempGitProject('gsd-spec-fix-latest-');

  try {
    for (const id of ['fix-998', 'fix-999', 'fix-1000']) {
      const fixDir = path.join(cwd, '.planning', 'fixes', id);
      fs.mkdirSync(fixDir, { recursive: true });
      fs.writeFileSync(path.join(fixDir, 'workflow.json'), JSON.stringify({
        id,
        mux: 'tmux',
        current_stage: `stage-for-${id}`,
        problem_subject: `问题：${id}`,
        commits: {},
      }, null, 2), 'utf8');
    }

    const fixStatus = runGsdTools(['spec-fix', 'status'], cwd, { HOME: cwd });
    assert.equal(fixStatus.success, true, normalizeOutput(fixStatus.error));
    const fixStatusJson = JSON.parse(fixStatus.output);
    assert.equal(fixStatusJson.id, 'fix-1000');

    const topStatus = runGsdTools(['status'], cwd, { HOME: cwd });
    assert.equal(topStatus.success, true, normalizeOutput(topStatus.error));
    const topStatusJson = JSON.parse(topStatus.output);
    assert.equal(topStatusJson.active_fix.id, 'fix-1000');
  } finally {
    cleanup(cwd);
  }
});

test('spec-fix complete-stage rejects invalid code-review outcomes', () => {
  const cwd = createTempGitProject('gsd-spec-fix-invalid-review-');

  try {
    scaffoldOpenSpecChange(cwd, 'callback-login-loop', { complete: true });
    const fixDir = path.join(cwd, '.planning', 'fixes', 'fix-001');
    const reviewDir = path.join(fixDir, 'artifacts', 'code-review');
    fs.mkdirSync(reviewDir, { recursive: true });
    fs.writeFileSync(path.join(reviewDir, 'REVIEW.md'), '# Code Review\n\nSome findings.\n', 'utf8');
    fs.writeFileSync(path.join(fixDir, 'workflow.json'), JSON.stringify({
      id: 'fix-001',
      mux: 'tmux',
      change_name: 'callback-login-loop',
      current_stage: 'code-review-ready',
      review_attempt: 0,
      review_resolution: null,
      auto_accept_after_round_3: false,
      blocked: false,
      mux_metadata: {
        type: 'tmux',
        session_name: 'spec-fix-fix-001',
      },
      panes: [],
      agent_providers: {},
      provider_resolutions: {},
      openspec: {
        change_name: 'callback-login-loop',
        state_root: '.planning/openspec',
        change_dir: '.planning/openspec/changes/callback-login-loop',
      },
      commits: {
        problem: 'abc1234',
        analysis: 'bcd2345',
        proposal_review: 'cde3456',
        coding: 'def4567',
        code_review: null,
        archive: null,
      },
      timestamps: {
        problem_captured: '2026-04-03T00:00:00.000Z',
        analysis: '2026-04-03T00:01:00.000Z',
        proposal_review: '2026-04-03T00:02:00.000Z',
        coding: '2026-04-03T00:03:00.000Z',
        code_review: null,
        archive: null,
      },
      stages: {
        analysis: { unlocked: false, status: 'completed' },
        proposal_review: { unlocked: false, status: 'completed' },
        coding: { unlocked: false, status: 'completed' },
        code_review: { unlocked: true, status: 'ready' },
        archive: { unlocked: false, status: 'locked' },
      },
    }, null, 2), 'utf8');

    const result = runGsdTools([
      'spec-fix',
      'complete-stage',
      'fix-001',
      '--stage',
      'code-review',
      '--review-outcome',
      'typo',
    ], cwd, { HOME: cwd });

    assert.equal(result.success, false, 'expected invalid review outcome to fail');
    assert.match(normalizeOutput(result.error), /accepted or changes_requested/i);

    const workflow = JSON.parse(fs.readFileSync(path.join(fixDir, 'workflow.json'), 'utf8'));
    assert.equal(workflow.current_stage, 'code-review-ready');
    assert.equal(workflow.commits.code_review, null);
  } finally {
    cleanup(cwd);
  }
});

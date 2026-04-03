/**
 * GSD Tools Test Helpers
 */

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOOLS_PATH = path.join(__dirname, '..', 'get-shit-done', 'bin', 'gsd-tools.cjs');

/**
 * Run gsd-tools command.
 *
 * @param {string|string[]} args - Command string (shell-interpreted) or array
 *   of arguments (shell-bypassed via execFileSync, safe for JSON and dollar signs).
 * @param {string} cwd - Working directory.
 * @param {object} [env] - Optional env overrides merged on top of process.env.
 *   Pass { HOME: cwd } to sandbox ~/.gsd/ lookups in tests that assert concrete
 *   config values that could be overridden by a developer's defaults.json.
 */
function runGsdTools(args, cwd = process.cwd(), env = {}) {
  try {
    let result;
    const childEnv = { ...process.env, ...env };
    if (Array.isArray(args)) {
      result = execFileSync(process.execPath, [TOOLS_PATH, ...args], {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: childEnv,
      });
    } else {
      result = execSync(`node "${TOOLS_PATH}" ${args}`, {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: childEnv,
      });
    }
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create a bare temp directory (no .planning/ structure)
function createTempDir(prefix = 'gsd-test-') {
  return fs.mkdtempSync(path.join(require('os').tmpdir(), prefix));
}

// Create temp directory structure
function createTempProject(prefix = 'gsd-test-') {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), prefix));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

// Create temp directory with initialized git repo and at least one commit
function createTempGitProject(prefix = 'gsd-test-') {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), prefix));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });

  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config commit.gpgsign false', { cwd: tmpDir, stdio: 'pipe' });

  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'PROJECT.md'),
    '# Project\n\nTest project.\n'
  );

  execSync('git add -A', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'pipe' });

  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Run one OpenSpec CLI command inside a temporary test repository.
 *
 * @param {string[]} args - OpenSpec argument vector.
 * @param {string} cwd - Repository root.
 * @returns {string} Trimmed stdout.
 */
function runOpenSpec(args, cwd) {
  return execFileSync('openspec', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Configure a repository-local nested OpenSpec state tree at `.planning/openspec`.
 *
 * @param {string} cwd - Repository root.
 */
function writeNestedOpenSpecLocator(cwd) {
  fs.writeFileSync(
    path.join(cwd, '.openspec-root.json'),
    JSON.stringify({ stateRoot: '.planning/openspec' }, null, 2),
    'utf8'
  );
  fs.mkdirSync(path.join(cwd, '.planning', 'openspec'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, '.planning', 'openspec', 'config.yaml'),
    'schema: spec-driven\n',
    'utf8'
  );
}

/**
 * Create a realistic linked OpenSpec change for spec-fix acceptance tests.
 *
 * @param {string} cwd - Repository root.
 * @param {string} changeName - Change identifier.
 * @param {object} [options] - Scaffolding options.
 * @param {boolean} [options.complete=false] - Whether to populate core artifacts.
 * @returns {string} Absolute change directory path.
 */
function scaffoldOpenSpecChange(cwd, changeName, options = {}) {
  const { complete = false } = options;

  writeNestedOpenSpecLocator(cwd);
  runOpenSpec(['new', 'change', changeName], cwd);

  const changeDir = path.join(cwd, '.planning', 'openspec', 'changes', changeName);
  if (!complete) {
    return changeDir;
  }

  fs.writeFileSync(
    path.join(changeDir, 'proposal.md'),
    [
      '## Why',
      '',
      'Need a linked spec-fix/OpenSpec change.',
      '',
      '## What Changes',
      '',
      '- Add one coordinated workflow.',
      '',
      '## Capabilities',
      '',
      '### New Capabilities',
      '- `coordination-link`: Link one fix workflow to one OpenSpec change.',
      '',
      '### Modified Capabilities',
      '- None.',
      '',
      '## Impact',
      '',
      '- GSD runner state and OpenSpec change state.',
      '',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(changeDir, 'design.md'),
    [
      '## Context',
      '',
      'Need the workflow and change to stay consistent.',
      '',
      '## Goals / Non-Goals',
      '',
      '**Goals:**',
      '- Coordinate one workflow with one change.',
      '',
      '**Non-Goals:**',
      '- Redesign the runner.',
      '',
      '## Decisions',
      '',
      '- Use OpenSpec runtime as the source of truth.',
      '',
      '## Risks / Trade-offs',
      '',
      '- External CLI failures must block archive.',
      '',
    ].join('\n'),
    'utf8'
  );

  const specDir = path.join(changeDir, 'specs', 'coordination-link');
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(
    path.join(specDir, 'spec.md'),
    [
      '## ADDED Requirements',
      '',
      '### Requirement: Workflow stays linked to the change',
      'The workflow MUST remain linked to the same OpenSpec change for its full lifetime.',
      '',
      '#### Scenario: Linked workflow status',
      '- **WHEN** the workflow reports status',
      '- **THEN** it shows the linked OpenSpec change name',
      '',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(changeDir, 'tasks.md'),
    [
      '## 1. Coordination',
      '',
      '- [x] 1.1 Create the linked change.',
      '- [x] 1.2 Define the linked workflow behavior.',
      '',
    ].join('\n'),
    'utf8'
  );

  return changeDir;
}

module.exports = {
  runGsdTools,
  runOpenSpec,
  writeNestedOpenSpecLocator,
  scaffoldOpenSpecChange,
  createTempDir,
  createTempProject,
  createTempGitProject,
  cleanup,
  TOOLS_PATH,
};

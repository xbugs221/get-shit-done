/**
 * Spec Fix Runner
 *
 * Provides a deterministic small-fix workflow runner that creates a fixed
 * workspace layout, persists workflow state, and exposes start/status/stage
 * completion commands for `gsd-tools spec-fix`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const {
  output,
  error,
  loadConfig,
  execGit,
  normalizeMd,
  planningRoot,
} = require('./core.cjs');

const FIX_STAGE_SEQUENCE = ['analysis', 'proposal_review', 'coding', 'code_review', 'archive'];
const FIX_AGENT_KEYS = ['analysis', 'proposal_review', 'coding', 'code_review', 'archive'];
const FIX_PANE_ROLES = ['lazygit', 'analysis', 'proposal-review', 'coding', 'code-review', 'archive'];
const SUPPORTED_MUX = new Set(['zellij', 'tmux']);
const DEFAULT_CHANGE_NAME = 'linear-spec-fix-runner';

/**
 * Ensure a directory exists before writing files into it.
 *
 * @param {string} dirPath - Directory path to create if missing.
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Pause synchronously for a short interval while polling external processes.
 *
 * @param {number} ms - Milliseconds to wait.
 */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Convert paths to git-friendly relative POSIX notation.
 *
 * @param {string} fromDir - Base directory.
 * @param {string} toPath - Target path.
 * @returns {string} Relative POSIX path.
 */
function toRelativePosix(fromDir, toPath) {
  return path.relative(fromDir, toPath).replace(/\\/g, '/');
}

/**
 * Quote one shell token for commands sent into tmux/zellij panes.
 *
 * @param {string} value - Raw shell token.
 * @returns {string} Single-quoted shell-safe token.
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Strip ANSI escape sequences from mux command output.
 *
 * @param {string} value - Raw terminal output.
 * @returns {string} Clean output without ANSI escape sequences.
 */
function stripAnsi(value) {
  return String(value || '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Create a repository-scoped mux session name to avoid cross-repo collisions.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixId - Fix workspace id.
 * @returns {string} Stable session name containing repo slug and path hash.
 */
function buildMuxSessionName(cwd, fixId) {
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
 * Run an external command and capture its result.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Argument vector.
 * @param {string} cwd - Working directory.
 * @returns {{exitCode: number, stdout: string, stderr: string}} Result payload.
 */
function runProcess(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return {
    exitCode: result.status ?? 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

/**
 * Render one executed command for mux metadata / debugging.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Argument vector.
 * @returns {string} Shell-like command string.
 */
function formatCommand(command, args) {
  return [command, ...args.map(arg => shellQuote(arg))].join(' ');
}

/**
 * Check whether a binary is available on PATH.
 *
 * @param {string} command - Executable name.
 * @returns {boolean} True when the executable is available.
 */
function commandExists(command) {
  return runProcess('sh', ['-lc', `command -v ${command}`], process.cwd()).exitCode === 0;
}

/**
 * Poll until a condition passes or timeout is exceeded.
 *
 * @param {Function} predicate - Function returning truthy when ready.
 * @param {number} timeoutMs - Maximum wait time.
 * @param {string} description - Human-readable failure description.
 */
function waitFor(predicate, timeoutMs, description) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    sleepMs(100);
  }
  throw new Error(description);
}

/**
 * Convert a free-form problem description into a single-line git subject.
 *
 * @param {string} problem - Original user problem text.
 * @returns {string} Normalized single-line subject suffix.
 */
function normalizeProblemSubject(problem) {
  return String(problem || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read a JSON file when present, otherwise return a fallback value.
 *
 * @param {string} filePath - JSON file path.
 * @param {any} fallback - Value returned when file does not exist.
 * @returns {any} Parsed JSON or fallback.
 */
function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Write pretty JSON with a trailing newline for stable diffs.
 *
 * @param {string} filePath - Target JSON file path.
 * @param {object} value - Serializable value.
 */
function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * Ensure `.planning/fixes/.gitignore` keeps mutable workflow state out of commits.
 *
 * The runner persists `workflow.json` after each stage transition, so it must be
 * excluded from stage commits to avoid self-referential commit hashes.
 *
 * @param {string} fixesRoot - Absolute `.planning/fixes` directory.
 * @returns {{ path: string, changed: boolean, restore: Function }} Gitignore mutation metadata.
 */
function ensureFixesGitignore(fixesRoot) {
  const gitignorePath = path.join(fixesRoot, '.gitignore');
  const rule = '*/workflow.json';
  let content = '';
  let existed = false;

  if (fs.existsSync(gitignorePath)) {
    existed = true;
    content = fs.readFileSync(gitignorePath, 'utf8');
    if (content.split(/\r?\n/).includes(rule)) {
      return {
        path: gitignorePath,
        changed: false,
        restore() {},
      };
    }
  }

  const nextContent = content.trim().length > 0
    ? `${content.replace(/\s*$/, '\n')}${rule}\n`
    : `${rule}\n`;
  fs.writeFileSync(gitignorePath, nextContent, 'utf8');
  return {
    path: gitignorePath,
    changed: true,
    restore() {
      if (existed) {
        fs.writeFileSync(gitignorePath, content, 'utf8');
        return;
      }
      fs.rmSync(gitignorePath, { force: true });
    },
  };
}

/**
 * Resolve the next fix workspace identifier using a stable numeric suffix.
 *
 * @param {string} fixesRoot - `.planning/fixes` directory.
 * @returns {string} Identifier such as `fix-001`.
 */
function nextFixId(fixesRoot) {
  const entries = fs.existsSync(fixesRoot)
    ? fs.readdirSync(fixesRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^fix-\d+$/.test(entry.name))
        .map(entry => Number(entry.name.slice(4)))
    : [];
  const nextNumber = entries.length > 0 ? Math.max(...entries) + 1 : 1;
  return `fix-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Map stage keys to their workspace artifact files.
 *
 * @param {string} fixDir - Absolute fix workspace directory.
 * @returns {Record<string, string>} Absolute artifact paths keyed by stage.
 */
function getArtifactPaths(fixDir) {
  return {
    analysis: path.join(fixDir, 'artifacts', 'analysis', 'RESULT.md'),
    proposal_review: path.join(fixDir, 'artifacts', 'proposal-review', 'REVIEW.md'),
    coding: path.join(fixDir, 'artifacts', 'coding', 'IMPLEMENTATION.md'),
    code_review: path.join(fixDir, 'artifacts', 'code-review', 'REVIEW.md'),
    archive: path.join(fixDir, 'artifacts', 'archive', 'SUMMARY.md'),
  };
}

/**
 * Resolve per-agent provider/runtime configuration from `.planning/config.json`.
 *
 * The persisted `agent_providers` field keeps a compact user-facing mapping for
 * status output, while `provider_resolutions` preserves the normalized provider
 * and runtime structure for hooks and mux payload generation.
 *
 * @param {string} cwd - Project root.
 * @returns {{agentProviders: object, providerResolutions: object}} Parsed mapping.
 */
function resolveAgentProviders(cwd) {
  const config = loadConfig(cwd);
  const configured = config.spec_fix_agent_providers || {};
  const agentProviders = {};
  const providerResolutions = {};

  for (const key of FIX_AGENT_KEYS) {
    const configuredValue =
      configured[key] ??
      configured[key.replace(/_/g, '-')] ??
      configured[key.replace(/_/g, '')] ??
      null;

    if (typeof configuredValue === 'string') {
      const [provider, runtime] = configuredValue.split(':', 2);
      agentProviders[key] = configuredValue;
      providerResolutions[key] = {
        provider: provider || configuredValue,
        runtime: runtime || null,
        source: 'workflow.spec_fix_agent_providers',
      };
      continue;
    }

    if (configuredValue && typeof configuredValue === 'object') {
      const provider = configuredValue.provider || configuredValue.runtime || 'default';
      const runtime = configuredValue.runtime || null;
      agentProviders[key] = runtime ? `${provider}:${runtime}` : provider;
      providerResolutions[key] = {
        provider,
        runtime,
        source: 'workflow.spec_fix_agent_providers',
      };
      continue;
    }

    agentProviders[key] = 'default';
    providerResolutions[key] = {
      provider: 'default',
      runtime: null,
      source: 'default',
    };
  }

  return { agentProviders, providerResolutions };
}

/**
 * Build stable mux pane metadata without reordering stages.
 *
 * @param {object} options - Pane construction options.
 * @param {string} options.fixId - Fix workspace id.
 * @param {string} options.fixDir - Absolute fix workspace directory.
 * @param {string} options.mux - Multiplexer type.
 * @param {object} options.agentProviders - Compact provider mapping.
 * @param {object} options.providerResolutions - Normalized provider/runtime mapping.
 * @param {string} options.cwd - Project root.
 * @returns {Array<object>} Pane definitions in the required fixed order.
 */
function buildPaneDefinitions({ fixId, fixDir, mux, agentProviders, providerResolutions, cwd }) {
  const promptDir = path.join(fixDir, 'prompts');

  return FIX_PANE_ROLES.map((role, index) => {
    const promptFile =
      role === 'lazygit'
        ? null
        : path.join(promptDir, `${role}.md`);
    const providerKey = role.replace(/-/g, '_');
    const provider = FIX_AGENT_KEYS.includes(providerKey) ? agentProviders[providerKey] : null;
    const providerResolution = FIX_AGENT_KEYS.includes(providerKey)
      ? providerResolutions[providerKey]
      : null;
    const runtime = providerResolution?.runtime || null;
    const promptAbsolutePath = promptFile || null;

    return {
      index: index + 1,
      pane_id: String(index + 1),
      role,
      mux,
      provider,
      runtime,
      prompt_path: promptFile ? path.relative(fixDir, promptFile).replace(/\\/g, '/') : null,
      injected_command: buildPaneShellCommand(cwd, promptAbsolutePath, role, providerResolution),
    };
  });
}

/**
 * Build a mux-specific adapter contract for the fixed pane layout.
 *
 * The runner keeps these launch payloads in workflow state so status output can
 * expose the exact pane order and injected commands even when the current
 * process does not actively attach to a terminal multiplexer.
 *
 * @param {string} cwd - Project root.
 * @param {string} mux - Multiplexer type.
 * @param {string} fixId - Fix workspace id.
 * @param {Array<object>} panes - Fixed pane definitions.
 * @returns {object} Mux metadata persisted in `workflow.json`.
 */
function buildMuxMetadata(cwd, mux, fixId, panes) {
  const sessionName = buildMuxSessionName(cwd, fixId);

  if (mux === 'zellij') {
    return {
      type: 'zellij',
      adapter_contract: 'fixed-six-pane-v1',
      session_name: sessionName,
      pane_order: FIX_PANE_ROLES,
      lazygit_pane: '1',
      launched: false,
      reason: 'layout_defined_for_runner',
      launch_commands: [
        formatCommand('script', ['-q', '-c', `zellij --session ${sessionName}`, '/dev/null']),
        formatCommand('zellij', ['--session', sessionName, 'action', 'rename-pane', panes[0].role]),
        formatCommand('zellij', ['--session', sessionName, 'action', 'write-chars', panes[0].injected_command]),
        formatCommand('zellij', ['--session', sessionName, 'action', 'write', '10']),
        ...panes.slice(1).map(pane =>
          formatCommand('zellij', ['--session', sessionName, 'action', 'new-pane', '--name', pane.role, '--cwd', cwd, '--', 'sh', '-lc', pane.injected_command])
        ),
      ],
    };
  }

  return {
    type: 'tmux',
    adapter_contract: 'fixed-six-pane-v1',
    session_name: sessionName,
    pane_order: FIX_PANE_ROLES,
    lazygit_pane: '1',
    launched: false,
    reason: 'layout_defined_for_runner',
    launch_commands: [
      formatCommand('tmux', ['new-session', '-d', '-P', '-F', '#{pane_id}', '-s', sessionName, '-c', cwd]),
      formatCommand('tmux', ['select-pane', '-t', '<root-pane>', '-T', panes[0].role]),
      formatCommand('tmux', ['send-keys', '-t', '<root-pane>', panes[0].injected_command, 'C-m']),
      ...panes.slice(1).flatMap(pane => [
        formatCommand('tmux', ['split-window', '-d', '-P', '-F', '#{pane_id}', '-t', '<root-pane>', '-c', cwd]),
        formatCommand('tmux', ['select-pane', '-t', '<new-pane>', '-T', pane.role]),
        formatCommand('tmux', ['send-keys', '-t', '<new-pane>', pane.injected_command, 'C-m']),
        formatCommand('tmux', ['select-layout', '-t', '<root-pane>', 'tiled']),
      ]),
    ],
  };
}

/**
 * Build the shell command injected into one mux pane.
 *
 * @param {string} cwd - Project root.
 * @param {string|null} promptPath - Absolute prompt path or null for lazygit.
 * @param {string} role - Pane role.
 * @param {{provider: string, runtime: string|null}|null} providerResolution - Parsed provider/runtime.
 * @returns {string} Shell command for the pane.
 */
function buildPaneShellCommand(cwd, promptPath, role, providerResolution) {
  if (!promptPath) {
    return `cd ${shellQuote(cwd)} && exec lazygit`;
  }

  const provider = providerResolution?.provider || 'default';
  const runtime = providerResolution?.runtime || '';

  return [
    `cd ${shellQuote(cwd)}`,
    `export GSD_SPEC_FIX_ROLE=${shellQuote(role)}`,
    `export GSD_SPEC_FIX_PROVIDER=${shellQuote(provider)}`,
    `export GSD_SPEC_FIX_RUNTIME=${shellQuote(runtime)}`,
    `cat ${shellQuote(promptPath)}`,
    `printf 'spec-fix role=%s provider=%s runtime=%s\\n' "$GSD_SPEC_FIX_ROLE" "$GSD_SPEC_FIX_PROVIDER" "$GSD_SPEC_FIX_RUNTIME"`,
    'printf \'\\n\'',
    'exec "${SHELL:-/bin/sh}" -l',
  ].join(' && ');
}

/**
 * Kill a previously launched mux session during rollback or test cleanup.
 *
 * @param {object|null} muxMetadata - Persisted mux metadata.
 * @param {string} cwd - Project root.
 */
function killMuxSession(muxMetadata, cwd) {
  if (!muxMetadata || !muxMetadata.session_name) return;

  if (muxMetadata.type === 'tmux') {
    runProcess('tmux', ['kill-session', '-t', muxMetadata.session_name], cwd);
    return;
  }

  runProcess('zellij', ['kill-session', muxMetadata.session_name], cwd);
}

/**
 * Check whether a tmux session already exists.
 *
 * @param {string} cwd - Project root.
 * @param {string} sessionName - Candidate session name.
 * @returns {boolean} True when the session already exists.
 */
function tmuxSessionExists(cwd, sessionName) {
  return runProcess('tmux', ['has-session', '-t', sessionName], cwd).exitCode === 0;
}

/**
 * Check whether a zellij session already exists.
 *
 * @param {string} cwd - Project root.
 * @param {string} sessionName - Candidate session name.
 * @returns {boolean} True when the session already exists.
 */
function zellijSessionExists(cwd, sessionName) {
  const sessions = runProcess('zellij', ['list-sessions'], cwd);
  if (sessions.exitCode !== 0) return false;
  return stripAnsi(sessions.stdout)
    .split('\n')
    .some(line => line.includes(sessionName));
}

/**
 * Remove one uncommitted fix workspace after a failed start attempt.
 *
 * @param {string} fixDir - Absolute fix workspace directory.
 * @param {{ changed: boolean, restore: Function }|null} gitignoreState - Gitignore mutation metadata.
 * @param {string} fixesRoot - Absolute `.planning/fixes` directory.
 */
function rollbackStartArtifacts(fixDir, gitignoreState, fixesRoot) {
  fs.rmSync(fixDir, { recursive: true, force: true });
  if (gitignoreState?.changed) {
    gitignoreState.restore();
  }
  try {
    const remaining = fs.readdirSync(fixesRoot, { withFileTypes: true });
    if (remaining.length === 0) {
      fs.rmdirSync(fixesRoot);
    }
  } catch {
    // Best-effort cleanup only.
  }
}

/**
 * Launch a detached tmux session with the fixed six-pane workflow layout.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixDir - Fix workspace directory.
 * @param {object} workflow - Workflow state to enrich.
 * @returns {object} Updated mux metadata.
 */
function launchTmuxSession(cwd, fixDir, workflow) {
  if (!commandExists('tmux')) {
    throw new Error('tmux is not installed or not available on PATH');
  }
  if (!commandExists('lazygit')) {
    throw new Error('lazygit is not installed or not available on PATH');
  }

  const sessionName = workflow.mux_metadata.session_name;
  const createdAt = new Date().toISOString();
  if (tmuxSessionExists(cwd, sessionName)) {
    throw new Error(`Failed to create tmux session ${sessionName}: duplicate session`);
  }

  let createdSession = false;
  const launchCommands = [];

  try {
    const newSessionArgs = ['new-session', '-d', '-P', '-F', '#{pane_id}', '-s', sessionName, '-c', cwd];
    launchCommands.push(formatCommand('tmux', newSessionArgs));
    const newSession = runProcess('tmux', newSessionArgs, cwd);
    if (newSession.exitCode !== 0) {
      throw new Error(newSession.stderr || newSession.stdout || `Failed to create tmux session ${sessionName}`);
    }
    if (!newSession.stdout) {
      throw new Error(`Failed to capture initial tmux pane for ${sessionName}`);
    }

    createdSession = true;
    const paneIds = [newSession.stdout.trim()];
    workflow.panes[0].pane_id = paneIds[0];

    const renameRootArgs = ['select-pane', '-t', paneIds[0], '-T', workflow.panes[0].role];
    launchCommands.push(formatCommand('tmux', renameRootArgs));
    runProcess('tmux', renameRootArgs, cwd);

    const sendRootArgs = ['send-keys', '-t', paneIds[0], workflow.panes[0].injected_command, 'C-m'];
    launchCommands.push(formatCommand('tmux', sendRootArgs));
    runProcess('tmux', sendRootArgs, cwd);

    for (let index = 1; index < workflow.panes.length; index += 1) {
      const pane = workflow.panes[index];
      const splitArgs = ['split-window', '-d', '-P', '-F', '#{pane_id}', '-t', paneIds[0], '-c', cwd];
      launchCommands.push(formatCommand('tmux', splitArgs));
      const splitResult = runProcess('tmux', splitArgs, cwd);
      if (splitResult.exitCode !== 0 || !splitResult.stdout) {
        throw new Error(splitResult.stderr || splitResult.stdout || `Failed to create tmux pane for ${pane.role}`);
      }

      const paneId = splitResult.stdout.trim();
      paneIds.push(paneId);
      pane.pane_id = paneId;

      const renameArgs = ['select-pane', '-t', paneId, '-T', pane.role];
      launchCommands.push(formatCommand('tmux', renameArgs));
      runProcess('tmux', renameArgs, cwd);

      const sendArgs = ['send-keys', '-t', paneId, pane.injected_command, 'C-m'];
      launchCommands.push(formatCommand('tmux', sendArgs));
      runProcess('tmux', sendArgs, cwd);

      const layoutArgs = ['select-layout', '-t', paneIds[0], 'tiled'];
      launchCommands.push(formatCommand('tmux', layoutArgs));
      runProcess('tmux', layoutArgs, cwd);
    }

    const finalLayoutArgs = ['select-layout', '-t', paneIds[0], 'tiled'];
    launchCommands.push(formatCommand('tmux', finalLayoutArgs));
    runProcess('tmux', finalLayoutArgs, cwd);

    return {
      ...workflow.mux_metadata,
      launched: true,
      reason: 'session_started',
      launched_at: createdAt,
      pane_ids: paneIds,
      launch_commands: launchCommands,
    };
  } catch (err) {
    if (createdSession) {
      killMuxSession({ type: 'tmux', session_name: sessionName }, cwd);
    }
    throw err;
  }
}

/**
 * Launch a detached zellij session with the fixed six-pane workflow layout.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixDir - Fix workspace directory.
 * @param {object} workflow - Workflow state to enrich.
 * @returns {object} Updated mux metadata.
 */
function launchZellijSession(cwd, fixDir, workflow) {
  if (!commandExists('zellij')) {
    throw new Error('zellij is not installed or not available on PATH');
  }
  if (!commandExists('script')) {
    throw new Error('script is required to start a detached zellij session');
  }
  if (!commandExists('lazygit')) {
    throw new Error('lazygit is not installed or not available on PATH');
  }

  const sessionName = workflow.mux_metadata.session_name;
  const createdAt = new Date().toISOString();
  const launcherLog = path.join(fixDir, 'mux', 'zellij-launch.log');
  ensureDir(path.dirname(launcherLog));
  if (zellijSessionExists(cwd, sessionName)) {
    throw new Error(`Failed to create zellij session ${sessionName}: duplicate session`);
  }

  let launcher = null;
  let createdSession = false;
  const launchCommands = [];

  try {
    const startArgs = ['-q', '-c', `zellij --session ${sessionName}`, '/dev/null'];
    launchCommands.push(formatCommand('script', startArgs));
    launcher = spawn('script', startArgs, {
      cwd,
      detached: true,
      stdio: ['ignore', fs.openSync(launcherLog, 'a'), fs.openSync(launcherLog, 'a')],
    });
    launcher.unref();

    waitFor(() => zellijSessionExists(cwd, sessionName), 5000, `Timed out waiting for zellij session ${sessionName}`);
    createdSession = true;

    const actionBase = ['--session', sessionName, 'action'];
    const renameArgs = [...actionBase, 'rename-pane', workflow.panes[0].role];
    launchCommands.push(formatCommand('zellij', renameArgs));
    const renameResult = runProcess('zellij', renameArgs, cwd);
    if (renameResult.exitCode !== 0) {
      throw new Error(renameResult.stderr || renameResult.stdout || `Failed to rename zellij pane for ${sessionName}`);
    }

    const writeCharsArgs = [...actionBase, 'write-chars', workflow.panes[0].injected_command];
    launchCommands.push(formatCommand('zellij', writeCharsArgs));
    runProcess('zellij', writeCharsArgs, cwd);

    const writeArgs = [...actionBase, 'write', '10'];
    launchCommands.push(formatCommand('zellij', writeArgs));
    runProcess('zellij', writeArgs, cwd);

    for (let index = 1; index < workflow.panes.length; index += 1) {
      const pane = workflow.panes[index];
      const paneArgs = [...actionBase, 'new-pane', '--name', pane.role, '--cwd', cwd, '--', 'sh', '-lc', pane.injected_command];
      launchCommands.push(formatCommand('zellij', paneArgs));
      const paneResult = runProcess('zellij', paneArgs, cwd);
      if (paneResult.exitCode !== 0) {
        throw new Error(paneResult.stderr || paneResult.stdout || `Failed to create zellij pane for ${pane.role}`);
      }
      pane.pane_id = String(index + 1);
    }

    return {
      ...workflow.mux_metadata,
      launched: true,
      reason: 'session_started',
      launched_at: createdAt,
      launcher_pid: launcher.pid,
      launcher_log: toRelativePosix(cwd, launcherLog),
      pane_ids: workflow.panes.map(pane => pane.pane_id),
      launch_commands: launchCommands,
    };
  } catch (err) {
    if (createdSession) {
      killMuxSession({ type: 'zellij', session_name: sessionName }, cwd);
    }
    throw err;
  }
}

/**
 * Start the configured mux session and enrich workflow state with launch data.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixDir - Fix workspace directory.
 * @param {object} workflow - Workflow state to enrich.
 * @returns {object} Updated mux metadata.
 */
function launchMuxSession(cwd, fixDir, workflow) {
  if (workflow.mux === 'tmux') {
    return launchTmuxSession(cwd, fixDir, workflow);
  }
  if (workflow.mux === 'zellij') {
    return launchZellijSession(cwd, fixDir, workflow);
  }
  throw new Error(`Unsupported mux type: ${workflow.mux}`);
}

/**
 * Build the initial stage table with locked/unlocked state and artifact paths.
 *
 * @param {string} fixDir - Absolute fix workspace directory.
 * @returns {Record<string, object>} Stage metadata.
 */
function buildInitialStageState(fixDir) {
  const artifacts = getArtifactPaths(fixDir);

  return {
    analysis: {
      key: 'analysis',
      unlocked: true,
      status: 'ready',
      artifact_path: path.relative(fixDir, artifacts.analysis).replace(/\\/g, '/'),
      commit_message: null,
    },
    proposal_review: {
      key: 'proposal_review',
      unlocked: false,
      status: 'locked',
      artifact_path: path.relative(fixDir, artifacts.proposal_review).replace(/\\/g, '/'),
      commit_message: null,
    },
    coding: {
      key: 'coding',
      unlocked: false,
      status: 'locked',
      artifact_path: path.relative(fixDir, artifacts.coding).replace(/\\/g, '/'),
      commit_message: null,
    },
    code_review: {
      key: 'code_review',
      unlocked: false,
      status: 'locked',
      artifact_path: path.relative(fixDir, artifacts.code_review).replace(/\\/g, '/'),
      commit_message: null,
    },
    archive: {
      key: 'archive',
      unlocked: false,
      status: 'locked',
      artifact_path: path.relative(fixDir, artifacts.archive).replace(/\\/g, '/'),
      commit_message: null,
    },
  };
}

/**
 * Create stage prompt and artifact placeholder files for one fix workspace.
 *
 * @param {string} fixDir - Absolute fix workspace directory.
 * @param {string} fixId - Fix workspace id.
 * @param {string} problem - Original user problem.
 * @param {object} providerResolutions - Normalized provider mapping.
 */
function materializeWorkspaceFiles(fixDir, fixId, problem, providerResolutions) {
  const promptDir = path.join(fixDir, 'prompts');
  const artifacts = getArtifactPaths(fixDir);
  const feedbackDir = path.join(fixDir, 'feedback');

  ensureDir(promptDir);
  ensureDir(feedbackDir);
  for (const artifactPath of Object.values(artifacts)) {
    ensureDir(path.dirname(artifactPath));
  }

  const problemDoc = normalizeMd(
    [
      '# Problem',
      '',
      `- Fix ID: ${fixId}`,
      '- Workflow: fixed spec-fix runner',
      '',
      '## Original Input',
      '',
      problem.trim(),
      '',
      '## Normalized Subject',
      '',
      `问题：${normalizeProblemSubject(problem)}`,
      '',
    ].join('\n')
  );
  fs.writeFileSync(path.join(fixDir, 'PROBLEM.md'), problemDoc, 'utf8');

  const promptTemplates = {
    analysis: [
      '# Analysis Stage',
      '',
      `- Fix ID: ${fixId}`,
      `- Provider: ${providerResolutions.analysis.provider}`,
      `- Runtime: ${providerResolutions.analysis.runtime || 'default'}`,
      '- Deliverable: artifacts/analysis/RESULT.md',
      '',
      'Write evidence, symptoms, suspected root cause, and the proposed fix direction.',
    ],
    'proposal-review': [
      '# Proposal Review Stage',
      '',
      `- Fix ID: ${fixId}`,
      `- Provider: ${providerResolutions.proposal_review.provider}`,
      `- Runtime: ${providerResolutions.proposal_review.runtime || 'default'}`,
      '- Deliverable: artifacts/proposal-review/REVIEW.md',
      '',
      'Review the analysis proposal, challenge scope, and either approve or request changes.',
    ],
    coding: [
      '# Coding Stage',
      '',
      `- Fix ID: ${fixId}`,
      `- Provider: ${providerResolutions.coding.provider}`,
      `- Runtime: ${providerResolutions.coding.runtime || 'default'}`,
      '- Deliverable: artifacts/coding/IMPLEMENTATION.md',
      '',
      'Implement only the approved change. Record touched files, tests, and commit-ready notes.',
    ],
    'code-review': [
      '# Code Review Stage',
      '',
      `- Fix ID: ${fixId}`,
      `- Provider: ${providerResolutions.code_review.provider}`,
      `- Runtime: ${providerResolutions.code_review.runtime || 'default'}`,
      '- Deliverable: artifacts/code-review/REVIEW.md',
      '',
      'Compare the implementation against the original problem and proposal. Produce structured review feedback.',
    ],
    archive: [
      '# Archive Stage',
      '',
      `- Fix ID: ${fixId}`,
      `- Provider: ${providerResolutions.archive.provider}`,
      `- Runtime: ${providerResolutions.archive.runtime || 'default'}`,
      '- Deliverable: artifacts/archive/SUMMARY.md',
      '',
      'Summarize the final accepted solution, review outcome, and resulting commits.',
    ],
  };

  for (const [name, lines] of Object.entries(promptTemplates)) {
    fs.writeFileSync(path.join(promptDir, `${name}.md`), normalizeMd(lines.join('\n')), 'utf8');
  }

  const artifactTemplates = {
    analysis: '# Analysis Result\n\n<!-- spec-fix:complete by replacing this placeholder with evidence -->\n',
    proposal_review: '# Proposal Review\n\n<!-- spec-fix:complete by replacing this placeholder with approval or change requests -->\n',
    coding: '# Coding Notes\n\n<!-- spec-fix:complete by replacing this placeholder with implementation notes and tests -->\n',
    code_review: '# Code Review\n\n<!-- spec-fix:complete by replacing this placeholder with verification findings -->\n',
    archive: '# Archive Summary\n\n<!-- spec-fix:complete by replacing this placeholder with final archival notes -->\n',
  };

  fs.writeFileSync(artifacts.analysis, artifactTemplates.analysis, 'utf8');
  fs.writeFileSync(artifacts.proposal_review, artifactTemplates.proposal_review, 'utf8');
  fs.writeFileSync(artifacts.coding, artifactTemplates.coding, 'utf8');
  fs.writeFileSync(artifacts.code_review, artifactTemplates.code_review, 'utf8');
  fs.writeFileSync(artifacts.archive, artifactTemplates.archive, 'utf8');
}

/**
 * Create the initial workflow document for a new fix run.
 *
 * @param {object} options - Workflow creation options.
 * @returns {object} Workflow state ready to be written to disk.
 */
function buildInitialWorkflow(options) {
  const {
    cwd,
    fixId,
    fixDir,
    problem,
    mux,
    changeName,
    agentProviders,
    providerResolutions,
  } = options;
  const now = new Date().toISOString();
  const stages = buildInitialStageState(fixDir);
  const panes = buildPaneDefinitions({ fixId, fixDir, mux, agentProviders, providerResolutions, cwd });

  return {
    id: fixId,
    change_name: changeName,
    mux,
    current_stage: 'problem-captured',
    review_attempt: 0,
    review_resolution: null,
    auto_accept_after_round_3: false,
    blocked: false,
    created_at: now,
    updated_at: now,
    last_committed_stage: 'problem',
    problem_subject: `问题：${normalizeProblemSubject(problem)}`,
    problem_path: 'PROBLEM.md',
    workflow_schema: 'fixed-spec-fix-runner/v1',
    panes,
    mux_metadata: buildMuxMetadata(cwd, mux, fixId, panes),
    agent_providers: agentProviders,
    provider_resolutions: providerResolutions,
    commits: {
      problem: null,
      analysis: null,
      proposal_review: null,
      coding: null,
      code_review: null,
      archive: null,
    },
    timestamps: {
      problem_captured: now,
      analysis: null,
      proposal_review: null,
      coding: null,
      code_review: null,
      archive: null,
    },
    stages,
  };
}

/**
 * Find the latest fix workspace on disk.
 *
 * @param {string} cwd - Project root.
 * @returns {{id: string, dir: string}|null} Latest fix workspace or null.
 */
function findLatestFix(cwd) {
  const fixesRoot = path.join(planningRoot(cwd), 'fixes');
  if (!fs.existsSync(fixesRoot)) return null;
  const ids = fs.readdirSync(fixesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^fix-\d+$/.test(entry.name))
    .map(entry => ({
      id: entry.name,
      num: Number(entry.name.slice(4)),
    }))
    .sort((a, b) => a.num - b.num);
  if (ids.length === 0) return null;
  const id = ids[ids.length - 1].id;
  return { id, dir: path.join(fixesRoot, id) };
}

/**
 * Resolve one fix workspace by id and validate its workflow state file.
 *
 * @param {string} cwd - Project root.
 * @param {string|null} fixId - Optional fix id.
 * @returns {{fixId: string, fixDir: string, workflowPath: string, workflow: object}} Workspace details.
 */
function resolveFixWorkspace(cwd, fixId) {
  const target = fixId ? { id: fixId, dir: path.join(planningRoot(cwd), 'fixes', fixId) } : findLatestFix(cwd);
  if (!target) {
    error('No spec-fix workspace found. Run `gsd-tools spec-fix start --mux <zellij|tmux> --problem "..."` first.');
  }

  const workflowPath = path.join(target.dir, 'workflow.json');
  if (!fs.existsSync(workflowPath)) {
    error(`Missing workflow.json for ${target.id}`);
  }

  return {
    fixId: target.id,
    fixDir: target.dir,
    workflowPath,
    workflow: readJson(workflowPath, {}),
  };
}

/**
 * Ensure a stage artifact exists and is no longer the generated placeholder.
 *
 * @param {string} artifactPath - Absolute artifact path.
 * @param {string} stageName - Stage name for error messages.
 */
function validateArtifact(artifactPath, stageName) {
  if (!fs.existsSync(artifactPath)) {
    error(`Stage ${stageName} is missing required artifact: ${artifactPath}`);
  }

  const content = fs.readFileSync(artifactPath, 'utf8').trim();
  if (!content || content.includes('<!-- spec-fix:complete')) {
    error(`Stage ${stageName} artifact is still using the generated placeholder: ${artifactPath}`);
  }
}

/**
 * Return the fixed stage commit message pattern required by the runner.
 *
 * @param {string} fixId - Fix workspace id.
 * @param {string} stageKey - Internal stage key.
 * @returns {string} Commit subject for the stage.
 */
function getStageCommitMessage(fixId, stageKey) {
  switch (stageKey) {
    case 'analysis':
      return `analysis(${fixId}): evidence and openspec change`;
    case 'proposal_review':
      return `review(${fixId}): refine proposal`;
    case 'coding':
      return `fix(${fixId}): implement approved proposal`;
    case 'code_review':
      return `review(${fixId}): verify against problem and proposal`;
    case 'archive':
      return `chore(${fixId}): archive workflow`;
    default:
      return `chore(${fixId}): update workflow`;
  }
}

/**
 * Advance the deterministic runner after a validated stage completes.
 *
 * @param {object} workflow - Workflow JSON object to mutate.
 * @param {string} stageKey - Stage being completed.
 * @param {object} options - Completion options.
 * @param {string|null} options.reviewOutcome - Code review outcome.
 * @param {string|null} options.feedbackFile - Optional feedback file path.
 */
function advanceWorkflowState(workflow, stageKey, options) {
  const now = new Date().toISOString();
  workflow.updated_at = now;
  workflow.timestamps[stageKey] = now;
  workflow.stages[stageKey].unlocked = false;
  workflow.stages[stageKey].status = 'completed';
  workflow.stages[stageKey].commit_message = getStageCommitMessage(workflow.id, stageKey);
  workflow.stages[stageKey].completed_at = now;
  workflow.last_committed_stage = stageKey;

  if (stageKey === 'analysis') {
    workflow.current_stage = 'analysis-done';
    workflow.stages.proposal_review.unlocked = true;
    workflow.stages.proposal_review.status = 'ready';
    return;
  }

  if (stageKey === 'proposal_review') {
    workflow.current_stage = 'proposal-review-done';
    workflow.stages.coding.unlocked = true;
    workflow.stages.coding.status = 'ready';
    return;
  }

  if (stageKey === 'coding') {
    workflow.current_stage = 'coding-done';
    workflow.stages.code_review.unlocked = true;
    workflow.stages.code_review.status = 'ready';
    return;
  }

  if (stageKey === 'code_review') {
    const reviewOutcome = options.reviewOutcome || 'accepted';
    if (reviewOutcome === 'changes_requested') {
      workflow.review_attempt += 1;
      if (options.feedbackFile) {
        workflow.latest_review_feedback = options.feedbackFile;
      }
      if (workflow.review_attempt >= 3) {
        workflow.review_resolution = 'accepted_after_round_3';
        workflow.auto_accept_after_round_3 = true;
        workflow.current_stage = 'archive-ready';
        workflow.stages.archive.unlocked = true;
        workflow.stages.archive.status = 'ready';
      } else {
        workflow.review_resolution = 'changes_requested';
        workflow.current_stage = 'coding-redo';
        workflow.stages.coding.unlocked = true;
        workflow.stages.coding.status = 'ready';
        workflow.stages.coding.redo_requested_at = now;
        workflow.stages.code_review.status = 'waiting_for_redo';
      }
      return;
    }

    workflow.review_attempt += 1;
    workflow.review_resolution = 'accepted';
    workflow.current_stage = 'archive-ready';
    workflow.stages.archive.unlocked = true;
    workflow.stages.archive.status = 'ready';
    return;
  }

  if (stageKey === 'archive') {
    workflow.current_stage = 'archived';
    workflow.review_resolution = workflow.review_resolution || 'accepted';
    return;
  }
}

/**
 * Stage files and create one workflow commit.
 *
 * @param {string} cwd - Project root.
 * @param {string[]} files - Relative paths to stage.
 * @param {string} message - Commit subject.
 * @returns {string} Short commit hash.
 */
function commitFiles(cwd, files, message) {
  for (const file of files) {
    execGit(cwd, ['add', file]);
  }

  const result = execGit(cwd, ['commit', '-m', message]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to create commit: ${message}`);
  }

  const hashResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  if (hashResult.exitCode !== 0 || !hashResult.stdout) {
    throw new Error(`Commit succeeded but failed to resolve HEAD hash for: ${message}`);
  }
  return hashResult.stdout.trim();
}

/**
 * Command: start a new deterministic spec-fix run.
 *
 * @param {string} cwd - Project root.
 * @param {object} options - Start options.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixStart(cwd, options, raw) {
  const mux = options.mux;
  const problem = String(options.problem || '').trim();
  if (!SUPPORTED_MUX.has(mux)) {
    error('Usage: gsd-tools spec-fix start --mux <zellij|tmux> --problem "..." [--change <name>]');
  }
  if (!problem) {
    error('Usage: gsd-tools spec-fix start --mux <zellij|tmux> --problem "..." [--change <name>]');
  }

  const gitCheck = execGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (gitCheck.exitCode !== 0) {
    error('spec-fix start requires a git repository');
  }

  const fixesRoot = path.join(planningRoot(cwd), 'fixes');
  ensureDir(fixesRoot);
  const fixesGitignoreState = ensureFixesGitignore(fixesRoot);
  const fixesGitignorePath = fixesGitignoreState.path;

  const fixId = nextFixId(fixesRoot);
  const fixDir = path.join(fixesRoot, fixId);
  ensureDir(fixDir);

  const { agentProviders, providerResolutions } = resolveAgentProviders(cwd);
  materializeWorkspaceFiles(fixDir, fixId, problem, providerResolutions);

  const workflow = buildInitialWorkflow({
    cwd,
    fixId,
    fixDir,
    problem,
    mux,
    changeName: options.change || DEFAULT_CHANGE_NAME,
    agentProviders,
    providerResolutions,
  });
  const workflowPath = path.join(fixDir, 'workflow.json');
  writeJson(workflowPath, workflow);
  let launchedMuxMetadata = null;

  try {
    launchedMuxMetadata = launchMuxSession(cwd, fixDir, workflow);
    workflow.mux_metadata = launchedMuxMetadata;
    writeJson(workflowPath, workflow);

    const commitMessage = `问题：${normalizeProblemSubject(problem)}`;
    const problemHash = commitFiles(cwd, [
      toRelativePosix(cwd, fixesGitignorePath),
      toRelativePosix(cwd, fixDir),
    ], commitMessage);
    workflow.commits.problem = problemHash;
    workflow.mux_metadata.last_problem_commit = problemHash;
    workflow.updated_at = new Date().toISOString();
    writeJson(workflowPath, workflow);
  } catch (err) {
    if (launchedMuxMetadata?.launched) {
      killMuxSession(launchedMuxMetadata, cwd);
    }
    rollbackStartArtifacts(fixDir, fixesGitignoreState, fixesRoot);
    error(err.message);
  }

  const result = {
    started: true,
    id: fixId,
    mux,
    current_stage: workflow.current_stage,
    review_attempt: workflow.review_attempt,
    change_name: workflow.change_name,
    workspace: toRelativePosix(cwd, fixDir),
    problem_subject: workflow.problem_subject,
    agent_providers: workflow.agent_providers,
    mux_metadata: workflow.mux_metadata,
    panes: workflow.panes,
  };
  output(result, raw, fixId);
}

/**
 * Command: mark one stage complete via validate -> commit -> persist -> unlock.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixId - Fix workspace id.
 * @param {object} options - Completion options.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixCompleteStage(cwd, fixId, options, raw) {
  const stageArg = String(options.stage || '').trim().replace(/-/g, '_');
  if (!FIX_STAGE_SEQUENCE.includes(stageArg)) {
    error('Usage: gsd-tools spec-fix complete-stage <id> --stage <analysis|proposal-review|coding|code-review|archive> [--review-outcome <accepted|changes_requested>] [--feedback-file <path>]');
  }
  if (stageArg !== 'code_review' && options.reviewOutcome) {
    error('--review-outcome is only valid for the code-review stage');
  }
  if (stageArg === 'code_review' && options.reviewOutcome && !['accepted', 'changes_requested'].includes(options.reviewOutcome)) {
    error('--review-outcome must be either accepted or changes_requested');
  }

  const { fixDir, workflowPath, workflow } = resolveFixWorkspace(cwd, fixId);

  if (!workflow.stages || !workflow.stages[stageArg]) {
    error(`Unknown stage in workflow: ${stageArg}`);
  }
  if (workflow.stages[stageArg].status === 'completed') {
    error(`Stage ${stageArg} has already been completed`);
  }
  if (!workflow.stages[stageArg].unlocked) {
    error(`Stage ${stageArg} is still locked`);
  }

  const artifacts = getArtifactPaths(fixDir);
  validateArtifact(artifacts[stageArg], stageArg);

  let feedbackFile = null;
  if (options.feedbackFile) {
    feedbackFile = path.relative(fixDir, path.resolve(cwd, options.feedbackFile)).replace(/\\/g, '/');
  }

  const filesToCommit = [toRelativePosix(cwd, artifacts[stageArg])];
  if (options.feedbackFile && fs.existsSync(path.resolve(cwd, options.feedbackFile))) {
    filesToCommit.push(toRelativePosix(cwd, path.resolve(cwd, options.feedbackFile)));
  }

  let commitHash;
  try {
    commitHash = commitFiles(cwd, filesToCommit, getStageCommitMessage(workflow.id, stageArg));
    workflow.commits[stageArg] = commitHash;
    advanceWorkflowState(workflow, stageArg, {
      reviewOutcome: options.reviewOutcome || null,
      feedbackFile,
    });
    writeJson(workflowPath, workflow);
  } catch (err) {
    error(err.message);
  }

  const result = {
    completed: stageArg,
    id: workflow.id,
    current_stage: workflow.current_stage,
    review_attempt: workflow.review_attempt,
    review_resolution: workflow.review_resolution,
    auto_accept_after_round_3: workflow.auto_accept_after_round_3,
    commit_hash: commitHash,
  };
  output(result, raw, workflow.current_stage);
}

/**
 * Command: render status for one fix workspace.
 *
 * @param {string} cwd - Project root.
 * @param {string|null} fixId - Optional fix workspace id.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixStatus(cwd, fixId, raw) {
  const { fixDir, workflow } = resolveFixWorkspace(cwd, fixId);
  const result = {
    id: workflow.id,
    change_name: workflow.change_name,
    current_stage: workflow.current_stage,
    review_attempt: workflow.review_attempt,
    review_resolution: workflow.review_resolution,
    auto_accept_after_round_3: workflow.auto_accept_after_round_3,
    blocked: workflow.blocked,
    problem_subject: workflow.problem_subject,
    mux: workflow.mux,
    mux_metadata: workflow.mux_metadata,
    panes: workflow.panes,
    agent_providers: workflow.agent_providers,
    provider_resolutions: workflow.provider_resolutions,
    commits: workflow.commits,
    workflow_path: toRelativePosix(cwd, path.join(fixDir, 'workflow.json')),
  };
  output(result, raw, workflow.current_stage);
}

/**
 * Command: lightweight top-level status for compatibility with acceptance tests.
 *
 * @param {string} cwd - Project root.
 * @param {boolean} raw - Raw output mode.
 */
function cmdStatusOverview(cwd, raw) {
  const headSubjectResult = execGit(cwd, ['log', '-1', '--pretty=%s']);
  const latestFix = findLatestFix(cwd);
  const payload = {
    head_subject: headSubjectResult.exitCode === 0 ? headSubjectResult.stdout.trim() : null,
    active_fix: null,
  };

  if (latestFix) {
    const workflow = readJson(path.join(latestFix.dir, 'workflow.json'), null);
    if (workflow) {
      payload.active_fix = {
        id: workflow.id,
        current_stage: workflow.current_stage,
        problem_subject: workflow.problem_subject,
      };
    }
  }

  output(payload, raw, payload.head_subject || '');
}

module.exports = {
  cmdSpecFixStart,
  cmdSpecFixStatus,
  cmdSpecFixCompleteStage,
  cmdStatusOverview,
};

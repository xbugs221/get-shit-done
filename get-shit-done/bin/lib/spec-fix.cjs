/**
 * Spec Fix Runner
 *
 * Provides a deterministic small-fix workflow runner that supports both the
 * legacy staged entrypoints and the autonomous natural-language orchestrator
 * for `gsd-tools spec-fix`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const {
  output,
  error,
  loadConfig,
  execGit,
  normalizeMd,
  planningRoot,
} = require('./core.cjs');
const {
  archiveOpenSpecChange,
  ensureOpenSpecChange,
  getOpenSpecChangeSnapshot,
  resolveOpenSpecStateRootHint,
} = require('./openspec-runtime.cjs');

const FIX_STAGE_SEQUENCE = ['analysis', 'proposal_review', 'coding', 'code_review', 'archive'];
const FIX_AGENT_KEYS = ['analysis', 'proposal_review', 'coding', 'code_review', 'archive'];
const FIX_PANE_ROLES = ['lazygit', 'analysis', 'proposal-review', 'coding', 'code-review', 'archive'];
const SUPPORTED_MUX = new Set(['zellij', 'tmux']);
const STAGE_ROLE_BY_KEY = {
  analysis: 'analysis',
  proposal_review: 'proposal-review',
  coding: 'coding',
  code_review: 'code-review',
  archive: 'archive',
};
const CLI_ENTRY = path.resolve(__dirname, '..', 'gsd-tools.cjs');

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
 * Quote one string for a KDL layout document.
 *
 * @param {string} value - Raw string content.
 * @returns {string} JSON-style quoted string accepted by KDL.
 */
function kdlQuote(value) {
  return JSON.stringify(String(value));
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
 * @param {object} [options] - Process options.
 * @param {object} [options.env] - Extra environment variables.
 * @returns {{exitCode: number, stdout: string, stderr: string}} Result payload.
 */
function runProcess(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env: options.env ? { ...process.env, ...options.env } : process.env,
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
 * Persist the latest linked OpenSpec snapshot on the workflow document.
 *
 * @param {object} workflow - Workflow JSON object to enrich.
 * @param {object} snapshot - Fresh OpenSpec snapshot from the runtime bridge.
 */
function syncWorkflowOpenSpec(workflow, snapshot) {
  workflow.change_name = snapshot.change_name;
  workflow.openspec_sync_state = 'synced';
  workflow.openspec = {
    ...snapshot,
    sync_state: 'synced',
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * Mark the workflow as blocked with a stable reason for status reporting.
 *
 * @param {object} workflow - Workflow JSON object to mutate.
 * @param {string} stageKey - Stage that caused the block.
 * @param {string} reason - Human-readable block reason.
 */
function markWorkflowBlocked(workflow, stageKey, reason) {
  workflow.blocked = true;
  workflow.blocked_reason = reason;
  workflow.blocking_stage = stageKey;
  workflow.executing_stage = null;
  workflow.execution_state = 'blocked';
  workflow.current_stage = `${getStageRole(stageKey)}-blocked`;
  workflow.updated_at = new Date().toISOString();
}

/**
 * Clear any previous workflow block before retrying execution.
 *
 * @param {object} workflow - Workflow JSON object to mutate.
 */
function clearWorkflowBlocked(workflow) {
  workflow.blocked = false;
  workflow.blocked_reason = null;
  workflow.blocking_stage = null;
  workflow.updated_at = new Date().toISOString();
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
 * Convert one internal stage key into the persisted pane role form.
 *
 * @param {string} stageKey - Internal stage key such as `proposal_review`.
 * @returns {string} Role token such as `proposal-review`.
 */
function getStageRole(stageKey) {
  return STAGE_ROLE_BY_KEY[stageKey] || stageKey.replace(/_/g, '-');
}

/**
 * Convert one pane role token into the internal stage key form.
 *
 * @param {string} role - Pane role such as `proposal-review`.
 * @returns {string} Internal stage key such as `proposal_review`.
 */
function getStageKeyFromRole(role) {
  return String(role || '').replace(/-/g, '_');
}

/**
 * Build the shared stage execution contract used by autonomous and mux modes.
 *
 * @param {object} options - Contract options.
 * @param {string} options.cwd - Project root.
 * @param {string} options.fixId - Fix workspace id.
 * @param {string} options.fixDir - Absolute fix workspace directory.
 * @param {string} options.stageKey - Internal stage key.
 * @param {{provider: string, runtime: string|null}|null} options.providerResolution - Provider/runtime selection.
 * @returns {{command: string, args: string[], env: object, display_command: string}} Stage command spec.
 */
function buildStageExecutionSpec({ cwd, fixId, fixDir, stageKey, providerResolution }) {
  const role = getStageRole(stageKey);
  const promptPath = path.join(fixDir, 'prompts', `${role}.md`);
  const artifactPath = getArtifactPaths(fixDir)[stageKey];
  const command = process.execPath;
  const args = [
    CLI_ENTRY,
    'spec-fix',
    'run-stage',
    fixId,
    '--stage',
    role,
    '--cwd',
    cwd,
  ];

  return {
    command,
    args,
    env: {
      GSD_SPEC_FIX_ROLE: role,
      GSD_SPEC_FIX_PROVIDER: providerResolution?.provider || 'default',
      GSD_SPEC_FIX_RUNTIME: providerResolution?.runtime || '',
      GSD_SPEC_FIX_PROMPT_PATH: promptPath,
      GSD_SPEC_FIX_ARTIFACT_PATH: artifactPath,
    },
    display_command: formatCommand(command, args),
  };
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
    const stageExecution = FIX_AGENT_KEYS.includes(providerKey)
      ? buildStageExecutionSpec({
          cwd,
          fixId,
          fixDir,
          stageKey: providerKey,
          providerResolution,
        })
      : null;

    return {
      index: index + 1,
      pane_id: String(index + 1),
      role,
      mux,
      provider,
      runtime,
      prompt_path: promptFile ? path.relative(fixDir, promptFile).replace(/\\/g, '/') : null,
      stage_command: stageExecution,
      injected_command: buildPaneShellCommand(cwd, promptAbsolutePath, role, providerResolution, stageExecution),
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
function buildMuxMetadata(cwd, mux, fixId, panes, fixDir) {
  const sessionName = buildMuxSessionName(cwd, fixId);

  if (mux === 'zellij') {
    const layoutPath = path.join(fixDir, 'mux', 'zellij-layout.kdl');
    return {
      type: 'zellij',
      adapter_contract: 'fixed-six-pane-v1',
      session_name: sessionName,
      pane_order: FIX_PANE_ROLES,
      lazygit_pane: '1',
      layout_path: toRelativePosix(cwd, layoutPath),
      launched: false,
      reason: 'layout_defined_for_runner',
      launch_commands: [
        formatCommand('zellij', ['attach', sessionName, '--create-background', 'options', '--default-layout', layoutPath]),
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
 * @param {{command: string, args: string[], display_command: string}|null} stageExecution - Shared stage command contract.
 * @returns {string} Shell command for the pane.
 */
function buildPaneShellCommand(cwd, promptPath, role, providerResolution, stageExecution) {
  if (!promptPath) {
    return `cd ${shellQuote(cwd)} && exec lazygit`;
  }

  const provider = providerResolution?.provider || 'default';
  const runtime = providerResolution?.runtime || '';
  const runCommand = stageExecution?.display_command || 'true';

  return [
    `cd ${shellQuote(cwd)}`,
    `export GSD_SPEC_FIX_ROLE=${shellQuote(role)}`,
    `export GSD_SPEC_FIX_PROVIDER=${shellQuote(provider)}`,
    `export GSD_SPEC_FIX_RUNTIME=${shellQuote(runtime)}`,
    `${runCommand}; stage_exit=$?`,
    `printf 'spec-fix role=%s provider=%s runtime=%s exit=%s\\n' "$GSD_SPEC_FIX_ROLE" "$GSD_SPEC_FIX_PROVIDER" "$GSD_SPEC_FIX_RUNTIME" "$stage_exit"`,
    `printf 'prompt=%s\\n\\n' ${shellQuote(promptPath)}`,
    'exec "${SHELL:-/bin/sh}" -l',
  ].join(' && ');
}

/**
 * Render one zellij pane node that executes the pane's injected shell command.
 *
 * @param {object} pane - Persisted pane definition.
 * @param {boolean} focused - Whether this pane should receive initial focus.
 * @returns {string[]} KDL lines for the leaf pane.
 */
function buildZellijLeafPaneLines(pane, focused) {
  const lines = [
    `            pane name=${kdlQuote(pane.role)} size="50%" command="sh" {`,
    `                args "-lc" ${kdlQuote(pane.injected_command)}`,
  ];
  if (focused) {
    lines.push('                focus true');
  }
  lines.push('            }');
  return lines;
}

/**
 * Build a fixed 2x3 zellij layout for the six spec-fix panes.
 *
 * Top row: lazygit | analysis | proposal-review
 * Bottom row: coding | code-review | archive
 *
 * @param {object} workflow - Current workflow state.
 * @returns {string} KDL document for zellij default_layout.
 */
function buildZellijLayout(workflow) {
  const columns = [
    [workflow.panes[0], workflow.panes[3]],
    [workflow.panes[1], workflow.panes[4]],
    [workflow.panes[2], workflow.panes[5]],
  ];
  const lines = [
    'layout {',
    '    tab name="spec-fix" split_direction="horizontal" {',
  ];

  for (const [topPane, bottomPane] of columns) {
    lines.push('        pane size="33%" split_direction="vertical" {');
    lines.push(...buildZellijLeafPaneLines(topPane, false));
    lines.push(...buildZellijLeafPaneLines(bottomPane, bottomPane.role === 'archive'));
    lines.push('        }');
  }

  lines.push('    }');
  lines.push('}');
  return `${lines.join('\n')}\n`;
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
 * Launch a detached zellij session with a fixed 2x3 six-pane layout.
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
  if (!commandExists('lazygit')) {
    throw new Error('lazygit is not installed or not available on PATH');
  }

  const sessionName = workflow.mux_metadata.session_name;
  const createdAt = new Date().toISOString();
  const layoutPath = path.join(cwd, workflow.mux_metadata.layout_path || toRelativePosix(cwd, path.join(fixDir, 'mux', 'zellij-layout.kdl')));
  ensureDir(path.dirname(layoutPath));
  if (zellijSessionExists(cwd, sessionName)) {
    throw new Error(`Failed to create zellij session ${sessionName}: duplicate session`);
  }

  const launchCommands = [];

  try {
    fs.writeFileSync(layoutPath, buildZellijLayout(workflow), 'utf8');
    const startArgs = ['attach', sessionName, '--create-background', 'options', '--default-layout', layoutPath];
    launchCommands.push(formatCommand('zellij', startArgs));
    const startResult = runProcess('zellij', startArgs, cwd);
    if (startResult.exitCode !== 0) {
      throw new Error(startResult.stderr || startResult.stdout || `Failed to create zellij session ${sessionName}`);
    }
    waitFor(() => zellijSessionExists(cwd, sessionName), 5000, `Timed out waiting for zellij session ${sessionName}`);

    return {
      ...workflow.mux_metadata,
      launched: true,
      reason: 'session_started',
      launched_at: createdAt,
      pane_ids: workflow.panes.map(pane => pane.pane_id),
      launch_commands: launchCommands,
    };
  } catch (err) {
    if (zellijSessionExists(cwd, sessionName)) {
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
 * Build the initial OpenSpec section for a new workflow.
 *
 * @param {string} cwd - Project root.
 * @param {object|null} openSpecSnapshot - Optional linked OpenSpec snapshot.
 * @returns {object} Persisted OpenSpec state for workflow.json.
 */
function buildInitialOpenSpecState(cwd, openSpecSnapshot) {
  const stateRootHint = resolveOpenSpecStateRootHint(cwd);
  if (openSpecSnapshot) {
    return {
      ...openSpecSnapshot,
      sync_state: 'synced',
      last_synced_at: new Date().toISOString(),
    };
  }

  return {
    change_name: null,
    state_root: stateRootHint.stateRoot,
    change_dir: null,
    is_complete: false,
    apply_requires: [],
    artifacts: {},
    sync_state: stateRootHint.available ? 'pending' : 'unavailable',
    last_synced_at: null,
  };
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
    openSpecSnapshot,
    agentProviders,
    providerResolutions,
  } = options;
  const now = new Date().toISOString();
  const stages = buildInitialStageState(fixDir);
  const panes = mux
    ? buildPaneDefinitions({ fixId, fixDir, mux, agentProviders, providerResolutions, cwd })
    : [];

  return {
    id: fixId,
    change_name: openSpecSnapshot?.change_name || null,
    mux: mux || null,
    current_stage: 'problem-captured',
    execution_mode: mux ? 'manual' : 'autonomous',
    execution_state: 'idle',
    executing_stage: null,
    review_attempt: 0,
    review_resolution: null,
    auto_accept_after_round_3: false,
    blocked: false,
    blocked_reason: null,
    blocking_stage: null,
    created_at: now,
    updated_at: now,
    last_committed_stage: 'problem',
    problem_subject: `问题：${normalizeProblemSubject(problem)}`,
    problem_path: 'PROBLEM.md',
    workflow_schema: 'fixed-spec-fix-runner/v1',
    panes,
    mux_metadata: mux ? buildMuxMetadata(cwd, mux, fixId, panes, fixDir) : null,
    agent_providers: agentProviders,
    provider_resolutions: providerResolutions,
    openspec_sync_state: openSpecSnapshot ? 'synced' : buildInitialOpenSpecState(cwd, null).sync_state,
    openspec: buildInitialOpenSpecState(cwd, openSpecSnapshot || null),
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
 * Create one fix workspace, commit the captured problem, and optionally launch mux.
 *
 * @param {string} cwd - Project root.
 * @param {object} options - Workspace options.
 * @param {string} options.problem - Original natural-language problem.
 * @param {string|null} [options.mux=null] - Optional mux type.
 * @param {string|null} [options.changeName=null] - Optional pre-linked OpenSpec change.
 * @returns {{fixDir: string, workflowPath: string, workflow: object, fixId: string}} Workspace payload.
 */
function createSpecFixWorkspace(cwd, options) {
  const mux = options.mux || null;
  const problem = String(options.problem || '').trim();
  const changeName = String(options.changeName || '').trim();

  const gitCheck = execGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (gitCheck.exitCode !== 0) {
    throw new Error('spec-fix requires a git repository');
  }

  let openSpecSnapshot = null;
  if (changeName) {
    openSpecSnapshot = getOpenSpecChangeSnapshot(cwd, changeName);
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
    openSpecSnapshot,
    agentProviders,
    providerResolutions,
  });
  const workflowPath = path.join(fixDir, 'workflow.json');
  writeJson(workflowPath, workflow);
  let launchedMuxMetadata = null;

  try {
    if (mux) {
      launchedMuxMetadata = launchMuxSession(cwd, fixDir, workflow);
      workflow.mux_metadata = launchedMuxMetadata;
      writeJson(workflowPath, workflow);
    }

    const commitMessage = `问题：${normalizeProblemSubject(problem)}`;
    const problemHash = commitFiles(cwd, [
      toRelativePosix(cwd, fixesGitignorePath),
      toRelativePosix(cwd, fixDir),
    ], commitMessage);
    workflow.commits.problem = problemHash;
    workflow.updated_at = new Date().toISOString();
    if (workflow.mux_metadata) {
      workflow.mux_metadata.last_problem_commit = problemHash;
    }
    writeJson(workflowPath, workflow);
    return {
      fixDir,
      workflowPath,
      workflow,
      fixId,
    };
  } catch (err) {
    if (launchedMuxMetadata?.launched) {
      killMuxSession(launchedMuxMetadata, cwd);
    }
    rollbackStartArtifacts(fixDir, fixesGitignoreState, fixesRoot);
    throw err;
  }
}

/**
 * Build a stable internal change name for autonomous OpenSpec syncing.
 *
 * @param {object} workflow - Workflow JSON object.
 * @returns {string} Repository-local OpenSpec change identifier.
 */
function buildInternalOpenSpecChangeName(workflow) {
  return `spec-fix-${workflow.id}`;
}

/**
 * Ensure an internal OpenSpec change exists when the repository exposes a state root.
 *
 * @param {string} cwd - Project root.
 * @param {object} workflow - Workflow JSON object to mutate.
 * @returns {string[]} Relative paths that should be staged in the next commit.
 */
function ensureWorkflowOpenSpecLinked(cwd, workflow) {
  if (workflow.change_name) {
    try {
      syncWorkflowOpenSpec(workflow, getOpenSpecChangeSnapshot(cwd, workflow.change_name));
      return workflow.openspec?.change_dir ? [workflow.openspec.change_dir] : [];
    } catch (err) {
      workflow.openspec_sync_state = 'error';
      workflow.openspec = {
        ...(workflow.openspec || {}),
        sync_state: 'error',
        error: err.message,
      };
      return [];
    }
  }

  const created = ensureOpenSpecChange(cwd, buildInternalOpenSpecChangeName(workflow));
  if (!created.snapshot) {
    workflow.openspec_sync_state = 'unavailable';
    workflow.openspec = {
      ...(workflow.openspec || {}),
      sync_state: 'unavailable',
      state_root: created.stateRoot,
      change_name: null,
      change_dir: null,
    };
    return [];
  }

  syncWorkflowOpenSpec(workflow, created.snapshot);
  return workflow.openspec?.change_dir ? [workflow.openspec.change_dir] : [];
}

/**
 * Execute the shared stage command contract and parse its structured payload.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixId - Fix workspace id.
 * @param {string} fixDir - Absolute fix workspace directory.
 * @param {string} stageKey - Internal stage key.
 * @param {object} providerResolution - Provider/runtime selection.
 * @returns {{success: boolean, exitCode: number, payload: object|null, stdout: string, stderr: string}} Result payload.
 */
function executeStageContract(cwd, fixId, fixDir, stageKey, providerResolution) {
  const spec = buildStageExecutionSpec({
    cwd,
    fixId,
    fixDir,
    stageKey,
    providerResolution,
  });
  const result = runProcess(spec.command, spec.args, cwd, { env: spec.env });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout || 'null');
  } catch {
    payload = null;
  }
  return {
    success: result.exitCode === 0,
    exitCode: result.exitCode,
    payload,
    stdout: result.stdout,
    stderr: result.stderr,
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
    error('No spec-fix workspace found. Run `gsd-tools spec-fix --problem "..."` or the legacy `spec-fix start` command first.');
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
    throw new Error(`Stage ${stageName} is missing required artifact: ${artifactPath}`);
  }

  const content = fs.readFileSync(artifactPath, 'utf8').trim();
  if (!content || content.includes('<!-- spec-fix:complete')) {
    throw new Error(`Stage ${stageName} artifact is still using the generated placeholder: ${artifactPath}`);
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
  clearWorkflowBlocked(workflow);
  workflow.executing_stage = null;
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
    execGit(cwd, ['add', '-A', '--', file]);
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
  const changeName = String(options.change || '').trim();
  if (!SUPPORTED_MUX.has(mux)) {
    error('Usage: gsd-tools spec-fix start --mux <zellij|tmux> --problem "..." --change <name>');
  }
  if (!problem) {
    error('Usage: gsd-tools spec-fix start --mux <zellij|tmux> --problem "..." --change <name>');
  }
  if (!changeName) {
    error('spec-fix start requires --change <name>');
  }

  try {
    const { fixDir, workflow } = createSpecFixWorkspace(cwd, {
      mux,
      problem,
      changeName,
    });
    workflow.execution_mode = 'manual';
    workflow.execution_state = 'idle';
    const workflowPath = path.join(fixDir, 'workflow.json');
    writeJson(workflowPath, workflow);

    output({
      started: true,
      id: workflow.id,
      mux,
      current_stage: workflow.current_stage,
      review_attempt: workflow.review_attempt,
      change_name: workflow.change_name,
      openspec: workflow.openspec,
      workspace: toRelativePosix(cwd, fixDir),
      problem_subject: workflow.problem_subject,
      agent_providers: workflow.agent_providers,
      mux_metadata: workflow.mux_metadata,
      panes: workflow.panes,
      execution_state: workflow.execution_state,
    }, raw, workflow.id);
  } catch (err) {
    error(err.message);
  }
}

/**
 * Validate common stage completion options.
 *
 * @param {string} stageArg - Internal stage key.
 * @param {object} options - Stage completion options.
 */
function assertStageCompletionOptions(stageArg, options) {
  if (!FIX_STAGE_SEQUENCE.includes(stageArg)) {
    throw new Error('Usage: gsd-tools spec-fix complete-stage <id> --stage <analysis|proposal-review|coding|code-review|archive> [--review-outcome <accepted|changes_requested>] [--feedback-file <path>]');
  }
  if (stageArg !== 'code_review' && options.reviewOutcome) {
    throw new Error('--review-outcome is only valid for the code-review stage');
  }
  if (stageArg === 'code_review' && options.reviewOutcome && !['accepted', 'changes_requested'].includes(options.reviewOutcome)) {
    throw new Error('--review-outcome must be either accepted or changes_requested');
  }
}

/**
 * Commit one validated stage and advance the workflow state machine.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixDir - Absolute fix workspace directory.
 * @param {string} workflowPath - Workflow JSON path.
 * @param {object} workflow - Workflow JSON object to mutate.
 * @param {string} stageArg - Internal stage key.
 * @param {object} options - Completion options.
 * @returns {{commitHash: string}} Completion result.
 */
function completeStageInternal(cwd, fixDir, workflowPath, workflow, stageArg, options) {
  assertStageCompletionOptions(stageArg, options);

  if (!workflow.stages || !workflow.stages[stageArg]) {
    throw new Error(`Unknown stage in workflow: ${stageArg}`);
  }
  if (workflow.stages[stageArg].status === 'completed') {
    throw new Error(`Stage ${stageArg} has already been completed`);
  }
  if (!workflow.stages[stageArg].unlocked) {
    throw new Error(`Stage ${stageArg} is still locked`);
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

  if (stageArg === 'analysis') {
    filesToCommit.push(...ensureWorkflowOpenSpecLinked(cwd, workflow));
  } else if (workflow.change_name) {
    try {
      syncWorkflowOpenSpec(workflow, getOpenSpecChangeSnapshot(cwd, workflow.change_name));
    } catch (err) {
      workflow.openspec_sync_state = 'error';
      workflow.openspec = {
        ...(workflow.openspec || {}),
        sync_state: 'error',
        error: err.message,
      };
    }
  }

  if (stageArg === 'archive' && workflow.change_name) {
    const openSpecSnapshot = getOpenSpecChangeSnapshot(cwd, workflow.change_name);
    syncWorkflowOpenSpec(workflow, openSpecSnapshot);
    archiveOpenSpecChange(cwd, workflow.change_name);
    if (workflow.openspec?.change_dir) {
      filesToCommit.push(workflow.openspec.change_dir);
    }
    if (workflow.openspec?.state_root) {
      filesToCommit.push(path.posix.join(workflow.openspec.state_root, 'changes', 'archive'));
      workflow.openspec_sync_state = 'archived';
      workflow.openspec = {
        ...(workflow.openspec || {}),
        sync_state: 'archived',
        archived: true,
        last_synced_at: new Date().toISOString(),
      };
    }
  }

  const commitHash = commitFiles(cwd, [...new Set(filesToCommit)], getStageCommitMessage(workflow.id, stageArg));
  workflow.commits[stageArg] = commitHash;
  advanceWorkflowState(workflow, stageArg, {
    reviewOutcome: options.reviewOutcome || null,
    feedbackFile,
  });
  if (workflow.current_stage === 'archived') {
    workflow.execution_state = 'completed';
  } else if (workflow.execution_mode === 'manual') {
    workflow.execution_state = 'idle';
  }
  writeJson(workflowPath, workflow);
  return { commitHash };
}

/**
 * Find the next unlocked stage that is ready to execute.
 *
 * @param {object} workflow - Workflow JSON object.
 * @returns {string|null} Next stage key or null when nothing is ready.
 */
function findNextReadyStage(workflow) {
  for (const stageKey of FIX_STAGE_SEQUENCE) {
    const stage = workflow.stages?.[stageKey];
    if (stage?.unlocked && stage?.status === 'ready') {
      return stageKey;
    }
  }
  return null;
}

/**
 * Execute one deterministic fixture stage for acceptance tests.
 *
 * @param {string} fixDir - Absolute fix workspace directory.
 * @param {object} workflow - Current workflow JSON.
 * @param {string} stageKey - Internal stage key.
 * @returns {{reviewOutcome: string|null, artifactPath: string}} Fixture result.
 */
function executeFixtureStage(fixDir, workflow, stageKey) {
  const artifacts = getArtifactPaths(fixDir);
  const artifactPath = artifacts[stageKey];
  let reviewOutcome = null;
  const reviewRound = workflow.review_attempt + 1;

  switch (stageKey) {
    case 'analysis':
      fs.writeFileSync(artifactPath, normalizeMd([
        '# Analysis Result',
        '',
        `Problem: ${workflow.problem_subject}`,
        '',
        '- Confirmed the callback loop behavior from the bug report.',
        '- Scoped the change as a small workflow-level fix.',
      ].join('\n')), 'utf8');
      break;
    case 'proposal_review':
      fs.writeFileSync(artifactPath, normalizeMd([
        '# Proposal Review',
        '',
        '- Approved the scoped fix.',
        '- Keep the implementation limited to the identified regression path.',
      ].join('\n')), 'utf8');
      break;
    case 'coding':
      fs.writeFileSync(artifactPath, normalizeMd([
        '# Coding Notes',
        '',
        `- Applied implementation pass ${reviewRound}.`,
        '- Added deterministic verification notes for the fix workflow.',
      ].join('\n')), 'utf8');
      break;
    case 'code_review':
      reviewOutcome = process.env.GSD_SPEC_FIX_TEST_MODE === 'changes_requested_3x'
        ? 'changes_requested'
        : 'accepted';
      fs.writeFileSync(artifactPath, normalizeMd([
        '# Code Review',
        '',
        `- Review round: ${reviewRound}`,
        `- Outcome: ${reviewOutcome}`,
        reviewOutcome === 'changes_requested'
          ? '- Request one more focused coding pass.'
          : '- Implementation matches the problem and approved proposal.',
      ].join('\n')), 'utf8');
      break;
    case 'archive':
      fs.writeFileSync(artifactPath, normalizeMd([
        '# Archive Summary',
        '',
        `- Final resolution: ${workflow.review_resolution || 'accepted'}`,
        `- Review attempts: ${workflow.review_attempt}`,
        '- Workflow archived automatically by the autonomous runner.',
      ].join('\n')), 'utf8');
      break;
    default:
      throw new Error(`Unsupported fixture stage: ${stageKey}`);
  }

  return {
    reviewOutcome,
    artifactPath,
  };
}

/**
 * Command: execute one stage contract and materialize the expected artifact.
 *
 * @param {string} cwd - Project root.
 * @param {string} fixId - Fix workspace id.
 * @param {object} options - Stage execution options.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixRunStage(cwd, fixId, options, raw) {
  const stageArg = getStageKeyFromRole(options.stage);
  if (!FIX_STAGE_SEQUENCE.includes(stageArg)) {
    error('Usage: gsd-tools spec-fix run-stage <id> --stage <analysis|proposal-review|coding|code-review|archive>');
  }

  const { fixDir, workflow } = resolveFixWorkspace(cwd, fixId);
  const testMode = process.env.GSD_SPEC_FIX_TEST_MODE || '';

  try {
    let result;
    if (testMode === 'success' || testMode === 'changes_requested_3x') {
      result = executeFixtureStage(fixDir, workflow, stageArg);
    } else {
      const role = getStageRole(stageArg);
      const promptPath = path.relative(cwd, path.join(fixDir, 'prompts', `${role}.md`)).replace(/\\/g, '/');
      const artifactPath = path.relative(cwd, getArtifactPaths(fixDir)[stageArg]).replace(/\\/g, '/');
      throw new Error(`No automatic executor is configured for ${role}. Review ${promptPath} and update ${artifactPath} manually.`);
    }

    output({
      stage: stageArg,
      review_outcome: result.reviewOutcome,
      artifact_path: toRelativePosix(cwd, result.artifactPath),
    }, raw, JSON.stringify({
      stage: stageArg,
      review_outcome: result.reviewOutcome,
      artifact_path: toRelativePosix(cwd, result.artifactPath),
    }));
  } catch (err) {
    error(err.message);
  }
}

/**
 * Command: run the autonomous natural-language spec-fix workflow to completion.
 *
 * @param {string} cwd - Project root.
 * @param {object} options - Autonomous options.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixAutonomous(cwd, options, raw) {
  const problem = String(options.problem || '').trim();
  const mux = options.mux ? String(options.mux).trim() : null;
  if (!problem) {
    error('Usage: gsd-tools spec-fix --problem "..." [--mux <zellij|tmux>]');
  }
  if (mux && !SUPPORTED_MUX.has(mux)) {
    error('Usage: gsd-tools spec-fix --problem "..." [--mux <zellij|tmux>]');
  }

  let context;
  try {
    context = createSpecFixWorkspace(cwd, {
      mux,
      problem,
      changeName: null,
    });
  } catch (err) {
    error(err.message);
  }

  const { fixDir, workflowPath } = context;
  let workflow = context.workflow;
  workflow.execution_mode = 'autonomous';
  workflow.execution_state = 'running';
  writeJson(workflowPath, workflow);

  while (true) {
    const stageKey = findNextReadyStage(workflow);
    if (!stageKey) {
      if (workflow.current_stage === 'archived') {
        workflow.execution_state = 'completed';
      }
      break;
    }

    clearWorkflowBlocked(workflow);
    workflow.execution_state = 'running';
    workflow.executing_stage = stageKey;
    workflow.current_stage = `${getStageRole(stageKey)}-running`;
    writeJson(workflowPath, workflow);

    const stageRun = executeStageContract(
      cwd,
      workflow.id,
      fixDir,
      stageKey,
      workflow.provider_resolutions?.[stageKey] || null
    );

    if (!stageRun.success) {
      markWorkflowBlocked(workflow, stageKey, stageRun.stderr || stageRun.stdout || `Stage ${stageKey} failed`);
      writeJson(workflowPath, workflow);
      break;
    }

    try {
      completeStageInternal(cwd, fixDir, workflowPath, workflow, stageKey, {
        reviewOutcome: stageRun.payload?.review_outcome || null,
        feedbackFile: null,
      });
    } catch (err) {
      markWorkflowBlocked(workflow, stageKey, err.message);
      writeJson(workflowPath, workflow);
      break;
    }
  }

  output({
    started: true,
    id: workflow.id,
    current_stage: workflow.current_stage,
    execution_state: workflow.execution_state,
    review_attempt: workflow.review_attempt,
    review_resolution: workflow.review_resolution,
    auto_accept_after_round_3: workflow.auto_accept_after_round_3,
    blocked: workflow.blocked,
    blocked_reason: workflow.blocked_reason,
    problem_subject: workflow.problem_subject,
    change_name: workflow.change_name,
    openspec_sync_state: workflow.openspec_sync_state,
    openspec: workflow.openspec,
    commits: workflow.commits,
    workspace: toRelativePosix(cwd, fixDir),
  }, raw, workflow.id);
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
  const { fixDir, workflowPath, workflow } = resolveFixWorkspace(cwd, fixId);
  try {
    const completion = completeStageInternal(cwd, fixDir, workflowPath, workflow, stageArg, {
      reviewOutcome: options.reviewOutcome || null,
      feedbackFile: options.feedbackFile || null,
    });
    output({
      completed: stageArg,
      id: workflow.id,
      current_stage: workflow.current_stage,
      review_attempt: workflow.review_attempt,
      review_resolution: workflow.review_resolution,
      auto_accept_after_round_3: workflow.auto_accept_after_round_3,
      commit_hash: completion.commitHash,
    }, raw, workflow.current_stage);
  } catch (err) {
    error(err.message);
  }
}

/**
 * Command: render status for one fix workspace.
 *
 * @param {string} cwd - Project root.
 * @param {string|null} fixId - Optional fix workspace id.
 * @param {boolean} raw - Raw output mode.
 */
function cmdSpecFixStatus(cwd, fixId, raw) {
  const { fixDir, workflowPath, workflow } = resolveFixWorkspace(cwd, fixId);
  let openSpecResult = workflow.openspec || null;

  if (workflow.change_name && workflow.openspec?.sync_state !== 'archived') {
    try {
      const openSpecSnapshot = getOpenSpecChangeSnapshot(cwd, workflow.change_name);
      syncWorkflowOpenSpec(workflow, openSpecSnapshot);
      writeJson(workflowPath, workflow);
      openSpecResult = workflow.openspec;
    } catch (err) {
      workflow.openspec_sync_state = 'error';
      openSpecResult = {
        ...(workflow.openspec || { change_name: workflow.change_name }),
        sync_state: 'error',
        error: err.message,
      };
    }
  } else if (workflow.change_name) {
    openSpecResult = {
      ...(workflow.openspec || {}),
      change_name: workflow.change_name,
      sync_state: workflow.openspec_sync_state || workflow.openspec?.sync_state || 'archived',
    };
  } else {
    openSpecResult = {
      ...(workflow.openspec || {}),
      change_name: null,
      sync_state: workflow.openspec_sync_state || workflow.openspec?.sync_state || 'pending',
    };
  }

  const result = {
    id: workflow.id,
    change_name: workflow.change_name,
    current_stage: workflow.current_stage,
    execution_mode: workflow.execution_mode || 'manual',
    execution_state: workflow.execution_state || 'idle',
    executing_stage: workflow.executing_stage || null,
    review_attempt: workflow.review_attempt,
    review_resolution: workflow.review_resolution,
    auto_accept_after_round_3: workflow.auto_accept_after_round_3,
    blocked: workflow.blocked,
    blocked_reason: workflow.blocked_reason || null,
    blocking_stage: workflow.blocking_stage || null,
    problem_subject: workflow.problem_subject,
    mux: workflow.mux,
    mux_metadata: workflow.mux_metadata,
    panes: workflow.panes,
    agent_providers: workflow.agent_providers,
    provider_resolutions: workflow.provider_resolutions,
    commits: workflow.commits,
    openspec_sync_state: workflow.openspec_sync_state || openSpecResult?.sync_state || null,
    openspec: openSpecResult,
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
  cmdSpecFixAutonomous,
  cmdSpecFixRunStage,
  cmdSpecFixStart,
  cmdSpecFixStatus,
  cmdSpecFixCompleteStage,
  cmdStatusOverview,
};

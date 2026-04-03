/**
 * OpenSpec Runtime Bridge
 *
 * Provides a thin CLI adapter for querying linked OpenSpec changes from GSD
 * without duplicating OpenSpec state-root resolution logic.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Convert an absolute path into project-relative POSIX notation.
 *
 * @param {string} cwd - Project root.
 * @param {string} targetPath - Absolute path returned by OpenSpec.
 * @returns {string} Relative POSIX path.
 */
function toRelativePosix(cwd, targetPath) {
  return path.relative(cwd, targetPath).replace(/\\/g, '/');
}

/**
 * Parse the JSON payload from OpenSpec stdout that may include banner lines.
 *
 * @param {string} text - Raw OpenSpec stdout.
 * @returns {any} Parsed JSON payload.
 */
function parseJsonPayload(text) {
  const normalized = String(text || '').trim();
  const jsonStart = normalized.search(/[\[{]/);
  if (jsonStart === -1) {
    throw new Error(`OpenSpec did not return JSON output: ${normalized || '(empty output)'}`);
  }
  return JSON.parse(normalized.slice(jsonStart));
}

/**
 * Run one OpenSpec CLI command and return stdout/stderr for higher-level parsing.
 *
 * @param {string} cwd - Project root.
 * @param {string[]} args - OpenSpec argument vector.
 * @returns {{stdout: string, stderr: string}} Command output.
 */
function runOpenSpecCommand(cwd, args) {
  const result = spawnSync('openspec', args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  if ((result.status ?? 1) !== 0) {
    throw new Error(stderr || stdout || `OpenSpec command failed: openspec ${args.join(' ')}`);
  }
  return { stdout, stderr };
}

/**
 * Normalize OpenSpec artifact arrays into a stable object keyed by artifact id.
 *
 * @param {Array<object>} artifacts - Artifact records returned by OpenSpec.
 * @returns {Record<string, object>} Artifact map for workflow persistence.
 */
function buildArtifactMap(artifacts) {
  const artifactMap = {};
  for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
    if (!artifact?.id) continue;
    artifactMap[artifact.id] = {
      status: artifact.status || 'unknown',
      output_path: artifact.outputPath || null,
      missing_dependencies: Array.isArray(artifact.missingDependencies)
        ? artifact.missingDependencies
        : [],
    };
  }
  return artifactMap;
}

/**
 * Read one linked OpenSpec change through the runtime JSON contract.
 *
 * @param {string} cwd - Project root.
 * @param {string} changeName - Linked OpenSpec change name.
 * @returns {object} Normalized OpenSpec snapshot for workflow persistence.
 */
function getOpenSpecChangeSnapshot(cwd, changeName) {
  const statusPayload = parseJsonPayload(
    runOpenSpecCommand(cwd, ['status', '--change', changeName, '--json']).stdout
  );
  const instructionsPayload = parseJsonPayload(
    runOpenSpecCommand(cwd, ['instructions', 'apply', '--change', changeName, '--json']).stdout
  );
  const changeDir = path.resolve(String(instructionsPayload.changeDir || ''));
  const stateRoot = path.dirname(path.dirname(changeDir));

  return {
    change_name: changeName,
    schema_name: statusPayload.schemaName || instructionsPayload.schemaName || null,
    state_root: toRelativePosix(cwd, stateRoot),
    change_dir: toRelativePosix(cwd, changeDir),
    is_complete: Boolean(statusPayload.isComplete),
    apply_requires: Array.isArray(statusPayload.applyRequires) ? statusPayload.applyRequires : [],
    artifacts: buildArtifactMap(statusPayload.artifacts),
    instruction_state: instructionsPayload.state || null,
    progress: instructionsPayload.progress || null,
  };
}

/**
 * Archive one linked OpenSpec change before the workflow enters `archived`.
 *
 * @param {string} cwd - Project root.
 * @param {string} changeName - Linked OpenSpec change name.
 * @returns {{stdout: string, stderr: string}} Archive command output.
 */
function archiveOpenSpecChange(cwd, changeName) {
  return runOpenSpecCommand(cwd, ['archive', changeName, '--yes']);
}

module.exports = {
  archiveOpenSpecChange,
  getOpenSpecChangeSnapshot,
};

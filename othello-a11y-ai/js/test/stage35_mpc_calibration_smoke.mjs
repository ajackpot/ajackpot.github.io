import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const trainingDir = path.join(repoRoot, 'tools', 'evaluator-training');
const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'othello-stage35-mpc-'));

const syntheticLowPath = path.join(trainingDir, 'out', 'stage35_mpc_synthetic_18_21.jsonl');
const syntheticHighPath = path.join(trainingDir, 'out', 'stage35_mpc_synthetic_22_24.jsonl');
const outputPath = path.join(repoRoot, 'benchmarks', 'stage35_mpc_calibration_smoke.json');

function runNode(relativeScriptPath, args = []) {
  const scriptPath = path.join(trainingDir, relativeScriptPath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: tempDir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `Expected ${relativeScriptPath} to succeed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  return result;
}

runNode('generate-synthetic-corpus.mjs', [
  '--count', '30',
  '--min-empties', '18',
  '--max-empties', '21',
  '--seed', '3501',
  '--teacher', 'evaluator',
  '--output', 'tools/evaluator-training/out/stage35_mpc_synthetic_18_21.jsonl',
]);
runNode('generate-synthetic-corpus.mjs', [
  '--count', '30',
  '--min-empties', '22',
  '--max-empties', '24',
  '--seed', '3502',
  '--teacher', 'evaluator',
  '--output', 'tools/evaluator-training/out/stage35_mpc_synthetic_22_24.jsonl',
]);
assert.ok(fs.existsSync(syntheticLowPath), 'Low-empties synthetic corpus for MPC smoke should exist.');
assert.ok(fs.existsSync(syntheticHighPath), 'High-empties synthetic corpus for MPC smoke should exist.');

runNode('calibrate-mpc-profile.mjs', [
  '--input', 'tools/evaluator-training/out/stage35_mpc_synthetic_18_21.jsonl',
  '--input', 'tools/evaluator-training/out/stage35_mpc_synthetic_22_24.jsonl',
  '--calibration-buckets', '18-21:2>3,22-24:2>3',
  '--sample-stride', '1',
  '--max-samples-per-bucket', '4',
  '--holdout-mod', '3',
  '--holdout-residue', '0',
  '--time-limit-ms', '3000',
  '--max-table-entries', '40000',
  '--output-json', 'benchmarks/stage35_mpc_calibration_smoke.json',
]);
assert.ok(fs.existsSync(outputPath), 'MPC calibration output should be written to the repo-relative benchmark path.');

const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(summary.version, 1, 'MPC calibration profile version should be 1.');
assert.equal(summary.calibrations.length, 2, 'Smoke run should contain two calibration buckets.');
assert.ok(summary.calibrations.every((entry) => entry.sampleCount > 0), 'Each smoke calibration bucket should collect at least one sample.');
assert.ok(summary.calibrations.every((entry) => Array.isArray(entry.zCoverage) && entry.zCoverage.length > 0), 'Each calibration bucket should report z-coverage data.');

console.log('stage35_mpc_calibration_smoke: all assertions passed');

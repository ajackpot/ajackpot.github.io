import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const trainingDir = path.join(repoRoot, 'tools', 'evaluator-training');
const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'othello-stage34-paths-'));

const generatedSyntheticPath = path.join(trainingDir, 'out', 'synthetic.jsonl');
const sampledPath = path.join(trainingDir, 'out', 'stage34_sampled.txt');
const trainedProfilePath = path.join(trainingDir, 'out', 'stage34_train_smoke.json');
const generatedModulePath = path.join(repoRoot, 'js', 'ai', 'stage34_generated_profile_smoke.js');
const benchmarkOutputPath = path.join(repoRoot, 'benchmarks', 'stage34_cwd_smoke_depth_benchmark.json');

function runNode(relativeScriptPath, args = []) {
  const scriptPath = path.join(trainingDir, relativeScriptPath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: tempDir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `Expected ${relativeScriptPath} to succeed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  return result;
}

runNode('generate-synthetic-corpus.mjs', ['--count', '6', '--seed', '123']);
assert.ok(fs.existsSync(generatedSyntheticPath), 'Default synthetic corpus path should resolve inside the repo from an arbitrary cwd.');
assert.equal(fs.readFileSync(generatedSyntheticPath, 'utf8').trim().split(/\n+/).length, 6, 'Synthetic corpus should contain the requested number of samples.');

runNode('sample-corpus.mjs', [
  '--input', 'tools/evaluator-training/out/synthetic.jsonl',
  '--output', 'tools/evaluator-training/out/stage34_sampled.txt',
  '--stride', '2',
  '--max-samples', '2',
]);
assert.ok(fs.existsSync(sampledPath), 'Repo-relative input/output paths should resolve inside the repo from an arbitrary cwd.');

runNode('train-phase-linear.mjs', [
  '--input', 'tools/evaluator-training/out/stage34_sampled.txt',
  '--limit', '2',
  '--skip-diagnostics',
  '--output-json', 'tools/evaluator-training/out/stage34_train_smoke.json',
]);
assert.ok(fs.existsSync(trainedProfilePath), 'Training output JSON should be written to the repo-relative target path.');

runNode('export-profile-module.mjs', [
  '--evaluation-json', 'tools/evaluator-training/out/stage34_train_smoke.json',
  '--output-module', 'js/ai/stage34_generated_profile_smoke.js',
]);
assert.ok(fs.existsSync(generatedModulePath), 'Repo-relative js/ai output path should resolve inside the repo from an arbitrary cwd.');

runNode('benchmark-depth-search-profile.mjs', [
  '--candidate-profile', 'tools/evaluator-training/out/stage34_train_smoke.json',
  '--output-json', 'benchmarks/stage34_cwd_smoke_depth_benchmark.json',
  '--empties', '18',
  '--seed-count', '1',
  '--repetitions', '1',
  '--time-limit-ms', '10',
  '--max-depth', '1',
]);
assert.ok(fs.existsSync(benchmarkOutputPath), 'Repo-relative benchmark output path should resolve inside the repo from an arbitrary cwd.');

console.log('stage34_training_tool_path_context_smoke: all assertions passed');

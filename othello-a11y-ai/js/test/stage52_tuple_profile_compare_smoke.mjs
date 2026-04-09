#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const tupleJsonPath = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'top24_retrained_patch_lateb_endgame.json');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage52-compare-'));
const summaryJsonPath = path.join(tempDir, 'compare-summary.json');

const compare = spawnSync(process.execPath, [
  path.join(repoRoot, 'tools', 'evaluator-training', 'compare-tuple-residual-profiles.mjs'),
  '--left', tupleJsonPath,
  '--right', tupleJsonPath,
  '--summary-json', summaryJsonPath,
], { cwd: repoRoot, encoding: 'utf8' });
if (compare.status !== 0) {
  throw new Error(`compare-tuple-residual-profiles failed\nSTDOUT:\n${compare.stdout}\nSTDERR:\n${compare.stderr}`);
}

const summary = JSON.parse(fs.readFileSync(summaryJsonPath, 'utf8'));
if (summary.exactObjectEquality !== true || summary.runtimeEquivalent !== true || summary.metadataOnlyDifference !== false) {
  throw new Error(`unexpected compare summary: ${JSON.stringify(summary)}`);
}

console.log('stage52_tuple_profile_compare_smoke: ok');

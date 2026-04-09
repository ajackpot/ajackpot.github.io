#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const tupleJsonPath = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'top24_retrained_patch_lateb_endgame.json');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage52-patch-meta-'));
const outputModulePath = path.join(tempDir, 'generated.js');

const install = spawnSync(process.execPath, [
  path.join(repoRoot, 'tools', 'evaluator-training', 'install-tuple-residual-profile.mjs'),
  '--tuple-json', tupleJsonPath,
  '--output-module', outputModulePath,
], { cwd: repoRoot, encoding: 'utf8' });
if (install.status !== 0) {
  throw new Error(`install-tuple-residual-profile failed\nSTDOUT:\n${install.stdout}\nSTDERR:\n${install.stderr}`);
}

const module = await import(pathToFileURL(outputModulePath).href);
const tupleProfile = module.GENERATED_TUPLE_RESIDUAL_PROFILE;
if (!tupleProfile || !tupleProfile.patch || tupleProfile.patch.mode !== 'prune') {
  throw new Error('generated module should preserve tuple profile patch metadata');
}

console.log('stage52_generated_module_patch_metadata_smoke: ok');

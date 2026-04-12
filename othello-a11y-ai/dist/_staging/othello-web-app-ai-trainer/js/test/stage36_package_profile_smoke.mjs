import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const { buildPackages } = await import(path.join(repoRoot, 'tools/package/lib.mjs'));

const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage36-package-smoke-'));

try {
  const results = await buildPackages({
    repoRoot,
    outputDir,
    packageName: 'stage36-smoke',
    profileNames: ['runtime', 'trainer'],
    stagingOnly: true
  });

  const runtime = results.find((result) => result.profileName === 'runtime');
  const trainer = results.find((result) => result.profileName === 'trainer');

  assert.ok(runtime, 'runtime profile result should exist');
  assert.ok(trainer, 'trainer profile result should exist');

  await fs.access(path.join(runtime.stageRoot, 'index.html'));
  await fs.access(path.join(runtime.stageRoot, 'js/ai/evaluator.js'));
  await assert.rejects(fs.access(path.join(runtime.stageRoot, 'benchmarks/stage24_exact_fastest_first_audit.json')));
  await assert.rejects(fs.access(path.join(runtime.stageRoot, 'tools/evaluator-training/train-phase-linear.mjs')));
  await assert.rejects(fs.access(path.join(runtime.stageRoot, 'js/test/core-smoke.mjs')));

  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/train-phase-linear.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/run-tuple-layout-family-pilot.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/run-multi-candidate-training-suite.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/run-multi-candidate-training-suite.bat'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/estimate-tuple-layout-candidate-sizes.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/TOOL_INDEX.md'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/examples/multi-candidate-suite.train-only.example.json'));
  await fs.access(path.join(trainer.stageRoot, 'tools/package/build-release-packages.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'js/test/core-smoke.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'js/test/stage37_generated_module_builder_smoke.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'js/test/stage60_generated_profile_runtime_compaction_smoke.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'js/test/stage63_multi_candidate_training_suite_smoke.mjs'));
  await fs.access(path.join(trainer.stageRoot, 'benchmarks/README.md'));
  await fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/out/README.md'));
  await assert.rejects(fs.access(path.join(trainer.stageRoot, 'benchmarks/stage24_exact_fastest_first_audit.json')));
  await assert.rejects(fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/out/stage32_trained-move-ordering-smoke.json')));
  await assert.rejects(fs.access(path.join(trainer.stageRoot, 'tools/evaluator-training/train-move-ordering-profile.mjs')));
  await assert.rejects(fs.access(path.join(trainer.stageRoot, 'docs/reports/README.md')));

  console.log('stage36 package profile smoke passed');
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stage76-trineutron-suite-'));

try {
  const configPath = path.join(tempDir, 'suite-config.json');
  const outputDir = path.join(tempDir, 'suite-output');
  const suiteScript = path.join(repoRoot, 'tools/engine-match/run-trineutron-match-suite.mjs');

  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      openingPlies: 4,
      ourTimeMs: 20,
      theirTimeMs: 20,
      ourMaxDepth: 4,
      theirMaxDepth: 8,
      exactEndgameEmpties: 8,
      solverAdjudicationEmpties: 6,
      solverAdjudicationTimeMs: 1000,
      solverAdjudicationMaxDepth: 6,
      variantSeedMode: 'shared'
    },
    referenceVariantId: 'active-no-mpc',
    variants: [
      {
        id: 'active',
        variant: 'active',
        label: 'active-installed'
      },
      {
        id: 'active-no-mpc',
        type: 'custom',
        label: 'active-without-mpc',
        generatedModule: 'js/ai/learned-eval-profile.generated.js',
        disableMpc: true
      }
    ],
    scenarios: [
      {
        id: 'diagnostic',
        label: 'diagnostic scenario',
        seed: 7,
        games: 1,
        theirNoiseScale: 0
      }
    ]
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--output-dir', outputDir,
    '--config', configPath,
  ], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 32 });

  const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(summary.runCount, 2);
  assert.equal(summary.successCount, 2);
  assert.equal(summary.failureCount, 0);
  assert.equal(summary.skippedCount, 0);
  assert.equal(summary.referenceVariantId, 'active-no-mpc');
  assert.ok(summary.aggregateByVariant.active);
  assert.ok(summary.aggregateByVariant['active-no-mpc']);
  assert.equal(summary.resultsByScenario.length, 1);
  assert.equal(summary.resultsByScenario[0].variants.length, 2);

  const customRun = JSON.parse(await fs.readFile(path.join(outputDir, 'results', 'diagnostic', 'active-no-mpc.json'), 'utf8'));
  assert.equal(customRun.options.variantSeedMode, 'shared');
  assert.equal(customRun.customVariant.disabledFeatures.mpc, true);
  assert.equal(customRun.customVariant.mpcProfileName, null);

  await execFileAsync(process.execPath, [
    suiteScript,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 32 });

  const resumedSummary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(resumedSummary.skippedCount, 2);
  assert.equal(resumedSummary.failureCount, 0);

  console.log('stage76 trineutron match suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  makeTupleResidualTrainingProfileFromWeights,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage47-inspect-tuple-'));

try {
  const tupleJsonPath = path.join(tempDir, 'tuple.json');
  const outputJsonPath = path.join(tempDir, 'inspection.json');

  const tupleProfile = {
    ...makeTupleResidualTrainingProfileFromWeights({
      name: 'stage47-inspect-tuple',
      description: 'stage47 tuple inspector smoke profile',
      layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
      trainedBuckets: [
        {
          key: 'late-a',
          minEmpties: 13,
          maxEmpties: 19,
          scale: 1,
          tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple) => (
            Array.from({ length: tuple.tableSize }, () => 0)
          )),
        },
      ],
    }),
    diagnostics: {
      allSamples: {
        delta: {
          maeInStones: -0.03,
        },
      },
      selectedAll: {
        delta: {
          maeInStones: -0.05,
        },
      },
      holdoutSelected: {
        base: {
          maeInStones: 1.21,
        },
        candidate: {
          maeInStones: 1.10,
          meanResidualInStones: -0.41,
        },
        delta: {
          maeInStones: -0.11,
        },
      },
      byBucket: [
        {
          key: 'late-a',
          minEmpties: 13,
          maxEmpties: 19,
          holdout: {
            base: {
              maeInStones: 1.20,
            },
            candidate: {
              maeInStones: 1.11,
              meanResidualInStones: -0.55,
            },
            delta: {
              maeInStones: -0.09,
            },
          },
          weightStats: {
            totalWeights: 504,
            visitedWeights: 504,
            retainedWeights: 504,
            nonZeroCount: 504,
            meanAbsWeight: 120,
            maxAbsWeight: 1701,
          },
        },
      ],
    },
  };

  await fs.writeFile(tupleJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/inspect-tuple-residual-profile.mjs'),
    '--input', tupleJsonPath,
    '--output-json', outputJsonPath,
  ], {
    cwd: tempDir,
    maxBuffer: 1024 * 1024 * 16,
  });

  const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  assert.equal(summary.profileName, 'stage47-inspect-tuple');
  assert.equal(summary.verdict.status, 'needs-review');
  assert.ok(summary.warnings.some((warning) => warning.code === 'holdout-mean-shift'));
  assert.ok(summary.warnings.some((warning) => warning.code === 'bucket-mean-shift'));
  assert.ok(summary.warnings.some((warning) => warning.code === 'bucket-large-weight'));
  assert.equal(summary.byBucket[0]?.key, 'late-a');

  console.log('stage47 tuple profile inspector smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

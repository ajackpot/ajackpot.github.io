#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  collectInputFileEntries,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  parseArgs,
  resolveCliPath,
  streamTrainingSamples,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('sample-corpus.mjs');
  const outputPath = displayTrainingOutputPath('sample.txt');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    --output ${outputPath} \
    [--stride 25] [--sample-residue 0] [--max-samples 1000000] [--target-scale 3000] \
    [--min-empties 0] [--max-empties 60]
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const STOP = '__STOP_SAMPLE_CORPUS__';
const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || (!args.input && !args['input-dir']) || !args.output) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const requestedInputs = [
  ...ensureArray(args.input),
  ...ensureArray(args['input-dir']),
];
const inputFiles = await collectInputFileEntries(requestedInputs);
if (inputFiles.length === 0) {
  throw new Error('입력 파일을 찾지 못했습니다.');
}

const stride = Math.max(1, Math.trunc(toFiniteNumber(args.stride, 25)));
const residue = Math.max(0, Math.trunc(toFiniteNumber(args['sample-residue'], 0)));
const maxSamples = args['max-samples'] !== undefined
  ? Math.max(1, Math.trunc(toFiniteNumber(args['max-samples'], 1)))
  : undefined;
const targetScale = toFiniteNumber(args['target-scale'], 3000);
const minEmpties = Math.max(0, Math.trunc(toFiniteNumber(args['min-empties'], 0)));
const maxEmpties = Math.min(60, Math.trunc(toFiniteNumber(args['max-empties'], 60)));
const outputPath = resolveCliPath(args.output);
await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
let kept = 0;
let seen = 0;
let emptiesFiltered = 0;
try {
  await streamTrainingSamples(inputFiles, { targetScale }, async ({ state, sampleIndex, rawLine }) => {
    seen = sampleIndex + 1;
    const empties = state.getEmptyCount();
    if (empties < minEmpties || empties > maxEmpties) {
      emptiesFiltered += 1;
      return;
    }
    if ((sampleIndex % stride) !== residue) {
      return;
    }
    if (!output.write(`${rawLine}\n`)) {
      await new Promise((resolve) => output.once('drain', resolve));
    }
    kept += 1;
    if (maxSamples && kept >= maxSamples) {
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    output.destroy();
    throw error;
  }
}
await new Promise((resolve, reject) => {
  output.end((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

console.log(`Seen samples: ${formatInteger(seen)}`);
console.log(`Empties filter: ${minEmpties}..${maxEmpties} | filtered out ${formatInteger(emptiesFiltered)}`);
console.log(`Kept samples: ${formatInteger(kept)}`);
console.log(`Saved sample corpus to ${outputPath}`);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  displayGeneratedOpeningPriorModulePath,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveGeneratedOpeningPriorModulePath,
  sanitizeOpeningPriorProfileForModule,
  writeGeneratedOpeningPriorModule,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('build-opening-prior-module.mjs');
  const defaultPriorJsonPath = displayTrainingOutputPath('trained-opening-prior-profile.json');
  const defaultOutputModulePath = displayTrainingOutputPath('opening-prior.generated.js');
  const defaultSummaryJsonPath = displayProjectPath('benchmarks', 'generated_opening_prior_module_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    [--opening-prior-json ${defaultPriorJsonPath}] \
    [--output-module ${defaultOutputModulePath}] \
    [--summary-json ${defaultSummaryJsonPath}] \
    [--format compact|expanded] [--hash-encoding hex|decimal] \
    [--max-ply 18] [--min-position-count 0] [--min-move-count 0] [--max-candidates-per-position 8]

설명:
- attached/opening prior JSON만으로 app용 opening-prior.generated.js를 다시 생성합니다.
- 기본값은 compact runtime 형식이며, JSON 학습 산출물을 정적 웹 앱용 모듈로 줄입니다.
- 필요하면 --format expanded로 예전처럼 풀 형태 모듈도 생성할 수 있습니다.
`);
}

function fileExists(filePath) {
  if (!filePath) {
    return false;
  }
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function maybeDefaultInputPath(candidatePath) {
  return fileExists(candidatePath) ? candidatePath : null;
}

function toFiniteInteger(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function createProfileSummary(profile) {
  if (!profile) {
    return null;
  }

  const positions = Array.isArray(profile.positions) ? profile.positions : [];
  const moveCount = positions.reduce((sum, position) => {
    if (Array.isArray(position)) {
      return sum + Math.max(0, Math.floor((position.length - 3) / 3));
    }
    return sum + (Array.isArray(position?.moves) ? position.moves.length : 0);
  }, 0);

  return {
    version: profile.version ?? null,
    name: profile.name ?? null,
    format: profile.format ?? 'expanded-v1',
    hashEncoding: profile.hashEncoding ?? 'decimal',
    symmetry: profile.symmetry ?? null,
    positionCount: positions.length,
    moveCount,
    runtimePositionCount: profile?.runtime?.positionCount ?? positions.length,
    runtimeMoveCount: profile?.runtime?.moveCount ?? moveCount,
    holdoutCoverage: profile?.diagnostics?.holdout?.coverage ?? null,
    holdoutTop1Accuracy: profile?.diagnostics?.holdout?.top1Accuracy ?? null,
    holdoutTop3Accuracy: profile?.diagnostics?.holdout?.top3Accuracy ?? null,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const defaultPriorJsonPath = maybeDefaultInputPath(resolveCliPath('tools/evaluator-training/out/trained-opening-prior-profile.json'));
const openingPriorJsonPath = args['opening-prior-json']
  ? resolveCliPath(args['opening-prior-json'])
  : defaultPriorJsonPath;

if (!openingPriorJsonPath) {
  printUsage();
  process.exit(1);
}

const outputModulePath = args['output-module']
  ? resolveCliPath(args['output-module'])
  : resolveCliPath('tools/evaluator-training/out/opening-prior.generated.js');
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;
const moduleFormat = typeof args.format === 'string' ? args.format : 'compact';
const moduleOptions = {
  moduleFormat,
  hashEncoding: typeof args['hash-encoding'] === 'string' ? args['hash-encoding'] : undefined,
  maxPly: toFiniteInteger(args['max-ply'], null),
  minPositionCount: toFiniteInteger(args['min-position-count'], 0),
  minMoveCount: toFiniteInteger(args['min-move-count'], 0),
  maxCandidatesPerPosition: toFiniteInteger(args['max-candidates-per-position'], null),
};

const rawProfile = loadJsonFileIfPresent(openingPriorJsonPath);
const openingPriorProfile = sanitizeOpeningPriorProfileForModule(rawProfile, moduleOptions);
if (!openingPriorProfile) {
  throw new Error('No readable opening prior profile JSON was provided.');
}

const inputStats = await fs.promises.stat(openingPriorJsonPath);
const writtenPath = await writeGeneratedOpeningPriorModule(outputModulePath, rawProfile, moduleOptions);
const moduleStats = await fs.promises.stat(writtenPath);
const summary = {
  generatedAt: new Date().toISOString(),
  openingPriorJsonPath,
  openingPriorJsonBytes: inputStats.size,
  outputModulePath: writtenPath,
  outputModuleBytes: moduleStats.size,
  outputModuleRatio: inputStats.size > 0 ? moduleStats.size / inputStats.size : null,
  moduleOptions: {
    format: moduleOptions.moduleFormat,
    hashEncoding: openingPriorProfile?.hashEncoding ?? null,
    ...(Number.isFinite(moduleOptions.maxPly) ? { maxPly: moduleOptions.maxPly } : {}),
    minPositionCount: moduleOptions.minPositionCount,
    minMoveCount: moduleOptions.minMoveCount,
    ...(Number.isFinite(moduleOptions.maxCandidatesPerPosition)
      ? { maxCandidatesPerPosition: moduleOptions.maxCandidatesPerPosition }
      : {}),
  },
  openingPriorProfile: createProfileSummary(openingPriorProfile),
};

console.log(`Saved opening prior module to ${writtenPath}`);
console.log(`  opening prior profile: ${openingPriorProfile?.name ?? 'null'}`);
console.log(`  module format       : ${openingPriorProfile?.format ?? moduleFormat}`);
console.log(`  module size         : ${moduleStats.size} bytes`);
if (inputStats.size > 0) {
  console.log(`  size ratio          : ${(moduleStats.size / inputStats.size * 100).toFixed(2)}% of JSON`);
}

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved summary JSON to ${summaryJsonPath}`);
}

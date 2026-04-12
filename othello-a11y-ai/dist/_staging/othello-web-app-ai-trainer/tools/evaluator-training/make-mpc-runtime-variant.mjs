#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { resolveMpcProfile } from '../../js/ai/evaluation-profiles.js';
import {
  buildProfileStageMetadata,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveTrainingOutputPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('make-mpc-runtime-variant.mjs');
  const inputPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const outputPath = displayTrainingOutputPath('candidate-mpc-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input-profile ${inputPath} \
    [--output-json ${outputPath}] \
    [--name candidate-mpc-profile-name] \
    [--description "설명"] \
    [--default-mode high|both|off] \
    [--enable-high-cut on|off] [--enable-low-cut on|off] \
    [--max-window 1] [--max-checks-per-node 1] \
    [--min-depth 2] [--min-depth-gap 2] [--max-depth-distance 1] [--min-ply 1] \
    [--allow-root on|off] \
    [--interval-scale 1.0] [--high-scale 1.0] [--low-scale 1.0] [--depth-distance-scale 1.25]

호환 별칭:
- --mpc-json == --input-profile
- --max-tries-per-node == --max-checks-per-node
- --high-residual-scale == --high-scale
- --low-residual-scale == --low-scale

설명:
- 기존 MPC profile JSON의 회귀 계수는 그대로 두고, 런타임 pruning 동작과 interval width 배율만 조정한 파생 profile을 생성합니다.
- 현재 search 엔진이 실제로 사용하는 MPC runtime 필드는 enableHighCut / enableLowCut / maxChecksPerNode /
  minDepth / minDepthGap / maxDepthDistance / minPly / highScale / lowScale / depthDistanceScale 입니다.
- default-mode 는 high/both/off 를 legacy enableHighCut/enableLowCut 쌍으로 바꿔 주는 편의 별칭입니다.
`);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parseBooleanFlag(value, fallback = null) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['off', 'false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  throw new Error(`boolean flag 값은 on/off, true/false, 1/0 중 하나여야 합니다: ${value}`);
}

function parseFiniteInteger(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(Math.round(number))) {
    throw new Error(`정수 값이 아닙니다: ${value}`);
  }
  const rounded = Math.round(number);
  if (rounded < min || rounded > max) {
    throw new Error(`정수 값 범위를 벗어났습니다: ${rounded}`);
  }
  return rounded;
}

function parseFiniteNumber(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`숫자 값이 아닙니다: ${value}`);
  }
  if (number < min || number > max) {
    throw new Error(`숫자 값 범위를 벗어났습니다: ${number}`);
  }
  return number;
}

function normalizeMpcMode(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['off', 'disabled', 'none'].includes(normalized)) {
    return 'off';
  }
  if (['both', 'high-low', 'highlow'].includes(normalized)) {
    return 'both';
  }
  if (['high', 'fail-high', 'upper'].includes(normalized)) {
    return 'high';
  }
  return fallback;
}

function resolveModeFlags({ explicitMode, enableHighCut, enableLowCut, fallbackHigh, fallbackLow }) {
  const mode = normalizeMpcMode(explicitMode, null);
  if (mode === 'off') {
    return { enableHighCut: false, enableLowCut: false, mode: 'off' };
  }
  if (mode === 'both') {
    return { enableHighCut: true, enableLowCut: true, mode: 'both' };
  }
  if (mode === 'high') {
    return { enableHighCut: true, enableLowCut: false, mode: 'high' };
  }

  const resolvedHigh = enableHighCut ?? fallbackHigh;
  const resolvedLow = enableLowCut ?? fallbackLow;
  if (resolvedHigh === false && resolvedLow === false) {
    return { enableHighCut: false, enableLowCut: false, mode: 'off' };
  }
  if (resolvedHigh !== false && resolvedLow === true) {
    return { enableHighCut: true, enableLowCut: true, mode: 'both' };
  }
  return { enableHighCut: resolvedHigh !== false, enableLowCut: resolvedLow === true, mode: 'high' };
}

function scaleIntervalHalfWidths(calibration, intervalScale) {
  if (!Number.isFinite(intervalScale) || intervalScale === 1) {
    return calibration;
  }

  const next = { ...calibration };
  if (Number.isFinite(next.intervalHalfWidth)) {
    next.intervalHalfWidth *= intervalScale;
  }
  if (Number.isFinite(next.highIntervalHalfWidth)) {
    next.highIntervalHalfWidth *= intervalScale;
  }
  if (Number.isFinite(next.lowIntervalHalfWidth)) {
    next.lowIntervalHalfWidth *= intervalScale;
  }
  if (next.recommendedZ && typeof next.recommendedZ === 'object') {
    next.recommendedZ = { ...next.recommendedZ };
    if (Number.isFinite(next.recommendedZ.intervalHalfWidth)) {
      next.recommendedZ.intervalHalfWidth *= intervalScale;
    }
    if (Number.isFinite(next.recommendedZ.highIntervalHalfWidth)) {
      next.recommendedZ.highIntervalHalfWidth *= intervalScale;
    }
    if (Number.isFinite(next.recommendedZ.lowIntervalHalfWidth)) {
      next.recommendedZ.lowIntervalHalfWidth *= intervalScale;
    }
  }
  return next;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const inputProfilePath = resolveCliPath(args['input-profile'] ?? args['mpc-json']);
const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveTrainingOutputPath('candidate-mpc-profile.json');
if (!inputProfilePath) {
  printUsage();
  process.exit(1);
}

const baseProfile = resolveMpcProfile(loadJsonFileIfPresent(inputProfilePath));
if (!baseProfile) {
  throw new Error(`input profile을 읽을 수 없습니다: ${inputProfilePath}`);
}

const baseRuntime = baseProfile.runtime && typeof baseProfile.runtime === 'object'
  ? { ...cloneJson(baseProfile.runtime) }
  : {};
const explicitEnableHighCut = parseBooleanFlag(args['enable-high-cut'], null);
const explicitEnableLowCut = parseBooleanFlag(args['enable-low-cut'], null);
const modeFlags = resolveModeFlags({
  explicitMode: args['default-mode'],
  enableHighCut: explicitEnableHighCut,
  enableLowCut: explicitEnableLowCut,
  fallbackHigh: baseRuntime.enableHighCut !== false,
  fallbackLow: baseRuntime.enableLowCut === true,
});

const maxChecksPerNode = parseFiniteInteger(
  args['max-checks-per-node'] ?? args['max-tries-per-node'],
  Number.isFinite(Number(baseRuntime.maxChecksPerNode ?? baseRuntime.numTry)) ? Math.round(Number(baseRuntime.maxChecksPerNode ?? baseRuntime.numTry)) : 1,
  { min: 1, max: 8 },
);
const runtime = {
  ...baseRuntime,
  enableHighCut: modeFlags.enableHighCut,
  enableLowCut: modeFlags.enableLowCut,
  defaultMode: modeFlags.mode,
  maxWindow: parseFiniteInteger(args['max-window'], Number.isFinite(Number(baseRuntime.maxWindow ?? baseRuntime.windowMax)) ? Math.round(Number(baseRuntime.maxWindow ?? baseRuntime.windowMax)) : 1, { min: 1, max: 64 }),
  maxChecksPerNode,
  maxTriesPerNode: maxChecksPerNode,
  minDepth: parseFiniteInteger(args['min-depth'], Number.isFinite(Number(baseRuntime.minDepth)) ? Math.round(Number(baseRuntime.minDepth)) : 2, { min: 1, max: 64 }),
  minDepthGap: parseFiniteInteger(args['min-depth-gap'], Number.isFinite(Number(baseRuntime.minDepthGap)) ? Math.round(Number(baseRuntime.minDepthGap)) : 2, { min: 1, max: 32 }),
  maxDepthDistance: parseFiniteInteger(args['max-depth-distance'], Number.isFinite(Number(baseRuntime.maxDepthDistance)) ? Math.round(Number(baseRuntime.maxDepthDistance)) : 1, { min: 0, max: 32 }),
  minPly: parseFiniteInteger(args['min-ply'], Number.isFinite(Number(baseRuntime.minPly)) ? Math.round(Number(baseRuntime.minPly)) : 1, { min: 0, max: 64 }),
  highScale: parseFiniteNumber(args['high-scale'] ?? args['high-residual-scale'], Number.isFinite(Number(baseRuntime.highScale)) ? Number(baseRuntime.highScale) : 1, { min: 0, max: 10 }),
  lowScale: parseFiniteNumber(args['low-scale'] ?? args['low-residual-scale'], Number.isFinite(Number(baseRuntime.lowScale)) ? Number(baseRuntime.lowScale) : 1, { min: 0, max: 10 }),
  depthDistanceScale: parseFiniteNumber(args['depth-distance-scale'], Number.isFinite(Number(baseRuntime.depthDistanceScale)) ? Number(baseRuntime.depthDistanceScale) : 1.25, { min: 1, max: 10 }),
};
if (parseBooleanFlag(args['allow-root'], null) === true) {
  runtime.minPly = 0;
}
if (parseBooleanFlag(args['allow-root'], null) === false && !Object.hasOwn(args, 'min-ply')) {
  runtime.minPly = Math.max(1, runtime.minPly);
}

const intervalScale = parseFiniteNumber(args['interval-scale'], 1.0, { min: 0, max: 10 });
const name = typeof args.name === 'string' && args.name.trim() !== ''
  ? args.name.trim()
  : `${baseProfile.name ?? 'mpc-profile'}__runtime-variant`;
const description = typeof args.description === 'string'
  ? args.description
  : `${baseProfile.description ?? 'mpc profile'} (runtime-derived variant)`;

const nextProfile = {
  version: baseProfile.version ?? 1,
  name,
  description,
  runtime,
  calibrations: baseProfile.calibrations.map((entry) => scaleIntervalHalfWidths(cloneJson(entry), intervalScale)),
};

if (Object.hasOwn(baseProfile, 'source')) {
  nextProfile.source = {
    ...cloneJson(baseProfile.source ?? {}),
    derivedFromProfileName: baseProfile.name ?? null,
    derivedFromProfilePath: path.relative(process.cwd(), inputProfilePath).replace(/\\/g, '/'),
    derivedAt: new Date().toISOString(),
    runtimeVariant: {
      intervalScale,
      mode: modeFlags.mode,
      runtime,
    },
  };
}
if (Object.hasOwn(baseProfile, 'diagnostics')) {
  nextProfile.diagnostics = {
    ...cloneJson(baseProfile.diagnostics ?? {}),
    runtimeVariant: {
      baseProfileName: baseProfile.name ?? null,
      intervalScale,
      mode: modeFlags.mode,
      runtime,
    },
  };
}
nextProfile.stage = buildProfileStageMetadata({
  kind: 'mpc-profile',
  status: 'runtime-variant',
  derivedFromProfileName: baseProfile.name ?? null,
  derivedFromProfilePath: path.relative(process.cwd(), inputProfilePath).replace(/\\/g, '/'),
});

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(nextProfile, null, 2)}\n`, 'utf8');

console.log(`Base profile : ${baseProfile.name ?? path.basename(inputProfilePath)}`);
console.log(`Output       : ${outputJsonPath}`);
console.log(`Mode         : ${modeFlags.mode}`);
console.log(`maxChecks    : ${runtime.maxChecksPerNode}`);
console.log(`highScale    : ${runtime.highScale}`);
console.log(`lowScale     : ${runtime.lowScale}`);
console.log(`intervalScale: ${intervalScale}`);

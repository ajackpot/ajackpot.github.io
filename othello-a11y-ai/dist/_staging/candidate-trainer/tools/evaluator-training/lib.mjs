import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { bitFromIndex } from '../../js/core/bitboard.js';
import { createStateFromBitboards } from '../../js/core/game-state.js';
import { PLAYER_COLORS } from '../../js/core/rules.js';
import {
  createEmptyEvaluationFeatureRecord,
  createEmptyMoveOrderingFeatureRecord,
  populateEvaluationFeatureRecord,
  populateMoveOrderingFeatureRecord,
  Evaluator,
} from '../../js/ai/evaluator.js';
import {
  canonicalizeEvaluationWeightsForBucket,
  compileEvaluationProfile,
  EVALUATION_FEATURE_KEYS,
  MOVE_ORDERING_FEATURE_KEYS,
  makeMoveOrderingTrainingProfileFromWeights,
  makeTupleResidualTrainingProfileFromWeights,
  moveOrderingFallbackWeightsForEmpties,
  resolveEvaluationProfile,
  resolveMoveOrderingBuckets,
  resolveTupleResidualLayout,
  resolveTupleResidualProfile,
  TUPLE_RESIDUAL_LAYOUT_LIBRARY,
} from '../../js/ai/evaluation-profiles.js';
import { resolveOpeningPriorProfile } from '../../js/ai/opening-prior.js';

export const REGRESSION_FEATURE_KEYS = Object.freeze(['bias', ...EVALUATION_FEATURE_KEYS]);
export const MOVE_ORDERING_REGRESSION_FEATURE_KEYS = Object.freeze([...MOVE_ORDERING_FEATURE_KEYS]);
export const EGAROUCID_TRAIN_DATA_TOTAL_SAMPLES = 25514097;

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

export const EVALUATOR_TRAINING_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT_DIR = path.resolve(EVALUATOR_TRAINING_DIR, '..', '..');

const PROJECT_ROOT_ENTRY_NAMES = new Set([
  'benchmarks',
  'docs',
  'index.html',
  'js',
  'README.md',
  'styles.css',
  'tests',
  'third_party',
  'tools',
]);

export function toPortablePath(value) {
  return String(value).replace(/\\/g, '/');
}

export function resolveProjectPath(...segments) {
  return path.resolve(PROJECT_ROOT_DIR, ...segments);
}

export function resolveTrainingToolPath(...segments) {
  return path.resolve(EVALUATOR_TRAINING_DIR, ...segments);
}

export function resolveTrainingOutputPath(...segments) {
  return path.resolve(EVALUATOR_TRAINING_DIR, 'out', ...segments);
}

export function resolveGeneratedProfilesModulePath() {
  return resolveProjectPath('js', 'ai', 'learned-eval-profile.generated.js');
}

export function resolveGeneratedOpeningPriorModulePath() {
  return resolveProjectPath('js', 'ai', 'opening-prior.generated.js');
}

export const STAGE_INFO_PATH = resolveProjectPath('stage-info.json');
let cachedStageInfo = null;

function normalizeStageInfo(raw = null) {
  const numericStage = Number.parseInt(
    raw?.currentStage ?? raw?.stage ?? raw?.number ?? raw?.id ?? '',
    10,
  );
  const number = Number.isInteger(numericStage) && numericStage > 0 ? numericStage : null;
  const tag = typeof raw?.tag === 'string' && raw.tag.trim() !== ''
    ? raw.tag.trim()
    : (number === null ? 'stage-unknown' : `stage${number}`);

  return Object.freeze({
    number,
    tag,
    file: toPortablePath(path.relative(PROJECT_ROOT_DIR, STAGE_INFO_PATH) || 'stage-info.json'),
    ...(typeof raw?.label === 'string' && raw.label.trim() !== '' ? { label: raw.label.trim() } : {}),
    ...(typeof raw?.updatedAt === 'string' && raw.updatedAt.trim() !== '' ? { updatedAt: raw.updatedAt.trim() } : {}),
  });
}

export function loadStageInfo() {
  if (cachedStageInfo) {
    return cachedStageInfo;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STAGE_INFO_PATH, 'utf8'));
    cachedStageInfo = normalizeStageInfo(parsed);
  } catch {
    cachedStageInfo = normalizeStageInfo(null);
  }

  return cachedStageInfo;
}

export function getCurrentStageTag() {
  return loadStageInfo().tag;
}

export function getCurrentStageNumber() {
  return loadStageInfo().number;
}

export function defaultEvaluationProfileName() {
  return `trained-phase-linear-${getCurrentStageTag()}`;
}

export function defaultMoveOrderingProfileName() {
  return `trained-move-ordering-${getCurrentStageTag()}`;
}

export function defaultTupleResidualProfileName() {
  return `trained-tuple-residual-${getCurrentStageTag()}`;
}

export function defaultOpeningPriorProfileName() {
  return `trained-opening-prior-${getCurrentStageTag()}`;
}

export function buildProfileStageMetadata(extra = {}) {
  const stageInfo = loadStageInfo();
  return Object.freeze({
    number: stageInfo.number,
    tag: stageInfo.tag,
    file: stageInfo.file,
    ...(stageInfo.label ? { label: stageInfo.label } : {}),
    ...(stageInfo.updatedAt ? { updatedAt: stageInfo.updatedAt } : {}),
    ...extra,
  });
}

export function isProjectRelativeCliPath(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  const portable = toPortablePath(value).replace(/\/+$/, '');
  if (portable === '' || portable === '.') {
    return false;
  }
  if (portable.startsWith('./') || portable.startsWith('../')) {
    return false;
  }

  const firstSegment = portable.split('/')[0];
  return PROJECT_ROOT_ENTRY_NAMES.has(firstSegment);
}

export function resolveCliPath(value, { baseDir = process.cwd() } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const raw = String(value);
  if (path.isAbsolute(raw)) {
    return path.normalize(raw);
  }

  if (isProjectRelativeCliPath(raw)) {
    return path.resolve(PROJECT_ROOT_DIR, toPortablePath(raw));
  }

  return path.resolve(baseDir, raw);
}

export function relativePathFromCwd(targetPath) {
  const resolved = resolveCliPath(targetPath);
  if (!resolved) {
    return null;
  }
  const relative = path.relative(process.cwd(), resolved);
  return toPortablePath(relative === '' ? '.' : relative);
}

export function displayProjectPath(...segments) {
  return relativePathFromCwd(resolveProjectPath(...segments));
}

export function displayTrainingToolPath(...segments) {
  return relativePathFromCwd(resolveTrainingToolPath(...segments));
}

export function displayTrainingOutputPath(...segments) {
  return relativePathFromCwd(resolveTrainingOutputPath(...segments));
}

export function displayGeneratedProfilesModulePath() {
  return relativePathFromCwd(resolveGeneratedProfilesModulePath());
}

export function displayGeneratedOpeningPriorModulePath() {
  return relativePathFromCwd(resolveGeneratedOpeningPriorModulePath());
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    if (Object.hasOwn(args, key)) {
      const current = Array.isArray(args[key]) ? args[key] : [args[key]];
      current.push(next);
      args[key] = current;
    } else {
      args[key] = next;
    }
    index += 1;
  }
  return args;
}

export function ensureArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export async function collectInputFileEntries(inputs, { extensions = ['.txt', '.jsonl', '.ndjson'] } = {}) {
  const files = [];
  const normalizedExtensions = new Set(extensions.map((value) => String(value).toLowerCase()));

  async function visit(candidate) {
    const resolved = resolveCliPath(candidate);
    const stat = await fs.promises.stat(resolved);
    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
      for (const entry of entries) {
        await visit(path.join(resolved, entry.name));
      }
      return;
    }

    const extension = path.extname(resolved).toLowerCase();
    if (normalizedExtensions.has(extension)) {
      files.push({
        path: resolved,
        sizeBytes: stat.size,
      });
    }
  }

  for (const input of inputs) {
    await visit(input);
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

export async function collectInputFiles(inputs) {
  const entries = await collectInputFileEntries(inputs);
  return entries.map((entry) => entry.path);
}

async function normalizeInputFileEntries(fileEntriesOrPaths) {
  const normalized = [];
  for (const item of fileEntriesOrPaths) {
    if (typeof item === 'string') {
      const resolved = resolveCliPath(item);
      const stat = await fs.promises.stat(resolved);
      normalized.push({ path: resolved, sizeBytes: stat.size });
      continue;
    }

    const resolvedPath = resolveCliPath(item.path);
    const sizeBytes = Number.isFinite(item.sizeBytes)
      ? Number(item.sizeBytes)
      : (await fs.promises.stat(resolvedPath)).size;
    normalized.push({ path: resolvedPath, sizeBytes });
  }
  return normalized;
}

export function calculateTotalInputBytes(fileEntriesOrPaths) {
  return fileEntriesOrPaths.reduce((sum, entry) => sum + Number(entry.sizeBytes ?? 0), 0);
}

export function detectKnownDatasetSampleCount(fileEntriesOrPaths) {
  const paths = fileEntriesOrPaths.map((entry) => (typeof entry === 'string' ? entry : entry.path)).map((value) => String(value));
  if (paths.some((value) => /(^|[\\/])Egaroucid_Train_Data([\\/]|$)/i.test(value))) {
    return EGAROUCID_TRAIN_DATA_TOTAL_SAMPLES;
  }
  return null;
}

export function estimateSampleCountFromBytes(totalBytes, averageBytesPerSample) {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || !Number.isFinite(averageBytesPerSample) || averageBytesPerSample <= 0) {
    return null;
  }
  return Math.max(1, Math.round(totalBytes / averageBytesPerSample));
}

export function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return NUMBER_FORMATTER.format(Math.round(value));
}

export function formatDurationSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 'n/a';
  }

  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function formatRate(value, digits = 0) {
  if (!Number.isFinite(value) || value < 0) {
    return 'n/a';
  }
  return `${value.toFixed(digits)}/s`;
}

export function percentage(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function createStateFromPerspectiveBoardString(boardString, {
  currentPlayer = PLAYER_COLORS.BLACK,
  consecutivePasses = 0,
  ply = 1,
} = {}) {
  const normalized = String(boardString).trim();
  if (!/^[XO-]{64}$/i.test(normalized)) {
    throw new Error(`Invalid 64-character board string: ${boardString}`);
  }

  const normalizedCurrentPlayer = currentPlayer === PLAYER_COLORS.WHITE
    ? PLAYER_COLORS.WHITE
    : PLAYER_COLORS.BLACK;
  const playerColor = normalizedCurrentPlayer;
  const opponentColor = playerColor === PLAYER_COLORS.BLACK
    ? PLAYER_COLORS.WHITE
    : PLAYER_COLORS.BLACK;

  let black = 0n;
  let white = 0n;
  const upper = normalized.toUpperCase();

  for (let index = 0; index < upper.length; index += 1) {
    const char = upper[index];
    if (char === 'X') {
      if (playerColor === PLAYER_COLORS.BLACK) {
        black |= bitFromIndex(index);
      } else {
        white |= bitFromIndex(index);
      }
    } else if (char === 'O') {
      if (opponentColor === PLAYER_COLORS.BLACK) {
        black |= bitFromIndex(index);
      } else {
        white |= bitFromIndex(index);
      }
    }
  }

  return createStateFromBitboards({
    black,
    white,
    currentPlayer: normalizedCurrentPlayer,
    consecutivePasses,
    ply,
  });
}

export function createStateFromJsonRecord(record) {
  if (typeof record.board === 'string' || typeof record.boardString === 'string') {
    return createStateFromPerspectiveBoardString(record.board ?? record.boardString, {
      currentPlayer: record.currentPlayer ?? PLAYER_COLORS.BLACK,
      consecutivePasses: record.consecutivePasses ?? 0,
      ply: record.ply ?? 1,
    });
  }

  if (record.black !== undefined && record.white !== undefined) {
    return createStateFromBitboards({
      black: BigInt(record.black),
      white: BigInt(record.white),
      currentPlayer: record.currentPlayer ?? PLAYER_COLORS.BLACK,
      consecutivePasses: record.consecutivePasses ?? 0,
      ply: record.ply ?? 1,
    });
  }

  throw new Error('JSON sample must include board/boardString or black/white bitboards.');
}

export function parseTrainingSampleLine(line, { targetScale = 3000 } = {}) {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return null;
  }

  const egaroucidMatch = /^([XO-]{64})\s+(-?\d+)/i.exec(trimmed);
  if (egaroucidMatch) {
    const [, boardString, scoreText] = egaroucidMatch;
    return {
      state: createStateFromPerspectiveBoardString(boardString),
      target: Number(scoreText) * targetScale,
      sourceTarget: Number(scoreText),
      sourceFormat: 'egaroucid',
    };
  }

  if (trimmed.startsWith('{')) {
    const record = JSON.parse(trimmed);
    const state = createStateFromJsonRecord(record);
    if (Number.isFinite(record.engineScore) || Number.isFinite(record.target)) {
      return {
        state,
        target: Number.isFinite(record.engineScore) ? Number(record.engineScore) : Number(record.target),
        sourceTarget: Number.isFinite(record.engineScore) ? Number(record.engineScore) : Number(record.target),
        sourceFormat: 'json-engine',
      };
    }

    if (Number.isFinite(record.score)) {
      const usesEngineScale = record.scoreScale === 'engine';
      const target = usesEngineScale ? Number(record.score) : Number(record.score) * targetScale;
      return {
        state,
        target,
        sourceTarget: Number(record.score),
        sourceFormat: usesEngineScale ? 'json-engine' : 'json-stones',
      };
    }

    throw new Error('JSON sample must include engineScore, target, or score.');
  }

  throw new Error('Unsupported sample line format.');
}

export async function streamTrainingSamples(fileEntriesOrPaths, options, onSample) {
  const normalizedEntries = await normalizeInputFileEntries(fileEntriesOrPaths);
  const totalBytes = calculateTotalInputBytes(normalizedEntries);
  let completedBytes = 0;
  let sampleIndex = 0;

  for (const entry of normalizedEntries) {
    const filePath = entry.path;
    const fileSizeBytes = entry.sizeBytes;
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNumber = 0;
    let fileBytesProcessed = 0;

    for await (const line of rl) {
      lineNumber += 1;
      fileBytesProcessed = Math.min(fileSizeBytes, fileBytesProcessed + Buffer.byteLength(line, 'utf8') + 1);
      const sample = parseTrainingSampleLine(line, options);
      if (!sample) {
        continue;
      }

      await onSample({
        ...sample,
        rawLine: line,
        filePath,
        lineNumber,
        sampleIndex,
        fileSizeBytes,
        fileBytesProcessed,
        totalBytesProcessed: Math.min(totalBytes, completedBytes + fileBytesProcessed),
        totalBytes,
      });

      sampleIndex += 1;
      if (Number.isInteger(options.limit) && sampleIndex >= options.limit) {
        rl.close();
        stream.destroy();
        return sampleIndex;
      }
    }

    completedBytes += fileSizeBytes;
  }

  return sampleIndex;
}

export function createFeatureScratch() {
  return createEmptyEvaluationFeatureRecord();
}

export function createMoveOrderingFeatureScratch() {
  return createEmptyMoveOrderingFeatureRecord();
}

export function fillRegressionVectorFromState(state, scratch) {
  const record = populateEvaluationFeatureRecord(scratch, state, state.currentPlayer, { includeDiagnostics: false });
  const vector = [1];
  for (const key of EVALUATION_FEATURE_KEYS) {
    vector.push(record[key]);
  }
  return {
    record,
    vector,
  };
}

export function fillMoveOrderingRegressionVectorFromState(state, perspectiveColor, scratch, context = {}) {
  const record = populateMoveOrderingFeatureRecord(scratch, state, perspectiveColor, context);
  const vector = [];
  for (const key of MOVE_ORDERING_FEATURE_KEYS) {
    vector.push(record[key]);
  }
  return {
    record,
    vector,
  };
}

export function bucketIndexForEmpties(compiledProfile, empties) {
  const bucket = compiledProfile.bucketsByEmptyCount[Math.max(0, Math.min(60, empties))];
  return compiledProfile.phaseBuckets.findIndex((candidate) => candidate.key === bucket.key);
}

export function zeroMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function zeroVector(size) {
  return Array(size).fill(0);
}

export function addOuterProductInPlace(matrix, vector, scale = 1) {
  for (let row = 0; row < vector.length; row += 1) {
    const left = vector[row] * scale;
    for (let col = 0; col < vector.length; col += 1) {
      matrix[row][col] += left * vector[col];
    }
  }
}

export function addOuterProductSubsetInPlace(matrix, vector, activeIndices, scale = 1) {
  for (const row of activeIndices) {
    const left = vector[row] * scale;
    for (const col of activeIndices) {
      matrix[row][col] += left * vector[col];
    }
  }
}

export function addScaledVectorInPlace(target, vector, scale) {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += vector[index] * scale;
  }
}

export function addScaledVectorSubsetInPlace(target, vector, scale, activeIndices) {
  for (const index of activeIndices) {
    target[index] += vector[index] * scale;
  }
}

export function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let bestRow = pivotIndex;
    let bestValue = Math.abs(augmented[pivotIndex][pivotIndex]);
    for (let row = pivotIndex + 1; row < size; row += 1) {
      const candidate = Math.abs(augmented[row][pivotIndex]);
      if (candidate > bestValue) {
        bestValue = candidate;
        bestRow = row;
      }
    }

    if (bestValue < 1e-9) {
      return null;
    }

    if (bestRow !== pivotIndex) {
      const temp = augmented[pivotIndex];
      augmented[pivotIndex] = augmented[bestRow];
      augmented[bestRow] = temp;
    }

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let col = pivotIndex; col <= size; col += 1) {
      augmented[pivotIndex][col] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) {
        continue;
      }
      const factor = augmented[row][pivotIndex];
      if (factor === 0) {
        continue;
      }
      for (let col = pivotIndex; col <= size; col += 1) {
        augmented[row][col] -= factor * augmented[pivotIndex][col];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

export function weightsObjectFromSolution(solution) {
  const weights = { bias: solution[0] };
  for (let index = 0; index < EVALUATION_FEATURE_KEYS.length; index += 1) {
    weights[EVALUATION_FEATURE_KEYS[index]] = solution[index + 1];
  }
  return weights;
}

export function solutionFromWeights(weights) {
  const vector = [weights.bias ?? 0];
  for (const key of EVALUATION_FEATURE_KEYS) {
    vector.push(weights[key] ?? 0);
  }
  return vector;
}

export function moveOrderingWeightsObjectFromSolution(solution) {
  const weights = {};
  for (let index = 0; index < MOVE_ORDERING_FEATURE_KEYS.length; index += 1) {
    weights[MOVE_ORDERING_FEATURE_KEYS[index]] = solution[index] ?? 0;
  }
  return weights;
}

export function moveOrderingSolutionFromWeights(weights) {
  const vector = [];
  for (const key of MOVE_ORDERING_FEATURE_KEYS) {
    vector.push(weights[key] ?? 0);
  }
  return vector;
}

export function moveOrderingSeedSolutionForBucket(bucket) {
  if (bucket?.weights) {
    return moveOrderingSolutionFromWeights(bucket.weights);
  }
  return moveOrderingSolutionFromWeights(moveOrderingFallbackWeightsForEmpties((Number(bucket?.minEmpties ?? 0) + Number(bucket?.maxEmpties ?? 0)) / 2));
}

export function roundWeights(weights, digits = 6) {
  const rounded = {};
  const scale = 10 ** digits;
  for (const [key, value] of Object.entries(weights)) {
    rounded[key] = Math.round(value * scale) / scale;
  }
  return rounded;
}

export function buildProfileFromBucketWeights(baseProfile, bucketWeightVectors, metadata = {}) {
  const resolvedBaseProfile = resolveEvaluationProfile(baseProfile);
  return {
    version: 1,
    name: metadata.name ?? defaultEvaluationProfileName(),
    description: metadata.description ?? '회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.',
    stage: metadata.stage ?? buildProfileStageMetadata({ kind: 'evaluation-profile' }),
    source: metadata.source ?? null,
    diagnostics: metadata.diagnostics ?? null,
    phaseBuckets: resolvedBaseProfile.phaseBuckets.map((bucket, index) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: roundWeights(canonicalizeEvaluationWeightsForBucket(
        bucket,
        weightsObjectFromSolution(bucketWeightVectors[index]),
      )),
    })),
  };
}

export function buildMoveOrderingProfileFromBucketWeights(bucketSpecs, bucketWeightVectors, metadata = {}) {
  return makeMoveOrderingTrainingProfileFromWeights({
    name: metadata.name ?? defaultMoveOrderingProfileName(),
    description: metadata.description ?? 'late move-ordering evaluator를 회귀로 재추정한 프로필입니다.',
    stage: metadata.stage ?? buildProfileStageMetadata({ kind: 'move-ordering-profile' }),
    source: metadata.source ?? null,
    diagnostics: metadata.diagnostics ?? null,
    trainedBuckets: bucketSpecs.map((bucket, index) => ({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: roundWeights(moveOrderingWeightsObjectFromSolution(bucketWeightVectors[index])),
    })),
  });
}

function roundFiniteNumber(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(Number(value ?? 0) * scale) / scale;
}

function roundNumberArray(values, digits = 6) {
  const scale = 10 ** digits;
  return values.map((value) => Math.round(Number(value ?? 0) * scale) / scale);
}

export function buildTupleResidualProfileFromWeights(bucketSpecs, layout, bucketTupleWeightTables, metadata = {}) {
  const resolvedLayout = resolveTupleResidualLayout(layout);
  return makeTupleResidualTrainingProfileFromWeights({
    name: metadata.name ?? defaultTupleResidualProfileName(),
    description: metadata.description ?? 'tuple residual evaluator를 온라인 residual fitting으로 학습한 프로필입니다.',
    stage: metadata.stage ?? buildProfileStageMetadata({ kind: 'tuple-residual-profile' }),
    source: metadata.source ?? null,
    diagnostics: metadata.diagnostics ?? null,
    calibration: metadata.calibration ?? null,
    layout: resolvedLayout,
    trainedBuckets: bucketSpecs.map((bucket, index) => ({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      scale: Number.isFinite(bucket?.scale) ? bucket.scale : 1,
      bias: roundFiniteNumber(metadata.bucketBiases?.[index] ?? 0),
      tupleWeights: (bucketTupleWeightTables[index] ?? []).map((table) => roundNumberArray(table)),
    })),
  });
}

export function sanitizeEvaluationProfileForModule(profile) {
  if (!profile) {
    return null;
  }

  const resolved = resolveEvaluationProfile(profile);
  const source = profile && typeof profile === 'object' ? profile : {};

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : resolved.version,
    name: resolved.name,
    description: resolved.description,
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    featureKeys: EVALUATION_FEATURE_KEYS,
    phaseBuckets: Object.freeze(resolved.phaseBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: Object.freeze({ ...bucket.weights }),
    }))),
  });
}

export function sanitizeMoveOrderingProfileForModule(profile) {
  if (!profile) {
    return null;
  }

  const source = profile && typeof profile === 'object' ? profile : {};
  const buckets = resolveMoveOrderingBuckets(profile);

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : defaultMoveOrderingProfileName(),
    description: typeof source.description === 'string'
      ? source.description
      : '외부 학습 도구로 생성한 late move-ordering evaluator입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    featureKeys: MOVE_ORDERING_FEATURE_KEYS,
    trainedBuckets: Object.freeze(buckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: Object.freeze({ ...bucket.weights }),
    }))),
  });
}

export function sanitizeTupleResidualProfileForModule(profile) {
  if (!profile) {
    return null;
  }

  const source = profile && typeof profile === 'object' ? profile : {};
  const resolved = resolveTupleResidualProfile(profile);
  if (!resolved) {
    return null;
  }

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : defaultTupleResidualProfileName(),
    description: typeof source.description === 'string'
      ? source.description
      : '외부 학습 도구로 생성한 tuple residual evaluator입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    ...(Object.hasOwn(source, 'calibration') ? { calibration: source.calibration } : {}),
    ...(Object.hasOwn(source, 'patch') ? { patch: source.patch } : {}),
    featureEncoding: resolved.featureEncoding,
    layout: Object.freeze({
      version: resolved.layout.version,
      name: resolved.layout.name,
      description: resolved.layout.description,
      tupleCount: resolved.layout.tupleCount,
      maxTupleLength: resolved.layout.maxTupleLength,
      totalTableSize: resolved.layout.totalTableSize,
      tuples: Object.freeze(resolved.layout.tuples.map((tuple) => Object.freeze({
        key: tuple.key,
        squares: Object.freeze([...tuple.squares]),
        length: tuple.length,
        tableSize: tuple.tableSize,
      }))),
    }),
    trainedBuckets: Object.freeze(resolved.trainedBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      scale: bucket.scale,
      bias: bucket.bias,
      tupleWeights: Object.freeze(bucket.tupleWeights.map((table) => Object.freeze([...table]))),
    }))),
  });
}

export function sanitizeMpcProfileForModule(profile) {
  if (!profile) {
    return null;
  }

  const source = profile && typeof profile === 'object' ? profile : {};
  const calibrations = Array.isArray(source.calibrations)
    ? source.calibrations.map((calibration) => Object.freeze(JSON.parse(JSON.stringify(calibration))))
    : [];
  const runtime = source.runtime && typeof source.runtime === 'object'
    ? Object.freeze(JSON.parse(JSON.stringify(source.runtime)))
    : (source.runtimeConfig && typeof source.runtimeConfig === 'object'
      ? Object.freeze(JSON.parse(JSON.stringify(source.runtimeConfig)))
      : null);

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : 'calibrated-mpc-profile-v1',
    description: typeof source.description === 'string'
      ? source.description
      : 'shallow/deep search 상관 기반 MPC/ProbCut 보정 프로필입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    ...(runtime ? { runtime } : {}),
    calibrations: Object.freeze(calibrations),
  });
}

function normalizeGeneratedProfilesModuleFormat(value) {
  if (typeof value !== 'string') {
    return 'compact';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'expanded' || normalized === 'full'
    ? 'expanded'
    : 'compact';
}

function builtinTupleLayoutNameForModule(layout) {
  if (!layout || typeof layout !== 'object') {
    return null;
  }
  const layoutName = typeof layout.name === 'string' && layout.name.trim() !== ''
    ? layout.name.trim()
    : null;
  if (!layoutName) {
    return null;
  }

  const builtin = TUPLE_RESIDUAL_LAYOUT_LIBRARY[layoutName];
  if (!builtin || !Array.isArray(layout.tuples)) {
    return null;
  }
  if (builtin.tupleCount !== layout.tuples.length) {
    return null;
  }

  for (let tupleIndex = 0; tupleIndex < builtin.tuples.length; tupleIndex += 1) {
    const builtinTuple = builtin.tuples[tupleIndex];
    const sourceTuple = layout.tuples[tupleIndex];
    if (!Array.isArray(sourceTuple?.squares) || builtinTuple.squares.length !== sourceTuple.squares.length) {
      return null;
    }
    for (let squareIndex = 0; squareIndex < builtinTuple.squares.length; squareIndex += 1) {
      if (builtinTuple.squares[squareIndex] !== sourceTuple.squares[squareIndex]) {
        return null;
      }
    }
  }

  return layoutName;
}

function compactEvaluationProfileForModule(profile) {
  const resolved = sanitizeEvaluationProfileForModule(profile);
  if (!resolved) {
    return null;
  }

  return Object.freeze({
    version: resolved.version,
    format: 'compact-v1',
    name: resolved.name,
    ...(Object.hasOwn(resolved, 'stage') ? { stage: resolved.stage } : {}),
    phaseBuckets: Object.freeze(resolved.phaseBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: Object.freeze({ ...bucket.weights }),
    }))),
  });
}

function compactMoveOrderingProfileForModule(profile) {
  const resolved = sanitizeMoveOrderingProfileForModule(profile);
  if (!resolved) {
    return null;
  }

  return Object.freeze({
    version: resolved.version,
    format: 'compact-v1',
    name: resolved.name,
    ...(Object.hasOwn(resolved, 'stage') ? { stage: resolved.stage } : {}),
    trainedBuckets: Object.freeze(resolved.trainedBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      weights: Object.freeze({ ...bucket.weights }),
    }))),
  });
}

function compactTupleResidualProfileForModule(profile) {
  const resolved = sanitizeTupleResidualProfileForModule(profile);
  if (!resolved) {
    return null;
  }

  const builtinLayoutName = builtinTupleLayoutNameForModule(resolved.layout);
  const compactLayout = builtinLayoutName
    ? null
    : Object.freeze({
      ...(typeof resolved.layout.name === 'string' && resolved.layout.name.trim() !== ''
        ? { name: resolved.layout.name }
        : {}),
      tuples: Object.freeze(resolved.layout.tuples.map((tuple) => Object.freeze([...tuple.squares]))),
    });

  const compactPatchMetadata = Object.hasOwn(resolved, 'patch')
    ? Object.freeze(JSON.parse(JSON.stringify(resolved.patch)))
    : null;

  return Object.freeze({
    version: resolved.version,
    format: 'compact-v1',
    name: resolved.name,
    ...(Object.hasOwn(resolved, 'stage') ? { stage: resolved.stage } : {}),
    ...(compactPatchMetadata ? { patch: compactPatchMetadata } : {}),
    featureEncoding: resolved.featureEncoding,
    ...(builtinLayoutName ? { layoutName: builtinLayoutName } : { layout: compactLayout }),
    trainedBuckets: Object.freeze(resolved.trainedBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      scale: bucket.scale,
      bias: bucket.bias,
      tupleWeights: Object.freeze(bucket.tupleWeights.map((table) => Object.freeze([...table]))),
    }))),
  });
}

function compactMpcProfileForModule(profile) {
  const resolved = sanitizeMpcProfileForModule(profile);
  if (!resolved) {
    return null;
  }

  const compactRuntime = resolved.runtime && typeof resolved.runtime === 'object'
    ? Object.freeze({
      ...(resolved.runtime.enableHighCut !== undefined ? { enableHighCut: resolved.runtime.enableHighCut !== false } : {}),
      ...(resolved.runtime.enableLowCut !== undefined ? { enableLowCut: resolved.runtime.enableLowCut === true } : {}),
      ...(Number.isFinite(Number(resolved.runtime.maxWindow)) ? { maxWindow: Math.round(Number(resolved.runtime.maxWindow)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.maxChecksPerNode)) ? { maxChecksPerNode: Math.round(Number(resolved.runtime.maxChecksPerNode)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.minDepth)) ? { minDepth: Math.round(Number(resolved.runtime.minDepth)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.minDepthGap)) ? { minDepthGap: Math.round(Number(resolved.runtime.minDepthGap)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.maxDepthDistance)) ? { maxDepthDistance: Math.round(Number(resolved.runtime.maxDepthDistance)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.minPly)) ? { minPly: Math.round(Number(resolved.runtime.minPly)) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.highScale)) ? { highScale: Number(resolved.runtime.highScale) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.lowScale)) ? { lowScale: Number(resolved.runtime.lowScale) } : {}),
      ...(Number.isFinite(Number(resolved.runtime.depthDistanceScale)) ? { depthDistanceScale: Number(resolved.runtime.depthDistanceScale) } : {}),
    })
    : null;

  const compactCalibrations = resolved.calibrations.map((calibration) => {
    const intercept = Number(calibration?.regression?.intercept ?? calibration?.intercept);
    const slope = Number(calibration?.regression?.slope ?? calibration?.slope);
    const intervalHalfWidth = Number(
      calibration?.recommendedZ?.intervalHalfWidth
      ?? calibration?.intervalHalfWidth
      ?? calibration?.holdoutMetrics?.stdDevResidual
      ?? calibration?.trainMetrics?.stdDevResidual
      ?? NaN
    );
    const highIntervalHalfWidth = Number(
      calibration?.recommendedZ?.highIntervalHalfWidth
      ?? calibration?.highIntervalHalfWidth
      ?? NaN
    );
    const lowIntervalHalfWidth = Number(
      calibration?.recommendedZ?.lowIntervalHalfWidth
      ?? calibration?.lowIntervalHalfWidth
      ?? NaN
    );

    return Object.freeze({
      ...(typeof calibration?.key === 'string' ? { key: calibration.key } : {}),
      ...(typeof calibration?.label === 'string' ? { label: calibration.label } : {}),
      minEmpties: Number.isInteger(calibration?.minEmpties) ? calibration.minEmpties : 0,
      maxEmpties: Number.isInteger(calibration?.maxEmpties) ? calibration.maxEmpties : 0,
      shallowDepth: Number.isInteger(calibration?.shallowDepth) ? calibration.shallowDepth : 0,
      deepDepth: Number.isInteger(calibration?.deepDepth) ? calibration.deepDepth : 0,
      usable: calibration?.usable !== false,
      ...(Number.isFinite(intercept) ? { intercept } : {}),
      ...(Number.isFinite(slope) ? { slope } : {}),
      ...(Number.isFinite(intervalHalfWidth) ? { intervalHalfWidth } : {}),
      ...(Number.isFinite(highIntervalHalfWidth) ? { highIntervalHalfWidth } : {}),
      ...(Number.isFinite(lowIntervalHalfWidth) ? { lowIntervalHalfWidth } : {}),
      ...(Number.isFinite(Number(calibration?.recommendedZ?.z))
        ? { recommendedZ: Object.freeze({
          z: Number(calibration.recommendedZ.z),
          ...(Number.isFinite(intervalHalfWidth) ? { intervalHalfWidth } : {}),
          ...(Number.isFinite(highIntervalHalfWidth) ? { highIntervalHalfWidth } : {}),
          ...(Number.isFinite(lowIntervalHalfWidth) ? { lowIntervalHalfWidth } : {}),
          ...(Number.isFinite(Number(calibration?.recommendedZ?.coverage)) ? { coverage: Number(calibration.recommendedZ.coverage) } : {}),
        }) }
        : {}),
    });
  });

  return Object.freeze({
    version: resolved.version,
    format: 'compact-v1',
    name: resolved.name,
    ...(Object.hasOwn(resolved, 'stage') ? { stage: resolved.stage } : {}),
    ...(compactRuntime ? { runtime: compactRuntime } : {}),
    calibrations: Object.freeze(compactCalibrations),
  });
}

function normalizeOpeningPriorModuleFormat(value) {
  if (typeof value !== 'string') {
    return 'compact';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'expanded' || normalized === 'full'
    ? 'expanded'
    : 'compact';
}

function normalizeOpeningPriorHashEncoding(value, moduleFormat = 'compact') {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'hex' || normalized === 'decimal') {
      return normalized;
    }
  }
  return moduleFormat === 'compact' ? 'hex' : 'decimal';
}

function encodeOpeningPriorStateHash(stateHash, {
  sourceHashEncoding = 'decimal',
  targetHashEncoding = 'hex',
} = {}) {
  const raw = String(stateHash).trim();
  if (raw === '') {
    throw new Error('Opening prior state hash cannot be empty.');
  }

  let hashValue;
  if (sourceHashEncoding === 'hex') {
    if (!/^[0-9a-f]+$/i.test(raw.replace(/^0x/i, ''))) {
      throw new Error(`Invalid opening prior hex state hash: ${stateHash}`);
    }
    hashValue = BigInt(`0x${raw.replace(/^0x/i, '')}`);
  } else if (/^[0-9]+$/.test(raw)) {
    hashValue = BigInt(raw);
  } else if (/^[0-9a-f]+$/i.test(raw)) {
    hashValue = BigInt(`0x${raw}`);
  } else {
    throw new Error(`Invalid opening prior state hash: ${stateHash}`);
  }

  return targetHashEncoding === 'hex'
    ? hashValue.toString(16)
    : hashValue.toString(10);
}

function summarizeOpeningPriorSourceForModule(source, resolvedProfile) {
  if (!source && !resolvedProfile) {
    return undefined;
  }

  const inputFiles = Array.isArray(source?.inputFiles) ? source.inputFiles : [];
  const originalMoveCount = Array.isArray(resolvedProfile?.positions)
    ? resolvedProfile.positions.reduce((sum, position) => sum + position.moves.length, 0)
    : 0;

  return {
    ...(Number.isFinite(source?.totalInputBytes) ? { totalInputBytes: Number(source.totalInputBytes) } : {}),
    ...(inputFiles.length > 0 ? { inputFileCount: inputFiles.length } : {}),
    ...(Array.isArray(resolvedProfile?.positions) ? {
      originalPositionCount: resolvedProfile.positions.length,
      originalMoveCount,
    } : {}),
  };
}

function summarizeOpeningPriorDiagnosticsForModule(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object') {
    return undefined;
  }

  const summary = {};
  if (diagnostics.train && typeof diagnostics.train === 'object') {
    summary.train = {
      ...(Number.isFinite(diagnostics.train.gameCount) ? { gameCount: diagnostics.train.gameCount } : {}),
      ...(Number.isFinite(diagnostics.train.sampleCount) ? { sampleCount: diagnostics.train.sampleCount } : {}),
      ...(Number.isFinite(diagnostics.train.retainedPositionCount) ? { retainedPositionCount: diagnostics.train.retainedPositionCount } : {}),
      ...(Number.isFinite(diagnostics.train.retainedMoveCount) ? { retainedMoveCount: diagnostics.train.retainedMoveCount } : {}),
    };
  }

  if (diagnostics.holdout && typeof diagnostics.holdout === 'object') {
    summary.holdout = {
      ...(Number.isFinite(diagnostics.holdout.gameCount) ? { gameCount: diagnostics.holdout.gameCount } : {}),
      ...(Number.isFinite(diagnostics.holdout.coverage) ? { coverage: diagnostics.holdout.coverage } : {}),
      ...(Number.isFinite(diagnostics.holdout.moveCoverage) ? { moveCoverage: diagnostics.holdout.moveCoverage } : {}),
      ...(Number.isFinite(diagnostics.holdout.top1Accuracy) ? { top1Accuracy: diagnostics.holdout.top1Accuracy } : {}),
      ...(Number.isFinite(diagnostics.holdout.top2Accuracy) ? { top2Accuracy: diagnostics.holdout.top2Accuracy } : {}),
      ...(Number.isFinite(diagnostics.holdout.top3Accuracy) ? { top3Accuracy: diagnostics.holdout.top3Accuracy } : {}),
      ...(Number.isFinite(diagnostics.holdout.meanRank) ? { meanRank: diagnostics.holdout.meanRank } : {}),
      ...(Number.isFinite(diagnostics.holdout.meanReciprocalRank) ? { meanReciprocalRank: diagnostics.holdout.meanReciprocalRank } : {}),
    };
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function compactOpeningPriorProfileForModule(profile, {
  hashEncoding = 'hex',
  maxPly = null,
  minPositionCount = 0,
  minMoveCount = 0,
  maxCandidatesPerPosition = null,
} = {}) {
  const resolvedProfile = resolveOpeningPriorProfile(profile);
  if (!resolvedProfile) {
    return null;
  }

  const normalizedHashEncoding = normalizeOpeningPriorHashEncoding(hashEncoding, 'compact');
  const normalizedMaxPly = Number.isFinite(maxPly) ? Math.max(0, Math.round(maxPly)) : null;
  const normalizedMinPositionCount = Math.max(0, Math.round(Number(minPositionCount) || 0));
  const normalizedMinMoveCount = Math.max(0, Math.round(Number(minMoveCount) || 0));
  const normalizedMaxCandidates = Number.isFinite(maxCandidatesPerPosition)
    ? Math.max(1, Math.round(maxCandidatesPerPosition))
    : null;

  const compactPositions = [];
  let retainedMoveCount = 0;
  for (const position of resolvedProfile.positions) {
    if (normalizedMaxPly !== null && position.ply > normalizedMaxPly) {
      continue;
    }
    if (position.totalCount < normalizedMinPositionCount) {
      continue;
    }

    let moves = position.moves.filter((move) => move.count >= normalizedMinMoveCount);
    if (normalizedMaxCandidates !== null) {
      moves = moves.slice(0, normalizedMaxCandidates);
    }
    if (moves.length === 0) {
      continue;
    }

    const flatPosition = [
      encodeOpeningPriorStateHash(position.stateHash, {
        sourceHashEncoding: resolvedProfile.hashEncoding,
        targetHashEncoding: normalizedHashEncoding,
      }),
      position.ply,
      position.totalCount,
    ];
    for (const move of moves) {
      flatPosition.push(move.moveIndex, move.count, Number.isFinite(move.priorScore) ? Math.round(move.priorScore) : 0);
    }

    compactPositions.push(flatPosition);
    retainedMoveCount += moves.length;
  }

  const runtime = {
    positionCount: compactPositions.length,
    moveCount: retainedMoveCount,
    filters: {
      ...(normalizedMaxPly !== null ? { maxPly: normalizedMaxPly } : {}),
      minPositionCount: normalizedMinPositionCount,
      minMoveCount: normalizedMinMoveCount,
      ...(normalizedMaxCandidates !== null ? { maxCandidatesPerPosition: normalizedMaxCandidates } : {}),
    },
  };

  return {
    version: resolvedProfile.version,
    format: 'compact-v1',
    hashEncoding: normalizedHashEncoding,
    name: resolvedProfile.name,
    description: resolvedProfile.description,
    symmetry: resolvedProfile.symmetry,
    ...(Object.hasOwn(resolvedProfile, 'stage') ? { stage: resolvedProfile.stage } : {}),
    ...(summarizeOpeningPriorSourceForModule(resolvedProfile.source, resolvedProfile)
      ? { source: summarizeOpeningPriorSourceForModule(resolvedProfile.source, resolvedProfile) }
      : {}),
    ...(Object.hasOwn(resolvedProfile, 'options') ? { options: resolvedProfile.options } : {}),
    ...(summarizeOpeningPriorDiagnosticsForModule(resolvedProfile.diagnostics)
      ? { diagnostics: summarizeOpeningPriorDiagnosticsForModule(resolvedProfile.diagnostics) }
      : {}),
    runtime,
    positions: compactPositions,
  };
}

export function sanitizeOpeningPriorProfileForModule(profile, {
  moduleFormat = 'compact',
  hashEncoding,
  maxPly = null,
  minPositionCount = 0,
  minMoveCount = 0,
  maxCandidatesPerPosition = null,
} = {}) {
  if (!profile) {
    return null;
  }

  const normalizedModuleFormat = normalizeOpeningPriorModuleFormat(moduleFormat);
  if (normalizedModuleFormat === 'expanded') {
    return resolveOpeningPriorProfile(profile);
  }

  return compactOpeningPriorProfileForModule(profile, {
    hashEncoding: normalizeOpeningPriorHashEncoding(hashEncoding, normalizedModuleFormat),
    maxPly,
    minPositionCount,
    minMoveCount,
    maxCandidatesPerPosition,
  });
}

export function renderGeneratedOpeningPriorModule(profile, options = {}) {
  const normalizedModuleFormat = normalizeOpeningPriorModuleFormat(options.moduleFormat);
  const normalizedProfile = sanitizeOpeningPriorProfileForModule(profile, {
    ...options,
    moduleFormat: normalizedModuleFormat,
  });
  const serialized = normalizedProfile
    ? JSON.stringify(normalizedProfile, null, normalizedModuleFormat === 'expanded' ? 2 : 0)
    : 'null';
  return `const GENERATED_OPENING_PRIOR_PROFILE = ${serialized};

export { GENERATED_OPENING_PRIOR_PROFILE };
export default GENERATED_OPENING_PRIOR_PROFILE;
`;
}

export async function writeGeneratedOpeningPriorModule(outputPath, profile, options = {}) {
  const resolvedOutputPath = resolveCliPath(outputPath);
  await fs.promises.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.promises.writeFile(resolvedOutputPath, renderGeneratedOpeningPriorModule(profile, options), 'utf8');
  return resolvedOutputPath;
}

export function renderGeneratedProfilesModule({
  evaluationProfile = null,
  moveOrderingProfile = null,
  tupleResidualProfile = null,
  mpcProfile = null,
} = {}, options = {}) {
  const normalizedModuleFormat = normalizeGeneratedProfilesModuleFormat(options.moduleFormat);
  const indentation = normalizedModuleFormat === 'expanded' ? 2 : 0;
  const normalizedEvaluationProfile = normalizedModuleFormat === 'expanded'
    ? sanitizeEvaluationProfileForModule(evaluationProfile)
    : compactEvaluationProfileForModule(evaluationProfile);
  const normalizedMoveOrderingProfile = normalizedModuleFormat === 'expanded'
    ? sanitizeMoveOrderingProfileForModule(moveOrderingProfile)
    : compactMoveOrderingProfileForModule(moveOrderingProfile);
  const normalizedTupleResidualProfile = normalizedModuleFormat === 'expanded'
    ? sanitizeTupleResidualProfileForModule(tupleResidualProfile)
    : compactTupleResidualProfileForModule(tupleResidualProfile);
  const normalizedMpcProfile = normalizedModuleFormat === 'expanded'
    ? sanitizeMpcProfileForModule(mpcProfile)
    : compactMpcProfileForModule(mpcProfile);
  const evaluationSerialized = normalizedEvaluationProfile ? JSON.stringify(normalizedEvaluationProfile, null, indentation) : 'null';
  const moveOrderingSerialized = normalizedMoveOrderingProfile ? JSON.stringify(normalizedMoveOrderingProfile, null, indentation) : 'null';
  const tupleSerialized = normalizedTupleResidualProfile ? JSON.stringify(normalizedTupleResidualProfile, null, indentation) : 'null';
  const mpcSerialized = normalizedMpcProfile ? JSON.stringify(normalizedMpcProfile, null, indentation) : 'null';

  if (normalizedModuleFormat === 'expanded') {
    return `const GENERATED_EVALUATION_PROFILE = ${evaluationSerialized === 'null' ? 'null' : `Object.freeze(${evaluationSerialized})`};
const GENERATED_MOVE_ORDERING_PROFILE = ${moveOrderingSerialized === 'null' ? 'null' : `Object.freeze(${moveOrderingSerialized})`};
const GENERATED_TUPLE_RESIDUAL_PROFILE = ${tupleSerialized === 'null' ? 'null' : `Object.freeze(${tupleSerialized})`};
const GENERATED_MPC_PROFILE = ${mpcSerialized === 'null' ? 'null' : `Object.freeze(${mpcSerialized})`};

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE, GENERATED_TUPLE_RESIDUAL_PROFILE, GENERATED_MPC_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
`;
  }

  return `const GENERATED_EVALUATION_PROFILE=${evaluationSerialized};
const GENERATED_MOVE_ORDERING_PROFILE=${moveOrderingSerialized};
const GENERATED_TUPLE_RESIDUAL_PROFILE=${tupleSerialized};
const GENERATED_MPC_PROFILE=${mpcSerialized};
export{GENERATED_EVALUATION_PROFILE,GENERATED_MOVE_ORDERING_PROFILE,GENERATED_TUPLE_RESIDUAL_PROFILE,GENERATED_MPC_PROFILE};
export default GENERATED_EVALUATION_PROFILE;
`;
}

export async function writeGeneratedProfilesModule(outputPath, {
  evaluationProfile = null,
  moveOrderingProfile = null,
  tupleResidualProfile = null,
  mpcProfile = null,
} = {}, options = {}) {
  const resolvedOutputPath = resolveCliPath(outputPath);
  await fs.promises.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.promises.writeFile(resolvedOutputPath, renderGeneratedProfilesModule({
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
  }, options), 'utf8');
  return resolvedOutputPath;
}

export function loadJsonFileIfPresent(filePath) {
  if (!filePath) {
    return null;
  }
  return JSON.parse(fs.readFileSync(resolveCliPath(filePath), 'utf8'));
}

export async function loadGeneratedProfilesModuleIfPresent(filePath) {
  if (!filePath) {
    return null;
  }
  const resolvedPath = resolveCliPath(filePath);
  const imported = await import(pathToFileURL(resolvedPath).href);
  return {
    resolvedPath,
    evaluationProfile: imported.GENERATED_EVALUATION_PROFILE ?? imported.default ?? null,
    moveOrderingProfile: imported.GENERATED_MOVE_ORDERING_PROFILE ?? null,
    tupleResidualProfile: imported.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null,
    mpcProfile: imported.GENERATED_MPC_PROFILE ?? null,
  };
}

export function createEvaluatorForProfile(profile, { tupleResidualProfile = null } = {}) {
  return new Evaluator({ evaluationProfile: profile, tupleResidualProfile });
}

export function summarizeMetricAccumulator(accumulator) {
  if (!accumulator || accumulator.count === 0) {
    return {
      count: 0,
      mae: null,
      rmse: null,
      meanResidual: null,
      stdDevResidual: null,
      maxAbsResidual: null,
    };
  }

  const variance = Math.max(0, (accumulator.sumSquaredResidual / accumulator.count) - ((accumulator.sumResidual / accumulator.count) ** 2));
  return {
    count: accumulator.count,
    mae: accumulator.sumAbsResidual / accumulator.count,
    rmse: Math.sqrt(accumulator.sumSquaredResidual / accumulator.count),
    meanResidual: accumulator.sumResidual / accumulator.count,
    stdDevResidual: Math.sqrt(variance),
    maxAbsResidual: accumulator.maxAbsResidual,
  };
}

export function createMetricAccumulator() {
  return {
    count: 0,
    sumAbsResidual: 0,
    sumSquaredResidual: 0,
    sumResidual: 0,
    maxAbsResidual: 0,
  };
}

export function updateMetricAccumulator(accumulator, residual) {
  accumulator.count += 1;
  accumulator.sumAbsResidual += Math.abs(residual);
  accumulator.sumSquaredResidual += residual * residual;
  accumulator.sumResidual += residual;
  accumulator.maxAbsResidual = Math.max(accumulator.maxAbsResidual, Math.abs(residual));
}

export function createPairwiseRankingAccumulator() {
  return {
    comparablePairs: 0,
    correctPairs: 0,
    tiedTeacherPairs: 0,
    tiedPredictionPairs: 0,
    weightedComparablePairs: 0,
    weightedCorrectPairs: 0,
    maxTeacherGap: 0,
  };
}

export function updatePairwiseRankingAccumulator(accumulator, items) {
  if (!accumulator || !Array.isArray(items) || items.length <= 1) {
    return;
  }

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    const left = items[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const right = items[rightIndex];
      const teacherDelta = Number(left.target ?? 0) - Number(right.target ?? 0);
      const predictedDelta = Number(left.predicted ?? 0) - Number(right.predicted ?? 0);
      const teacherGap = Math.abs(teacherDelta);

      if (teacherGap < 1e-9) {
        accumulator.tiedTeacherPairs += 1;
        continue;
      }

      accumulator.comparablePairs += 1;
      accumulator.weightedComparablePairs += teacherGap;
      accumulator.maxTeacherGap = Math.max(accumulator.maxTeacherGap, teacherGap);

      if (Math.abs(predictedDelta) < 1e-9) {
        accumulator.tiedPredictionPairs += 1;
      }

      const correct = (teacherDelta > 0 && predictedDelta > 0)
        || (teacherDelta < 0 && predictedDelta < 0);
      if (correct) {
        accumulator.correctPairs += 1;
        accumulator.weightedCorrectPairs += teacherGap;
      }
    }
  }
}

export function summarizePairwiseRankingAccumulator(accumulator) {
  if (!accumulator || accumulator.comparablePairs === 0) {
    return {
      comparablePairs: 0,
      correctPairs: 0,
      tiedTeacherPairs: accumulator?.tiedTeacherPairs ?? 0,
      tiedPredictionPairs: accumulator?.tiedPredictionPairs ?? 0,
      accuracy: null,
      weightedAccuracy: null,
      maxTeacherGap: accumulator?.maxTeacherGap ?? null,
    };
  }

  return {
    comparablePairs: accumulator.comparablePairs,
    correctPairs: accumulator.correctPairs,
    tiedTeacherPairs: accumulator.tiedTeacherPairs,
    tiedPredictionPairs: accumulator.tiedPredictionPairs,
    accuracy: accumulator.correctPairs / accumulator.comparablePairs,
    weightedAccuracy: accumulator.weightedComparablePairs > 0
      ? accumulator.weightedCorrectPairs / accumulator.weightedComparablePairs
      : null,
    maxTeacherGap: accumulator.maxTeacherGap,
  };
}

export function createCorrelationAccumulator() {
  return {
    count: 0,
    sumX: 0,
    sumY: 0,
    sumXY: 0,
    sumX2: 0,
    sumY2: 0,
    sumAbsX: 0,
  };
}

export function updateCorrelationAccumulator(accumulator, x, y) {
  const xValue = Number(x);
  const yValue = Number(y);
  if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
    return;
  }

  accumulator.count += 1;
  accumulator.sumX += xValue;
  accumulator.sumY += yValue;
  accumulator.sumXY += xValue * yValue;
  accumulator.sumX2 += xValue * xValue;
  accumulator.sumY2 += yValue * yValue;
  accumulator.sumAbsX += Math.abs(xValue);
}

export function summarizeCorrelationAccumulator(accumulator) {
  if (!accumulator || accumulator.count === 0) {
    return {
      count: 0,
      correlation: null,
      meanAbsFeature: null,
    };
  }

  const meanX = accumulator.sumX / accumulator.count;
  const meanY = accumulator.sumY / accumulator.count;
  const covariance = (accumulator.sumXY / accumulator.count) - (meanX * meanY);
  const varianceX = Math.max(0, (accumulator.sumX2 / accumulator.count) - (meanX * meanX));
  const varianceY = Math.max(0, (accumulator.sumY2 / accumulator.count) - (meanY * meanY));
  const denominator = Math.sqrt(varianceX * varianceY);

  return {
    count: accumulator.count,
    correlation: denominator > 1e-12 ? covariance / denominator : null,
    meanAbsFeature: accumulator.sumAbsX / accumulator.count,
  };
}

export function resolveSeedProfile(seedProfile) {
  return compileEvaluationProfile(seedProfile ?? null);
}

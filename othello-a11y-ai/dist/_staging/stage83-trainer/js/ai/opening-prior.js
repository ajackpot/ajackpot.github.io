import {
  bitFromIndex,
  bitsToIndices,
  coordToIndex,
  indexToCoord,
  indexToRowCol,
  rowColToIndex,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import GENERATED_OPENING_PRIOR_PROFILE from './opening-prior.generated.js';

const HASH_WHITE_SHIFT = 64n;
const HASH_PLAYER_SHIFT = 128n;
const HASH_WHITE_TO_MOVE_BIT = 1n << HASH_PLAYER_SHIFT;
const OPENING_PRIOR_HASH_ENCODINGS = new Set(['decimal', 'hex']);
const OPENING_PRIOR_COMPACT_FORMAT = 'compact-v1';

const TRANSFORM_SPECS = Object.freeze([
  Object.freeze({
    key: 'identity',
    apply: ({ row, col }) => ({ row, col }),
  }),
  Object.freeze({
    key: 'rotate-180',
    apply: ({ row, col }) => ({ row: 7 - row, col: 7 - col }),
  }),
  Object.freeze({
    key: 'transpose',
    apply: ({ row, col }) => ({ row: col, col: row }),
  }),
  Object.freeze({
    key: 'anti-diagonal',
    apply: ({ row, col }) => ({ row: 7 - col, col: 7 - row }),
  }),
]);

const TRANSFORM_INDEX_TABLES = Object.freeze(TRANSFORM_SPECS.map((transform) => Object.freeze(
  Array.from({ length: 64 }, (_, index) => {
    const { row, col } = indexToRowCol(index);
    const next = transform.apply({ row, col });
    return rowColToIndex(next.row, next.col);
  }),
)));

const TRANSFORM_KEYS = Object.freeze(TRANSFORM_SPECS.map((entry) => entry.key));

function normalizeHashEncoding(value, fallback = 'decimal') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return OPENING_PRIOR_HASH_ENCODINGS.has(normalized) ? normalized : fallback;
}

function encodeHashValue(hashValue, hashEncoding = 'decimal') {
  const normalizedHashEncoding = normalizeHashEncoding(hashEncoding);
  return normalizedHashEncoding === 'hex'
    ? hashValue.toString(16)
    : hashValue.toString(10);
}

function normalizeHashString(value, hashEncoding = 'decimal') {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    return '';
  }

  const normalizedHashEncoding = normalizeHashEncoding(hashEncoding);
  const raw = String(value).trim();
  if (raw === '') {
    return '';
  }

  try {
    if (normalizedHashEncoding === 'hex') {
      const normalizedHex = raw.replace(/^0x/i, '').toLowerCase();
      if (!/^[0-9a-f]+$/i.test(normalizedHex)) {
        return '';
      }
      return BigInt(`0x${normalizedHex}`).toString(16);
    }

    return BigInt(raw).toString(10);
  } catch {
    return '';
  }
}

function isCompactOpeningPriorProfile(profile) {
  return typeof profile?.format === 'string'
    && profile.format.trim().toLowerCase() === OPENING_PRIOR_COMPACT_FORMAT;
}

function makeHashKey(black, white, currentPlayer) {
  return black
    | (white << HASH_WHITE_SHIFT)
    | (currentPlayer === 'white' ? HASH_WHITE_TO_MOVE_BIT : 0n);
}

export function transformMoveIndex(index, transformIndex) {
  const normalizedTransformIndex = Number.isInteger(transformIndex) ? transformIndex : 0;
  const table = TRANSFORM_INDEX_TABLES[normalizedTransformIndex] ?? TRANSFORM_INDEX_TABLES[0];
  return table[index] ?? index;
}

export function transformBitboard(bitboard, transformIndex) {
  if (bitboard === 0n) {
    return 0n;
  }

  let transformed = 0n;
  for (const index of bitsToIndices(bitboard)) {
    transformed |= bitFromIndex(transformMoveIndex(index, transformIndex));
  }
  return transformed;
}

function coerceFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMoveEntry(move, fallbackRank = null) {
  const compactMove = Array.isArray(move) ? move : null;
  const explicitMoveIndex = compactMove
    ? (Number.isInteger(compactMove[0]) ? compactMove[0] : null)
    : (Number.isInteger(move?.moveIndex) ? move.moveIndex : null);
  const explicitCoord = compactMove
    ? null
    : (typeof move?.coord === 'string' ? move.coord.trim().toUpperCase() : null);
  const moveIndex = explicitMoveIndex ?? (explicitCoord ? coordToIndex(explicitCoord) : -1);
  if (!Number.isInteger(moveIndex) || moveIndex < 0 || moveIndex >= 64) {
    return null;
  }

  const rank = compactMove
    ? (Number.isInteger(compactMove[3]) && compactMove[3] > 0 ? compactMove[3] : fallbackRank)
    : (Number.isInteger(move?.rank) && move.rank > 0 ? move.rank : fallbackRank);
  const count = compactMove ? compactMove[1] : move?.count;
  const priorScore = compactMove ? compactMove[2] : move?.priorScore;

  return {
    moveIndex,
    coord: explicitCoord ?? indexToCoord(moveIndex),
    count: Math.max(0, Math.round(coerceFiniteNumber(count, 0))),
    share: compactMove ? null : coerceFiniteNumber(move?.share, null),
    popularityScore: compactMove ? null : coerceFiniteNumber(move?.popularityScore, null),
    outcomeScore: compactMove ? null : coerceFiniteNumber(move?.outcomeScore, null),
    priorScore: coerceFiniteNumber(priorScore, null),
    meanScore: compactMove ? null : coerceFiniteNumber(move?.meanScore, null),
    meanActualScore: compactMove ? null : coerceFiniteNumber(move?.meanActualScore, null),
    meanTheoreticalScore: compactMove ? null : coerceFiniteNumber(move?.meanTheoreticalScore, null),
    winRate: compactMove ? null : coerceFiniteNumber(move?.winRate, null),
    drawRate: compactMove ? null : coerceFiniteNumber(move?.drawRate, null),
    lossRate: compactMove ? null : coerceFiniteNumber(move?.lossRate, null),
    sampleCount: compactMove
      ? Math.max(0, Math.round(coerceFiniteNumber(count, 0)))
      : Math.max(0, Math.round(coerceFiniteNumber(move?.sampleCount, move?.count ?? 0))),
    ...(rank ? { rank } : {}),
  };
}

function scoreSortValue(move) {
  if (Number.isFinite(move?.priorScore)) {
    return move.priorScore;
  }
  if (Number.isFinite(move?.popularityScore)) {
    return move.popularityScore;
  }
  if (Number.isFinite(move?.meanScore)) {
    return move.meanScore;
  }
  return 0;
}

function normalizePositionEntry(position, { hashEncoding = 'decimal' } = {}) {
  const normalizedHashEncoding = normalizeHashEncoding(hashEncoding);

  let stateHash = '';
  let ply = 0;
  let totalCount = 0;
  let retainedCount = 0;
  let candidateCount = 0;
  let sourcePositionId = null;
  let normalizedMoves = [];

  if (Array.isArray(position)) {
    if (position.length < 3) {
      return null;
    }

    stateHash = normalizeHashString(position[0], normalizedHashEncoding);
    if (stateHash === '') {
      return null;
    }

    ply = Math.max(0, Math.round(coerceFiniteNumber(position[1], 0)));
    totalCount = Math.max(0, Math.round(coerceFiniteNumber(position[2], 0)));
    normalizedMoves = [];
    for (let index = 3; index + 2 < position.length; index += 3) {
      const move = normalizeMoveEntry([position[index], position[index + 1], position[index + 2]], normalizedMoves.length + 1);
      if (move) {
        normalizedMoves.push(move);
      }
    }
    retainedCount = normalizedMoves.reduce((sum, move) => sum + move.count, 0);
    candidateCount = normalizedMoves.length;
  } else {
    stateHash = normalizeHashString(
      typeof position?.stateHash === 'string'
        ? position.stateHash.trim()
        : (typeof position?.hashKey === 'string' ? position.hashKey.trim() : ''),
      normalizedHashEncoding,
    );
    if (stateHash === '') {
      return null;
    }

    normalizedMoves = (Array.isArray(position?.moves) ? position.moves : [])
      .map((move, index) => normalizeMoveEntry(move, index + 1))
      .filter(Boolean)
      .sort((left, right) => {
        const scoreDelta = scoreSortValue(right) - scoreSortValue(left);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.moveIndex - right.moveIndex;
      })
      .map((move, index) => ({
        ...move,
        rank: index + 1,
      }));

    totalCount = Math.max(
      0,
      Math.round(coerceFiniteNumber(
        position?.totalCount,
        normalizedMoves.reduce((sum, move) => sum + move.count, 0),
      )),
    );
    retainedCount = Math.max(
      0,
      Math.round(coerceFiniteNumber(
        position?.retainedCount,
        normalizedMoves.reduce((sum, move) => sum + move.count, 0),
      )),
    );
    candidateCount = Math.max(
      0,
      Math.round(coerceFiniteNumber(position?.candidateCount, normalizedMoves.length)),
    );
    sourcePositionId = typeof position?.sourcePositionId === 'string' && position.sourcePositionId.trim() !== ''
      ? position.sourcePositionId.trim()
      : null;
    ply = Math.max(0, Math.round(coerceFiniteNumber(position?.ply, 0)));
  }

  return {
    stateHash,
    ply,
    totalCount,
    retainedCount,
    candidateCount,
    ...(sourcePositionId ? { sourcePositionId } : {}),
    moves: normalizedMoves,
  };
}

function resolveOpeningPriorProfileHeader(profile) {
  if (!profile) {
    return null;
  }

  return {
    version: Number.isInteger(profile?.version) ? profile.version : 1,
    name: typeof profile?.name === 'string' && profile.name.trim() !== ''
      ? profile.name.trim()
      : 'trained-opening-prior',
    description: typeof profile?.description === 'string'
      ? profile.description
      : '오프라인 집계로 생성한 opening/root prior profile입니다.',
    symmetry: typeof profile?.symmetry === 'string' && profile.symmetry.trim() !== ''
      ? profile.symmetry.trim()
      : 'canonical-4',
    format: isCompactOpeningPriorProfile(profile) ? OPENING_PRIOR_COMPACT_FORMAT : 'expanded-v1',
    hashEncoding: normalizeHashEncoding(profile?.hashEncoding, isCompactOpeningPriorProfile(profile) ? 'hex' : 'decimal'),
    ...(profile && typeof profile === 'object' && Object.hasOwn(profile, 'stage') ? { stage: profile.stage } : {}),
    ...(profile && typeof profile === 'object' && Object.hasOwn(profile, 'source') ? { source: profile.source } : {}),
    ...(profile && typeof profile === 'object' && Object.hasOwn(profile, 'options') ? { options: profile.options } : {}),
    ...(profile && typeof profile === 'object' && Object.hasOwn(profile, 'diagnostics') ? { diagnostics: profile.diagnostics } : {}),
    ...(profile && typeof profile === 'object' && Object.hasOwn(profile, 'runtime') ? { runtime: profile.runtime } : {}),
  };
}

export const ACTIVE_OPENING_PRIOR_PROFILE = GENERATED_OPENING_PRIOR_PROFILE ?? null;

export function resolveOpeningPriorProfile(profile = ACTIVE_OPENING_PRIOR_PROFILE) {
  if (!profile) {
    return null;
  }

  const header = resolveOpeningPriorProfileHeader(profile);
  if (!header) {
    return null;
  }

  const positions = (Array.isArray(profile?.positions) ? profile.positions : [])
    .map((position) => normalizePositionEntry(position, { hashEncoding: header.hashEncoding }))
    .filter(Boolean)
    .sort((left, right) => {
      if (left.ply !== right.ply) {
        return left.ply - right.ply;
      }
      if (right.totalCount !== left.totalCount) {
        return right.totalCount - left.totalCount;
      }
      return left.stateHash.localeCompare(right.stateHash);
    });

  return {
    ...header,
    positions,
  };
}

let cachedActiveCompiledProfile = null;

export function compileOpeningPriorProfile(profile = ACTIVE_OPENING_PRIOR_PROFILE) {
  const header = resolveOpeningPriorProfileHeader(profile);
  if (!header) {
    return null;
  }

  if (!isCompactOpeningPriorProfile(profile)) {
    const resolved = resolveOpeningPriorProfile(profile);
    if (!resolved) {
      return null;
    }

    return {
      ...resolved,
      positionsByKey: new Map(resolved.positions.map((position) => [position.stateHash, position])),
      compactEntryCache: null,
    };
  }

  const positionsByKey = new Map();
  const rawPositions = Array.isArray(profile?.positions) ? profile.positions : [];
  for (const rawPosition of rawPositions) {
    if (Array.isArray(rawPosition)) {
      const stateHash = normalizeHashString(rawPosition[0], header.hashEncoding);
      if (stateHash !== '') {
        positionsByKey.set(stateHash, rawPosition);
      }
      continue;
    }

    const normalizedPosition = normalizePositionEntry(rawPosition, { hashEncoding: header.hashEncoding });
    if (normalizedPosition) {
      positionsByKey.set(normalizedPosition.stateHash, normalizedPosition);
    }
  }

  return {
    ...header,
    positions: rawPositions,
    positionsByKey,
    compactEntryCache: new Map(),
  };
}

export function canonicalizeOpeningPriorState(state, { hashEncoding = 'decimal' } = {}) {
  if (!(state instanceof GameState)) {
    throw new TypeError('canonicalizeOpeningPriorState expects a GameState instance.');
  }

  const normalizedHashEncoding = normalizeHashEncoding(hashEncoding);
  let bestHashValue = null;
  let bestTransformIndex = 0;
  let matchingTransformIndices = [];

  for (let transformIndex = 0; transformIndex < TRANSFORM_INDEX_TABLES.length; transformIndex += 1) {
    const transformedBlack = transformBitboard(state.black, transformIndex);
    const transformedWhite = transformBitboard(state.white, transformIndex);
    const hashValue = makeHashKey(transformedBlack, transformedWhite, state.currentPlayer);

    if (bestHashValue === null || hashValue < bestHashValue) {
      bestHashValue = hashValue;
      bestTransformIndex = transformIndex;
      matchingTransformIndices = [transformIndex];
    } else if (hashValue === bestHashValue) {
      matchingTransformIndices.push(transformIndex);
    }
  }

  const hashValue = bestHashValue ?? 0n;
  const uniqueMatchingTransformIndices = [...new Set(
    matchingTransformIndices.length > 0 ? matchingTransformIndices : [bestTransformIndex],
  )];

  return {
    stateHash: encodeHashValue(hashValue, normalizedHashEncoding),
    stateHashDecimal: encodeHashValue(hashValue, 'decimal'),
    stateHashHex: encodeHashValue(hashValue, 'hex'),
    transformIndex: bestTransformIndex,
    transformKey: TRANSFORM_KEYS[bestTransformIndex],
    matchingTransformIndices: uniqueMatchingTransformIndices,
    matchingTransformKeys: uniqueMatchingTransformIndices.map((transformIndex) => TRANSFORM_KEYS[transformIndex]),
  };
}

export function canonicalizeOpeningPriorSample(state, moveIndex, { hashEncoding = 'decimal' } = {}) {
  if (!(state instanceof GameState)) {
    throw new TypeError('canonicalizeOpeningPriorSample expects a GameState instance.');
  }
  if (!Number.isInteger(moveIndex) || moveIndex < 0 || moveIndex >= 64) {
    throw new RangeError(`Invalid move index for opening prior sample: ${moveIndex}`);
  }

  const canonical = canonicalizeOpeningPriorState(state, { hashEncoding });
  return {
    ...canonical,
    moveIndex: transformMoveIndex(moveIndex, canonical.transformIndex),
    coord: indexToCoord(transformMoveIndex(moveIndex, canonical.transformIndex)),
  };
}

function resolveCompiledPositionEntry(compiled, canonicalStateHash) {
  const entry = compiled.positionsByKey.get(canonicalStateHash);
  if (!entry) {
    return null;
  }

  if (!compiled.compactEntryCache || !Array.isArray(entry)) {
    return entry;
  }

  let cachedEntry = compiled.compactEntryCache.get(canonicalStateHash) ?? null;
  if (cachedEntry) {
    return cachedEntry;
  }

  cachedEntry = normalizePositionEntry(entry, { hashEncoding: compiled.hashEncoding });
  if (!cachedEntry) {
    return null;
  }
  compiled.compactEntryCache.set(canonicalStateHash, cachedEntry);
  return cachedEntry;
}

function expandOpeningPriorMoves(entry, canonical) {
  const matchingTransformIndices = Array.isArray(canonical?.matchingTransformIndices)
    && canonical.matchingTransformIndices.length > 0
    ? canonical.matchingTransformIndices
    : [canonical?.transformIndex ?? 0];
  const totalCount = Math.max(
    0,
    coerceFiniteNumber(
      entry?.totalCount,
      Array.isArray(entry?.moves)
        ? entry.moves.reduce((sum, move) => sum + coerceFiniteNumber(move?.count, 0), 0)
        : 0,
    ),
  );
  const expandedMoves = new Map();

  for (const move of Array.isArray(entry?.moves) ? entry.moves : []) {
    const orbitIndices = [...new Set(matchingTransformIndices.map(
      (transformIndex) => transformMoveIndex(move.moveIndex, transformIndex),
    ))];
    const orbitSize = Math.max(1, orbitIndices.length);
    const distributedCount = coerceFiniteNumber(move.count, 0) / orbitSize;
    const distributedSampleCount = coerceFiniteNumber(move.sampleCount, move.count ?? 0) / orbitSize;

    for (const restoredIndex of orbitIndices) {
      const existing = expandedMoves.get(restoredIndex);
      const nextCount = distributedCount + coerceFiniteNumber(existing?.count, 0);
      const nextSampleCount = distributedSampleCount + coerceFiniteNumber(existing?.sampleCount, 0);
      expandedMoves.set(restoredIndex, {
        ...move,
        ...(existing ?? {}),
        moveIndex: restoredIndex,
        coord: indexToCoord(restoredIndex),
        count: nextCount,
        sampleCount: nextSampleCount,
        share: totalCount > 0 ? nextCount / totalCount : null,
        symmetryOrbitSize: Math.max(orbitSize, existing?.symmetryOrbitSize ?? 0),
      });
    }
  }

  return [...expandedMoves.values()]
    .sort((left, right) => {
      const scoreDelta = scoreSortValue(right) - scoreSortValue(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.moveIndex - right.moveIndex;
    })
    .map((move, index) => ({
      ...move,
      rank: index + 1,
      share: totalCount > 0 ? move.count / totalCount : move.share ?? null,
    }));
}

export function lookupOpeningPrior(state, profile = ACTIVE_OPENING_PRIOR_PROFILE) {
  if (!(state instanceof GameState)) {
    throw new TypeError('lookupOpeningPrior expects a GameState instance.');
  }

  const compiled = profile === ACTIVE_OPENING_PRIOR_PROFILE
    ? (cachedActiveCompiledProfile ??= compileOpeningPriorProfile(profile))
    : compileOpeningPriorProfile(profile);
  if (!compiled) {
    return null;
  }

  const canonical = canonicalizeOpeningPriorState(state, { hashEncoding: compiled.hashEncoding });
  const entry = resolveCompiledPositionEntry(compiled, canonical.stateHash);
  if (!entry) {
    return null;
  }

  const expandedMoves = expandOpeningPriorMoves(entry, canonical);
  const retainedCount = expandedMoves.reduce((sum, move) => sum + coerceFiniteNumber(move.count, 0), 0);

  return {
    ...entry,
    matchedTransformKey: canonical.transformKey,
    matchedTransformIndex: canonical.transformIndex,
    matchedTransformIndices: canonical.matchingTransformIndices,
    matchedTransformKeys: canonical.matchingTransformKeys,
    sourceCandidateCount: entry.candidateCount,
    candidateCount: expandedMoves.length,
    retainedCount,
    moves: expandedMoves,
  };
}

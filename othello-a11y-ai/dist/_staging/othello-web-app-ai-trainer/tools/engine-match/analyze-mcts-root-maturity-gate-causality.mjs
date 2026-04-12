#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  inputJsonList: [],
  outputJson: null,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/analyze-mcts-root-maturity-gate-causality.mjs \
    --input-json-list benchmarks/fileA.json,benchmarks/fileB.json \
    [--output-json benchmarks/stage118_root_gate_causality_summary.json]

설명:
- benchmark-mcts-root-maturity-gate-runtime.mjs 출력(JSON)을 읽어,
  root-maturity gate activation이 실제로 base -> target 출력 차이를 설명하는지 scenario 단위로 집계합니다.
- 기준 signature는 bestMoveCoord / score / proven / isExactResult / rootSolvedOutcome 다섯 항목입니다.
`);
}

function parseCsvPaths(value, fallback = []) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...fallback];
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildOutputSignature(result = {}) {
  return {
    bestMoveCoord: result?.bestMoveCoord ?? null,
    score: Number.isFinite(Number(result?.score)) ? Number(result.score) : null,
    proven: result?.proven === true,
    isExactResult: result?.isExactResult === true,
    rootSolvedOutcome: typeof result?.rootSolvedOutcome === 'string'
      ? result.rootSolvedOutcome
      : (typeof result?.mctsRootSolvedOutcome === 'string' ? result.mctsRootSolvedOutcome : null),
  };
}

function signaturesEqual(left = {}, right = {}) {
  return left.bestMoveCoord === right.bestMoveCoord
    && left.score === right.score
    && left.proven === right.proven
    && left.isExactResult === right.isExactResult
    && left.rootSolvedOutcome === right.rootSolvedOutcome;
}

function createAggregate(label) {
  return {
    label,
    scenarios: 0,
    gateActivatedCount: 0,
    gateNotActivatedCount: 0,
    baseVsTargetDiffCount: 0,
    baseVsRuntimeDiffCount: 0,
    runtimeVsTargetDiffCount: 0,
    activatedChangedScenarioCount: 0,
    activationExplainsTargetShiftCount: 0,
    activationWithoutOutputChangeCount: 0,
    activationButRuntimeStillBaseCount: 0,
    activationButRuntimeDivergedFromBothCount: 0,
    targetShiftWithoutActivationCount: 0,
    targetShiftWithoutActivationButRuntimeMatchedTargetCount: 0,
    targetShiftWithoutActivationAndRuntimeStayedBaseCount: 0,
    targetShiftWithoutActivationAndRuntimeDivergedFromBothCount: 0,
    changedScenarioDetails: [],
  };
}

function finalizeAggregate(aggregate) {
  const scenarios = aggregate.scenarios || 0;
  const baseVsTargetDiffCount = aggregate.baseVsTargetDiffCount || 0;
  return {
    ...aggregate,
    gateActivatedRate: scenarios > 0 ? round(aggregate.gateActivatedCount / scenarios) : 0,
    baseVsTargetDiffRate: scenarios > 0 ? round(baseVsTargetDiffCount / scenarios) : 0,
    activationExplainsTargetShiftRateAmongChanged: baseVsTargetDiffCount > 0
      ? round(aggregate.activationExplainsTargetShiftCount / baseVsTargetDiffCount)
      : 0,
    activationExplainsTargetShiftRateAmongAll: scenarios > 0
      ? round(aggregate.activationExplainsTargetShiftCount / scenarios)
      : 0,
  };
}

function classifyScenario(summary, scenario, sourceLabel, scenarioIndex) {
  const variants = scenario?.variants && typeof scenario.variants === 'object' ? scenario.variants : null;
  const base = variants?.base ?? null;
  const target = variants?.target ?? null;
  const runtimeGate = variants?.['runtime-gate'] ?? null;
  if (!base || !target || !runtimeGate) {
    return;
  }

  const baseSignature = buildOutputSignature(base);
  const targetSignature = buildOutputSignature(target);
  const runtimeSignature = buildOutputSignature(runtimeGate);
  const gateActivated = runtimeGate.proofPriorityRootMaturityGateActivated === true;
  const baseVsTargetDiff = !signaturesEqual(baseSignature, targetSignature);
  const baseVsRuntimeDiff = !signaturesEqual(baseSignature, runtimeSignature);
  const runtimeVsTargetDiff = !signaturesEqual(runtimeSignature, targetSignature);

  summary.scenarios += 1;
  if (gateActivated) {
    summary.gateActivatedCount += 1;
  } else {
    summary.gateNotActivatedCount += 1;
  }
  if (baseVsTargetDiff) {
    summary.baseVsTargetDiffCount += 1;
  }
  if (baseVsRuntimeDiff) {
    summary.baseVsRuntimeDiffCount += 1;
  }
  if (runtimeVsTargetDiff) {
    summary.runtimeVsTargetDiffCount += 1;
  }

  const runtimeMatchesTarget = signaturesEqual(runtimeSignature, targetSignature);
  const runtimeMatchesBase = signaturesEqual(runtimeSignature, baseSignature);

  if (gateActivated && baseVsTargetDiff) {
    summary.activatedChangedScenarioCount += 1;
    if (runtimeMatchesTarget && !runtimeMatchesBase) {
      summary.activationExplainsTargetShiftCount += 1;
    } else if (runtimeMatchesBase) {
      summary.activationButRuntimeStillBaseCount += 1;
    } else {
      summary.activationButRuntimeDivergedFromBothCount += 1;
    }
  }

  if (gateActivated && !baseVsRuntimeDiff) {
    summary.activationWithoutOutputChangeCount += 1;
  }

  if (!gateActivated && baseVsTargetDiff) {
    summary.targetShiftWithoutActivationCount += 1;
    if (runtimeMatchesTarget) {
      summary.targetShiftWithoutActivationButRuntimeMatchedTargetCount += 1;
    } else if (runtimeMatchesBase) {
      summary.targetShiftWithoutActivationAndRuntimeStayedBaseCount += 1;
    } else {
      summary.targetShiftWithoutActivationAndRuntimeDivergedFromBothCount += 1;
    }
  }

  if (baseVsTargetDiff) {
    summary.changedScenarioDetails.push({
      sourceLabel,
      scenarioIndex,
      emptyCount: scenario?.emptyCount ?? null,
      seed: scenario?.seed ?? null,
      timeLimitMs: scenario?.timeLimitMs ?? null,
      fixedIterations: scenario?.fixedIterations ?? scenario?.mctsMaxIterations ?? null,
      legalMoveCount: scenario?.legalMoveCount ?? null,
      gateActivated,
      gateActivationReason: runtimeGate.proofPriorityRootMaturityGateActivationReason ?? null,
      gateActivationIteration: Number.isFinite(Number(runtimeGate.proofPriorityRootMaturityGateActivationIteration))
        ? Number(runtimeGate.proofPriorityRootMaturityGateActivationIteration)
        : null,
      runtimeMatchesTarget,
      runtimeMatchesBase,
      base: baseSignature,
      target: targetSignature,
      runtimeGate: runtimeSignature,
    });
  }
}

function analyzeBenchmarkFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const summary = createAggregate(relativePathFromCwd(filePath) ?? filePath);
  const scenarios = Array.isArray(parsed?.scenarios) ? parsed.scenarios : [];
  scenarios.forEach((scenario, index) => classifyScenario(summary, scenario, summary.label, index));
  return {
    file: relativePathFromCwd(filePath) ?? filePath,
    type: parsed?.type ?? null,
    generatedAt: parsed?.generatedAt ?? null,
    options: parsed?.options ?? {},
    summary: finalizeAggregate(summary),
  };
}

function mergeAggregates(label, entries = []) {
  const merged = createAggregate(label);
  for (const entry of entries) {
    const summary = entry?.summary ?? {};
    for (const key of [
      'scenarios',
      'gateActivatedCount',
      'gateNotActivatedCount',
      'baseVsTargetDiffCount',
      'baseVsRuntimeDiffCount',
      'runtimeVsTargetDiffCount',
      'activatedChangedScenarioCount',
      'activationExplainsTargetShiftCount',
      'activationWithoutOutputChangeCount',
      'activationButRuntimeStillBaseCount',
      'activationButRuntimeDivergedFromBothCount',
      'targetShiftWithoutActivationCount',
      'targetShiftWithoutActivationButRuntimeMatchedTargetCount',
      'targetShiftWithoutActivationAndRuntimeStayedBaseCount',
      'targetShiftWithoutActivationAndRuntimeDivergedFromBothCount',
    ]) {
      merged[key] += Number(summary?.[key] ?? 0);
    }
    if (Array.isArray(summary?.changedScenarioDetails)) {
      merged.changedScenarioDetails.push(...summary.changedScenarioDetails);
    }
  }
  return finalizeAggregate(merged);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const inputJsonList = parseCsvPaths(args['input-json-list'] ?? args.i, DEFAULTS.inputJsonList)
    .map((filePath) => resolveCliPath(filePath, repoRoot));
  const outputJson = typeof args['output-json'] === 'string'
    ? resolveCliPath(args['output-json'], repoRoot)
    : DEFAULTS.outputJson;

  if (inputJsonList.length === 0) {
    throw new Error('At least one --input-json-list entry is required.');
  }

  const perFile = inputJsonList.map((filePath) => analyzeBenchmarkFile(filePath));
  const merged = mergeAggregates('combined', perFile);
  const summary = {
    type: 'mcts-root-maturity-gate-causality-analysis',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot) ?? repoRoot,
    options: {
      inputJsonList: inputJsonList.map((filePath) => relativePathFromCwd(filePath) ?? filePath),
    },
    perFile,
    combined: merged,
  };

  if (outputJson) {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true });
    fs.writeFileSync(outputJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    type: summary.type,
    files: perFile.length,
    combined: {
      scenarios: merged.scenarios,
      gateActivatedCount: merged.gateActivatedCount,
      baseVsTargetDiffCount: merged.baseVsTargetDiffCount,
      activationExplainsTargetShiftCount: merged.activationExplainsTargetShiftCount,
      targetShiftWithoutActivationCount: merged.targetShiftWithoutActivationCount,
      activationExplainsTargetShiftRateAmongChanged: merged.activationExplainsTargetShiftRateAmongChanged,
    },
    outputJson: outputJson ? (relativePathFromCwd(outputJson) ?? outputJson) : null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

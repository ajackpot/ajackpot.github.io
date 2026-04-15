import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { resolveCliPath } from '../evaluator-training/lib.mjs';

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(outputPath, data) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function writeText(outputPath, text) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text, 'utf8');
}

export function maybeRun(scriptPath, args, outputJsonPath, { cwd, force, logPath = null }) {
  const resolvedOutputPath = resolveCliPath(outputJsonPath);
  if (!force && fs.existsSync(resolvedOutputPath)) {
    return { outputJsonPath: resolvedOutputPath, reused: true };
  }
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
  });
  if (logPath) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, `${result.stdout ?? ''}${result.stderr ?? ''}`, 'utf8');
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? 'unknown'}): ${scriptPath}\n${result.stderr ?? result.stdout ?? ''}`);
  }
  return { outputJsonPath: resolvedOutputPath, reused: false };
}

export function buildVariantSpecString(variants, pathSelector = (variant) => variant.generatedModule) {
  return variants.map((variant) => `${variant.label}|${pathSelector(variant)}`).join(';');
}

export function slugForPair(left, right) {
  return `${left.label}_vs_${right.label}`;
}

export function allVariantPairs(variants) {
  const pairs = [];
  for (let i = 0; i < variants.length; i += 1) {
    for (let j = i + 1; j < variants.length; j += 1) {
      pairs.push([variants[i], variants[j]]);
    }
  }
  return pairs;
}

export function weightedAverage(entries, valueSelector, weightSelector) {
  const filtered = (entries ?? []).filter((entry) => Number(weightSelector(entry) ?? 0) > 0);
  if (filtered.length === 0) {
    return 0;
  }
  const totalWeight = filtered.reduce((sum, entry) => sum + Number(weightSelector(entry) ?? 0), 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const weightedTotal = filtered.reduce((sum, entry) => sum + Number(valueSelector(entry) ?? 0) * Number(weightSelector(entry) ?? 0), 0);
  return weightedTotal / totalWeight;
}

export function summarizeThroughputVariant(timeBuckets, variantLabel, baselineLabel) {
  const variantEntries = [];
  const comparisonEntries = [];
  for (const bucket of timeBuckets ?? []) {
    if (bucket?.variants?.[variantLabel]) {
      variantEntries.push(bucket.variants[variantLabel]);
    }
    for (const comparison of bucket?.comparisons ?? []) {
      if (comparison?.candidateVariant === variantLabel && comparison?.baselineVariant === baselineLabel) {
        comparisonEntries.push(comparison);
      }
    }
  }
  return {
    variantLabel,
    weightedNodesPerMs: weightedAverage(variantEntries, (entry) => entry.nodesPerMs, (entry) => entry.samples?.length ?? 0),
    weightedDepth: weightedAverage(variantEntries, (entry) => entry.averageCompletedDepth, (entry) => entry.samples?.length ?? 0),
    weightedCompletionRate: weightedAverage(variantEntries, (entry) => entry.completionRate, (entry) => entry.samples?.length ?? 0),
    weightedNodesPerMsGainVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.candidateNodesPerMsGainRate, (entry) => entry.sampleCount),
    weightedDepthGainVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.candidateAverageDepthGain, (entry) => entry.sampleCount),
    weightedMoveAgreementVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.moveAgreementRate, (entry) => entry.sampleCount),
  };
}

export function summarizeHeadToHead(
  pairResults,
  leftLabel,
  rightLabel,
  familyFilter = null,
  { getLabels = (pairResult) => [pairResult.left?.label, pairResult.right?.label] } = {},
) {
  const relevant = pairResults.filter((pairResult) => {
    const labels = getLabels(pairResult);
    const familyOk = !familyFilter || pairResult.family === familyFilter;
    return familyOk && labels.includes(leftLabel) && labels.includes(rightLabel);
  });
  const scenarioEntries = [];
  for (const pairResult of relevant) {
    for (const scenario of pairResult.summary.scenarios ?? []) {
      if (scenario?.variants?.[leftLabel] && scenario?.variants?.[rightLabel]) {
        scenarioEntries.push({
          pairSlug: pairResult.pairSlug,
          scenarioKey: pairResult.scenarioKey,
          scenarioFamily: pairResult.family,
          searchAlgorithm: pairResult.searchAlgorithm,
          timeLimitMs: scenario.timeLimitMs,
          totalGames: scenario.totalGames,
          pointGap: Number(scenario.variants[rightLabel].scoreRate ?? 0) - Number(scenario.variants[leftLabel].scoreRate ?? 0),
        });
      }
    }
  }
  return {
    leftLabel,
    rightLabel,
    family: familyFilter ?? 'all',
    scenarioCount: scenarioEntries.length,
    totalGames: scenarioEntries.reduce((sum, entry) => sum + Number(entry.totalGames ?? 0), 0),
    weightedPointGap: weightedAverage(scenarioEntries, (entry) => entry.pointGap, (entry) => entry.totalGames),
    worstPointGap: scenarioEntries.length > 0 ? Math.min(...scenarioEntries.map((entry) => Number(entry.pointGap ?? 0))) : 0,
    bestPointGap: scenarioEntries.length > 0 ? Math.max(...scenarioEntries.map((entry) => Number(entry.pointGap ?? 0))) : 0,
    scenarios: scenarioEntries,
  };
}

export function summarizeDepth(depthSummary) {
  const overall = depthSummary?.overall ?? {};
  const cases = Number(overall.cases ?? 0);
  const identicalBest = Number(overall.identicalBestMoveCases ?? 0);
  return {
    cases,
    sameBestRate: cases > 0 ? identicalBest / cases : 0,
    nodeDeltaPercent: Number(overall.nodeDeltaPercent ?? 0),
    elapsedDeltaPercent: Number(overall.elapsedDeltaPercent ?? 0),
    overall,
  };
}

export function summarizeExact(exactSummary) {
  const overall = exactSummary?.overall ?? {};
  const cases = Number(overall.cases ?? 0);
  const identicalScore = Number(overall.identicalScoreCases ?? 0);
  const identicalBest = Number(overall.identicalBestMoveCases ?? 0);
  return {
    cases,
    sameScoreRate: cases > 0 ? identicalScore / cases : 0,
    sameBestRate: cases > 0 ? identicalBest / cases : 0,
    nodeDeltaPercent: Number(overall.nodeDeltaPercent ?? 0),
    elapsedDeltaPercent: Number(overall.elapsedDeltaPercent ?? 0),
    overall,
  };
}

export function summarizeCombinedSearchCost(depth, exact) {
  const baselineNodes = Number(depth?.overall?.baselineNodes ?? 0) + Number(exact?.overall?.baselineNodes ?? 0);
  const candidateNodes = Number(depth?.overall?.candidateNodes ?? 0) + Number(exact?.overall?.candidateNodes ?? 0);
  const baselineElapsedMs = Number(depth?.overall?.baselineElapsedMs ?? 0) + Number(exact?.overall?.baselineElapsedMs ?? 0);
  const candidateElapsedMs = Number(depth?.overall?.candidateElapsedMs ?? 0) + Number(exact?.overall?.candidateElapsedMs ?? 0);
  const nodeDeltaPercent = baselineNodes > 0 ? ((candidateNodes - baselineNodes) / baselineNodes) * 100 : 0;
  const elapsedDeltaPercent = baselineElapsedMs > 0 ? ((candidateElapsedMs - baselineElapsedMs) / baselineElapsedMs) * 100 : 0;
  return {
    baselineNodes,
    candidateNodes,
    baselineElapsedMs,
    candidateElapsedMs,
    nodeDeltaPercent,
    elapsedDeltaPercent,
  };
}

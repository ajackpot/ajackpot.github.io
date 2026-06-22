const RANGE_KEYS = ['lower', 'expected', 'upper'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyStructure() {
  return {
    navMoves: 0,
    activations: 0,
    decisions: 0,
    waits: 0,
    speechUnits: 0,
    scanSteps: 0,
    contextResets: 0,
  };
}

function addCounts(target, step) {
  target.navMoves += step.navMoves ?? 0;
  target.activations += step.activations ?? 0;
  target.decisions += step.decisions ?? 0;
  target.waits += step.waits ?? 0;
  target.speechUnits += step.speechUnits ?? 0;
  target.scanSteps += step.scanSteps ?? step.navMoves ?? 0;
  target.contextResets += step.contextResets ?? 0;
}

function estimateStepMs(step, profile, rangeKey) {
  const navCount = profile.navigationModel === 'scan'
    ? (step.scanSteps ?? step.navMoves ?? 0)
    : (step.navMoves ?? 0);

  const navigationMs = profile.navigationModel === 'scan'
    ? (profile.scanStepMs?.[rangeKey] ?? 0)
    : (profile.navigationMs?.[rangeKey] ?? 0);

  const base =
    navCount * navigationMs +
    (step.activations ?? 0) * (profile.activationMs?.[rangeKey] ?? 0) +
    (step.decisions ?? 0) * (profile.decisionMs?.[rangeKey] ?? 0) +
    (step.waits ?? 0) * (profile.waitMs?.[rangeKey] ?? 0) +
    (step.speechUnits ?? 0) * (profile.speechUnitMs?.[rangeKey] ?? 0) +
    (step.contextResets ?? 0) * (profile.contextResetMs?.[rangeKey] ?? 0);

  const recoveryMultiplier = step.bucket === 'recovery'
    ? (profile.recoveryMultiplier?.[rangeKey] ?? 1)
    : 1;

  return Math.round(base * recoveryMultiplier);
}

function aggregateStructural(taskGraph) {
  const totals = emptyStructure();
  const byBucket = {
    entry: emptyStructure(),
    repeated: emptyStructure(),
    recovery: emptyStructure(),
  };

  for (const step of taskGraph.steps) {
    addCounts(totals, step);
    if (!byBucket[step.bucket]) {
      byBucket[step.bucket] = emptyStructure();
    }
    addCounts(byBucket[step.bucket], step);
  }

  return {
    totals,
    byBucket,
  };
}

function estimateTaskForProfile(taskGraph, profile) {
  const totalsByRange = {};
  const bucketsByRange = {};

  for (const rangeKey of RANGE_KEYS) {
    let totalMs = 0;
    const bucketMs = {
      entry: 0,
      repeated: 0,
      recovery: 0,
    };

    for (const step of taskGraph.steps) {
      const stepMs = estimateStepMs(step, profile, rangeKey);
      totalMs += stepMs;
      bucketMs[step.bucket] = (bucketMs[step.bucket] ?? 0) + stepMs;
    }

    totalsByRange[rangeKey] = {
      milliseconds: totalMs,
      seconds: Number((totalMs / 1000).toFixed(1)),
    };

    bucketsByRange[rangeKey] = Object.fromEntries(
      Object.entries(bucketMs).map(([bucket, value]) => [
        bucket,
        {
          milliseconds: value,
          seconds: Number((value / 1000).toFixed(1)),
        },
      ])
    );
  }

  return {
    label: profile.label,
    description: profile.description,
    ranges: totalsByRange,
    bucketRanges: bucketsByRange,
  };
}

function compareVariants(variantA, variantB, profileId) {
  const aExpected = variantA.profiles[profileId].ranges.expected.seconds;
  const bExpected = variantB.profiles[profileId].ranges.expected.seconds;
  const improvementSeconds = Number((aExpected - bExpected).toFixed(1));
  const improvementRatio = aExpected === 0 ? 0 : Number((((aExpected - bExpected) / aExpected) * 100).toFixed(1));
  return {
    expectedReductionSeconds: improvementSeconds,
    expectedReductionPercent: improvementRatio,
  };
}

export function buildBenchmarkResults({ graphs, profiles }) {
  const results = {
    generatedAt: new Date().toISOString(),
    variants: {},
    comparisons: {},
    overall: {},
  };

  for (const [variantId, variant] of Object.entries(graphs)) {
    results.variants[variantId] = {
      label: variant.label,
      description: variant.description,
      tasks: {},
    };

    for (const [taskId, taskGraph] of Object.entries(variant.tasks)) {
      const structural = aggregateStructural(taskGraph);
      const profileResults = {};

      for (const [profileId, profile] of Object.entries(profiles)) {
        profileResults[profileId] = estimateTaskForProfile(taskGraph, profile);
      }

      results.variants[variantId].tasks[taskId] = {
        title: taskGraph.title,
        assumptions: clone(taskGraph.assumptions ?? []),
        structural,
        profiles: profileResults,
      };
    }
  }

  const taskIds = Object.keys(graphs.variantA.tasks);
  for (const taskId of taskIds) {
    results.comparisons[taskId] = {};
    for (const profileId of Object.keys(profiles)) {
      results.comparisons[taskId][profileId] = compareVariants(
        results.variants.variantA.tasks[taskId],
        results.variants.variantB.tasks[taskId],
        profileId
      );
    }
  }

  for (const [profileId, profile] of Object.entries(profiles)) {
    const totals = {
      variantA: 0,
      variantB: 0,
    };

    for (const taskId of taskIds) {
      totals.variantA += results.variants.variantA.tasks[taskId].profiles[profileId].ranges.expected.seconds;
      totals.variantB += results.variants.variantB.tasks[taskId].profiles[profileId].ranges.expected.seconds;
    }

    results.overall[profileId] = {
      label: profile.label,
      variantAExpectedSeconds: Number(totals.variantA.toFixed(1)),
      variantBExpectedSeconds: Number(totals.variantB.toFixed(1)),
      expectedReductionSeconds: Number((totals.variantA - totals.variantB).toFixed(1)),
      expectedReductionPercent: Number((((totals.variantA - totals.variantB) / totals.variantA) * 100).toFixed(1)),
    };
  }

  return results;
}

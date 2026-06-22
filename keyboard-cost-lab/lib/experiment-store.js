const STORE_KEY = 'keyboard-cost-lab-results-v1';

const EMPTY_STORE = Object.freeze({
  version: 1,
  updatedAt: '',
  services: {},
});

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function clone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function normalizeStore(rawStore) {
  if (!rawStore || typeof rawStore !== 'object') return clone(EMPTY_STORE);
  return {
    version: 1,
    updatedAt: typeof rawStore.updatedAt === 'string' ? rawStore.updatedAt : '',
    services: rawStore.services && typeof rawStore.services === 'object' ? rawStore.services : {},
  };
}

export function readStoredExperimentResults() {
  if (!canUseLocalStorage()) return clone(EMPTY_STORE);
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) return clone(EMPTY_STORE);
  try {
    return normalizeStore(JSON.parse(raw));
  } catch {
    return clone(EMPTY_STORE);
  }
}

export function writeStoredExperimentResults(store) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(normalizeStore(store)));
}

export function getServiceCompletedTaskCount(serviceRecord) {
  if (!serviceRecord?.actualRuns) return 0;
  return Object.values(serviceRecord.actualRuns).reduce((sum, results) => {
    return sum + (Array.isArray(results) ? results.length : 0);
  }, 0);
}

export function getExpectedServiceTaskCount(serviceRecordOrOptions = {}) {
  const taskCount = Number(serviceRecordOrOptions.taskCount ?? serviceRecordOrOptions.expectedTaskCount ?? 3);
  const conditionCount = Number(serviceRecordOrOptions.conditionCount ?? serviceRecordOrOptions.expectedConditionCount ?? 2);
  return Math.max(0, taskCount) * Math.max(0, conditionCount);
}

export function getServiceProgressLabel(status) {
  if (status === 'completed') return '수행 완료';
  if (status === 'in-progress') return '진행 중';
  return '수행 전';
}

export function getServiceProgress(serviceId, options = {}) {
  const store = readStoredExperimentResults();
  const record = store.services?.[serviceId] ?? null;
  if (!record) {
    return {
      status: 'not-started',
      label: '수행 전',
      completedTaskCount: 0,
      expectedTaskCount: getExpectedServiceTaskCount(options),
      updatedAt: '',
      record: null,
    };
  }

  const expectedTaskCount = getExpectedServiceTaskCount({ ...options, ...record });
  const completedTaskCount = getServiceCompletedTaskCount(record);
  const status = expectedTaskCount > 0 && completedTaskCount >= expectedTaskCount
    ? 'completed'
    : completedTaskCount > 0
      ? 'in-progress'
      : 'not-started';

  return {
    status,
    label: getServiceProgressLabel(status),
    completedTaskCount,
    expectedTaskCount,
    updatedAt: record.updatedAt || '',
    record,
  };
}

export function saveServiceRunSnapshot({
  serviceId,
  serviceLabel,
  sessionId,
  order,
  taskCount,
  conditionCount,
  measurementRules,
  actualRuns,
  benchmarkResults,
  aggregateActualCondition,
}) {
  if (!serviceId) return null;
  const now = new Date().toISOString();
  const normalizedActualRuns = {
    variantA: Array.isArray(actualRuns?.variantA) ? clone(actualRuns.variantA) : [],
    variantB: Array.isArray(actualRuns?.variantB) ? clone(actualRuns.variantB) : [],
  };
  const record = {
    serviceId,
    serviceLabel: serviceLabel || serviceId,
    sessionId: sessionId || '',
    order: Array.isArray(order) ? [...order] : [],
    taskCount: Number(taskCount ?? 3),
    conditionCount: Number(conditionCount ?? 2),
    updatedAt: now,
    measurementRules: measurementRules ? clone(measurementRules) : null,
    actualRuns: normalizedActualRuns,
  };

  if (typeof aggregateActualCondition === 'function') {
    record.actualTotals = {
      variantA: aggregateActualCondition({ taskResults: normalizedActualRuns.variantA }),
      variantB: aggregateActualCondition({ taskResults: normalizedActualRuns.variantB }),
    };
  }

  if (benchmarkResults) {
    record.benchmarkSummary = clone(benchmarkResults.overall ?? {});
  }

  const completedTaskCount = getServiceCompletedTaskCount(record);
  const expectedTaskCount = getExpectedServiceTaskCount(record);
  record.status = expectedTaskCount > 0 && completedTaskCount >= expectedTaskCount
    ? 'completed'
    : completedTaskCount > 0
      ? 'in-progress'
      : 'not-started';
  record.statusLabel = getServiceProgressLabel(record.status);

  const store = readStoredExperimentResults();
  const nextStore = {
    ...store,
    version: 1,
    updatedAt: now,
    services: {
      ...(store.services ?? {}),
      [serviceId]: record,
    },
  };
  writeStoredExperimentResults(nextStore);
  return record;
}

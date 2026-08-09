import { getComparisonOrder, normalizeComparisonAssignment } from './utils.js';

const STORE_KEY = 'keyboard-cost-lab-results-v1';
const CONDITION_IDS = Object.freeze(['variantA', 'variantB']);

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

function normalizeNonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(0, Math.trunc(fallback));
  return Math.max(0, Math.trunc(parsed));
}

function normalizeConditionOrder(order, conditionCount = CONDITION_IDS.length) {
  const available = CONDITION_IDS.slice(0, Math.max(0, normalizeNonNegativeInteger(conditionCount, CONDITION_IDS.length)));
  const normalized = [];
  for (const conditionId of Array.isArray(order) ? order : []) {
    if (available.includes(conditionId) && !normalized.includes(conditionId)) {
      normalized.push(conditionId);
    }
  }
  for (const conditionId of available) {
    if (!normalized.includes(conditionId)) normalized.push(conditionId);
  }
  return normalized;
}

function normalizeActualRuns(actualRuns, taskCount, conditionCount) {
  const normalized = {};
  for (const conditionId of CONDITION_IDS.slice(0, conditionCount)) {
    normalized[conditionId] = Array.isArray(actualRuns?.[conditionId])
      ? clone(actualRuns[conditionId].slice(0, taskCount))
      : [];
  }
  return normalized;
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

export function getServiceCompletionPercent(completedTaskCount, expectedTaskCount) {
  const expected = normalizeNonNegativeInteger(expectedTaskCount);
  if (expected === 0) return 0;
  const completed = Math.min(normalizeNonNegativeInteger(completedTaskCount), expected);
  return Math.round((completed / expected) * 100);
}

export function formatServiceProgressSummary(progressOrCounts = {}) {
  const expectedTaskCount = normalizeNonNegativeInteger(progressOrCounts.expectedTaskCount);
  const completedTaskCount = Math.min(
    normalizeNonNegativeInteger(progressOrCounts.completedTaskCount),
    expectedTaskCount
  );
  const completionPercent = Number.isFinite(progressOrCounts.completionPercent)
    ? Math.max(0, Math.min(100, Math.round(progressOrCounts.completionPercent)))
    : getServiceCompletionPercent(completedTaskCount, expectedTaskCount);
  return `${expectedTaskCount}개 중 ${completedTaskCount}개 완료(${completionPercent}%)`;
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
    const expectedTaskCount = getExpectedServiceTaskCount(options);
    return {
      status: 'not-started',
      label: '수행 전',
      completedTaskCount: 0,
      expectedTaskCount,
      completionPercent: 0,
      updatedAt: '',
      record: null,
    };
  }

  const expectedTaskCount = getExpectedServiceTaskCount({ ...record, ...options });
  const completedTaskCount = Math.min(getServiceCompletedTaskCount(record), expectedTaskCount);
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
    completionPercent: getServiceCompletionPercent(completedTaskCount, expectedTaskCount),
    updatedAt: record.updatedAt || '',
    record,
  };
}

export function findNextIncompleteTaskPosition({
  order,
  actualRuns,
  taskCount,
  conditionCount = CONDITION_IDS.length,
} = {}) {
  const normalizedTaskCount = normalizeNonNegativeInteger(taskCount);
  const normalizedConditionCount = Math.min(
    CONDITION_IDS.length,
    normalizeNonNegativeInteger(conditionCount, CONDITION_IDS.length)
  );
  const normalizedOrder = normalizeConditionOrder(order, normalizedConditionCount);
  const normalizedRuns = normalizeActualRuns(actualRuns, normalizedTaskCount, normalizedConditionCount);

  for (let conditionIndex = 0; conditionIndex < normalizedOrder.length; conditionIndex += 1) {
    const conditionId = normalizedOrder[conditionIndex];
    const completedForCondition = normalizedRuns[conditionId]?.length ?? 0;
    if (completedForCondition < normalizedTaskCount) {
      return {
        conditionId,
        conditionIndex,
        taskIndex: completedForCondition,
      };
    }
  }
  return null;
}

export function buildServiceResumePlan(serviceRecord, options = {}) {
  if (!serviceRecord || typeof serviceRecord !== 'object') return null;
  const taskCount = normalizeNonNegativeInteger(
    options.taskCount ?? serviceRecord.taskCount ?? 0
  );
  const conditionCount = Math.min(
    CONDITION_IDS.length,
    normalizeNonNegativeInteger(options.conditionCount ?? serviceRecord.conditionCount ?? CONDITION_IDS.length)
  );
  const expectedTaskCount = taskCount * conditionCount;
  if (expectedTaskCount === 0) return null;

  const order = normalizeConditionOrder(serviceRecord.order, conditionCount);
  const actualRuns = normalizeActualRuns(serviceRecord.actualRuns, taskCount, conditionCount);
  const completedTaskCount = Math.min(
    Object.values(actualRuns).reduce((sum, results) => sum + results.length, 0),
    expectedTaskCount
  );
  if (completedTaskCount === 0) return null;

  const next = findNextIncompleteTaskPosition({
    order,
    actualRuns,
    taskCount,
    conditionCount,
  });

  return {
    serviceId: serviceRecord.serviceId || '',
    sessionId: serviceRecord.sessionId || '',
    order,
    comparisonAssignment: normalizeComparisonAssignment(serviceRecord.comparisonAssignment),
    taskCount,
    conditionCount,
    expectedTaskCount,
    completedTaskCount,
    completionPercent: getServiceCompletionPercent(completedTaskCount, expectedTaskCount),
    isComplete: next === null,
    nextConditionId: next?.conditionId ?? null,
    nextConditionIndex: next?.conditionIndex ?? -1,
    nextTaskIndex: next?.taskIndex ?? -1,
    actualRuns,
    runtimeSnapshots: serviceRecord.runtimeSnapshots && typeof serviceRecord.runtimeSnapshots === 'object'
      ? clone(serviceRecord.runtimeSnapshots)
      : {},
    record: clone(serviceRecord),
  };
}

export function getServiceResumePlan(serviceId, options = {}) {
  const store = readStoredExperimentResults();
  return buildServiceResumePlan(store.services?.[serviceId] ?? null, options);
}

export function clearStoredServiceProgress(serviceId) {
  if (!serviceId) return;
  const store = readStoredExperimentResults();
  if (!store.services?.[serviceId]) return;
  const nextServices = { ...store.services };
  delete nextServices[serviceId];
  writeStoredExperimentResults({
    ...store,
    updatedAt: new Date().toISOString(),
    services: nextServices,
  });
}

export function saveServiceRunSnapshot({
  serviceId,
  serviceLabel,
  sessionId,
  order,
  comparisonAssignment,
  taskCount,
  conditionCount,
  measurementRules,
  actualRuns,
  runtimeSnapshots,
  benchmarkResults,
  aggregateActualCondition,
}) {
  if (!serviceId) return null;
  const now = new Date().toISOString();
  const normalizedActualRuns = {
    variantA: Array.isArray(actualRuns?.variantA) ? clone(actualRuns.variantA) : [],
    variantB: Array.isArray(actualRuns?.variantB) ? clone(actualRuns.variantB) : [],
  };
  const normalizedComparisonAssignment = normalizeComparisonAssignment(comparisonAssignment);
  const record = {
    serviceId,
    serviceLabel: serviceLabel || serviceId,
    sessionId: sessionId || '',
    order: Array.isArray(order) ? [...order] : [],
    comparisonAssignment: normalizedComparisonAssignment,
    comparisonOrder: getComparisonOrder(order, normalizedComparisonAssignment),
    taskCount: Number(taskCount ?? 3),
    conditionCount: Number(conditionCount ?? 2),
    updatedAt: now,
    measurementRules: measurementRules ? clone(measurementRules) : null,
    actualRuns: normalizedActualRuns,
    runtimeSnapshots: runtimeSnapshots && typeof runtimeSnapshots === 'object'
      ? clone(runtimeSnapshots)
      : {},
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

  const expectedTaskCount = getExpectedServiceTaskCount(record);
  const completedTaskCount = Math.min(getServiceCompletedTaskCount(record), expectedTaskCount);
  record.status = expectedTaskCount > 0 && completedTaskCount >= expectedTaskCount
    ? 'completed'
    : completedTaskCount > 0
      ? 'in-progress'
      : 'not-started';
  record.statusLabel = getServiceProgressLabel(record.status);
  record.completedTaskCount = completedTaskCount;
  record.expectedTaskCount = expectedTaskCount;
  record.completionPercent = getServiceCompletionPercent(completedTaskCount, expectedTaskCount);

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

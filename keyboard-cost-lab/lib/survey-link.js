import { serviceRegistry } from '../data/service-registry.js';
import { surveyManifest, surveyPrefillParams } from '../data/survey-config.js';
import { getExpectedServiceTaskCount, getServiceCompletedTaskCount } from './experiment-store.js';
import { escapeHtml, formatSeconds } from './utils.js';

const SURVEY_SERVICE_IDS = surveyManifest.services.map((service) => service.id);
const CONDITION_IDS = ['variantA', 'variantB'];
const CONDITION_LABELS = {
  variantA: 'A',
  variantB: 'B',
};

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatCount(value, suffix = '회') {
  return `${Math.round(asNumber(value))}${suffix}`;
}

function formatOptionalMetric(label, value, suffix = '회') {
  const number = asNumber(value);
  if (number <= 0) return '';
  return `${label} ${formatCount(number, suffix)}`;
}

function getSurveyServices(services = serviceRegistry) {
  return SURVEY_SERVICE_IDS.map((serviceId) => {
    const manifestService = surveyManifest.services.find((service) => service.id === serviceId);
    const registryService = services.find((service) => service.id === serviceId);
    return {
      id: serviceId,
      label: registryService?.label ?? manifestService?.label ?? serviceId,
      taskCount: Number(registryService?.taskCount ?? manifestService?.taskCount ?? 2),
      conditionCount: Number(registryService?.conditionCount ?? 2),
      path: registryService?.path ?? null,
      available: registryService?.available ?? true,
    };
  });
}

function isCompletedServiceRecord(record, service) {
  if (!record) return false;
  if (record.status === 'completed') return true;
  const expectedTaskCount = getExpectedServiceTaskCount({
    taskCount: service.taskCount,
    conditionCount: service.conditionCount,
    ...record,
  });
  return expectedTaskCount > 0 && getServiceCompletedTaskCount(record) >= expectedTaskCount;
}

export function getStudySurveyProgress(store, services = serviceRegistry) {
  const surveyServices = getSurveyServices(services);
  const rows = surveyServices.map((service) => {
    const record = store?.services?.[service.id] ?? null;
    const expectedTaskCount = getExpectedServiceTaskCount({
      taskCount: service.taskCount,
      conditionCount: service.conditionCount,
      ...record,
    });
    const completedTaskCount = record ? getServiceCompletedTaskCount(record) : 0;
    const completed = isCompletedServiceRecord(record, service);
    return {
      ...service,
      record,
      completed,
      completedTaskCount,
      expectedTaskCount,
      label: service.label,
    };
  });

  return {
    services: rows,
    completedServices: rows.filter((row) => row.completed),
    remainingServices: rows.filter((row) => !row.completed),
    allComplete: rows.every((row) => row.completed),
    completedCount: rows.filter((row) => row.completed).length,
    totalCount: rows.length,
  };
}

function getConditionTotals(record, conditionId) {
  const fromTotals = record?.actualTotals?.[conditionId];
  if (fromTotals && typeof fromTotals === 'object') return fromTotals;

  const results = Array.isArray(record?.actualRuns?.[conditionId]) ? record.actualRuns[conditionId] : [];
  const totals = results.reduce((acc, result) => {
    acc.durationSeconds += asNumber(result.durationSeconds);
    acc.hiddenDurationSeconds += asNumber(result.hiddenDurationSeconds);
    acc.totalKeyInputs += asNumber(result.totalKeyInputs);
    acc.focusChanges += asNumber(result.focusChanges);
    acc.backtrackInputs += asNumber(result.backtrackInputs);
    acc.wrongSelections += asNumber(result.wrongSelections);
    acc.contextResets += asNumber(result.contextResets);
    acc.modalEscapes += asNumber(result.modalEscapes);
    acc.pointerActivations += asNumber(result.pointerActivations);
    acc.successCount += result.success ? 1 : 0;
    return acc;
  }, {
    durationSeconds: 0,
    hiddenDurationSeconds: 0,
    totalKeyInputs: 0,
    focusChanges: 0,
    backtrackInputs: 0,
    wrongSelections: 0,
    contextResets: 0,
    modalEscapes: 0,
    pointerActivations: 0,
    successCount: 0,
  });
  totals.incompleteCount = Math.max(0, results.length - totals.successCount);
  return totals;
}

function formatTaskLine(result, index) {
  const status = result.success ? '완료' : '수행 불가능';
  const parts = [
    `${index + 1}번 ${status}`,
    formatSeconds(asNumber(result.durationSeconds)),
    `키 ${formatCount(result.totalKeyInputs)}`,
    `초점 ${formatCount(result.focusChanges)}`,
  ];

  const optional = [
    formatOptionalMetric('오선택', result.wrongSelections),
    formatOptionalMetric('다시 찾기', result.contextResets),
    formatOptionalMetric('초점 이탈', result.modalEscapes),
  ].filter(Boolean);

  return parts.concat(optional).join(', ');
}

export function formatServiceConditionRecord(record, service, conditionId) {
  const taskResults = Array.isArray(record?.actualRuns?.[conditionId]) ? record.actualRuns[conditionId] : [];
  if (!record || taskResults.length === 0) return '';

  const totals = getConditionTotals(record, conditionId);
  const summaryParts = [
    `합계: 완료 시간 ${formatSeconds(asNumber(totals.durationSeconds))}`,
    `키 입력 ${formatCount(totals.totalKeyInputs)}`,
    `초점 이동 ${formatCount(totals.focusChanges)}`,
    `목표와 다른 선택 ${formatCount(totals.wrongSelections)}`,
    `위치 다시 찾기 ${formatCount(totals.contextResets)}`,
    formatOptionalMetric('대화상자 밖 초점 이탈', totals.modalEscapes),
    `수행 완료 ${formatCount(totals.successCount, '개')}`,
    `수행 불가능 ${formatCount(totals.incompleteCount, '개')}`,
  ].filter(Boolean);

  const taskLines = taskResults.map(formatTaskLine);
  return `${summaryParts.join(', ')}\n과업별: ${taskLines.join(' / ')}`;
}

export function buildStudySurveyAnswers(store, services = serviceRegistry) {
  const progress = getStudySurveyProgress(store, services);
  const answers = {};

  for (const service of progress.services) {
    if (!service.record) continue;
    for (const conditionId of CONDITION_IDS) {
      const key = `service.${service.id}.actual${CONDITION_LABELS[conditionId]}`;
      const param = surveyPrefillParams[key];
      const value = formatServiceConditionRecord(service.record, service, conditionId);
      if (param && value) {
        answers[key] = value;
      }
    }
  }

  return answers;
}

export function buildStudySurveyUrl(store, { services = serviceRegistry, requireAllServices = true } = {}) {
  const progress = getStudySurveyProgress(store, services);
  if (requireAllServices && !progress.allComplete) return '';

  const url = new URL(surveyManifest.formResponseUrl);
  url.searchParams.set('usp', 'pp_url');

  const answers = buildStudySurveyAnswers(store, services);
  for (const [key, value] of Object.entries(answers)) {
    const param = surveyPrefillParams[key];
    if (!param || !value) continue;
    url.searchParams.set(param, value);
  }

  return url.toString();
}

export function renderSurveyTransferPanel({ store, services = serviceRegistry, requireAllServices = true } = {}) {
  const progress = getStudySurveyProgress(store, services);
  const surveyUrl = buildStudySurveyUrl(store, { services, requireAllServices });
  const completedLabels = progress.completedServices.map((service) => service.label).join(', ') || '아직 없음';
  const remainingLabels = progress.remainingServices.map((service) => service.label).join(', ') || '없음';
  const statusLabel = `${progress.completedCount} / ${progress.totalCount}개 서비스 완료`;

  return `
    <section class="card survey-transfer-card">
      <div class="service-card-header">
        <div>
          <p class="eyebrow">설문지 제출 준비</p>
          <h2>구글 설문지로 수행 기록 전달</h2>
        </div>
        <span class="pill ${progress.allComplete ? 'pill-success' : ''}">${escapeHtml(statusLabel)}</span>
      </div>
      <p class="muted">3개 서비스 과업을 모두 완료하면 설문지로 이동하여 수행 기록을 자동으로 입력할 수 있습니다.</p>
      <dl class="meta-list compact service-progress-list">
        <div><dt>완료한 서비스</dt><dd>${escapeHtml(completedLabels)}</dd></div>
        <div><dt>남은 서비스</dt><dd>${escapeHtml(remainingLabels)}</dd></div>
      </dl>
      <div class="button-row">
        ${surveyUrl
          ? `<a class="button button-primary" href="${escapeHtml(surveyUrl)}" target="_blank" rel="noreferrer">구글 설문지로 이동</a>`
          : '<span class="muted">아직 완료하지 않은 서비스가 있습니다.</span>'}
      </div>
    </section>
  `;
}

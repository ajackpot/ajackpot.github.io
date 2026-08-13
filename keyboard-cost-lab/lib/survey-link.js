import { serviceRegistry } from '../data/service-registry.js';
import { surveyManifest, surveyPrefillParams } from '../data/survey-config.js';
import { getExpectedServiceTaskCount, getServiceCompletedTaskCount } from './experiment-store.js';
import {
  CONDITION_PAGE_TYPE_LABELS,
  escapeHtml,
  formatSeconds,
  getConditionIdForComparisonLabel,
  normalizeComparisonAssignment,
} from './utils.js';

const SURVEY_SERVICE_IDS = surveyManifest.services.map((service) => service.id);
const COMPARISON_LABELS = ['A', 'B'];

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

  const completedTaskCount = rows.reduce((sum, row) => sum + row.completedTaskCount, 0);
  const expectedTaskCount = rows.reduce((sum, row) => sum + row.expectedTaskCount, 0);

  return {
    services: rows,
    completedServices: rows.filter((row) => row.completed),
    remainingServices: rows.filter((row) => !row.completed),
    allComplete: rows.every((row) => row.completed),
    completedCount: rows.filter((row) => row.completed).length,
    totalCount: rows.length,
    completedTaskCount,
    expectedTaskCount,
    hasAnyProgress: completedTaskCount > 0 || rows.some((row) => row.completed),
  };
}

export function getSurveyTransferPanelCopy(progress) {
  const totalCount = Number(progress?.totalCount ?? 0);
  const remainingCount = Number(progress?.remainingServices?.length ?? totalCount);

  if (progress?.allComplete) {
    return {
      eyebrow: '테스트 완료',
      heading: '설문 작성하기',
      description: `${totalCount}개 서비스의 테스트를 모두 마쳤습니다. 수행 기록이 입력된 설문지로 이동해 응답해 주세요.`,
      waitingMessage: '',
    };
  }

  if (progress?.hasAnyProgress) {
    return {
      eyebrow: '테스트 진행 중',
      heading: '테스트 진행 상태',
      description: `${remainingCount}개 서비스의 남은 과업을 마치면 설문지로 이동할 수 있습니다.`,
      waitingMessage: `${remainingCount}개 서비스의 남은 과업을 마치면 설문 작성 버튼이 나타납니다.`,
    };
  }

  return {
    eyebrow: '테스트 준비',
    heading: '테스트 진행 상태',
    description: `아래에서 테스트할 서비스를 골라 주세요. ${totalCount}개 서비스의 테스트를 모두 마치면 설문지로 이동할 수 있습니다.`,
    waitingMessage: `${totalCount}개 서비스의 테스트를 모두 마치면 설문 작성 버튼이 나타납니다.`,
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
  const status = result.success ? '완료' : '완료하지 못함';
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

export function formatServiceConditionRecord(record, service, conditionId, comparisonLabel = '') {
  const taskResults = Array.isArray(record?.actualRuns?.[conditionId]) ? record.actualRuns[conditionId] : [];
  if (!record || taskResults.length === 0) return '';

  const totals = getConditionTotals(record, conditionId);
  const summaryParts = [
    `합계: 수행 시간 ${formatSeconds(asNumber(totals.durationSeconds))}`,
    `키 입력 ${formatCount(totals.totalKeyInputs)}`,
    `초점 이동 ${formatCount(totals.focusChanges)}`,
    `목표와 다른 선택 ${formatCount(totals.wrongSelections)}`,
    `위치 다시 찾기 ${formatCount(totals.contextResets)}`,
    formatOptionalMetric('대화상자 밖 초점 이탈', totals.modalEscapes),
    `완료한 과업 ${formatCount(totals.successCount, '개')}`,
    `완료하지 못한 과업 ${formatCount(totals.incompleteCount, '개')}`,
  ].filter(Boolean);

  const pageType = CONDITION_PAGE_TYPE_LABELS[conditionId] ?? conditionId;
  const taskLines = taskResults.map(formatTaskLine);
  return [
    comparisonLabel ? `비교안: ${comparisonLabel}` : '',
    `페이지 유형: ${pageType}`,
    summaryParts.join(', '),
    `과업별: ${taskLines.join(' / ')}`,
  ].filter(Boolean).join('\n');
}

export function buildStudySurveyAnswers(store, services = serviceRegistry) {
  const progress = getStudySurveyProgress(store, services);
  const answers = {};

  for (const service of progress.services) {
    if (!service.record) continue;
    const assignment = normalizeComparisonAssignment(service.record.comparisonAssignment);
    for (const comparisonLabel of COMPARISON_LABELS) {
      const conditionId = getConditionIdForComparisonLabel(assignment, comparisonLabel);
      if (!conditionId) continue;
      const key = `service.${service.id}.actual${comparisonLabel}`;
      const param = surveyPrefillParams[key];
      const value = formatServiceConditionRecord(service.record, service, conditionId, comparisonLabel);
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
  const copy = getSurveyTransferPanelCopy(progress);
  const completedLabels = progress.completedServices.map((service) => service.label).join(', ') || '아직 없음';
  const remainingLabels = progress.remainingServices.map((service) => service.label).join(', ') || '없음';
  const statusLabel = `${progress.totalCount}개 중 ${progress.completedCount}개 서비스 완료`;

  return `
    <section class="card survey-transfer-card">
      <div class="service-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2>${escapeHtml(copy.heading)}</h2>
        </div>
        <span class="pill ${progress.allComplete ? 'pill-success' : ''}">${escapeHtml(statusLabel)}</span>
      </div>
      <p class="muted">${escapeHtml(copy.description)}</p>
      <dl class="meta-list compact service-progress-list">
        <div><dt>완료한 서비스</dt><dd>${escapeHtml(completedLabels)}</dd></div>
        <div><dt>남은 서비스</dt><dd>${escapeHtml(remainingLabels)}</dd></div>
      </dl>
      <div class="button-row">
        ${surveyUrl
          ? `<a class="button button-primary" href="${escapeHtml(surveyUrl)}" target="_blank" rel="noreferrer">설문 작성하기(새 탭)</a>`
          : `<span class="muted">${escapeHtml(copy.waitingMessage)}</span>`}
      </div>
    </section>
  `;
}

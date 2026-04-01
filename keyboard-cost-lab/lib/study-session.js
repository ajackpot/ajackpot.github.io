
import { escapeHtml } from './utils.js';
import { surveyConfig, getServiceSurveyItems, getSurveyItem } from '../data/survey-config.js';

const STUDY_PROGRESS_STORAGE_PREFIX = 'keyboard-cost-lab-study-progress';

function getStudyStorageKey(sessionId) {
  return `${STUDY_PROGRESS_STORAGE_PREFIX}:${sessionId}`;
}

function createEmptyStudyState(sessionId) {
  return {
    version: 1,
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedServicesOrder: [],
    services: {},
  };
}

function normalizeStudyState(sessionId, state) {
  if (!state || typeof state !== 'object') {
    return createEmptyStudyState(sessionId);
  }

  const completedServicesOrder = Array.isArray(state.completedServicesOrder)
    ? state.completedServicesOrder.filter((serviceId, index, array) => typeof serviceId === 'string' && array.indexOf(serviceId) === index)
    : [];

  const services = state.services && typeof state.services === 'object' ? state.services : {};

  return {
    version: 1,
    sessionId,
    createdAt: state.createdAt || new Date().toISOString(),
    updatedAt: state.updatedAt || new Date().toISOString(),
    completedServicesOrder,
    services,
  };
}

export function readStudyState(sessionId) {
  if (!sessionId) return createEmptyStudyState('');
  const raw = window.localStorage.getItem(getStudyStorageKey(sessionId));
  if (!raw) return createEmptyStudyState(sessionId);

  try {
    return normalizeStudyState(sessionId, JSON.parse(raw));
  } catch {
    return createEmptyStudyState(sessionId);
  }
}

function writeStudyState(state) {
  const normalized = normalizeStudyState(state.sessionId, state);
  normalized.updatedAt = new Date().toISOString();
  window.localStorage.setItem(getStudyStorageKey(normalized.sessionId), JSON.stringify(normalized));
  return normalized;
}

export function clearStudyState(sessionId) {
  if (!sessionId) return;
  window.localStorage.removeItem(getStudyStorageKey(sessionId));
}

export function getStudyServiceRecord({ sessionId, serviceId }) {

  const state = readStudyState(sessionId);
  return state.services?.[serviceId] ?? null;
}

export function getStudyProgress({ sessionId, serviceIds = surveyConfig.serviceIds } = {}) {
  const state = readStudyState(sessionId);
  const completedIds = serviceIds.filter((serviceId) => Boolean(state.services?.[serviceId]?.surveyAnswers));
  const pendingIds = serviceIds.filter((serviceId) => !completedIds.includes(serviceId));

  return {
    state,
    totalCount: serviceIds.length,
    completedCount: completedIds.length,
    pendingCount: pendingIds.length,
    completedIds,
    pendingIds,
    isComplete: serviceIds.length > 0 && pendingIds.length === 0,
  };
}

function serializeConditionOrder(order) {
  if (!Array.isArray(order) || order.length === 0) return '';
  return order
    .map((variantId) => {
      if (variantId === 'variantA') return 'A';
      if (variantId === 'variantB') return 'B';
      return String(variantId);
    })
    .join('→');
}

function normalizeActualRecord(record) {
  if (!record || typeof record !== 'object') return {};
  const preferredOrder = [
    'durationSeconds',
    'hiddenDurationSeconds',
    'totalKeyInputs',
    'focusChanges',
    'wrongSelections',
    'contextResets',
    'modalEscapes',
    'backtrackInputs',
    'pointerActivations',
    'bookingCancels',
  ];

  const normalized = {};
  for (const key of preferredOrder) {
    if (typeof record[key] === 'number' && Number.isFinite(record[key])) {
      normalized[key] = Number(record[key].toFixed(1));
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (preferredOrder.includes(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = Number(value.toFixed(1));
    }
  }

  return normalized;
}

function readServiceSurveyAnswers(formElement, serviceId) {
  if (!(formElement instanceof HTMLFormElement)) {
    return {};
  }

  const answers = {};
  const formData = new FormData(formElement);
  for (const item of getServiceSurveyItems(serviceId)) {
    const value = formData.get(item.key);
    if (typeof value === 'string' && value) {
      answers[item.key] = value;
    }
  }
  return answers;
}

export function saveCompletedServiceRecord({
  sessionId,
  serviceId,
  serviceLabel,
  order,
  actualA,
  actualB,
  formElement,
}) {
  const state = readStudyState(sessionId);
  const surveyAnswers = readServiceSurveyAnswers(formElement, serviceId);
  const existing = state.services?.[serviceId] ?? null;

  state.services[serviceId] = {
    ...(existing ?? {}),
    serviceId,
    serviceLabel,
    savedAt: new Date().toISOString(),
    order: Array.isArray(order) ? [...order] : [],
    orderLabel: serializeConditionOrder(order),
    actualA: normalizeActualRecord(actualA),
    actualB: normalizeActualRecord(actualB),
    surveyAnswers,
  };

  if (!state.completedServicesOrder.includes(serviceId)) {
    state.completedServicesOrder.push(serviceId);
  }

  return writeStudyState(state);
}

function appendPrefillValue(searchParams, key, value) {
  const item = getSurveyItem(key);
  if (!item || value === undefined || value === null || value === '') return;

  if (Array.isArray(value)) {
    value.forEach((entryValue) => {
      if (entryValue !== undefined && entryValue !== null && entryValue !== '') {
        searchParams.append(item.prefillParam, String(entryValue));
      }
    });
    return;
  }

  searchParams.set(item.prefillParam, String(value));
}

export function buildStudySurveyUrl({ sessionId } = {}) {
  const state = readStudyState(sessionId);
  const url = new URL(surveyConfig.responseUrl);
  url.searchParams.set('usp', 'pp_url');

  appendPrefillValue(url.searchParams, 'meta.sessionId', sessionId);
  appendPrefillValue(url.searchParams, 'meta.studyVersion', surveyConfig.studyVersion);
  appendPrefillValue(
    url.searchParams,
    'meta.completedServicesOrder',
    state.completedServicesOrder.join(',')
  );

  for (const serviceId of surveyConfig.serviceIds) {
    const record = state.services?.[serviceId];
    if (!record) continue;

    for (const [key, value] of Object.entries(record.surveyAnswers ?? {})) {
      appendPrefillValue(url.searchParams, key, value);
    }

    appendPrefillValue(url.searchParams, `service.${serviceId}.order`, record.orderLabel);
    appendPrefillValue(url.searchParams, `service.${serviceId}.actualA`, JSON.stringify(record.actualA ?? {}));
    appendPrefillValue(url.searchParams, `service.${serviceId}.actualB`, JSON.stringify(record.actualB ?? {}));
  }

  return url.toString();
}

function renderRadioQuestion({ item, checkedValue }) {
  return `
    <fieldset class="survey-fieldset">
      <legend>${escapeHtml(item.title)}</legend>
      <p class="muted">${escapeHtml(item.helpText || '')}</p>
      <div class="survey-choice-list">
        ${item.choices.map((choice, index) => `
          <label class="choice-option">
            <input
              type="radio"
              name="${escapeHtml(item.key)}"
              value="${escapeHtml(choice)}"
              ${checkedValue === choice ? 'checked' : ''}
              ${index === 0 ? 'required' : ''}
            >
            <span>${escapeHtml(choice)}</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
  `;
}

export function renderStudyServiceCompletionCard({ sessionId, serviceId, serviceLabel }) {
  const record = getStudyServiceRecord({ sessionId, serviceId });
  const progress = getStudyProgress({ sessionId });
  const remainingAfterSave = progress.pendingIds.filter((id) => id !== serviceId).length;
  const savedNotice = record
    ? '이 서비스 평가는 이미 저장되어 있습니다. 다시 저장하면 이전 값이 새 값으로 바뀝니다.'
    : '이 서비스 평가는 아직 저장되지 않았습니다. 답을 고른 뒤 저장하십시오.';

  return `
    <section class="card study-save-card">
      <h2 id="service-evaluation-heading">이 서비스 평가 저장</h2>
      <p>
        지금 막 끝낸 ${escapeHtml(serviceLabel)} 화면을 떠올리며 답하십시오.
        저장하면 서비스 선택 화면으로 돌아가고, 남은 서비스와 마지막 설문지 버튼을 확인할 수 있습니다.
      </p>
      <div class="status-box" role="status" aria-live="polite">
        ${escapeHtml(savedNotice)}
        ${remainingAfterSave > 0 ? ` 저장 후 남은 서비스는 ${remainingAfterSave}개입니다.` : ' 저장 후에는 마지막 설문지 버튼이 열립니다.'}
      </div>
      <form class="service-evaluation-form" data-service-survey-form data-service-id="${escapeHtml(serviceId)}">
        ${getServiceSurveyItems(serviceId).map((item) => renderRadioQuestion({ item, checkedValue: record?.surveyAnswers?.[item.key] ?? '' })).join('')}
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="save-service-evaluation">이 서비스 평가 저장하고 돌아가기</button>
          <button class="button button-secondary" type="button" data-action="go-home">서비스 선택으로 돌아가기</button>
        </div>
      </form>
    </section>
  `;
}

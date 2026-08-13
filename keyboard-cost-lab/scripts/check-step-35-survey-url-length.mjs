import { benchmarkResultsCalendar } from '../data/benchmark-results-calendar.js';
import { benchmarkResultsComments } from '../data/benchmark-results-comments.js';
import { benchmarkResultsSearch } from '../data/benchmark-results-search.js';
import {
  buildStudySurveyAnswers,
  buildStudySurveyUrl,
  formatServiceConditionRecord,
} from '../lib/survey-link.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

function createTaskResult(durationSeconds, success = true) {
  return {
    durationSeconds,
    hiddenDurationSeconds: 0,
    totalKeyInputs: 121,
    focusChanges: 118,
    wrongSelections: 1,
    contextResets: 2,
    modalEscapes: 0,
    pointerActivations: 0,
    success,
  };
}

function createServiceRecord(serviceId, benchmarkSummary, comparisonAssignment) {
  return {
    serviceId,
    serviceLabel: serviceId,
    taskCount: 2,
    conditionCount: 2,
    status: 'completed',
    comparisonAssignment,
    actualRuns: {
      variantA: [createTaskResult(61.4), createTaskResult(58.7, false)],
      variantB: [createTaskResult(24.2), createTaskResult(23.6)],
    },
    actualTotals: {
      variantA: {
        durationSeconds: 120.1,
        totalKeyInputs: 242,
        focusChanges: 236,
        wrongSelections: 2,
        contextResets: 4,
        modalEscapes: 0,
        successCount: 1,
        incompleteCount: 1,
      },
      variantB: {
        durationSeconds: 47.8,
        totalKeyInputs: 242,
        focusChanges: 236,
        wrongSelections: 2,
        contextResets: 4,
        modalEscapes: 0,
        successCount: 2,
        incompleteCount: 0,
      },
    },
    benchmarkSummary,
  };
}

const comparisonAssignment = { variantA: 'B', variantB: 'A' };
const store = {
  version: 1,
  services: {
    calendar: createServiceRecord('calendar', benchmarkResultsCalendar.overall, comparisonAssignment),
    comments: createServiceRecord('comments', benchmarkResultsComments.overall, comparisonAssignment),
    search: createServiceRecord('search', benchmarkResultsSearch.overall, comparisonAssignment),
  },
};

const sampleRecord = formatServiceConditionRecord(
  store.services.calendar,
  { id: 'calendar', label: '예약 캘린더' },
  'variantB',
  'A',
);
assert(sampleRecord.includes('비교안: A'), '설문 수행 기록에 비교안 문자를 유지함');
assert(sampleRecord.includes('페이지 유형: 조작 부담이 개선된 페이지'), '설문 수행 기록에 페이지 유형을 유지함');
assert(sampleRecord.includes('합계: 수행 시간'), '설문 수행 기록에 실제 합계를 유지함');
assert(sampleRecord.includes('과업별:'), '설문 수행 기록에 과업별 실제 기록을 유지함');
assert(!sampleRecord.includes('사전 예상 시간과 실제 시간의 차이'), '설문 수행 기록에서 예상·실제 시간 차이 제목을 제거함');
assert(!sampleRecord.includes('키보드 사용자: 예상'), '설문 수행 기록에서 프로필별 예상 시간 문장을 제거함');
assert(!sampleRecord.includes('화면낭독기 사용자: 예상'), '설문 수행 기록에서 화면낭독 예상 시간 문장을 제거함');
assert(!sampleRecord.includes('스위치 사용자: 예상'), '설문 수행 기록에서 스위치 예상 시간 문장을 제거함');

const answers = buildStudySurveyAnswers(store);
assert(Object.keys(answers).length === 6, '세 서비스의 A/B 자동 응답 6개를 모두 생성함');
for (const [key, value] of Object.entries(answers)) {
  assert(!value.includes('사전 예상 시간과 실제 시간의 차이'), `${key}: 예상·실제 시간 차이를 전송하지 않음`);
  assert(value.includes('페이지 유형:'), `${key}: 페이지 유형을 전송함`);
  assert(value.includes('과업별:'), `${key}: 과업별 실제 기록을 전송함`);
}

const surveyUrl = buildStudySurveyUrl(store);
assert(surveyUrl.length < 8000, `대표적인 최대 기록에서도 설문 URL이 8,000자보다 짧음 (${surveyUrl.length}자)`);
const decodedUrl = decodeURIComponent(surveyUrl).replaceAll('+', ' ');
assert(!decodedUrl.includes('사전 예상 시간과 실제 시간의 차이'), '완성된 URL에도 예상·실제 시간 차이 문구가 없음');
assert(!decodedUrl.includes('예상보다'), '완성된 URL에도 차이 해석 문구가 없음');
assert(decodedUrl.includes('페이지 유형:'), '완성된 URL에 A/B 페이지 유형은 남아 있음');

if (failed) process.exit(1);

import { readFileSync } from 'node:fs';
import { commentsScenario } from '../data/comments-scenario.js';
import { commentsTasks } from '../data/tasks-comments.js';
import { benchmarkResultsCalendar } from '../data/benchmark-results-calendar.js';
import { benchmarkResultsComments } from '../data/benchmark-results-comments.js';
import { benchmarkResultsSearch } from '../data/benchmark-results-search.js';
import { buildStudySurveyAnswers, buildStudySurveyUrl } from '../lib/survey-link.js';
import { buildExportPayload } from '../lib/service-shell.js';
import {
  CONDITION_PAGE_TYPE_LABELS,
  getComparisonLabel,
  getConditionIdForComparisonLabel,
  normalizeComparisonAssignment,
} from '../lib/utils.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

function getFunctionBody(source, functionName) {
  const signature = new RegExp(`function\\s+${functionName}\\([^)]*\\)\\s*\\{`);
  const match = signature.exec(source);
  if (!match) return '';
  const open = match.index + match[0].length - 1;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return '';
}

const fixed = normalizeComparisonAssignment({ variantA: 'A', variantB: 'B' });
const reversed = normalizeComparisonAssignment({ variantA: 'B', variantB: 'A' });
assert(getComparisonLabel(fixed, 'variantA') === 'A', '기본 배정에서 문제 구조가 비교안 A로 연결됨');
assert(getComparisonLabel(reversed, 'variantB') === 'A', '역배정에서 개선 구조가 비교안 A로 연결됨');
assert(getConditionIdForComparisonLabel(reversed, 'B') === 'variantA', '역배정에서 비교안 B가 문제 구조로 역조회됨');
assert(CONDITION_PAGE_TYPE_LABELS.variantA === '조작 부담 문제가 있는 페이지', '문제 구조의 페이지 유형 문구가 명확함');
assert(CONDITION_PAGE_TYPE_LABELS.variantB === '조작 부담이 개선된 페이지', '개선 구조의 페이지 유형 문구가 명확함');

const task2 = commentsTasks.find((task) => task.id === 'task-2-popular-admin-detail-helpful');
assert(Boolean(task2), '댓글 목록 과업 2가 존재함');
assert(task2?.goalSummary.includes('3월 25일에 작성된 운영자 안내 댓글'), '댓글 목록 과업 2가 날짜로 목표 댓글을 구분함');
assert(!Object.hasOwn(task2 ?? {}, 'requiredCategory'), '댓글 목록 과업 2 성공 판정이 댓글 범위와 무관함');
assert(task2?.targetCommentId === 'comment-admin', '댓글 목록 과업 2 목표가 3월 25일 운영자 안내 댓글임');
const adminNotices = commentsScenario.comments.filter((comment) => comment.badge === '운영자 안내');
const targetAdminNotice = commentsScenario.comments.find((comment) => comment.id === task2?.targetCommentId);
assert(adminNotices.length >= 3, '동일한 운영자 안내 댓글이 여러 개 있어 날짜 구분 검사가 의미가 있음');
assert(targetAdminNotice?.timeLabel.startsWith('3월 25일'), '과업 2 목표 ID가 실제 3월 25일 댓글을 가리킴');

const sources = {
  calendar: readFileSync(new URL('../app.js', import.meta.url), 'utf8'),
  comments: readFileSync(new URL('../comments-app.js', import.meta.url), 'utf8'),
  search: readFileSync(new URL('../search-app.js', import.meta.url), 'utf8'),
};

for (const [service, source] of Object.entries(sources)) {
  assert(source.includes('comparisonAssignment: getRandomComparisonAssignment()'), `${service}: 비교안 A/B 배정을 서비스 시작 상태에 저장함`);
  assert(source.includes('comparisonAssignment: state.comparisonAssignment'), `${service}: 배정표를 저장 기록과 결과 파일에 전달함`);
  assert(source.includes("getConditionIdForComparisonLabel(state.comparisonAssignment, 'A')"), `${service}: 최종 비교안 A를 실제 배정표로 역조회함`);
  assert(source.includes("getConditionIdForComparisonLabel(state.comparisonAssignment, 'B')"), `${service}: 최종 비교안 B를 실제 배정표로 역조회함`);
  assert(source.includes('다른 서비스 테스트 시작하기'), `${service}: 최종 화면에 다른 서비스 시작 버튼이 있음`);
  assert(!source.includes("title: '비교안 A · 조작 부담이 큰 구조'"), `${service}: 구조 ID에 비교안 A 제목을 고정하지 않음`);
  assert(!source.includes("title: '비교안 B · 개선 구조'"), `${service}: 구조 ID에 비교안 B 제목을 고정하지 않음`);
}

const calendarNavBody = getFunctionBody(sources.calendar, 'handleGridNavigation');
assert(calendarNavBody.includes('nextButton.focus()'), '예약 시간표 방향키 이동이 기존 그리드 안에서 초점만 옮김');
assert(calendarNavBody.includes('nextButton.tabIndex = 0'), '예약 시간표가 로빙 tabindex를 갱신함');
assert(!calendarNavBody.includes('render();'), '예약 시간표 방향키 이동이 그리드 전체를 다시 그리지 않음');

const commentNavBody = getFunctionBody(sources.comments, 'handleCommentOptionNavigation');
const commentSyncBody = getFunctionBody(sources.comments, 'syncSelectedCommentUi');
assert(commentNavBody.includes('syncSelectedCommentUi'), '댓글 방향키 이동이 안정된 목록 DOM 갱신 함수를 사용함');
assert(!commentNavBody.includes('render();'), '댓글 방향키 이동이 목록 전체를 다시 그리지 않음');
assert(commentSyncBody.includes("option.setAttribute('aria-selected'"), '댓글 목록의 선택 상태를 제자리에서 갱신함');
assert(commentSyncBody.includes('target.focus()'), '댓글 목록에서 다음 항목으로 직접 초점을 옮김');

const searchNavBody = getFunctionBody(sources.search, 'handleResultOptionNavigation');
const searchSyncBody = getFunctionBody(sources.search, 'syncSelectedResultUi');
assert(searchNavBody.includes('syncSelectedResultUi'), '검색 결과 방향키 이동이 안정된 목록 DOM 갱신 함수를 사용함');
assert(!searchNavBody.includes('render();'), '검색 결과 방향키 이동이 목록 전체를 다시 그리지 않음');
assert(searchSyncBody.includes("option.setAttribute('aria-selected'"), '검색 결과 목록의 선택 상태를 제자리에서 갱신함');
assert(searchSyncBody.includes('target.focus()'), '검색 결과 목록에서 다음 항목으로 직접 초점을 옮김');

function createTaskResult(durationSeconds, success = true) {
  return {
    durationSeconds,
    hiddenDurationSeconds: 0,
    totalKeyInputs: 20,
    focusChanges: 16,
    backtrackInputs: 2,
    wrongSelections: 1,
    contextResets: 1,
    modalEscapes: 0,
    pointerActivations: 0,
    success,
  };
}

function createServiceRecord(serviceId, benchmarkSummary, comparisonAssignment = reversed) {
  return {
    serviceId,
    serviceLabel: serviceId,
    taskCount: 2,
    conditionCount: 2,
    status: 'completed',
    comparisonAssignment,
    actualRuns: {
      variantA: [createTaskResult(80), createTaskResult(80)],
      variantB: [createTaskResult(25), createTaskResult(25)],
    },
    actualTotals: {
      variantA: { durationSeconds: 160, totalKeyInputs: 40, focusChanges: 32, wrongSelections: 2, contextResets: 2, modalEscapes: 0, successCount: 2, incompleteCount: 0 },
      variantB: { durationSeconds: 50, totalKeyInputs: 40, focusChanges: 32, wrongSelections: 2, contextResets: 2, modalEscapes: 0, successCount: 2, incompleteCount: 0 },
    },
    benchmarkSummary,
  };
}

const store = {
  version: 1,
  services: {
    calendar: createServiceRecord('calendar', benchmarkResultsCalendar.overall),
    comments: createServiceRecord('comments', benchmarkResultsComments.overall),
    search: createServiceRecord('search', benchmarkResultsSearch.overall),
  },
};
const answers = buildStudySurveyAnswers(store);
const calendarA = answers['service.calendar.actualA'] ?? '';
const calendarB = answers['service.calendar.actualB'] ?? '';
assert(calendarA.includes('페이지 유형: 조작 부담이 개선된 페이지'), '역배정 시 설문 비교안 A에 개선 페이지 유형을 기록함');
assert(calendarA.includes('키보드 사용자: 예상 56.7초, 실제 50.0초, 예상보다 6.7초 짧게 걸림'), '설문 비교안 A에 개선 구조의 예상 시간과 실제 차이를 기록함');
assert(calendarB.includes('페이지 유형: 조작 부담 문제가 있는 페이지'), '역배정 시 설문 비교안 B에 문제 페이지 유형을 기록함');
assert(calendarB.includes('키보드 사용자: 예상 130.7초, 실제 160.0초, 예상보다 29.3초 오래 걸림'), '설문 비교안 B에 문제 구조의 예상 시간과 실제 차이를 기록함');
const surveyUrl = buildStudySurveyUrl(store);
assert(surveyUrl.includes('entry.384462370='), '설문 URL에 예약 캘린더 비교안 A 수행 기록이 포함됨');
assert(surveyUrl.includes('entry.1394688977='), '설문 URL에 예약 캘린더 비교안 B 수행 기록이 포함됨');
assert(surveyUrl.length < 20000, `모든 서비스 수행 기록을 포함한 설문 URL 길이가 과도하지 않음 (${surveyUrl.length}자)`);
assert(!surveyUrl.includes('session-example'), '설문 URL에 세션 식별값을 전달하지 않음');

const exportPayload = buildExportPayload({
  serviceId: 'calendar',
  sessionId: 'session-example',
  order: ['variantA', 'variantB'],
  comparisonAssignment: reversed,
  measurementRules: {},
  actualRuns: store.services.calendar.actualRuns,
  benchmarkResults: benchmarkResultsCalendar,
  storedServices: store.services,
});
assert(exportPayload.comparisonOrder.join('→') === 'B→A', '결과 파일의 수행 순서가 실제 A/B 배정표를 따름');
assert(exportPayload.comparisonPageTypes.A === '조작 부담이 개선된 페이지', '결과 파일에서 비교안 A의 페이지 유형을 역배정대로 기록함');
assert(exportPayload.comparisonPageTypes.B === '조작 부담 문제가 있는 페이지', '결과 파일에서 비교안 B의 페이지 유형을 역배정대로 기록함');
assert(exportPayload.actualByComparison.A[0]?.durationSeconds === 25, '결과 파일의 비교안 A 실제 기록이 개선 구조 실행값과 연결됨');
assert(exportPayload.actualByComparison.B[0]?.durationSeconds === 80, '결과 파일의 비교안 B 실제 기록이 문제 구조 실행값과 연결됨');

for (const name of ['calendar', 'comments', 'search']) {
  const graph = readFileSync(new URL(`../data/benchmark-graphs-${name}.js`, import.meta.url), 'utf8');
  assert(graph.includes("label: '조작 부담 문제가 있는 페이지'"), `${name}: 벤치마크 내부 문제 구조 라벨이 비교안 문자와 분리됨`);
  assert(graph.includes("label: '조작 부담이 개선된 페이지'"), `${name}: 벤치마크 내부 개선 구조 라벨이 비교안 문자와 분리됨`);
}

if (failed) process.exit(1);

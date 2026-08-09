import { readFileSync } from 'node:fs';
import {
  buildServiceResumePlan,
  clearStoredServiceProgress,
  findNextIncompleteTaskPosition,
  formatServiceProgressSummary,
  getServiceProgress,
  writeStoredExperimentResults,
} from '../lib/experiment-store.js';
import { renderServiceIntroActions } from '../lib/service-shell.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

function taskResult(id) {
  return {
    taskId: id,
    durationSeconds: 10,
    success: true,
  };
}

const partialRecord = {
  serviceId: 'calendar',
  serviceLabel: '예약 캘린더',
  order: ['variantB', 'variantA'],
  comparisonAssignment: { variantA: 'B', variantB: 'A' },
  taskCount: 2,
  conditionCount: 2,
  actualRuns: {
    variantA: [taskResult('a-1')],
    variantB: [taskResult('b-1'), taskResult('b-2')],
  },
  runtimeSnapshots: {
    variantA: { booking: null },
    variantB: { booking: { slotId: 'slot-1' } },
  },
};

const partialPlan = buildServiceResumePlan(partialRecord, { taskCount: 2, conditionCount: 2 });
assert(partialPlan?.completedTaskCount === 3, '부분 기록에서 완료한 과업 수를 3개로 계산함');
assert(partialPlan?.expectedTaskCount === 4, '서비스 전체 수행 단위를 4개로 계산함');
assert(partialPlan?.completionPercent === 75, '부분 기록의 진척률을 75%로 계산함');
assert(partialPlan?.order.join(',') === 'variantB,variantA', '저장된 비교안 수행 순서를 그대로 복원함');
assert(partialPlan?.comparisonAssignment.variantA === 'B', '저장된 무작위 A/B 배정표를 그대로 복원함');
assert(partialPlan?.nextConditionId === 'variantA', '완료하지 않은 다음 비교안을 찾음');
assert(partialPlan?.nextConditionIndex === 1, '다음 비교안의 수행 순서 인덱스를 찾음');
assert(partialPlan?.nextTaskIndex === 1, '완료한 과업을 건너뛰고 다음 과업 인덱스를 찾음');
assert(partialPlan?.runtimeSnapshots.variantB.booking.slotId === 'slot-1', '서비스 실행 상태 스냅샷을 재개 계획에 보존함');
assert(formatServiceProgressSummary(partialPlan) === '4개 중 3개 완료(75%)', '홈 진척률 문구가 요청 형식과 일치함');

const completedRecord = {
  ...partialRecord,
  actualRuns: {
    variantA: [taskResult('a-1'), taskResult('a-2')],
    variantB: [taskResult('b-1'), taskResult('b-2')],
  },
};
const completedPlan = buildServiceResumePlan(completedRecord, { taskCount: 2, conditionCount: 2 });
assert(completedPlan?.isComplete === true, '4개 과업 기록이 있으면 서비스 완료로 판정함');
assert(completedPlan?.nextConditionId === null, '모든 과업 완료 시 다음 과업을 만들지 않음');
assert(formatServiceProgressSummary(completedPlan) === '4개 중 4개 완료(100%)', '완료 진척률을 100%로 표시함');

const gapPosition = findNextIncompleteTaskPosition({
  order: ['variantB', 'variantA'],
  actualRuns: {
    variantA: [taskResult('a-1')],
    variantB: [taskResult('b-1'), taskResult('b-2')],
  },
  taskCount: 2,
  conditionCount: 2,
});
assert(gapPosition?.conditionId === 'variantA' && gapPosition?.taskIndex === 1, '수행 순서를 따라 첫 미완료 과업을 찾음');

const noProgressActions = renderServiceIntroActions({ completedTaskCount: 0, expectedTaskCount: 4 });
const partialActions = renderServiceIntroActions({ completedTaskCount: 1, expectedTaskCount: 4 });
const completedActions = renderServiceIntroActions({ completedTaskCount: 4, expectedTaskCount: 4 });
assert(!noProgressActions.includes('이전에 수행한 과업 건너뛰기'), '수행 기록이 없으면 건너뛰기 버튼을 표시하지 않음');
assert(partialActions.includes('data-action="resume-experiment"'), '부분 기록이 있으면 재개 동작 버튼을 표시함');
assert(partialActions.includes('이전에 수행한 과업 건너뛰기'), '부분 기록 버튼 문구가 요청과 일치함');
assert(!partialActions.includes('최종 결과 화면으로 이동'), '부분 기록에서는 최종 결과 버튼을 표시하지 않음');
assert(completedActions.includes('data-action="view-saved-final"'), '모든 기록이 있으면 저장된 최종 결과 동작을 표시함');
assert(completedActions.includes('최종 결과 화면으로 이동'), '완료 상태 버튼 문구가 요청과 일치함');
assert(!completedActions.includes('이전에 수행한 과업 건너뛰기'), '완료 상태에서는 건너뛰기 버튼을 최종 결과 버튼으로 대체함');

const memory = new Map();
globalThis.window = {
  localStorage: {
    getItem(key) { return memory.has(key) ? memory.get(key) : null; },
    setItem(key, value) { memory.set(key, String(value)); },
  },
};
writeStoredExperimentResults({
  version: 1,
  updatedAt: '',
  services: {
    calendar: partialRecord,
    comments: {
      ...partialRecord,
      serviceId: 'comments',
      actualRuns: { variantA: [taskResult('comments-a-1')], variantB: [] },
    },
  },
});
const storedProgress = getServiceProgress('calendar', { taskCount: 2, conditionCount: 2 });
assert(storedProgress.completedTaskCount === 3, '브라우저 저장소의 부분 기록을 진행 상태로 읽음');
assert(storedProgress.completionPercent === 75, '브라우저 저장소 진행 상태에 진척률을 포함함');
const currentScopeProgress = getServiceProgress('calendar', { taskCount: 1, conditionCount: 2 });
assert(currentScopeProgress.expectedTaskCount === 2, '현재 서비스의 과업 수가 오래된 저장 기록보다 우선함');
assert(currentScopeProgress.completedTaskCount === 2 && currentScopeProgress.completionPercent === 100, '현재 범위에 맞춰 오래된 초과 기록을 보정함');
clearStoredServiceProgress('calendar');
assert(getServiceProgress('calendar', { taskCount: 2, conditionCount: 2 }).completedTaskCount === 0, '처음부터 다시 시작할 때 해당 서비스의 기존 기록만 지울 수 있음');
assert(getServiceProgress('comments', { taskCount: 2, conditionCount: 2 }).completedTaskCount === 1, '현재 서비스를 초기화해도 다른 서비스의 기록은 유지함');
delete globalThis.window;

const sources = {
  calendar: readFileSync(new URL('../app.js', import.meta.url), 'utf8'),
  comments: readFileSync(new URL('../comments-app.js', import.meta.url), 'utf8'),
  search: readFileSync(new URL('../search-app.js', import.meta.url), 'utf8'),
};
const shellSource = readFileSync(new URL('../lib/service-shell.js', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../lib/experiment-store.js', import.meta.url), 'utf8');

assert(sources.calendar.includes('<dt>진척률</dt>'), '홈 서비스 카드의 진행 정보 이름을 진척률로 표시함');
assert(sources.calendar.includes('formatServiceProgressSummary(progress)'), '홈 서비스 카드가 개수와 백분율을 함께 표시함');
assert(shellSource.includes('이전에 수행한 과업 건너뛰기'), '공통 서비스 소개 화면에 재개 버튼 문구가 있음');
assert(shellSource.includes('최종 결과 화면으로 이동'), '공통 서비스 소개 화면에 최종 결과 버튼 문구가 있음');
assert(storeSource.includes('runtimeSnapshots'), '서비스 저장 기록에 재개용 실행 상태를 보존함');

for (const [service, source] of Object.entries(sources)) {
  assert(source.includes('getServiceResumePlan'), `${service}: 저장 기록에서 재개 계획을 읽음`);
  assert((source.match(/clearStoredServiceProgress\(SERVICE_ID\)/g) ?? []).length >= 2, `${service}: 서비스 소개와 결과 화면에서 다시 시작하면 이전 기록을 초기화함`);
  assert(source.includes('function resumeStoredExperiment()'), `${service}: 서비스 재개 함수를 제공함`);
  assert(source.includes("action === 'resume-experiment' || action === 'view-saved-final'"), `${service}: 두 재개 버튼 동작을 처리함`);
  assert(source.includes("state.view = 'final'"), `${service}: 완료 기록으로 최종 결과 화면을 열 수 있음`);
  assert(source.includes('runtimeSnapshots: {'), `${service}: 과업 저장 시 실행 상태 스냅샷을 함께 저장함`);
  assert(source.includes('findNextIncompleteTaskPosition({'), `${service}: 완료 뒤에도 다음 미완료 과업을 계산함`);
}

assert(sources.comments.includes('renderSharedServiceIntroActions(getSavedServiceProgress())'), '댓글 서비스 소개 화면이 저장 진척도에 맞는 버튼을 렌더링함');
assert(sources.search.includes('renderSharedServiceIntroActions(getSavedServiceProgress())'), '검색 서비스 소개 화면이 저장 진척도에 맞는 버튼을 렌더링함');
assert(sources.calendar.includes('savedProgress: getSavedServiceProgress()'), '예약 서비스 소개 화면이 저장 진척도를 공통 렌더러에 전달함');
assert(sources.search.includes('previewQuestionAssignmentsAfterTask'), '검색 서비스가 재개 후 무작위 미리보기 정답을 보존함');

if (failed) process.exit(1);

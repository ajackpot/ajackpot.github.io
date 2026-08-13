import { readFileSync } from 'node:fs';
import { benchmarkResultsComments } from '../data/benchmark-results-comments.js';
import { commentsBenchmarkGraphs } from '../data/benchmark-graphs-comments.js';
import {
  getStudySurveyProgress,
  getSurveyTransferPanelCopy,
  renderSurveyTransferPanel,
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

function taskResult(id) {
  return { taskId: id, durationSeconds: 10, success: true };
}

function serviceRecord(serviceId, completedTaskCount) {
  const variantACount = Math.min(2, completedTaskCount);
  const variantBCount = Math.max(0, Math.min(2, completedTaskCount - 2));
  return {
    serviceId,
    taskCount: 2,
    conditionCount: 2,
    actualRuns: {
      variantA: Array.from({ length: variantACount }, (_, index) => taskResult(`${serviceId}-a-${index + 1}`)),
      variantB: Array.from({ length: variantBCount }, (_, index) => taskResult(`${serviceId}-b-${index + 1}`)),
    },
  };
}

const commentsSource = readFileSync(new URL('../comments-app.js', import.meta.url), 'utf8');
const skipRenderIndex = commentsSource.indexOf('renderCommentsMainSkipLink()');
const headerRenderIndex = commentsSource.indexOf('renderCommentsHeader(conditionId)');
assert(skipRenderIndex >= 0 && skipRenderIndex < headerRenderIndex, '댓글 수행 페이지에서 본문 바로가기 링크를 글로벌 메뉴보다 먼저 렌더링함');
assert(commentsSource.includes('href="#filters-heading" data-action="jump-main">본문 바로가기</a>'), '두 비교안 공통 본문 바로가기 링크가 정렬과 범위 선택 영역을 가리킴');
assert(commentsSource.includes("focusElementNow('#filters-heading')"), '본문 바로가기 실행 시 본문 시작 제목으로 초점을 옮김');
assert(commentsSource.includes('<h2 id="filters-heading" tabindex="-1">정렬과 범위 선택</h2>'), '본문 시작 제목을 프로그래밍 방식으로 초점 이동할 수 있음');

for (const variantId of ['variantA', 'variantB']) {
  for (const [taskId, task] of Object.entries(commentsBenchmarkGraphs[variantId].tasks)) {
    assert(task.steps[0]?.id === 'skip-to-main', `${variantId} ${taskId}: 본문 바로가기 비용을 첫 진입 단계에 포함함`);
    assert(task.assumptions.some((text) => text.includes('글로벌 메뉴 탐색은 건너뛴다')), `${variantId} ${taskId}: 글로벌 메뉴 제외 가정을 명시함`);
  }
}
assert(!commentsBenchmarkGraphs.variantA.tasks.task1_newest_review_open_replies.steps.some((step) => step.id === 'reach-controls'), '문제 페이지 벤치마크에서 글로벌 메뉴 전체 탐색 단계를 제거함');
assert(benchmarkResultsComments.overall.keyboard.variantAExpectedSeconds === 102, '댓글 문제 페이지의 키보드 예상 시간을 새 바로가기 구조로 다시 계산함');
assert(benchmarkResultsComments.overall.screenReader.variantAExpectedSeconds === 180.5, '댓글 문제 페이지의 화면낭독 예상 시간을 새 바로가기 구조로 다시 계산함');
assert(benchmarkResultsComments.overall.switch.variantAExpectedSeconds === 255.5, '댓글 문제 페이지의 스위치 예상 시간을 새 바로가기 구조로 다시 계산함');
assert(benchmarkResultsComments.overall.keyboard.expectedReductionPercent === 70.4, '공통 글로벌 메뉴 비용을 제외한 뒤 키보드 비교 차이를 다시 계산함');

const emptyStore = { services: {} };
const emptyProgress = getStudySurveyProgress(emptyStore);
const emptyCopy = getSurveyTransferPanelCopy(emptyProgress);
assert(emptyProgress.hasAnyProgress === false, '저장된 과업이 없으면 테스트 시작 전 상태로 판정함');
assert(emptyCopy.eyebrow === '테스트 준비', '시작 전에는 테스트 준비 문구를 표시함');
assert(emptyCopy.heading === '테스트 진행 상태', '시작 전 진행 카드 제목을 테스트 진행 상태로 표시함');

const partialStore = {
  services: {
    calendar: serviceRecord('calendar', 4),
    comments: serviceRecord('comments', 1),
  },
};
const partialProgress = getStudySurveyProgress(partialStore);
const partialCopy = getSurveyTransferPanelCopy(partialProgress);
assert(partialProgress.hasAnyProgress === true && partialProgress.allComplete === false, '일부 과업이 저장되면 테스트 진행 중 상태로 판정함');
assert(partialCopy.eyebrow === '테스트 진행 중', '진행 중에는 테스트 진행 중 문구를 표시함');
assert(partialCopy.heading === '테스트 진행 상태', '진행 중 카드 제목을 테스트 진행 상태로 유지함');
assert(partialCopy.description === '2개 서비스의 남은 과업을 마치면 설문지로 이동할 수 있습니다.', '남은 서비스 수에 맞춰 다음 행동을 안내함');

const oneRemainingStore = {
  services: {
    calendar: serviceRecord('calendar', 4),
    comments: serviceRecord('comments', 4),
    search: serviceRecord('search', 1),
  },
};
const oneRemainingCopy = getSurveyTransferPanelCopy(getStudySurveyProgress(oneRemainingStore));
assert(oneRemainingCopy.description === '1개 서비스의 남은 과업을 마치면 설문지로 이동할 수 있습니다.', '서비스 하나가 남으면 단수에 맞는 구체적 안내를 표시함');

const completeStore = {
  services: {
    calendar: serviceRecord('calendar', 4),
    comments: serviceRecord('comments', 4),
    search: serviceRecord('search', 4),
  },
};
const completeProgress = getStudySurveyProgress(completeStore);
const completeCopy = getSurveyTransferPanelCopy(completeProgress);
assert(completeProgress.allComplete === true, '세 서비스를 모두 마치면 완료 상태로 판정함');
assert(completeCopy.eyebrow === '테스트 완료', '전체 완료 뒤에만 테스트 완료 문구를 표시함');
assert(completeCopy.heading === '설문 작성하기', '전체 완료 뒤 설문 작성 제목을 표시함');

const emptyPanel = renderSurveyTransferPanel({ store: emptyStore });
const partialPanel = renderSurveyTransferPanel({ store: partialStore });
const completePanel = renderSurveyTransferPanel({ store: completeStore });
assert(!emptyPanel.includes('테스트 마무리') && !partialPanel.includes('테스트 마무리'), '완료 전 화면에서 마무리 문구를 노출하지 않음');
assert(!emptyPanel.includes('테스트를 마치고 설문 작성하기') && !partialPanel.includes('테스트를 마치고 설문 작성하기'), '완료 전 화면에서 이미 테스트가 끝난 듯한 제목을 노출하지 않음');
assert(emptyPanel.includes('테스트 준비') && partialPanel.includes('테스트 진행 중'), '준비와 진행 상태를 서로 다르게 렌더링함');
assert(completePanel.includes('설문 작성하기(새 탭)'), '전체 완료 뒤 설문 작성 버튼을 표시함');

if (failed) process.exit(1);

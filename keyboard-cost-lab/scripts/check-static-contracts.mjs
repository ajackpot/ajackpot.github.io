import { readFileSync } from 'node:fs';

const files = {
  calendar: readFileSync('app.js', 'utf8'),
  comments: readFileSync('comments-app.js', 'utf8'),
  search: readFileSync('search-app.js', 'utf8'),
  utils: readFileSync('lib/utils.js', 'utf8'),
  serviceRegistry: readFileSync('data/service-registry.js', 'utf8'),
  serviceShell: readFileSync('lib/service-shell.js', 'utf8'),
  experimentStore: readFileSync('lib/experiment-store.js', 'utf8'),
};

const checks = [];
function assert(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

for (const [service, source] of Object.entries(files).filter(([key]) => ['calendar', 'comments', 'search'].includes(key))) {
  assert(`${service}: 테스트 번호가 화면 문자열에 남아 있지 않음`, !source.includes('테스트 번호'));
  assert(`${service}: 내려받기 파일명에 세션 식별자를 노출하지 않음`, !/download="[^"]*\$\{escapeHtml\(state\.sessionId\)\}/.test(source));
  assert(`${service}: 과업 요청 표시 스위치 상태를 시작 정보에 저장`, source.includes('runnerTaskRequestVisible: Boolean(state.runnerTaskRequestVisible)'));
  assert(`${service}: 과업 수행 페이지에서 선택 시 과업 요청 표시`, source.includes('state.showTaskRequestInRunner ? renderRunnerTaskRequestHtml'));
  assert(`${service}: 준비 화면에 과업 요청 표시 스위치 제공`, source.includes('renderTaskRequestVisibilitySwitchHtml({ checked: state.runnerTaskRequestVisible })'));
}


assert('home: 서비스 카드 반복 안내 문구 제거', !files.calendar.includes('service.points') && !files.serviceRegistry.includes('points:'));
assert('home: 서비스별 진행 상태 표시', files.calendar.includes('getServiceProgress(service.id') && files.calendar.includes('진행 상태'));
assert('store: 서비스 진행 상태 저장소 제공', files.experimentStore.includes('keyboard-cost-lab-results-v1') && files.experimentStore.includes('saveServiceRunSnapshot'));
assert('export: 결과 파일에 전체 서비스 저장값 포함', files.serviceShell.includes('storedServices'));
for (const [service, source] of Object.entries(files).filter(([key]) => ['calendar', 'comments', 'search'].includes(key))) {
  assert(`${service}: 과업 기록을 공통 저장소에 보존`, source.includes('saveServiceRunSnapshot'));
}

assert('utils: 과업 요청 표시 스위치 라벨 제공', files.utils.includes('과업 요청 사항을 수행 페이지에서도 보기'));
assert('utils: 과업 수행 페이지 과업 요청 카드 제공', files.utils.includes('export function renderRunnerTaskRequestHtml'));
assert('calendar: 비교안 B 시간표 클릭 실행 연결', files.calendar.includes('event.target.closest(\'[data-grid-slot="true"]\')'));

assert('calendar: 최종 예약 확인 대화상자 제공', files.calendar.includes("kind: 'booking-final-confirm'") && files.calendar.includes('data-action="dialog-finalize-booking"'));
assert('search: 저장 형식 독립 선택 제거', !files.search.includes("name: 'format'") && !files.search.includes('저장 형식'));
assert('search: 저장 위치 선택지에 파일 내보내기 포함', files.search.includes('PDF 파일로 내보내기') && files.search.includes('텍스트 파일로 내보내기'));
assert('search: 바로가기 링크를 검색 헤더보다 먼저 렌더링', files.search.indexOf('renderTopSkipLinks()') > -1 && files.search.indexOf('renderTopSkipLinks()') < files.search.indexOf('renderSearchHeader(conditionId, run)'));

assert('calendar: 예약 확인 흐름에 공유하기 버튼 제공', files.calendar.includes('data-focus-id="slot-dialog-share"') && files.calendar.includes('data-focus-id="booking-final-share"'));
assert('search: 검색어 입력란 기본값 제거', files.search.includes('query: searchScenario.queryLabel') && readFileSync('data/search-scenario.js', 'utf8').includes("queryLabel: ''"));
assert('search: 미리보기 답변 무작위 배정 상태 보존', files.search.includes('previewQuestionAssignments') && files.search.includes('getCurrentPreviewQuestionCorrectValue'));
assert('search: 미리보기 본문 숫자와 답변 선택지 연동', files.search.includes('getResultPreviewBody') && files.search.includes('PREVIEW_DEADLINE_FACTS'));
assert('comments: 누적 후기 댓글로 목표 댓글이 첫 번째가 되지 않음', files.comments.includes('comment-yeri') || readFileSync('data/comments-scenario.js', 'utf8').includes('comment-yeri'));
assert('search: 누적 자료로 목표 자료가 첫 번째가 되지 않음', readFileSync('data/search-scenario.js', 'utf8').includes('result-previsit-guide') && readFileSync('data/search-scenario.js', 'utf8').includes('result-audio-faq'));

const calendarActionChecks = [
  ['조건 적용', 'data-action="apply-filters"'],
  ['비교안 A 예약 시간 열기', 'data-action="slot-open"'],
  ['예약하기', 'data-action="dialog-confirm-slot"'],
  ['예약 취소 열기', 'data-action="open-cancel-modal"'],
  ['예약 취소 확정', 'data-action="dialog-confirm-cancel"'],
  ['점검 중 안내', 'data-action="site-placeholder"'],
  ['과업 종료', 'data-action="end-task"'],
  ['예약 가능 시간으로 이동', 'data-action="jump-results"'],
];
for (const [name, token] of calendarActionChecks) {
  assert(`calendar: ${name} 동작 지점 존재`, (files.calendar + files.utils).includes(token));
}


assert('comments: 답글 작성자 무작위 배정 상태 보존', files.comments.includes('replyAuthorAssignments'));
assert('comments: 다른 비교안의 정답 이름을 피해서 답글 작성자 배정', files.comments.includes('avoidCorrectValue: getOtherConditionReplyCorrectValue'));
assert('comments: 답변 선택지는 현재 과업 수행 페이지의 답글 작성자 배정 기준 사용', files.comments.includes('getCurrentReplyQuestionOptions(run, task)'));
assert('comments: 최종 성공 판정은 현재 과업 수행 페이지의 배정된 정답 기준 사용', files.comments.includes('getCurrentReplyQuestionCorrectValue(run, task)'));
assert('search: 검색 결과 보조 메뉴를 실제 패널로 표시', files.search.includes('renderSearchFeaturePanel(run)'));
assert('search: 검색 결과 메뉴 점검 중 안내 제거', !files.search.includes('현재 점검 중'));
assert('search: 검색 알림 상태 토글 제공', files.search.includes('toggleSearchAlert'));
assert('search: 보관함과 저장한 자료 패널 제공', files.search.includes("featureId: 'folder'") || files.search.includes('folder: () =>'));

const failures = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} checks failed.`);
  process.exit(1);
}

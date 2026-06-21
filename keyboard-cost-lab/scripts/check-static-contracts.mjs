import { readFileSync } from 'node:fs';

const files = {
  calendar: readFileSync('app.js', 'utf8'),
  comments: readFileSync('comments-app.js', 'utf8'),
  search: readFileSync('search-app.js', 'utf8'),
  utils: readFileSync('lib/utils.js', 'utf8'),
};

const checks = [];
function assert(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

for (const [service, source] of Object.entries(files).filter(([key]) => key !== 'utils')) {
  assert(`${service}: 실험 번호가 화면 문자열에 남아 있지 않음`, !source.includes('실험 번호'));
  assert(`${service}: 내려받기 파일명에 세션 식별자를 노출하지 않음`, !/download="[^"]*\$\{escapeHtml\(state\.sessionId\)\}/.test(source));
  assert(`${service}: 과업 요청 표시 스위치 상태를 시작 정보에 저장`, source.includes('runnerTaskRequestVisible: Boolean(state.runnerTaskRequestVisible)'));
  assert(`${service}: 수행 탭에서 선택 시 과업 요청 표시`, source.includes('state.showTaskRequestInRunner ? renderRunnerTaskRequestHtml'));
  assert(`${service}: 준비 화면에 과업 요청 표시 스위치 제공`, source.includes('renderTaskRequestVisibilitySwitchHtml({ checked: state.runnerTaskRequestVisible })'));
}

assert('utils: 과업 요청 표시 스위치 라벨 제공', files.utils.includes('과업 요청 사항을 수행 탭에서도 보기'));
assert('utils: 수행 탭 과업 요청 카드 제공', files.utils.includes('export function renderRunnerTaskRequestHtml'));
assert('calendar: 비교안 B 시간표 클릭 실행 연결', files.calendar.includes('event.target.closest(\'[data-grid-slot="true"]\')'));

const calendarActionChecks = [
  ['조건 적용', 'data-action="apply-filters"'],
  ['비교안 A 예약 시간 열기', 'data-action="slot-open"'],
  ['예약 확정', 'data-action="dialog-confirm-slot"'],
  ['예약 취소 열기', 'data-action="open-cancel-modal"'],
  ['예약 취소 확정', 'data-action="dialog-confirm-cancel"'],
  ['점검 중 안내', 'data-action="site-placeholder"'],
  ['과업 종료', 'data-action="end-task"'],
  ['예약 가능 시간으로 이동', 'data-action="jump-results"'],
];
for (const [name, token] of calendarActionChecks) {
  assert(`calendar: ${name} 동작 지점 존재`, (files.calendar + files.utils).includes(token));
}

const failures = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} checks failed.`);
  process.exit(1);
}

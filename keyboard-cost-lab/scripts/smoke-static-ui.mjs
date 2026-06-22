import fs from 'node:fs';

const appFiles = ['app.js', 'comments-app.js', 'search-app.js'];
let failed = false;

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const actionValues = new Set([...source.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1]));
  const handledActions = new Set([...source.matchAll(/action === '([^']+)'/g)].map((match) => match[1]));
  const unhandled = [...actionValues].filter((action) => !handledActions.has(action));
  assert(unhandled.length === 0, `${file}: 모든 data-action 값이 click 처리 분기에 연결됨${unhandled.length ? ` (${unhandled.join(', ')})` : ''}`);
  assert(!source.includes('실험 번호'), `${file}: 화면 출력 문자열에 실험 번호가 없음`);
  assert(!/outcome:\s*getEndTaskOutcome/.test(source), `${file}: 과업 종료 확인 대화상자 생성 시 결과를 미리 계산하지 않음`);
  assert(!/resultMessage:\s*modal\.outcome/.test(source), `${file}: 종료 확인 대화상자에 결과 메시지를 전달하지 않음`);
  assert(source.includes('runnerTaskRequestVisible: Boolean(state.runnerTaskRequestVisible)'), `${file}: 과업 수행 페이지 과업 요청 표시 옵션을 시작 정보에 저장함`);
  assert(source.includes('showTaskRequestInRunner: Boolean(launchPayload.runnerTaskRequestVisible)'), `${file}: 과업 수행 페이지가 과업 요청 표시 옵션을 읽음`);
  assert(!source.includes('${escapeHtml(task.title)} ·'), `${file}: 과업 수행 페이지 숨김 제목에 과업명이 노출되지 않음`);
}

const calendarSource = fs.readFileSync('app.js', 'utf8');
const gridButtonHasAction = /class="slot-grid-button[^`]+data-action="slot-open"[^`]+data-dialog-mode="select"[^`]+data-grid-slot="true"/s.test(calendarSource);
assert(gridButtonHasAction, '예약 캘린더 B 시간표 버튼이 일반 실행 경로에도 연결됨');

const utilsSource = fs.readFileSync('lib/utils.js', 'utf8');
assert(utilsSource.includes('과업 요청 사항을 수행 페이지에서도 보기'), '공통 유틸에 요청 사항 표시 스위치 문구가 있음');
assert(!utilsSource.includes('task-outcome-message'), '종료 확인 대화상자 유틸이 결과 메시지 영역을 만들지 않음');

if (failed) {
  process.exit(1);
}

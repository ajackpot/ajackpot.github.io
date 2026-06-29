import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appFiles = ['app.js', 'comments-app.js', 'search-app.js'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function read(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

const sources = Object.fromEntries(await Promise.all(appFiles.map(async (file) => [file, await read(file)])));
const utils = await read('lib/utils.js');

for (const [file, source] of Object.entries(sources)) {
  assert(!source.includes('테스트 번호'), `${file}: 화면 템플릿에 테스트 번호 문구가 남아 있습니다.`);
  assert(source.includes('renderTaskRequestVisibilitySwitchHtml({ checked: state.runnerTaskRequestVisible })'), `${file}: 과업 수행 페이지 과업 요청 표시 스위치가 없습니다.`);
  assert(source.includes('renderRunnerTaskRequestHtml({ goalSummary: task.goalSummary })'), `${file}: 과업 수행 페이지 과업 요청 표시 영역이 없습니다.`);
  assert(!source.includes('${escapeHtml(task.title)} ·'), `${file}: 과업 수행 페이지 숨김 제목에 과업명이 남아 있습니다.`);
}

assert(utils.includes('과업 요청 사항을 수행 페이지에서도 보기'), 'lib/utils.js: 요청한 스위치 이름이 없습니다.');
assert(!utils.includes('task-outcome-message'), 'lib/utils.js: 종료 확인 대화상자에 최종 판정 메시지를 노출하는 코드가 남아 있습니다.');

const calendarGridButtonMatch = sources['app.js'].match(/class="slot-grid-button[\s\S]*?aria-label="\$\{escapeHtml\(formatSlotLabel\(slot\)\)\}"/);
assert(calendarGridButtonMatch, 'app.js: 예약 캘린더 개선안 B 시간표 버튼 템플릿을 찾지 못했습니다.');
assert(calendarGridButtonMatch[0].includes('data-action="slot-open"'), 'app.js: 예약 캘린더 개선안 B 시간표 버튼에 실행 동작이 없습니다.');
assert(calendarGridButtonMatch[0].includes('data-dialog-mode="select"'), 'app.js: 예약 캘린더 개선안 B 시간표 버튼에 예약 확인 모드가 없습니다.');

assert(sources['comments-app.js'].includes('data-action="select-comment"'), 'comments-app.js: 댓글 목록 개선안 B 선택 버튼 동작이 없습니다.');
assert(sources['search-app.js'].includes('data-action="select-result"'), 'search-app.js: 검색 결과 개선안 B 선택 버튼 동작이 없습니다.');

for (const requiredCalendarAction of [
  'data-action="apply-filters"',
  'data-action="slot-open"',
  'data-action="dialog-confirm-slot"',
  'data-action="open-cancel-modal"',
  'data-action="dialog-confirm-cancel"',
  'data-action="site-placeholder"',
]) {
  assert(sources['app.js'].includes(requiredCalendarAction), `app.js: 예약 캘린더 주요 기능 ${requiredCalendarAction} 연결이 없습니다.`);
}


console.log('Static quality check passed.');
